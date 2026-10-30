import * as THREE from 'three';
import { OutlineComposer } from './composer.js';
import { CameraController } from './CameraController.js';
import { CalloutManager } from './CalloutManager.js';
import { WaveEffectManager } from './WaveEffectManager.js';
import { ThumbnailRenderer } from './ThumbnailRenderer.js';
import { CircuitBuilder } from './CircuitBuilder.js';
import { PinSnapIndex } from './interaction/PinSnapIndex.js';
import { InteractiveWireTool } from './interaction/InteractiveWireTool.js';
import { PinHudOverlay } from './interaction/PinHudOverlay.js';
import { StageTransformController } from './gizmo/StageTransformController.js';
import { circuitFlowSolver } from '../core/electrical/CircuitFlowSolver.js';
import { hardwareRegistry } from '../core/registry/ComponentRegistry.js';
import { registerAllHardware } from '../hardware/registerAllHardware.js';
import { themeService } from '../core/theme/ThemeService.js';

registerAllHardware(hardwareRegistry);

/**
 * Clean 3D Stage Orchestrator (No God-Object logic).
 * Delegates camera control, callouts, wave rings, thumbnails, theme synchronization, and declarative
 * circuit mounting to dedicated single-responsibility sub-systems and `ComponentRegistry`.
 */
