import * as THREE from 'three';
import { TransformGizmo3D } from './TransformGizmo3D.js';
import { GizmoMath } from './GizmoMath.js';
import { SmartPinMatcher } from '../../core/electrical/SmartPinMatcher.js';
import { i18n } from '../../core/i18n/I18nService.js';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Interactive 3D Stage Transform Controller (`StageTransformController`).
 *
 * Strictly adheres to Single Responsibility Principle:
 * - Raycasts against `TransformGizmo3D` handles (`X`, `Y`, `Z`, `XZ`, `RY`) and stage `HardwareComponent` meshes.
 * - Executes real-time 3D translation and Y-axis rotation via `GizmoMath`.
 * - Locks `CameraController` pan/orbit while dragging a gizmo axis.
 * - Triggers connected 3D jumper wire stretching (`onComponentTransformed`) and renders a compact Gizmo HUD.
 */
export class StageTransformController {
  /**
   * @param {object} deps
   * @param {THREE.Scene} deps.scene
   * @param {THREE.Camera} deps.camera
   * @param {HTMLCanvasElement} [deps.canvas]
   * @param {HTMLElement} [deps.stageEl]
   * @param {import('../CameraController.js').CameraController} [deps.cameraController]
   * @param {import('../../core/registry/ComponentRegistry.js').ComponentRegistry} deps.registry
   * @param {import('../interaction/InteractiveWireTool.js').InteractiveWireTool} [deps.wireTool]
   * @param {import('../interaction/PinHudOverlay.js').PinHudOverlay} [deps.pinHudOverlay]
   * @param {(comp: import('../../core/components/HardwareComponent.js').HardwareComponent) => void} [deps.onComponentTransformed]
   * @param {(comp: import('../../core/components/HardwareComponent.js').HardwareComponent) => any} [deps.onDuplicateComponent]
   * @param {(comp: import('../../core/components/HardwareComponent.js').HardwareComponent) => boolean} [deps.onRemoveComponent]
   */
  constructor({
    scene,
    camera,
    canvas,
    stageEl,
    hudEl,
    cameraController,
    registry,
    getComponents,
    wireTool,
    pinHudOverlay,
    onComponentTransformed,
    onDuplicateComponent,
    onRemoveComponent,
    onQuickConnectPair
  }) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;
    this.stageEl = stageEl;
    this.hudEl = hudEl || null;
    this.cameraController = cameraController;
    this.registry = registry || null;
    this.getComponents = typeof getComponents === 'function' ? getComponents : null;
    this.wireTool = wireTool || null;
    this.pinHudOverlay = pinHudOverlay || null;
    this.onComponentTransformed = onComponentTransformed;
    this.onDuplicateComponent = onDuplicateComponent;
    this.onRemoveComponent = onRemoveComponent;
    this.onQuickConnectPair = onQuickConnectPair || null;

    this.gizmo = new TransformGizmo3D();
    this.scene.add(this.gizmo.group);

    this.raycaster = new THREE.Raycaster();
    this.raycaster.layers.enable(0);
    this.raycaster.layers.enable(1);
    this.pointerNdc = new THREE.Vector2();

    this.selectedComponent = null;
    this.isQuickConnectMode = false;
    /** @type {{ from: string, to: string }|null} */
    this.lastSmartConnectedPair = null;
    this.snapEnabled = false; // Smooth free tabletop glide by default; toggleable to 2.54mm breadboard snap
    this.gridSnapStep = 2.54; // 0.1 inch standard breadboard pitch
    this.angleSnapStep = 15 * DEG_TO_RAD;

    this.bounds = {
      minX: -145,
      maxX: 145,
      minY: -2,
      maxY: 48,
      minZ: -115,
      maxZ: 115
    };

    this.dragState = null;
    this.pointerDownInfo = null;
    this.selectionListeners = new Set();

    if (this.stageEl) {
      this.mountHud();
    }
    if (this.canvas) {
      this.bindEvents();
    }