export class BoardStage {
  constructor({
    canvas,
    stageEl,
    leadersSvg,
    tagsEl,
    inspectorEl,
    compassNeedle,
    registry = hardwareRegistry
  }) {
    this.canvas = canvas;
    this.stageEl = stageEl;
    this.registry = registry;

    this.width = stageEl?.clientWidth || 800;
    this.height = stageEl?.clientHeight || 520;
    this.pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

    const initialTokens = themeService.getStageTokens();

    if (canvas) {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(this.width, this.height, false);
      this.renderer.setPixelRatio(this.pixelRatio);
      this.renderer.setClearColor(initialTokens.clearColor, 1);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } else {
      this.renderer = null;
    }

    this.scene = new THREE.Scene();

    this.camera = new THREE.OrthographicCamera(-60, 60, 40, -40, -400, 600);
    this.camera.layers.enable(0);
    this.camera.layers.enable(1);

    if (this.renderer) {
      this.composer = new OutlineComposer(this.renderer, {
        lineColor: initialTokens.outlineColor,
        thickness: 1.05,
        opacity: 0.96
      });
      this.composer.setSize(this.width, this.height, this.pixelRatio);
    } else {
      this.composer = null;
    }

    this.setupLightsAndFloor(initialTokens);
    this.applyTheme(themeService.getTheme());
    this._unsubTheme = themeService.onChange(({ theme }) => this.applyTheme(theme));

    // Active Host Controller Board instance (Arduino Uno R3, ESP32 DevKit V1, or NVIDIA Jetson Nano)
    this.hostBoard = this.registry.create('board.arduino_uno', { id: 'main.host_board' });
    this.arduinoBoard = this.hostBoard;
    this.board = this.hostBoard.group;
    this.scene.add(this.board);

    this.lessonGroup = new THREE.Group();
    this.scene.add(this.lessonGroup);
    this.activeParts = {};
    this.currentLesson = null;

    // Sub-systems
    this.cameraController = new CameraController({
      camera: this.camera,
      canvas: this.canvas,
      compassNeedle,
      onResetCallout: () => this.calloutManager?.select(null)
    });

    this.calloutManager = new CalloutManager({
      leadersSvg,
      tagsEl,
      inspectorEl,
      cameraController: this.cameraController
    });

    this.waveManager = new WaveEffectManager(this.scene);
    this.thumbnailRenderer = this.renderer ? new ThumbnailRenderer(this.renderer, this.registry) : null;
    this.circuitBuilder = new CircuitBuilder({
      registry: this.registry,
      hostBoard: this.hostBoard,
      lessonGroup: this.lessonGroup,
      onEnsureHostBoard: (typeId) => this.ensureHostBoard(typeId)
    });

    this.pinSnapIndex = new PinSnapIndex(3.8);
    this.wireTool = new InteractiveWireTool({
      registry: this.registry,
      stageGroup: this.lessonGroup,
      pinSnapIndex: this.pinSnapIndex,
      onConnectionsChanged: () => {
        this.solveFreeformFlow();
        this.pinHudOverlay?.rebuildDomNodes();
        this.transformController?.renderHud();
        this._notifyStageChanged();
      }
    });

    this.pinHudOverlay = new PinHudOverlay({
      scene: this.scene,
      stageEl: this.stageEl,
      camera: this.camera,
      registry: this.registry,
      wireTool: this.wireTool,
      onWireCreated: () => {
        this.solveFreeformFlow();
        this.transformController?.renderHud();
        this._notifyStageChanged();
      },
      onWireRemoved: () => {
        this.solveFreeformFlow();
        this.transformController?.renderHud();
        this._notifyStageChanged();
      }
    });

    this.stageListeners = new Set();
    this.independentSpawnSeq = 1;

    this.transformController = new StageTransformController({
      scene: this.scene,
      camera: this.camera,
      canvas: this.canvas,
      stageEl: this.stageEl,
      cameraController: this.cameraController,
      registry: this.registry,
      wireTool: this.wireTool,
      pinHudOverlay: this.pinHudOverlay,
      onComponentTransformed: (comp) => {
        if (comp) {
          this.wireTool.refreshConnectedWires(comp.id);
        }
        this.pinHudOverlay?.update();
        this.solveFreeformFlow();
        this._notifyStageChanged();
      },
      onDuplicateComponent: (comp) => this.duplicateComponent(comp),
      onRemoveComponent: (comp) => this.removeComponent(comp)
    });

    this.currentScenario = null;
    this.lastFlowResult = null;
    this.xrayMode = false;

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => this.resize());
    }
    this.resize();
  }

  /**
   * Registers a callback invoked whenever components on the 3D stage are spawned, moved, or removed.
   * @param {() => void} cb
   */
  onStageComponentsChange(cb) {
    if (typeof cb === 'function') {
      this.stageListeners.add(cb);
    }
    return () => this.stageListeners.delete(cb);
  }

  _notifyStageChanged() {
    for (const cb of this.stageListeners) {
      cb();
    }
  }

  setupLightsAndFloor(tokens = themeService.getStageTokens()) {
    this.hemiLight = new THREE.HemisphereLight(tokens.hemiSky, tokens.hemiGround, tokens.hemiIntensity);
    this.hemiLight.position.set(0, 120, 0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(tokens.dirColor, tokens.dirIntensity);
    this.dirLight.position.set(55, 110, 65);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.camera.left = -120;
    this.dirLight.shadow.camera.right = 120;
    this.dirLight.shadow.camera.top = 120;
    this.dirLight.shadow.camera.bottom = -120;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 260;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    this.fillLight = new THREE.DirectionalLight(tokens.fillColor, tokens.fillIntensity);
    this.fillLight.position.set(-70, 50, -60);
    this.scene.add(this.fillLight);

    this.grid = new THREE.GridHelper(360, 36, tokens.gridPrimary, tokens.gridSecondary);
    this.grid.position.y = -0.05;
    this.grid.layers.set(1);
    this.scene.add(this.grid);

    const floorGeo = new THREE.PlaneGeometry(360, 360);
    floorGeo.rotateX(-Math.PI / 2);
    this.floorMat = new THREE.ShadowMaterial({ opacity: tokens.shadowOpacity });
    const floorMesh = new THREE.Mesh(floorGeo, this.floorMat);
    floorMesh.position.y = -0.02;
    floorMesh.receiveShadow = true;
    floorMesh.layers.set(1);
    this.scene.add(floorMesh);
  }

  /**
   * Synchronizes the 3D WebGL stage clear color, studio lighting, grid lines, and outline ink shader
   * with the active workbench theme ('dark' | 'light').
   * @param {'dark'|'light'} [theme]
   */
  applyTheme(theme = themeService.getTheme()) {
    const tokens = themeService.getStageTokens(theme);
    this.currentStageTheme = tokens.id;
    this.stageThemeTokens = tokens;

    if (this.renderer) {
      this.renderer.setClearColor(tokens.clearColor, 1);
    }
    if (this.composer?.material?.uniforms?.lineColor) {
      this.composer.material.uniforms.lineColor.value.set(tokens.outlineColor);
    }
    if (this.hemiLight) {
      this.hemiLight.color.set(tokens.hemiSky);
      this.hemiLight.groundColor.set(tokens.hemiGround);
      this.hemiLight.intensity = tokens.hemiIntensity;
    }
    if (this.dirLight) {
      this.dirLight.color.set(tokens.dirColor);
      this.dirLight.intensity = tokens.dirIntensity;
    }
    if (this.fillLight) {
      this.fillLight.color.set(tokens.fillColor);
      this.fillLight.intensity = tokens.fillIntensity;
    }
    if (this.floorMat) {
      this.floorMat.opacity = tokens.shadowOpacity;
    }
    if (this.grid && this.scene) {
      const wasVisible = this.grid.visible;
      this.scene.remove(this.grid);
      if (this.grid.geometry) this.grid.geometry.dispose();
      this.grid = new THREE.GridHelper(360, 36, tokens.gridPrimary, tokens.gridSecondary);
      this.grid.position.y = -0.05;
      this.grid.layers.set(1);
      this.grid.visible = wasVisible;
      this.scene.add(this.grid);
    }
    return tokens;
  }

  resize() {
    this.width = this.stageEl?.clientWidth || 800;
    this.height = this.stageEl?.clientHeight || 520;
    this.pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    this.renderer?.setSize(this.width, this.height, false);
    this.composer?.setSize(this.width, this.height, this.pixelRatio);
    this.cameraController.setViewportSize(this.width, this.height);
  }

  turn(dir = 1) {
    this.cameraController.turn(dir);
  }

  zoomBy(factor) {
    this.cameraController.zoomBy(factor);
  }

  resetView() {
    this.cameraController.resetView();
  }

  selectCallout(id) {
    this.calloutManager.select(id);
  }

  /**
   * Ensures the 3D scene has the requested Host Board (`board.arduino_uno`, `board.esp32_devkit`, `board.jetson_nano`),
   * or removes the active host board when `typeId` is `'none'` or `null`.
   * @param {string|null} typeId
   */
  ensureHostBoard(typeId = 'board.arduino_uno') {
    if (!typeId || typeId === 'none') {
      if (this.hostBoard) {
        this.removeComponent(this.hostBoard);
      }
      return null;
    }

    if (
      this.hostBoard &&
      this.hostBoard.typeId === typeId &&
      this.isComponentOnStage(this.hostBoard)
    ) {
      if (!this.registry.getInstance(this.hostBoard.id)) {
        this.registry.instancesById.set(this.hostBoard.id, this.hostBoard);
      }
      return this.hostBoard;
    }

    if (this.hostBoard) {
      if (this.transformController?.selectedComponent?.id === this.hostBoard.id) {
        this.transformController.selectComponent(null);
      }
      this.wireTool?.removeWiresForComponent(this.hostBoard.id);
      if (this.hostBoard.group?.parent) {
        this.hostBoard.group.parent.remove(this.hostBoard.group);
      }
      this.registry.removeInstance(this.hostBoard.id, true);
    }

    this.hostBoard = this.registry.create(typeId, { id: `main.${typeId}` });
    this.arduinoBoard = this.hostBoard;
    this.board = this.hostBoard.group;
    this.scene.add(this.board);
    if (this.circuitBuilder) {
      this.circuitBuilder.hostBoard = this.hostBoard;
    }
    if (this.xrayMode && typeof this.hostBoard.setXRayMode === 'function') {
      this.hostBoard.setXRayMode(true);
    }
    this.pinHudOverlay?.rebuildDomNodes();
    this.solveFreeformFlow();
    this._notifyStageChanged();
    return this.hostBoard;
  }

  /**
   * Overrides the active host controller board (or null for automatic per-lesson board) and rebuilds the current circuit.
   * @param {string|null} typeId
   */
  setHostBoardOverride(typeId) {
    this.circuitBuilder.setHostBoardOverride(typeId);
    if (this.currentLesson) {
      this.loadLesson(this.currentLesson);
    }
  }

  loadLesson(lesson) {
    this.currentLesson = lesson;
    this.currentScenario = null;
    this.waveManager.clear();
    this.wireTool.setConnections([]);
    this.transformController?.selectComponent(null);
    const { activeParts, callouts, cameraTarget, cameraZoom } = this.circuitBuilder.build(lesson);
    this.activeParts = activeParts;
    this.pinSnapIndex.rebuild([...this.registry.instancesById.values()].filter((c) => this.isComponentOnStage(c)));
    this.pinHudOverlay?.rebuildDomNodes();
    this.cameraController.setDefaults({ target: cameraTarget, zoom: cameraZoom });
    this.calloutManager.setCallouts(callouts);
    this.resetView();
    this._notifyStageChanged();
  }

  /**
   * Loads a `CircuitScenarioSchema v2` document (single-board or multi-board freeform circuit)
   * into the 3D stage and solves its live electrical flow.
   * @param {object} scenarioData
   */
  loadScenario(scenarioData) {
    this.currentScenario = scenarioData;
    this.waveManager.clear();
    this.transformController?.selectComponent(null);
    const built = this.circuitBuilder.buildFromScenario(scenarioData);
    this.hostBoard = built.hostBoard || null;
    this.arduinoBoard = built.hostBoard || null;
    this.board = built.hostBoard?.group || null;
    this.activeParts = built.activeParts;
    this.pinSnapIndex.rebuild(built.allHardware);
    this.wireTool.setConnections(built.connections);
    this.pinHudOverlay?.rebuildDomNodes();

    // Drive default active output pins on host boards so closed loops illuminate immediately in Freeform Lab
    for (const board of built.boards) {
      if (board && typeof board.drivePin === 'function') {
        board.drivePin('@LED_BUILTIN', true);
      }
    }

    this.solveFreeformFlow();
    this.cameraController.setDefaults({ target: built.cameraTarget, zoom: built.cameraZoom });
    this.calloutManager.setCallouts(built.callouts);
    this.resetView();
    this._notifyStageChanged();
    return built;
  }

  /**
   * Clears all independent components and jumper wires from the 3D stage while optionally keeping/updating the primary host board.
   * @param {{ keepHostBoard?: boolean, hostBoardTypeId?: string|null }} [opts]
   */
  clearStage({ keepHostBoard = true, hostBoardTypeId = null } = {}) {
    this.waveManager.clear();
    this.transformController?.selectComponent(null);
    this.wireTool.setConnections([]);
    while (this.lessonGroup.children.length > 0) {
      const child = this.lessonGroup.children[0];
      this.lessonGroup.remove(child);
    }

    if (hostBoardTypeId === 'none' || !keepHostBoard) {
      this.ensureHostBoard('none');
      this.registry.clearInstances(new Set());
    } else if (hostBoardTypeId) {
      this.ensureHostBoard(hostBoardTypeId);
      const keepIds = this.hostBoard ? new Set([this.hostBoard.id]) : new Set();
      this.registry.clearInstances(keepIds);
    } else {
      const keepIds = this.hostBoard ? new Set([this.hostBoard.id]) : new Set();
      this.registry.clearInstances(keepIds);
    }

    this.activeParts = { hostBoard: this.hostBoard };
    this.pinSnapIndex.rebuild([...this.registry.instancesById.values()].filter((c) => this.isComponentOnStage(c)));
    this.pinHudOverlay?.rebuildDomNodes();
    this.calloutManager.setCallouts(this.hostBoard ? this.hostBoard.getSubsystemCallouts() : []);
    this.solveFreeformFlow();
    this._notifyStageChanged();
  }

  /**
   * Spawns an independent instance of any registered component or board onto the 3D stage,
   * supporting unlimited instances of the same `typeId` and automatically selecting it with the 3D Gizmo.
   *
   * @param {string} typeId
   * @param {object} [options]
   * @param {string} [options.id]
   * @param {number[]} [options.position]
   * @param {number[]} [options.rotation]
   * @param {boolean} [options.autoSelect=true]
   */
  spawnComponent(typeId, options = {}) {
    return this.spawnIndependentComponent(typeId, options);
  }

  spawnIndependentComponent(typeId, options = {}) {
    if (!typeId || !this.registry.has(typeId)) return null;

    const seq = this.independentSpawnSeq++;
    const col = (seq - 1) % 5;
    const row = Math.floor((seq - 1) / 5);
    const isBoard = typeId.startsWith('board.') && typeId !== 'board.breadboard';
    const isBreadboard = typeId === 'board.breadboard';

    let defaultPos;
    if (isBoard) {
      defaultPos = [-36 + col * 18, 0, -28 - row * 18];
    } else if (isBreadboard) {
      defaultPos = [34 + col * 14, 0, 18 + row * 14];
    } else {
      defaultPos = [16 + col * 7.62, 5.2, -16 + row * 7.62];
    }

    const pos = Array.isArray(options.position) ? options.position : defaultPos;
    const id =
      options.id ||
      `stage.${typeId.replace(/\./g, '_')}_${seq}`;

    const inst = this.registry.create(typeId, {
      ...options,
      id,
      position: pos
    });

    if (Array.isArray(options.rotation)) {
      inst.setRotation(
        options.rotation[0] || 0,
        options.rotation[1] || 0,
        options.rotation[2] || 0
      );
    }

    this.lessonGroup.add(inst.group);

    if (this.xrayMode && typeof inst.setXRayMode === 'function') {
      inst.setXRayMode(true);
    }

    if (isBoard && typeof inst.drivePin === 'function') {
      inst.drivePin('@LED_BUILTIN', true);
    }

    if (!this.hostBoard && inst.isHostBoard) {
      this.hostBoard = inst;
      this.arduinoBoard = inst;
      this.board = inst.group;
      if (this.circuitBuilder) {
        this.circuitBuilder.hostBoard = inst;
      }
    } else if (
      this.hostBoard &&
      !inst.isHostBoard &&
      Math.abs(this.hostBoard.group.position.x) < 1 &&
      Math.abs(this.hostBoard.group.position.z) < 1
    ) {
      // Shift host board left and frame camera when peripheral components are spawned on the right workbench zone
      this.hostBoard.setPosition(-30, 0, 0);
      this.cameraController?.setDefaults?.({
        target: new THREE.Vector3(2, 3, 2),
        zoom: 0.85
      });
      this.resetView();
    }

    this._syncIndependentCallouts();
    this.pinHudOverlay?.rebuildDomNodes();
    this.solveFreeformFlow();

    if (options.autoSelect !== false) {
      this.transformController?.selectComponent(inst);
    }

    this.spawnWave(inst.group.position.clone(), '#059669');
    this._notifyStageChanged();
    return inst;
  }

  /**
   * Duplicates an existing stage component with a slight spatial offset.
   * @param {import('../core/components/HardwareComponent.js').HardwareComponent|string} compOrId
   */
  duplicateComponent(compOrId) {
    const comp =
      typeof compOrId === 'string' ? this.registry.getInstance(compOrId) : compOrId;
    if (!comp || comp.typeId === 'passive.wire') return null;

    const p = comp.group.position;
    const r = comp.group.rotation;
    return this.spawnIndependentComponent(comp.typeId, {
      ...comp.options,
      id: undefined,
      position: [
        Number((p.x + 7.62).toFixed(2)),
        Number(p.y.toFixed(2)),
        Number((p.z + 5.08).toFixed(2))
      ],
      rotation: [r.x, r.y, r.z],
      autoSelect: true
    });
  }

  /**
   * Removes any component (including the primary host board `main.*` or peripheral components)
   * from the 3D stage and cleans up any connected wires.
   * @param {import('../core/components/HardwareComponent.js').HardwareComponent|string} compOrId
   */
  removeComponent(compOrId) {
    const comp =
      typeof compOrId === 'string' ? this.registry.getInstance(compOrId) : compOrId;
    if (!comp || comp.typeId === 'passive.wire') return false;

    if (this.transformController?.selectedComponent?.id === comp.id) {
      this.transformController.selectComponent(null);
    }

    this.wireTool?.removeWiresForComponent(comp.id);
    if (comp.group?.parent) {
      comp.group.parent.remove(comp.group);
    }
    this.registry.removeInstance(comp.id, true);

    if (this.hostBoard?.id === comp.id) {
      const fallbackBoard =
        [...this.registry.instancesById.values()].find(
          (c) => this.isComponentOnStage(c) && c.isHostBoard
        ) || null;
      this.hostBoard = fallbackBoard;
      this.arduinoBoard = fallbackBoard;
      this.board = fallbackBoard ? fallbackBoard.group : null;
      if (this.circuitBuilder) {
        this.circuitBuilder.hostBoard = fallbackBoard;
      }
    }

    this._syncIndependentCallouts();
    this.pinHudOverlay?.rebuildDomNodes();
    this.solveFreeformFlow();
    this._notifyStageChanged();
    return true;
  }

  /**
   * Synchronizes 3D stage callout labels with all active peripheral components on the stage.
   */
  _syncIndependentCallouts() {
    if (!this.calloutManager) return;
    const peripherals = this.getIndependentComponents();
    if (peripherals.length === 0) {
      this.calloutManager.setCallouts(this.hostBoard?.getSubsystemCallouts?.() || []);
      return;
    }
    const callouts = peripherals
      .filter((c) => typeof c.getCalloutDescriptor === 'function')
      .map((c) => c.getCalloutDescriptor());
    this.calloutManager.setCallouts(callouts);
  }

  /**
   * Verifies that a registered component instance is mounted inside this `BoardStage.scene`.
   * @param {import('../core/components/HardwareComponent.js').HardwareComponent} comp
   */
  isComponentOnStage(comp) {
    if (!comp || !comp.group) return false;
    let curr = comp.group;
    while (curr) {
      if (curr === this.scene) return true;
      curr = curr.parent;
    }
    return false;
  }

  /**
   * Toggles 3D Dipole X-Ray Mode across all active stage components.
   * @param {boolean} enabled
   */
  setXRayMode(enabled) {
    this.xrayMode = Boolean(enabled);
    for (const comp of this.registry.instancesById.values()) {
      if (this.isComponentOnStage(comp) && typeof comp.setXRayMode === 'function') {
        comp.setXRayMode(this.xrayMode);
      }
    }
    return this.xrayMode;
  }

  /**
   * Returns all non-wire peripheral components on the stage.
   */
  getIndependentComponents() {
    return [...this.registry.instancesById.values()].filter(
      (c) => this.isComponentOnStage(c) && c.typeId !== 'passive.wire' && c.id !== this.hostBoard?.id
    );
  }

  /**
   * Evaluates closed-loop conductivity, Ohm's law current, and overcurrent/overvoltage faults
   * across all active stage components and freeform jumper wires.
   */
  solveFreeformFlow() {
    const components = [...this.registry.instancesById.values()].filter(
      (c) => this.isComponentOnStage(c) && c.typeId !== 'passive.wire'
    );
    this.pinSnapIndex.rebuild(components);
    this.lastFlowResult = circuitFlowSolver.solve({
      components,
      connections: this.wireTool.getConnections()
    });
    if (typeof this.onFlowSolved === 'function') {
      this.onFlowSolved(this.lastFlowResult);
    }
    return this.lastFlowResult;
  }

  spawnWave(originVec3, colorHex = '#1aa3a1') {
    this.waveManager.spawn(originVec3, colorHex);
  }

  setBoardLed(id, on, intensity = 1.6) {
    this.hostBoard?.setOnboardLed(id, on, intensity);
  }

  setPartLed(ledPart, level = 0) {
    if (!ledPart) return;
    if (typeof ledPart.setBrightness === 'function') {
      ledPart.setBrightness(level);
    }
  }

  renderThumbnail(lessonId) {
    return this.thumbnailRenderer.render(lessonId);
  }

  tick(dt) {
    // Polymorphic frame update across all registered active components on this stage
    for (const comp of this.registry.instancesById.values()) {
      if (this.isComponentOnStage(comp)) {
        comp.update(dt);
      }
    }

    this.cameraController.update(dt);
    this.transformController?.update();
    this.waveManager.update(dt);

    const zoom = this.cameraController.view.zoom;
    if (this.composer) {
      this.composer.setLineScale(Math.min(1.15, Math.max(0.65, Math.sqrt(zoom))));
      this.composer.render(this.scene, this.camera);
    }

    this.calloutManager.update();
  }
}