    this._unsubscribeI18n = i18n.onChange(() => this.renderHud());
  }

  /**
   * Subscribes to component selection changes.
   * @param {(comp: import('../../core/components/HardwareComponent.js').HardwareComponent|null) => void} cb
   */
  onSelectionChange(cb) {
    if (typeof cb === 'function') {
      this.selectionListeners.add(cb);
    }
    return () => this.selectionListeners.delete(cb);
  }

  _notifySelectionChange() {
    for (const cb of this.selectionListeners) {
      cb(this.selectedComponent);
    }
  }

  mountHud() {
    if (!this.stageEl || typeof document === 'undefined') return;
    this.hudEl = document.createElement('div');
    this.hudEl.id = 'gizmo-hud';
    this.hudEl.className = 'gizmo-hud';
    this.hudEl.hidden = true;
    this.stageEl.appendChild(this.hudEl);
  }

  /**
   * Selects a 3D hardware component and attaches the 3D Transform Gizmo to it.
   * @param {import('../../core/components/HardwareComponent.js').HardwareComponent|null} component
   */
  selectComponent(component) {
    if (component && component.typeId === 'passive.wire') {
      return;
    }
    if (!component || component !== this.selectedComponent) {
      this.isQuickConnectMode = false;
      this.lastSmartConnectedPair = null;
      this.pinHudOverlay?.setQuickConnectSourceComponent?.(null);
    }
    this.selectedComponent = component || null;
    this.gizmo.attach(this.selectedComponent);
    this.pinHudOverlay?.setSelectedComponent(this.selectedComponent);
    this.renderHud();
    this._notifySelectionChange();
  }

  /**
   * Activates Flownie 1-to-1 Smart Connect (`⚡ Akıllı Bağla`) mode anchored on the currently selected component (`A`).
   * Does NOT auto-wire the entire stage; instead waits for the user to click target components (`B`, `C`, ...) sequentially.
   */
  startQuickConnect() {
    if (!this.selectedComponent) return false;
    this.isQuickConnectMode = true;
    this.lastSmartConnectedPair = null;
    this.pinHudOverlay?.setQuickConnectSourceComponent?.(this.selectedComponent, (targetComp) => {
      this.handleStageComponentClick(targetComp);
    });
    this.renderHud();
    return true;
  }

  /**
   * Cancels Flownie 1-to-1 Smart Connect (`⚡ Akıllı Bağla`) mode.
   */
  cancelQuickConnect() {
    if (!this.isQuickConnectMode) return false;
    this.isQuickConnectMode = false;
    this.lastSmartConnectedPair = null;
    this.pinHudOverlay?.setQuickConnectSourceComponent?.(null);
    this.renderHud();
    return false;
  }

  /**
   * Toggles Flownie 1-to-1 Smart Connect (`⚡ Akıllı Bağla`) mode.
   * @param {boolean} [force]
   */
  toggleQuickConnect(force) {
    const next = typeof force === 'boolean' ? force : !this.isQuickConnectMode;
    return next ? this.startQuickConnect() : this.cancelQuickConnect();
  }

  /**
   * Handles a click on a stage component (`targetCompOrId`) according to the Flownie 1-to-1 state machine:
   * - If `isQuickConnectMode` is active on source component `A` (`this.selectedComponent`) and the user clicks
   *   any other component `B`, `C`, ..., it connects the single highest-scoring compatible free pin pair between
   *   `A` and the clicked component while keeping `A` locked as the active source.
   * - Otherwise, it selects the clicked component normally.
   *
   * @param {string|import('../../core/components/HardwareComponent.js').HardwareComponent} targetCompOrId
   * @returns {{ action: 'smart-connected'|'selected'|'none', connected: boolean, source?: any, target?: any, selected?: any, result: any }}
   */
  handleStageComponentClick(targetCompOrId) {
    const targetComp =
      typeof targetCompOrId === 'string'
        ? this.registry?.getInstance?.(targetCompOrId) ||
          this._getStageComponents().find((c) => c && c.id === targetCompOrId)
        : targetCompOrId;

    if (!targetComp || targetComp.typeId === 'passive.wire') {
      return { action: 'none', connected: false, selected: this.selectedComponent, result: null };
    }

    if (
      this.isQuickConnectMode &&
      this.selectedComponent &&
      targetComp.id !== this.selectedComponent.id
    ) {
      const result = this.quickConnectTo(targetComp);
      return {
        action: 'smart-connected',
        connected: Boolean(result?.connected),
        source: this.selectedComponent,
        target: targetComp,
        selected: this.selectedComponent,
        result
      };
    }

    if (this.selectedComponent !== targetComp) {
      this.selectComponent(targetComp);
    }

    return {
      action: 'selected',
      connected: false,
      selected: this.selectedComponent,
      result: null
    };
  }

  /**
   * Connects the highest-scoring compatible free pin pair between `this.selectedComponent` (`A`) and `targetCompOrId` (`B`).
   * @param {string|import('../../core/components/HardwareComponent.js').HardwareComponent} targetCompOrId
   */
  quickConnectTo(targetCompOrId) {
    if (!this.selectedComponent || !this.wireTool) {
      return { connected: false, reasonKey: 'elec.wiring.err.no_free_pins', wire: null, match: null };
    }
    const result = this.wireTool.quickConnectComponents(this.selectedComponent, targetCompOrId);
    if (result.connected && result.match) {
      this.lastSmartConnectedPair = {
        from: result.match.sourcePin.endpointId,
        to: result.match.targetPin.endpointId
      };
    }
    this.pinHudOverlay?.rebuildDomNodes();
    this.onComponentTransformed?.(this.selectedComponent);
    this.renderHud();
    return result;
  }

  /**
   * Disconnects all jumper wires attached to the currently selected component (`🔗̸ Kopar [N]`).
   * @returns {number} Count of removed wires
   */
  disconnectSelectedWires() {
    if (!this.selectedComponent || !this.wireTool) return 0;
    const removedCount = this.wireTool.disconnectComponent(this.selectedComponent.id);
    this.pinHudOverlay?.rebuildDomNodes();
    this.onComponentTransformed?.(this.selectedComponent);
    this.renderHud();
    return removedCount;
  }

  /**
   * Runs rule-based zero-cost Auto-Wire (`⚡ Akıllı Bağla`) across all stage components.
   */
  autoWireStage() {
    if (!this.wireTool) return { createdCount: 0, wires: [], plans: [] };
    const result = this.wireTool.autoConnectStage();
    this.pinHudOverlay?.rebuildDomNodes();
    this.onComponentTransformed?.(this.selectedComponent);
    this.renderHud();
    return result;
  }

  /**
   * Selects a component by its instance ID in `ComponentRegistry`.
   * @param {string|null} instanceId
   */
  selectById(instanceId) {
    if (!instanceId) {
      this.selectComponent(null);
      return null;
    }
    const inst = this.registry.getInstance(instanceId);
    this.selectComponent(inst || null);
    return inst || null;
  }

  /**
   * Toggles 2.54mm breadboard grid snapping.
   * @param {boolean} [force]
   */
  toggleSnap(force) {
    this.snapEnabled = typeof force === 'boolean' ? force : !this.snapEnabled;
    this.renderHud();
    return this.snapEnabled;
  }

  /**
   * Toggles the optional 3D Gizmo arrows (`X`, `Y`, `Z`, `XZ`, `RY`) on top of the selected component.
   * @param {boolean} [force]
   */
  toggleGizmoAxes(force) {
    const next = typeof force === 'boolean' ? force : !this.gizmo.axesVisible;
    this.gizmo.setAxesVisible(next);
    this.renderHud();
    return this.gizmo.axesVisible;
  }

  _isComponentInScene(comp) {
    if (!comp || !comp.group) return false;
    if (!this.scene) return true;
    let curr = comp.group;
    while (curr) {
      if (curr === this.scene) return true;
      curr = curr.parent;
    }
    return false;
  }

  _getStageComponents() {
    if (this.getComponents) {
      return (this.getComponents() || []).filter((c) => this._isComponentInScene(c));
    }
    if (this.registry?.instancesById instanceof Map) {
      return [...this.registry.instancesById.values()].filter((c) => this._isComponentInScene(c));
    }
    if (this.registry && typeof this.registry.getAllInstances === 'function') {
      return this.registry.getAllInstances().filter((c) => this._isComponentInScene(c));
    }
    return [];
  }

  /**
   * Evaluates magnetic breadboard tie-point docking for `comp` at `candidatePos` (`[x, y, z]`),
   * updating `comp.snappedBreadboardBinding` and `comp.setPosition`.
   * @param {import('../../core/components/HardwareComponent.js').HardwareComponent} comp
   * @param {number[]} candidatePos
   */
  _applyPositionWithBreadboardMagnet(comp, candidatePos) {
    if (!comp) return null;
    const allStageComps = this._getStageComponents();
    const breadboards = allStageComps.filter(
      (inst) => inst && (inst.typeId === 'board.breadboard' || inst.isPrototypingBoard)
    );
    if (breadboards.length > 0) {
      const mag = GizmoMath.computeBreadboardMagneticSnap(comp, candidatePos, breadboards);
      if (mag.snapped) {
        comp.snappedBreadboardBinding = mag;
        comp.setPosition(mag.position[0], mag.position[1], mag.position[2]);
        return mag;
      }
    }
    comp.snappedBreadboardBinding = null;
    comp.setPosition(candidatePos[0], candidatePos[1], candidatePos[2]);
    return null;
  }

  /**
   * Moves the currently selected component to `(x, y, z)` in world space and updates connected wires.
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  moveSelectedTo(x, y, z) {
    if (!this.selectedComponent) return null;
    const step = this.snapEnabled ? this.gridSnapStep : 0;
    const [nx, ny, nz] = GizmoMath.snapVector3([x, y, z], step, this.bounds);

    this._applyPositionWithBreadboardMagnet(this.selectedComponent, [nx, ny, nz]);
    this.gizmo.syncTransform();
    this.pinHudOverlay?.update();
    this.onComponentTransformed?.(this.selectedComponent);
    this.renderHud();
    return this.selectedComponent.group.position.clone();
  }

  /**
   * Nudges the currently selected component by `(dx, dy, dz)`.
   */
  translateSelected(dx = 0, dy = 0, dz = 0) {
    if (!this.selectedComponent) return null;
    const pos = this.selectedComponent.group.position;
    const nx = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, pos.x + dx));
    const ny = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, pos.y + dy));
    const nz = Math.max(this.bounds.minZ, Math.min(this.bounds.maxZ, pos.z + dz));

    this._applyPositionWithBreadboardMagnet(this.selectedComponent, [nx, ny, nz]);
    this.gizmo.syncTransform();
    this.pinHudOverlay?.update();
    this.onComponentTransformed?.(this.selectedComponent);
    this.renderHud();
    return this.selectedComponent.group.position.clone();
  }

  /**
   * Rotates the currently selected component around the Y axis by `deltaDeg` degrees.
   * @param {number} deltaDeg
   */
  rotateSelectedBy(deltaDeg = 45) {
    if (!this.selectedComponent) return null;
    const nextRad = this.selectedComponent.group.rotation.y + deltaDeg * DEG_TO_RAD;
    this.selectedComponent.setRotationY(nextRad);
    const pos = this.selectedComponent.group.position;
    this._applyPositionWithBreadboardMagnet(this.selectedComponent, [pos.x, pos.y, pos.z]);
    this.gizmo.syncTransform();
    this.pinHudOverlay?.update();
    this.onComponentTransformed?.(this.selectedComponent);
    this.renderHud();
    return nextRad;
  }

  /**
   * Duplicates the currently selected component onto the stage.
   */
  duplicateSelected() {
    if (!this.selectedComponent || !this.onDuplicateComponent) return null;
    const clone = this.onDuplicateComponent(this.selectedComponent);
    if (clone) {
      this.selectComponent(clone);
    }
    return clone;
  }

  /**
   * Deletes the currently selected component from the stage.
   */
  deleteSelected() {
    if (!this.selectedComponent || !this.onRemoveComponent) return false;
    const target = this.selectedComponent;
    const removed = this.onRemoveComponent(target);
    if (removed) {
      this.selectComponent(null);
    }
    return removed;
  }

  _updateRaycasterFromEvent(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointerNdc.x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    this.pointerNdc.y = -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
  }

  _raycastGizmoHandle(e) {
    if (!this.selectedComponent || !this.gizmo.group.visible) return null;
    this._updateRaycasterFromEvent(e);
    const hits = this.raycaster.intersectObjects(this.gizmo.getColliders(), true);
    if (hits.length === 0) return null;
    let obj = hits[0].object;
    while (obj && !obj.userData?.gizmoHandle) {
      obj = obj.parent;
    }
    return obj?.userData?.gizmoHandle || null;
  }

  _raycastStageComponent(e) {
    this._updateRaycasterFromEvent(e);
    const candidates = [];
    const meshToComp = new Map();

    for (const comp of this._getStageComponents()) {
      if (comp.typeId === 'passive.wire' || !comp.group) continue;
      comp.group.traverse((child) => {
        if (child.isMesh) {
          candidates.push(child);
          meshToComp.set(child, comp);
        }
      });
    }

    const hits = this.raycaster.intersectObjects(candidates, false);
    if (hits.length === 0) return null;
    return meshToComp.get(hits[0].object) || null;
  }

  bindEvents() {
    // Capture phase on pointerdown so direct tabletop component grabs & Gizmo handle grabs lock CameraController before panning
    this.canvas.addEventListener(
      'pointerdown',
      (e) => {
        if (e.button !== 0) return;

        // 0. Flownie 1-to-1 Smart Connect Target Click takes top priority over gizmo handles:
        if (this.isQuickConnectMode && this.selectedComponent) {
          const hitTarget = this._raycastStageComponent(e);
          if (hitTarget && hitTarget.id !== this.selectedComponent.id) {
            e.stopPropagation();
            this.pointerDownInfo = null;
            this.dragState = null;
            this.handleStageComponentClick(hitTarget);
            return;
          }
        }

        // 1. Check 3D Gizmo axis handle first (when 3D Gizmo axes are enabled)
        const handle = this._raycastGizmoHandle(e);
        if (handle && this.selectedComponent) {
          e.stopPropagation();
          this.cameraController?.setInteractionLocked(true);
          this.gizmo.setActiveHandle(handle);
          this.canvas.style.cursor = 'grabbing';
          this.canvas.setPointerCapture?.(e.pointerId);

          const p = this.selectedComponent.group.position;
          const startPos = [p.x, p.y, p.z];
          const startRotY = this.selectedComponent.group.rotation.y;
          const ro = this.raycaster.ray.origin;
          const rd = this.raycaster.ray.direction;
          const rayOrigin = [ro.x, ro.y, ro.z];
          const rayDir = [rd.x, rd.y, rd.z];

          let startScalar = 0;
          let startPlaneHit = null;
          let startAngle = 0;

          if (handle === 'X' || handle === 'Y' || handle === 'Z') {
            startScalar = GizmoMath.projectRayOntoAxis(rayOrigin, rayDir, startPos, handle).scalar;
          } else if (handle === 'XZ') {
            startPlaneHit =
              GizmoMath.intersectHorizontalPlane(rayOrigin, rayDir, startPos[1]) || [...startPos];
          } else if (handle === 'RY') {
            const hit = GizmoMath.intersectHorizontalPlane(rayOrigin, rayDir, startPos[1]);
            startAngle = hit ? GizmoMath.computePlanarAngle(startPos, hit) : 0;
          }

          this.dragState = {
            pointerId: e.pointerId,
            handle,
            isDirectTableDrag: false,
            startClientX: e.clientX,
            startClientY: e.clientY,
            hasMoved: true,
            startPos,
            startRotY,
            startScalar,
            startPlaneHit,
            startAngle
          };
          this.renderHud();
          return;
        }

        // 2. Direct Tabletop Component Grab OR Smart Connect Target Click:
        const hitComp = this._raycastStageComponent(e);
        if (hitComp) {
          const clickOutcome = this.handleStageComponentClick(hitComp);
          if (clickOutcome.action === 'smart-connected') {
            e.stopPropagation();
            this.pointerDownInfo = null;
            return;
          }
          this.cameraController?.setInteractionLocked(true);
          this.canvas.style.cursor = 'grabbing';
          this.canvas.setPointerCapture?.(e.pointerId);

          const p = hitComp.group.position;
          const startPos = [p.x, p.y, p.z];
          const startRotY = hitComp.group.rotation.y;
          const ro = this.raycaster.ray.origin;
          const rd = this.raycaster.ray.direction;
          const rayOrigin = [ro.x, ro.y, ro.z];
          const rayDir = [rd.x, rd.y, rd.z];
          const startPlaneHit =
            GizmoMath.intersectHorizontalPlane(rayOrigin, rayDir, startPos[1]) || [...startPos];

          this.dragState = {
            pointerId: e.pointerId,
            handle: 'XZ',
            isDirectTableDrag: true,
            startClientX: e.clientX,
            startClientY: e.clientY,
            hasMoved: false,
            startPos,
            startRotY,
            startScalar: 0,
            startPlaneHit,
            startAngle: 0
          };
          return;
        }

        this.pointerDownInfo = {
          x: e.clientX,
          y: e.clientY,
          time: performance.now()
        };
      },
      true
    );

    this.canvas.addEventListener('pointermove', (e) => {
      if (this.dragState && this.selectedComponent) {
        if (!this.dragState.hasMoved) {
          const moveDist = Math.hypot(
            e.clientX - this.dragState.startClientX,
            e.clientY - this.dragState.startClientY
          );
          if (moveDist < 3) return;
          this.dragState.hasMoved = true;
        }

        this._updateRaycasterFromEvent(e);
        const ro = this.raycaster.ray.origin;
        const rd = this.raycaster.ray.direction;
        const rayOrigin = [ro.x, ro.y, ro.z];
        const rayDir = [rd.x, rd.y, rd.z];
        const { handle, startPos, startRotY, startScalar, startPlaneHit, startAngle } =
          this.dragState;
        const snapStep = this.snapEnabled ? this.gridSnapStep : 0;

        if (handle === 'X' || handle === 'Y' || handle === 'Z') {
          const currentScalar = GizmoMath.projectRayOntoAxis(
            rayOrigin,
            rayDir,
            startPos,
            handle
          ).scalar;
          const nextPos = GizmoMath.computeAxisDragPosition({
            startPosition: startPos,
            axis: handle,
            startScalar,
            currentScalar,
            snapStep,
            bounds: this.bounds
          });
          this._applyPositionWithBreadboardMagnet(this.selectedComponent, nextPos);
        } else if (handle === 'XZ') {
          const currentHit =
            GizmoMath.intersectHorizontalPlane(rayOrigin, rayDir, startPos[1]) || startPlaneHit;
          const nextPos = GizmoMath.computePlanarXZDragPosition({
            startPosition: startPos,
            startHit: startPlaneHit,
            currentHit,
            snapStep,
            bounds: this.bounds
          });
          this._applyPositionWithBreadboardMagnet(this.selectedComponent, nextPos);
        } else if (handle === 'RY') {
          const hit = GizmoMath.intersectHorizontalPlane(rayOrigin, rayDir, startPos[1]);
          if (hit) {
            const currAngle = GizmoMath.computePlanarAngle(startPos, hit);
            const deltaAngle = currAngle - startAngle;
            const rawAngle = startRotY + deltaAngle;
            const snappedAngle = GizmoMath.snapAngle(rawAngle, this.snapEnabled ? 15 : 0);
            this.selectedComponent.setRotationY(snappedAngle);
          }
        }

        this.gizmo.syncTransform();
        this.pinHudOverlay?.update();
        this.onComponentTransformed?.(this.selectedComponent);
        this._syncHudCoordinates();
        return;
      }

      // Hover state over Gizmo handles or any draggable stage component
      const hoveredHandle = this._raycastGizmoHandle(e);
      this.gizmo.setHoveredHandle(hoveredHandle);
      if (hoveredHandle) {
        this.canvas.style.cursor = 'grab';
        return;
      }
      const hoveredComp = this._raycastStageComponent(e);
      this.pinHudOverlay?.setHoveredComponent(hoveredComp);
      if (this.isQuickConnectMode && hoveredComp && hoveredComp !== this.selectedComponent) {
        this.canvas.style.cursor = 'crosshair';
        return;
      }
      this.canvas.style.cursor = hoveredComp ? 'grab' : '';
    });

    const endInteraction = (e) => {
      if (this.dragState) {
        const wasClickWithoutDrag =
          e?.type === 'pointerup' &&
          this.dragState.isDirectTableDrag &&
          !this.dragState.hasMoved &&
          !this.isQuickConnectMode;
        const clickedComp = this.selectedComponent;
        this.dragState = null;
        this.gizmo.setActiveHandle(null);
        this.cameraController?.setInteractionLocked(false);
        this.canvas.style.cursor = '';
        if (wasClickWithoutDrag && clickedComp && typeof clickedComp.toggle === 'function') {
          clickedComp.toggle();
          this.onComponentTransformed?.(clickedComp);
        }
        this.renderHud();
        return;
      }

      if (this.pointerDownInfo && e.type === 'pointerup') {
        const dx = e.clientX - this.pointerDownInfo.x;
        const dy = e.clientY - this.pointerDownInfo.y;
        const dist = Math.hypot(dx, dy);
        this.pointerDownInfo = null;

        // Clicking on empty desk space without orbiting deselects the active component
        if (dist < 5) {
          const hitComp = this._raycastStageComponent(e);
          if (!hitComp && this.selectedComponent) {
            this.selectComponent(null);
          }
        }
      } else {
        this.pointerDownInfo = null;
      }
    };

    this.canvas.addEventListener('pointerup', endInteraction);
    this.canvas.addEventListener('pointercancel', endInteraction);

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isQuickConnectMode) {
          this.cancelQuickConnect();
          return;
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedComponent) {
          const activeTag = e.target?.tagName;
          const isEditable =
            activeTag === 'INPUT' ||
            activeTag === 'TEXTAREA' ||
            activeTag === 'SELECT' ||
            Boolean(e.target?.isContentEditable);
          if (!isEditable) {
            e.preventDefault();
            this.deleteSelected();
          }
        }
      });
    }
  }

  /**
   * Lightweight coordinate update during 60fps tabletop drag without rebuilding HUD DOM buttons.
   */
  _syncHudCoordinates() {
    if (!this.hudEl || !this.selectedComponent) return;
    const coordsEl = this.hudEl.querySelector('.gizmo-hud-coords');
    if (!coordsEl) return;
    const pos = this.selectedComponent.group.position;
    const rotDeg = Math.round(
      (((this.selectedComponent.group.rotation.y * RAD_TO_DEG) % 360) + 360) % 360
    );
    coordsEl.innerHTML = `
      ${i18n.t('ui.gizmo.positionLabel')}:
      <b>X:${pos.x.toFixed(1)}</b>
      <b>Y:${pos.y.toFixed(1)}</b>
      <b>Z:${pos.z.toFixed(1)}</b>
      <b>∠${rotDeg}°</b>
    `;
  }

  /**
   * Called each frame from `BoardStage.tick(dt)` to keep gizmo scale & position synchronized.
   */
  update() {
    if (this.selectedComponent) {
      // Verify selected component is still registered in the scene
      if (!this.registry.getInstance(this.selectedComponent.id)) {
        this.selectComponent(null);
        return;
      }
      const zoom = this.cameraController?.view?.zoom || 1.15;
      const scale = Math.min(1.35, Math.max(0.75, 1.05 / Math.sqrt(zoom)));
      this.gizmo.group.scale.setScalar(scale);
      this.gizmo.syncTransform();
    }
    this.pinHudOverlay?.update();
  }

  /**
   * Builds a structured ReactFlow-style Node Handle Inspector snapshot for a component.
   * @param {import('../../core/components/HardwareComponent.js').HardwareComponent} [comp]
   */
  getHandleInspectorSnapshot(comp = this.selectedComponent) {
    if (!comp) return null;
    const allPins = typeof comp.getElectricalPins === 'function' ? comp.getElectricalPins() : [];
    const handles = allPins.slice(0, 14).map((ePin) => {
      const voltage = Number(ePin.voltage ?? ePin.sensedVoltage ?? ePin.drivenVoltage ?? 0);
      const logicLevel = voltage >= 2.0 ? 1 : 0;
      const high = logicLevel === 1;
      const dir = String(ePin.direction || 'IO').toUpperCase();
      return {
        name: ePin.pinName,
        pinName: ePin.pinName,
        endpointId: ePin.endpointId,
        direction: dir,
        role: ePin.role || 'SIGNAL',
        protocol: ePin.protocol || 'GPIO',
        voltage: Number(voltage.toFixed(2)),
        logicLevel,
        high,
        pwmDuty: Number((ePin.pwmDuty ?? (high ? 1 : 0)).toFixed(2))
      };
    });

    return {
      componentId: comp.id,
      typeId: comp.typeId,
      isEnvironmentProp: Boolean(comp.isEnvironmentProp || allPins.length === 0),
      obstacleProfile: comp.obstacleProfile || null,
      totalPinCount: allPins.length,
      handles,
      state: { ...(comp.state || {}) },
      lastEvaluationResult: comp.lastEvaluationResult || null,
      lastEvaluationError: comp.lastEvaluationError || null
    };
  }

  renderHud() {
    if (!this.hudEl) return;
    if (!this.selectedComponent) {
      this.hudEl.hidden = true;
      this.hudEl.innerHTML = '';
      return;
    }

    this.hudEl.hidden = false;
    const comp = this.selectedComponent;
    const pos = comp.group.position;
    const rotDeg = Math.round(((comp.group.rotation.y * RAD_TO_DEG) % 360 + 360) % 360);
    const snapState = this.snapEnabled
      ? i18n.t('ui.flyout.stateOn')
      : i18n.t('ui.flyout.stateOff');
    const axesState = this.gizmo.axesVisible
      ? i18n.t('ui.flyout.stateOn')
      : i18n.t('ui.flyout.stateOff');
    const step = this.snapEnabled ? this.gridSnapStep : 2.0;
    const isPrimaryHost = comp.id.startsWith('main.');
    const wireCount = this.wireTool ? this.wireTool.getComponentWireCount(comp.id) : 0;
    const snapBind = comp.snappedBreadboardBinding;
    const inspectorSnap = this.getHandleInspectorSnapshot(comp);

    // Build compatible target component list so the selected component can be wired to ANY stage component in 1 click
    const existingConns = this.wireTool ? this.wireTool.getConnections() : [];
    const targetCandidates = [];
    for (const other of this._getStageComponents()) {
      if (!other || other.id === comp.id || other.typeId === 'wire.jumper' || other.typeId === 'passive.wire') continue;
      const match = SmartPinMatcher.findBestPinMatch(comp, other, existingConns);
      if (match) {
        targetCandidates.push({ comp: other, match });
      }
    }

    const handleInspectorHtml = inspectorSnap
      ? inspectorSnap.isEnvironmentProp
        ? `<div class="gizmo-handle-inspector is-prop" data-role="node-handle-inspector">
            <span class="gizmo-handle-title">🧱 ${i18n.t('ui.gizmo.propInspectorTitle', {}, '0-Pin Stage Obstacle / Prop')}</span>
            <span class="gizmo-handle-meta">
              r=${Number(inspectorSnap.obstacleProfile?.boundingRadiusCm ?? 4).toFixed(1)}cm ·
              refl=${Math.round(Number(inspectorSnap.obstacleProfile?.reflectivity ?? 0.92) * 100)}%
            </span>
          </div>`
        : `<div class="gizmo-handle-inspector" data-role="node-handle-inspector">
            <div class="gizmo-handle-head">
              <span class="gizmo-handle-title">⚡ ${i18n.t('ui.gizmo.handleInspectorTitle', {}, 'Node Handles (Live I/O)')}</span>
              <span class="gizmo-handle-state-pill ${comp.state?.active || comp.state?.energized ? 'is-high' : 'is-low'}">
                ${comp.state?.active || comp.state?.energized ? 'ACTIVE' : 'IDLE'}
                ${comp.state?.currentMa ? ` · ${Number(comp.state.currentMa).toFixed(1)}mA` : ''}
              </span>
            </div>
            <div class="gizmo-handle-list">
              ${inspectorSnap.handles
                .map(
                  (h) => `
                  <button
                    type="button"
                    class="gizmo-handle-chip ${h.high ? 'is-high' : 'is-low'}"
                    data-handle-pin="${h.pinName}"
                    data-test-toggle-pin="${h.pinName}"
                    title="${h.pinName} (${h.direction} · ${h.protocol}) — Click to toggle test signal (5V/0V)"
                  >
                    <span class="gizmo-handle-dir">${h.direction}</span>
                    <strong class="gizmo-handle-name">${h.pinName}</strong>
                    <code class="gizmo-handle-v">${h.voltage.toFixed(1)}V</code>
                    <span class="gizmo-handle-logic">${h.high ? 'HIGH' : 'LOW'}</span>
                  </button>
                `
                )
                .join('')}
            </div>
          </div>`
      : '';

    this.hudEl.innerHTML = `
      ${
        this.isQuickConnectMode
          ? `<div class="gizmo-quick-banner" role="status">
              <span class="gizmo-quick-pulse"></span>
              <span>${i18n.t('stage.wiring.quick_connect_active', { source: comp.id })}</span>
              ${
                this.lastSmartConnectedPair
                  ? `<strong style="margin-left:6px;color:#047857;">${i18n.t('stage.wiring.smart_connect_paired', this.lastSmartConnectedPair)}</strong>`
                  : ''
              }
            </div>`
          : ''
      }
      <div class="gizmo-hud-head">
        <span class="gizmo-hud-badge">✥ ${i18n.t('ui.gizmo.hudTitle')}</span>
        <strong class="gizmo-hud-name">${comp.name || comp.constructor.displayName}</strong>
        <code class="gizmo-hud-id">${comp.id}</code>
        ${
          snapBind && snapBind.snapped
            ? `<span class="gizmo-magnet-badge" data-breadboard-snap="${snapBind.breadboardId}">
                🧲 ${i18n.t('stage.wiring.magnet_snapped', { pins: snapBind.summary })}
              </span>`
            : ''
        }
        <span class="gizmo-hud-coords">
          ${i18n.t('ui.gizmo.positionLabel')}:
          <b>X:${pos.x.toFixed(1)}</b>
          <b>Y:${pos.y.toFixed(1)}</b>
          <b>Z:${pos.z.toFixed(1)}</b>
          <b>∠${rotDeg}°</b>
        </span>
      </div>
      ${
        targetCandidates.length > 0
          ? `<div class="gizmo-target-strip" role="group" aria-label="${i18n.t('stage.wiring.connect_to_label')}">
              <span class="gizmo-target-label">🔌 ${i18n.t('stage.wiring.connect_to_label')}:</span>
              <div class="gizmo-target-chips">
                ${targetCandidates
                  .map(
                    ({ comp: tComp, match }) => `
                      <button
                        type="button"
                        class="gizmo-target-chip"
                        data-quick-target-id="${tComp.id}"
                        title="${tComp.name || tComp.constructor.displayName} (${match.sourcePin.pinName} → ${match.targetPin.pinName})"
                      >
                        <span class="gizmo-target-dot" style="background:${match.color}"></span>
                        <span class="gizmo-target-name">+ ${tComp.name || tComp.constructor.displayName}</span>
                        <code class="gizmo-target-pins">${match.sourcePin.pinName}→${match.targetPin.pinName}</code>
                      </button>
                    `
                  )
                  .join('')}
              </div>
            </div>`
          : ''
      }
      ${handleInspectorHtml}
      <div class="gizmo-hud-actions">
        ${
          typeof comp.toggle === 'function'
            ? `<button type="button" class="gizmo-btn ${comp.state?.pressed ? 'is-active' : ''}" data-gizmo-act="toggle-button" style="border-color:#059669;font-weight:700;">
                🔘 ${comp.state?.pressed ? 'BASILI (HIGH) — Bırak' : 'BIRAKILDI (LOW) — Bas'}
              </button>
              <span class="gizmo-hud-sep" aria-hidden="true"></span>`
            : ''
        }
        ${
          typeof comp.setValue === 'function'
            ? `<label class="gizmo-btn" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">
                <span>🎚️ ${Number(comp.state?.value ?? 0)} ${comp.state?.unit || ''}</span>
                <input
                  type="range"
                  data-gizmo-act="sensor-slider"
                  min="${Number(comp.state?.minValue ?? 0)}"
                  max="${Number(comp.state?.maxValue ?? 1023)}"
                  step="1"
                  value="${Number(comp.state?.value ?? 0)}"
                  style="width:76px;accent-color:#059669;"
                />
              </label>
              <span class="gizmo-hud-sep" aria-hidden="true"></span>`
            : ''
        }
        <button type="button" class="gizmo-btn gizmo-btn-connect ${this.isQuickConnectMode ? 'is-active' : ''}" data-gizmo-act="quick-connect">
          ${i18n.t('stage.wiring.smart_connect')}
        </button>
        <button type="button" class="gizmo-btn gizmo-btn-disconnect" data-gizmo-act="disconnect-wires" ${wireCount === 0 ? 'disabled' : ''}>
          🔗̸ ${i18n.t('stage.wiring.disconnect_all')}
          <span class="gizmo-wire-badge">${wireCount}</span>
        </button>
        <span class="gizmo-hud-sep" aria-hidden="true"></span>
        <button type="button" class="gizmo-btn gizmo-btn-x" data-gizmo-act="x-neg" title="X -">◀ X</button>
        <button type="button" class="gizmo-btn gizmo-btn-x" data-gizmo-act="x-pos" title="X +">X ▶</button>
        <button type="button" class="gizmo-btn gizmo-btn-z" data-gizmo-act="z-neg" title="Z -">▲ Z</button>
        <button type="button" class="gizmo-btn gizmo-btn-z" data-gizmo-act="z-pos" title="Z +">Z ▼</button>
        <button type="button" class="gizmo-btn gizmo-btn-y" data-gizmo-act="y-pos" title="Y +">↑ Y</button>
        <button type="button" class="gizmo-btn gizmo-btn-y" data-gizmo-act="y-neg" title="Y -">↓ Y</button>
        <button type="button" class="gizmo-btn gizmo-btn-rot" data-gizmo-act="rot-45">
          ↻ ${i18n.t('ui.gizmo.rotate45')}
        </button>
        <button type="button" class="gizmo-btn ${this.snapEnabled ? 'is-active' : ''}" data-gizmo-act="toggle-snap">
          ⊞ ${i18n.t('ui.gizmo.snapToggle', { state: snapState })}
        </button>
        <button type="button" class="gizmo-btn ${this.gizmo.axesVisible ? 'is-active' : ''}" data-gizmo-act="toggle-axes">
          🧭 ${i18n.t('ui.gizmo.axesToggle', { state: axesState })}
        </button>
        <button type="button" class="gizmo-btn" data-gizmo-act="duplicate">
          ⧉ ${i18n.t('ui.gizmo.duplicate')}
        </button>
        <button type="button" class="gizmo-btn gizmo-btn-danger" data-gizmo-act="delete">
          🗑 ${i18n.t('ui.gizmo.delete')}
        </button>
        <button type="button" class="gizmo-btn gizmo-btn-close" data-gizmo-act="deselect" title="${i18n.t('ui.gizmo.deselect')}">
          ✕
        </button>
      </div>
    `;

    this.hudEl.querySelectorAll?.('[data-quick-target-id]')?.forEach((chipBtn) => {
      const targetId = chipBtn.getAttribute('data-quick-target-id');
      chipBtn.addEventListener('mouseenter', () => {
        const targetComp = this.registry?.getInstance(targetId);
        if (targetComp && this.pinHudOverlay) {
          this.pinHudOverlay.setQuickConnectSourceComponent(comp);
          this.pinHudOverlay.setHoveredComponent(targetComp);
        }
      });
      chipBtn.addEventListener('mouseleave', () => {
        if (this.pinHudOverlay) {
          if (!this.isQuickConnectMode) {
            this.pinHudOverlay.setQuickConnectSourceComponent(null);
          }
          this.pinHudOverlay.setHoveredComponent(null);
        }
      });
      chipBtn.addEventListener('click', () => {
        if (targetId) {
          this.quickConnectTo(targetId);
        }
      });
    });

    this.hudEl.querySelectorAll?.('[data-test-toggle-pin]')?.forEach((pinBtn) => {
      pinBtn.addEventListener('click', () => {
        const pinName = pinBtn.getAttribute('data-test-toggle-pin');
        if (!pinName || !this.selectedComponent) return;
        const pin = this.selectedComponent.getPin?.(pinName);
        if (!pin) return;
        const currentV = Number(pin.voltage || 0);
        const nextV = currentV >= 2.5 ? 0.0 : 5.0;
        const dir = String(pin.direction || '').toLowerCase();
        if (dir === 'output' || dir === 'power' || dir === 'pwm' || dir === 'bidirectional' || dir === 'io') {
          pin.driveVoltage?.(nextV);
        } else {
          pin.sensedVoltage = nextV;
        }
        this.onComponentTransformed?.(this.selectedComponent);
        this.renderHud();
      });
    });

    this.hudEl.querySelector?.('[data-gizmo-act="toggle-button"]')?.addEventListener('click', () => {
      if (this.selectedComponent && typeof this.selectedComponent.toggle === 'function') {
        this.selectedComponent.toggle();
        this.onComponentTransformed?.(this.selectedComponent);
        this.renderHud();
      }
    });
    this.hudEl.querySelector?.('[data-gizmo-act="sensor-slider"]')?.addEventListener('input', (ev) => {
      if (this.selectedComponent && typeof this.selectedComponent.setValue === 'function') {
        this.selectedComponent.setValue(Number(ev.target.value));
        this.onComponentTransformed?.(this.selectedComponent);
      }
    });
    this.hudEl.querySelector?.('[data-gizmo-act="sensor-slider"]')?.addEventListener('change', () => {
      this.renderHud();
    });
    this.hudEl.querySelector?.('[data-gizmo-act="quick-connect"]')?.addEventListener('click', () => {
      this.toggleQuickConnect();
    });
    this.hudEl.querySelector?.('[data-gizmo-act="disconnect-wires"]')?.addEventListener('click', () => {
      this.disconnectSelectedWires();
    });
    this.hudEl.querySelector?.('[data-gizmo-act="x-neg"]')?.addEventListener('click', () => {
      this.translateSelected(-step, 0, 0);
    });
    this.hudEl.querySelector?.('[data-gizmo-act="x-pos"]')?.addEventListener('click', () => {
      this.translateSelected(step, 0, 0);
    });
    this.hudEl.querySelector?.('[data-gizmo-act="z-neg"]')?.addEventListener('click', () => {
      this.translateSelected(0, 0, -step);
    });
    this.hudEl.querySelector?.('[data-gizmo-act="z-pos"]')?.addEventListener('click', () => {
      this.translateSelected(0, 0, step);
    });
    this.hudEl.querySelector?.('[data-gizmo-act="y-pos"]')?.addEventListener('click', () => {
      this.translateSelected(0, step, 0);
    });
    this.hudEl.querySelector?.('[data-gizmo-act="y-neg"]')?.addEventListener('click', () => {
      this.translateSelected(0, -step, 0);
    });
    this.hudEl.querySelector?.('[data-gizmo-act="rot-45"]')?.addEventListener('click', () => {
      this.rotateSelectedBy(45);
    });
    this.hudEl.querySelector?.('[data-gizmo-act="toggle-snap"]')?.addEventListener('click', () => {
      this.toggleSnap();
    });
    this.hudEl.querySelector?.('[data-gizmo-act="toggle-axes"]')?.addEventListener('click', () => {
      this.toggleGizmoAxes();
    });
    this.hudEl.querySelector?.('[data-gizmo-act="duplicate"]')?.addEventListener('click', () => {
      this.duplicateSelected();
    });
    this.hudEl.querySelector?.('[data-gizmo-act="delete"]')?.addEventListener('click', () => {
      this.deleteSelected();
    });
    this.hudEl.querySelector?.('[data-gizmo-act="deselect"]')?.addEventListener('click', () => {
      this.selectComponent(null);
    });
  }

  /**
   * Disposes gizmo state and detaches active selection.
   */
  destroy() {
    this.selectComponent(null);
    if (this.scene && this.gizmo?.group) {
      this.scene.remove(this.gizmo.group);
    }
  }
}
