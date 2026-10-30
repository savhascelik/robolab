import * as THREE from 'three';
import { i18n } from '../../core/i18n/I18nService.js';
import { hardwareRegistry } from '../../core/registry/ComponentRegistry.js';
import {
  DynamicComponentBuilder,
  PBR_MATERIAL_PRESETS
} from '../../core/components/DynamicComponentBuilder.js';

export const STUDIO_TEMPLATES = Object.freeze({
  logic_inverter_gate: {
    typeId: 'custom.logic_inverter_gate',
    name: 'NOT Mantık Evirici Kapısı (74HC04 Modülü)',
    nameTr: 'NOT Mantık Evirici Kapısı (74HC04 Modülü)',
    nameEn: 'NOT Logic Inverter Gate (74HC04 Module)',
    category: 'custom',
    isEnvironmentProp: false,
    summary: '4-Pin Mantık Evirici Modülü: IN DÜŞÜK (0V) -> OUT YÜKSEK (5.0V), IN YÜKSEK (5V) -> OUT DÜŞÜK (0.0V)',
    summaryTr: '4-Pin Mantık Evirici Modülü: IN DÜŞÜK (0V) -> OUT YÜKSEK (5.0V), IN YÜKSEK (5V) -> OUT DÜŞÜK (0.0V)',
    summaryEn: '4-Pin Logic Inverter Module: IN LOW (0V) -> OUT HIGH (5.0V), IN HIGH (5V) -> OUT LOW (0.0V)',
    description:
      'FR4 devre kartı, üst yüzeyde DIP-8 entegre çip gövdesi, durum LED göstergesi ve giriş sinyalini tersleyen dijital çıkış devresi.',
    descriptionTr:
      'FR4 devre kartı, üst yüzeyde DIP-8 entegre çip gövdesi, durum LED göstergesi ve giriş sinyalini tersleyen dijital çıkış devresi.',
    descriptionEn:
      'Custom digital hardware module with FR4 PCB, DIP-8 epoxy IC package attached on top, emissive output LED, and live inverter signal logic.',
    dimensions: { width: 14, height: 1.6, depth: 11 },
    pcbColor: 0x065f46,
    parts: [
      {
        id: 'pcb_base',
        primitive: 'rounded_box',
        size: [14, 1.6, 11],
        radius: 0.4,
        position: [0, 0.8, 0],
        materialPreset: 'fr4_pcb'
      },
      {
        id: 'dip_ic',
        primitive: 'rounded_box',
        size: [7.6, 1.8, 5.2],
        radius: 0.2,
        attach: { to: 'pcb_base', side: 'top', gap: 0 },
        materialPreset: 'ic_epoxy'
      },
      {
        id: 'status_led',
        primitive: 'capsule',
        size: [1.3, 1.8, 1.3],
        attach: { to: 'pcb_base', side: 'top', gap: 0, offset: [4.6, 0, 0] },
        materialPreset: 'frosted_led',
        color: 0x10b981,
        partRole: 'emissive'
      }
    ],
    pins: [
      { name: 'VCC', direction: 'power', edge: 'bottom', nominalVoltage: 5.0 },
      { name: 'GND', direction: 'ground', edge: 'bottom', nominalVoltage: 0.0 },
      { name: 'IN', direction: 'input', edge: 'left', nominalVoltage: 5.0 },
      { name: 'OUT', direction: 'output', edge: 'right', nominalVoltage: 5.0 }
    ],
    dipoles: [{ positivePin: 'VCC', negativePin: 'GND', resistanceOhms: 470, loadType: 'sensor' }],
    evaluateScript: `const inHigh = Boolean(pins.IN?.high || (pins.IN?.voltage ?? 0) >= 2.5);
const outV = inHigh ? 0.0 : 5.0;
return {
  outputs: {
    OUT: { voltage: outV, logicLevel: outV >= 2.5 ? 1 : 0 }
  },
  state: {
    active: outV >= 2.5,
    statusText: inHigh ? 'IN=HIGH → OUT=LOW' : 'IN=LOW → OUT=HIGH'
  }
};`
  },
  threshold_sensor_node: {
    typeId: 'custom.threshold_sensor_node',
    name: 'Akıllı Kızılötesi / Gaz Eşik Sensörü Modülü',
    nameTr: 'Akıllı Kızılötesi / Gaz Eşik Sensörü Modülü',
    nameEn: 'Smart IR / Gas Threshold Sensor Module',
    category: 'sensors',
    isEnvironmentProp: false,
    summary: '4-Pin 2.54mm Sensör Modülü: Alüminyum Algılama Yuvası, Uyarı LED\'i & Dijital/Analog Çıkış (DO/AO)',
    summaryTr: '4-Pin 2.54mm Sensör Modülü: Alüminyum Algılama Yuvası, Uyarı LED\'i & Dijital/Analog Çıkış (DO/AO)',
    summaryEn: '4-Pin 2.54mm Header Sensor Module with Shroud Tube, Alert LED & Digital/Analog Output (DO/AO)',
    description:
      '2.54mm standart pin dizilimi, üst yüzeyde silindirik algılama haznesi, ışıklı durum LED\'i ve mesafe/eşik değerine göre DO/AO üreten sensör kartı.',
    descriptionTr:
      '2.54mm standart pin dizilimi, üst yüzeyde silindirik algılama haznesi, ışıklı durum LED\'i ve mesafe/eşik değerine göre DO/AO üreten sensör kartı.',
    descriptionEn:
      'Custom sensor module built with 2.54mm pin header row, tubular sensing chamber attached on top, and DO/AO threshold output driver.',
    dimensions: { width: 14, height: 1.6, depth: 12 },
    pcbColor: 0x0f766e,
    parts: [
      {
        id: 'pcb_base',
        primitive: 'rounded_box',
        size: [14, 1.6, 12],
        radius: 0.35,
        position: [0, 0.8, 0],
        materialPreset: 'fr4_pcb_teal'
      },
      {
        id: 'sensor_shroud',
        primitive: 'tube',
        size: [5.4, 3.2, 5.4],
        innerRadius: 1.9,
        attach: { to: 'pcb_base', side: 'top', gap: 0, offset: [0, 0, -1.2] },
        materialPreset: 'brushed_aluminum'
      },
      {
        id: 'alert_led',
        primitive: 'sphere',
        size: [1.6, 1.6, 1.6],
        attach: { to: 'pcb_base', side: 'top', gap: 0, offset: [4.5, 0, 2.5] },
        materialPreset: 'frosted_led',
        color: 0x22c55e,
        partRole: 'emissive'
      }
    ],
    pins: [],
    pinGenerator: {
      prefix: 'P',
      count: 4,
      edge: 'bottom',
      pitchMm: 2.54,
      labels: ['VCC', 'GND', 'DO', 'AO'],
      directions: ['power', 'ground', 'output', 'analog']
    },
    dipoles: [{ positivePin: 'VCC', negativePin: 'GND', resistanceOhms: 330, loadType: 'sensor' }],
    evaluateScript: `const vcc = Number(pins.VCC?.voltage ?? 5.0);
const distCm = Number(stageEnv?.nearestObstacleCm ?? state.distanceCm ?? 25);
const powered = (vcc >= 3.0 || Boolean(report?.closedLoop)) && distCm <= 45;
const doVoltage = powered ? 5.0 : 0.0;
return {
  outputs: {
    DO: { voltage: doVoltage, logicLevel: powered ? 1 : 0 },
    AO: { voltage: powered ? 3.3 : 0.0, logicLevel: powered ? 1 : 0 }
  },
  state: {
    active: powered,
    distanceCm: distCm,
    statusText: powered ? 'DO=HIGH (5.0V)' : 'STANDBY'
  }
};`
  },
  rotor_fan_module: {
    typeId: 'custom.rotor_fan_module',
    name: '5V Fırçasız Soğutma Fanı Modülü',
    nameTr: '5V Fırçasız Soğutma Fanı Modülü',
    nameEn: '5V Brushless Cooling Fan Module',
    category: 'motors',
    isEnvironmentProp: false,
    summary: '5V Soğutma Fanı Modülü: Besleme verildiğinde dönen rotor kanatları (2400 RPM)',
    summaryTr: '5V Soğutma Fanı Modülü: Besleme verildiğinde dönen rotor kanatları (2400 RPM)',
    summaryEn: '5V Cooling Fan Module with spinning rotor blades when energized in closed loop',
    description:
      'Mat plastik dış kasa, merkez rotor göbeği ve akım geçtiğinde fiziksel olarak dönen alüminyum fan kanatlarına sahip elektromekanik aktüatör.',
    descriptionTr:
      'Mat plastik dış kasa, merkez rotor göbeği ve akım geçtiğinde fiziksel olarak dönen alüminyum fan kanatlarına sahip elektromekanik aktüatör.',
    descriptionEn:
      'Custom electromechanical actuator with matte plastic shroud, central rotor hub, and rotor blades that spin when current flows.',
    dimensions: { width: 15, height: 2.0, depth: 15 },
    pcbColor: 0x1e293b,
    parts: [
      {
        id: 'fan_frame',
        primitive: 'rounded_box',
        size: [15, 2.0, 15],
        radius: 0.5,
        position: [0, 1.0, 0],
        materialPreset: 'matte_plastic'
      },
      {
        id: 'rotor_hub',
        primitive: 'cylinder',
        size: [4.2, 1.8, 4.2],
        attach: { to: 'fan_frame', side: 'top', gap: 0.1 },
        materialPreset: 'ic_epoxy',
        partRole: 'rotor'
      },
      {
        id: 'rotor_blade_x',
        primitive: 'box',
        size: [11.5, 0.5, 1.8],
        attach: { to: 'rotor_hub', side: 'center', gap: 0 },
        materialPreset: 'brushed_aluminum',
        partRole: 'rotor'
      },
      {
        id: 'rotor_blade_z',
        primitive: 'box',
        size: [1.8, 0.5, 11.5],
        attach: { to: 'rotor_hub', side: 'center', gap: 0 },
        materialPreset: 'brushed_aluminum',
        partRole: 'rotor'
      }
    ],
    pins: [
      { name: 'VCC', direction: 'power', edge: 'bottom', nominalVoltage: 5.0 },
      { name: 'GND', direction: 'ground', edge: 'bottom', nominalVoltage: 0.0 }
    ],
    dipoles: [{ positivePin: 'VCC', negativePin: 'GND', resistanceOhms: 45, loadType: 'motor' }],
    evaluateScript: `const energized = Boolean((report?.closedLoop && report?.current > 0) || (pins.VCC?.voltage ?? 0) >= 3.0);
return {
  state: {
    active: energized,
    rpm: energized ? 2400 : 0
  }
};`
  },
  arena_barrier_prop: {
    typeId: 'custom.arena_barrier_prop',
    name: 'Ultrasonik / Sumo Parkur Engel Bariyeri (Pinsiz)',
    nameTr: 'Ultrasonik / Sumo Parkur Engel Bariyeri (Pinsiz)',
    nameEn: 'Ultrasonic / Sumo Arena Obstacle Barrier (No Pins)',
    category: 'props',
    isEnvironmentProp: true,
    obstacleProfile: {
      blocksUltrasonic: true,
      blocksInfrared: true,
      boundingRadiusCm: 5,
      reflectance: 0.92
    },
    summary: 'Pinsiz Fiziksel Sahne Engeli & Mesafe Sensörü Yansıtma Duvarı (Ultrasonik + Kızılötesi)',
    summaryTr: 'Pinsiz Fiziksel Sahne Engeli & Mesafe Sensörü Yansıtma Duvarı (Ultrasonik + Kızılötesi)',
    summaryEn: 'Physical Stage Obstacle & Sensor Reflection Wall (Ultrasonic + Infrared)',
    description:
      'Elektriksel pini olmayan 3B fiziksel sahne engeli. Fırçalanmış alüminyum gövde, kauçuk tamponlar ve simetrik yan dikmelerden oluşur; ultrasonik ve kızılötesi sensör ışınlarını yansıtır.',
    descriptionTr:
      'Elektriksel pini olmayan 3B fiziksel sahne engeli. Fırçalanmış alüminyum gövde, kauçuk tamponlar ve simetrik yan dikmelerden oluşur; ultrasonik ve kızılötesi sensör ışınlarını yansıtır.',
    descriptionEn:
      'Pure 3D physical stage obstacle with zero electrical pins. Uses brushed aluminum beam, repeat bumper pads, and mirrored side posts.',
    dimensions: { width: 26, height: 8, depth: 5 },
    pcbColor: 0x475569,
    parts: [
      {
        id: 'barrier_beam',
        primitive: 'rounded_box',
        size: [26, 6.5, 4.2],
        radius: 0.5,
        position: [0, 3.25, 0],
        materialPreset: 'brushed_aluminum'
      },
      {
        id: 'bumper_pads',
        primitive: 'box',
        size: [5.2, 2.2, 0.8],
        attach: { to: 'barrier_beam', side: 'front', gap: 0.05, offset: [-7, 0, 0] },
        materialPreset: 'rubber_tire',
        repeat: { count: 3, step: [7, 0, 0] }
      },
      {
        id: 'side_pillar',
        primitive: 'cylinder',
        size: [2.2, 8.0, 2.2],
        position: [11.5, 4.0, 0],
        materialPreset: 'gold_pin',
        mirror: { axis: 'x' }
      }
    ],
    pins: [],
    dipoles: []
  }
});

/**
 * On-Demand Component Palette, Custom Component Studio & Live Datasheet Synthesizer Popover (`#popover-root`)
 * with Right-Side 360° 3D Turntable Preview Stage.
 */
export class ComponentPalettePopover {
  /**
   * @param {object} options
   * @param {HTMLElement|null} [options.rootEl]
   * @param {import('../../core/registry/ComponentRegistry.js').ComponentRegistry} [options.registry]
   * @param {object} [options.apiClient]
   * @param {(typeId: string, spec?: object) => any} [options.onSpawnComponent]
   * @param {(isOpen: boolean) => void} [options.onVisibilityChange]
   */
  constructor({
    rootEl = null,
    stage = null,
    registry = hardwareRegistry,
    apiClient = null,
    onSpawnComponent,
    onOpenFullStudio,
    onVisibilityChange
  } = {}) {
    this.rootEl =
      rootEl || (typeof document !== 'undefined' ? document.getElementById('popover-root') : null);
    this.stage = stage;
    this.registry = registry;
    this.apiClient = apiClient;
    this.onSpawnComponent =
      onSpawnComponent || ((typeId) => this.stage?.spawnIndependentComponent?.(typeId));
    this.onOpenFullStudio = onOpenFullStudio || null;
    this.onVisibilityChange = onVisibilityChange;

    this.isOpen = false;
    this.activeTab = 'catalog'; // 'catalog' | 'studio' | 'datasheet'
    this.searchQuery = '';
    this.activeCategory = 'all';
    this.datasheetCode = 'BME280';
    this.isSynthesizing = false;
    this.lastSynthesizedSpec = null;

    // Custom Component Studio state
    this.studioPresetKey = 'logic_inverter_gate';
    this.studioDraft = this._cloneSpec(STUDIO_TEMPLATES.logic_inverter_gate);
    this.studioError = null;
    this.studioSavedMessage = null;

    // 3D Turntable Preview state
    this.previewTypeId = 'board.arduino_uno';
    this.previewComponent = null;
    this.turntableAngle = 0.45;
    this.turntableSpeedRadPerSec = 0.65;
    this._isDraggingTurntable = false;
    this._dragLastX = 0;
    this._rafId = null;
    this._lastFrameTimeMs = 0;

    this._previewScene = null;
    this._previewCamera = null;
    this._previewPivot = null;
    this._previewHolder = null;
    this._previewRenderer = null;
    this._previewCanvas = null;

    this._ensurePreviewScene();

    this._unsubLocale = i18n.onChange(() => this.render());
    this.render();
  }

  _cloneSpec(spec) {
    return JSON.parse(JSON.stringify(spec || STUDIO_TEMPLATES.logic_inverter_gate));
  }

  mount() {
    this.render();
    return this;
  }

  open(tab = null) {
    if (tab === 'catalog' || tab === 'studio' || tab === 'datasheet') {
      this.activeTab = tab;
    }
    this.isOpen = true;
    this.render();
    this.onVisibilityChange?.(true);
    return this.isOpen;
  }

  close() {
    this.isOpen = false;
    this._stopPreviewLoop();
    this.render();
    this.onVisibilityChange?.(false);
    return this.isOpen;
  }

  toggle() {
    return this.isOpen ? this.close() : this.open();
  }

  setSearchQuery(query = '') {
    this.searchQuery = String(query || '');
    this.render();
  }

  /**
   * Loads one of the built-in Custom Component Studio presets (`logic_inverter_gate`,
   * `threshold_sensor_node`, `rotor_fan_module`, `arena_barrier_prop`).
   * @param {string} presetKey
   */
  loadStudioPreset(presetKey) {
    const tpl = STUDIO_TEMPLATES[presetKey];
    if (!tpl) return null;
    this.studioPresetKey = presetKey;
    this.studioDraft = this._cloneSpec(tpl);
    this.studioError = null;
    this.studioSavedMessage = null;
    if (this.activeTab === 'studio') {
      this.setPreviewCustomSpec(this.studioDraft);
    }
    this.render();
    return this.studioDraft;
  }

  /**
   * Updates the active Studio draft spec and refreshes the live 3D turntable preview.
   * @param {object} partialOrFullSpec
   */
  setStudioDraft(partialOrFullSpec = {}) {
    if (!partialOrFullSpec || typeof partialOrFullSpec !== 'object') return this.studioDraft;
    this.studioDraft = {
      ...this.studioDraft,
      ...this._cloneSpec(partialOrFullSpec)
    };
    this.studioError = null;
    if (this.activeTab === 'studio') {
      this.setPreviewCustomSpec(this.studioDraft);
    }
    return this.studioDraft;
  }

  /**
   * Builds an ephemeral `HardwareComponent` from a custom Studio spec and mounts it on the 3D turntable
   * WITHOUT registering it in `ComponentRegistry` until the user saves.
   * @param {object} spec
   */
  setPreviewCustomSpec(spec = this.studioDraft) {
    try {
      this._ensurePreviewScene();
      const normalized = DynamicComponentBuilder.normalizeSpec(spec);
      const CompClass = DynamicComponentBuilder.buildComponentClass(normalized);
      this._disposePreviewComponent();

      const comp = new CompClass({ id: '__studio_preview__' });
      this.previewComponent = comp;
      this.previewTypeId = normalized.typeId;

      const holder = new THREE.Group();
      holder.add(comp.group);
      comp.group.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(comp.group);
      if (Number.isFinite(box.min.x) && Number.isFinite(box.max.x)) {
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 1);
        const targetSpan = 25.5;
        const scale = targetSpan / maxDim;

        comp.group.position.set(-center.x, -center.y, -center.z);
        holder.scale.setScalar(scale);
      }

      this._previewHolder = holder;
      this._previewPivot.add(holder);
      this._previewPivot.rotation.y = this.turntableAngle;
      this._renderPreviewFrame();
      this.studioError = null;
      return comp;
    } catch (err) {
      this.studioError = err?.message || String(err);
      return null;
    }
  }

  /**
   * Saves the Studio component into `ComponentRegistry`, persists via `apiClient.saveCustomComponent`
   * (if available), and spawns an instance on the 3D stage.
   * @param {object|null} [customSpec]
   */
  async saveAndSpawnStudioComponent(customSpec = null) {
    const specToSave = customSpec || this.studioDraft;
    try {
      const registered = DynamicComponentBuilder.registerFromSpec(specToSave, this.registry);
      this.studioDraft = this._cloneSpec(registered.spec);
      this.lastSynthesizedSpec = registered.spec;
      this.previewTypeId = registered.typeId;
      this.studioError = null;
      this.studioSavedMessage = `${registered.spec.name} (${registered.typeId})`;

      if (this.apiClient && typeof this.apiClient.saveCustomComponent === 'function') {
        try {
          await this.apiClient.saveCustomComponent(registered.spec);
        } catch {
          // Offline / local fallback handled inside BackendApiClient
        }
      }

      this.render();
      const spawned = this.onSpawnComponent?.(registered.typeId, registered.spec);
      return {
        ok: true,
        typeId: registered.typeId,
        spec: registered.spec,
        ComponentClass: registered.ComponentClass,
        instance: spawned || null
      };
    } catch (err) {
      this.studioError = err?.message || String(err);
      this.render();
      throw err;
    }
  }

  /**
   * Initializes the lightweight Three.js preview scene, studio lighting, and turntable pivot.
   * Safe to run in both browser and headless Node.js test environments.
   */
  _ensurePreviewScene() {
    if (this._previewScene) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 280 / 185, 0.1, 500);
    camera.position.set(0, 17, 36);
    camera.lookAt(0, 0.5, 0);

    const hemiLight = new THREE.HemisphereLight(0xf8fafc, 0x1e293b, 1.35);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.55);
    keyLight.position.set(28, 42, 34);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x10b981, 0.65);
    rimLight.position.set(-26, 18, -24);
    scene.add(rimLight);

    const ringGeo = new THREE.RingGeometry(10.8, 11.3, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = -7.8;
    scene.add(ringMesh);

    const discGeo = new THREE.CircleGeometry(10.8, 48);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.42
    });
    const discMesh = new THREE.Mesh(discGeo, discMat);
    discMesh.rotation.x = -Math.PI / 2;
    discMesh.position.y = -7.85;
    scene.add(discMesh);

    const pivot = new THREE.Group();
    pivot.name = 'CatalogTurntablePivot';
    pivot.rotation.y = this.turntableAngle;
    scene.add(pivot);

    this._previewScene = scene;
    this._previewCamera = camera;
    this._previewPivot = pivot;
  }

  /**
   * Disposes the currently mounted preview component's 3D meshes without touching `ComponentRegistry`.
   */
  _disposePreviewComponent() {
    if (this._previewHolder && this._previewPivot) {
      this._previewPivot.remove(this._previewHolder);
      this._previewHolder = null;
    }
    if (this.previewComponent) {
      try {
        this.previewComponent.dispose?.();
      } catch {
        // Ignore disposal errors
      }
      this.previewComponent = null;
    }
  }

  /**
   * Instantiates and frames the given `typeId` on the 3D turntable WITHOUT registering it in `this.registry.instancesById`.
   * @param {string} typeId
   */
  setPreviewComponent(typeId) {
    if (!typeId || !this.registry.has(typeId)) return null;
    this._ensurePreviewScene();

    if (this.previewTypeId === typeId && this.previewComponent && this.previewComponent.id === '__catalog_preview__') {
      this._highlightPreviewedCardDom(typeId);
      this._updatePreviewMetaDom();
      this._renderPreviewFrame();
      return this.previewComponent;
    }

    this.previewTypeId = typeId;
    this._disposePreviewComponent();

    const CompClass = this.registry.getClass(typeId);
    if (!CompClass) return null;

    const comp = new CompClass({ id: '__catalog_preview__' });
    this.previewComponent = comp;

    const holder = new THREE.Group();
    holder.add(comp.group);
    comp.group.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(comp.group);
    if (Number.isFinite(box.min.x) && Number.isFinite(box.max.x)) {
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 1);
      const targetSpan = 25.5;
      const scale = targetSpan / maxDim;

      comp.group.position.set(-center.x, -center.y, -center.z);
      holder.scale.setScalar(scale);
    }

    this._previewHolder = holder;
    this._previewPivot.add(holder);
    this._previewPivot.rotation.y = this.turntableAngle;

    this._highlightPreviewedCardDom(typeId);
    this._updatePreviewMetaDom();
    this._renderPreviewFrame();
    return comp;
  }

  /**
   * Advances the turntable angle by `dt` seconds (`0.65 rad/s` default) and renders one frame if open.
   * @param {number} [dt=0.016]
   */
  stepPreviewTurntable(dt = 0.016) {
    this._ensurePreviewScene();
    const safeDt = Math.min(Math.max(Number(dt) || 0, 0), 0.1);
    if (!this._isDraggingTurntable) {
      this.turntableAngle = (this.turntableAngle + safeDt * this.turntableSpeedRadPerSec) % (Math.PI * 2);
    }
    if (this._previewPivot) {
      this._previewPivot.rotation.y = this.turntableAngle;
    }
    if (this.previewComponent && typeof this.previewComponent.update === 'function') {
      try {
        this.previewComponent.update(safeDt, this.turntableAngle);
      } catch {
        // Ignore component update errors in preview
      }
    }
    this._renderPreviewFrame();
    return this.turntableAngle;
  }

  _ensurePreviewCanvasAndRenderer() {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      return null;
    }
    if (!this._previewCanvas) {
      const canvas = document.createElement('canvas');
      canvas.className = 'wb-preview-canvas';
      canvas.setAttribute('data-role', 'catalog-preview-canvas');
      canvas.width = 280;
      canvas.height = 185;

      canvas.addEventListener('pointerdown', (e) => {
        this._isDraggingTurntable = true;
        this._dragLastX = e.clientX;
        canvas.setPointerCapture?.(e.pointerId);
      });
      canvas.addEventListener('pointermove', (e) => {
        if (!this._isDraggingTurntable) return;
        const dx = e.clientX - this._dragLastX;
        this._dragLastX = e.clientX;
        this.turntableAngle += dx * 0.014;
        if (this._previewPivot) {
          this._previewPivot.rotation.y = this.turntableAngle;
        }
        this._renderPreviewFrame();
      });
      const stopDrag = () => {
        this._isDraggingTurntable = false;
      };
      canvas.addEventListener('pointerup', stopDrag);
      canvas.addEventListener('pointercancel', stopDrag);
      canvas.addEventListener('pointerleave', stopDrag);

      this._previewCanvas = canvas;
    }

    if (!this._previewRenderer) {
      try {
        const renderer = new THREE.WebGLRenderer({
          canvas: this._previewCanvas,
          antialias: true,
          alpha: true,
          powerPreference: 'low-power'
        });
        const dpr =
          typeof window !== 'undefined'
            ? Math.min(Math.max(window.devicePixelRatio || 1, 1.25), 2)
            : 1;
        renderer.setPixelRatio(dpr);
        renderer.setSize(280, 185, false);
        this._lastPreviewCssW = 280;
        this._lastPreviewCssH = 185;
        this._previewRenderer = renderer;
      } catch {
        this._previewRenderer = null;
      }
    }

    return this._previewCanvas;
  }

  _renderPreviewFrame() {
    if (!this._previewRenderer || !this._previewScene || !this._previewCamera) return;
    if (this._previewCanvas) {
      const rect = this._previewCanvas.getBoundingClientRect?.();
      if (rect && rect.width > 40 && rect.height > 40) {
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        if (this._lastPreviewCssW !== w || this._lastPreviewCssH !== h) {
          this._lastPreviewCssW = w;
          this._lastPreviewCssH = h;
          this._previewRenderer.setSize(w, h, false);
          this._previewCamera.aspect = w / h;
          this._previewCamera.updateProjectionMatrix();
        }
      }
    }
    this._previewRenderer.render(this._previewScene, this._previewCamera);
  }

  _startPreviewLoop() {
    if (this._rafId !== null) return;
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') return;

    this._lastFrameTimeMs =
      typeof performance !== 'undefined' ? performance.now() : Date.now();

    const tick = (nowMs) => {
      if (!this.isOpen || (this.activeTab !== 'catalog' && this.activeTab !== 'studio')) {
        this._rafId = null;
        return;
      }
      const dt = Math.min(Math.max((nowMs - this._lastFrameTimeMs) / 1000, 0.001), 0.064);
      this._lastFrameTimeMs = nowMs;
      this.stepPreviewTurntable(dt);
      this._rafId = window.requestAnimationFrame(tick);
    };

    this._rafId = window.requestAnimationFrame(tick);
  }

  _stopPreviewLoop() {
    if (this._rafId !== null && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(this._rafId);
    }
    this._rafId = null;
  }

  /**
   * Synthesizes a 3D hardware component from a part code (via backend `/api/v1/ai/datasheet`
   * or deterministic local fallback), registers it in `ComponentRegistry`, and spawns it on the stage.
   * @param {string} [partCode]
   */
  async synthesizeAndSpawn(partCode = this.datasheetCode) {
    const code = String(partCode || 'BME280').trim();
    if (!code) return null;

    this.datasheetCode = code;
    this.isSynthesizing = true;
    this.render();

    try {
      let spec = null;
      if (this.apiClient && typeof this.apiClient.synthesizeDatasheet === 'function') {
        try {
          spec = await this.apiClient.synthesizeDatasheet(code);
        } catch {
          spec = null;
        }
      }
      if (!spec || typeof spec !== 'object') {
        spec = DynamicComponentBuilder.synthesizeOfflineDatasheetSpec(code);
      }

      const registered = DynamicComponentBuilder.registerFromSpec(spec, this.registry);
      this.lastSynthesizedSpec = registered.spec;
      this.previewTypeId = registered.typeId;
      this.isSynthesizing = false;
      this.render();

      const spawned = this.onSpawnComponent?.(registered.typeId, registered.spec);
      return {
        typeId: registered.typeId,
        spec: registered.spec,
        instance: spawned || null
      };
    } catch (err) {
      this.isSynthesizing = false;
      this.render();
      throw err;
    }
  }

  _getCategories() {
    return [
      { id: 'all', label: i18n.t('workbench.palette.catAll') },
      { id: 'boards', label: i18n.t('workbench.palette.catBoards') },
      { id: 'sensors', label: i18n.t('workbench.palette.catSensors') },
      { id: 'motors', label: i18n.t('workbench.palette.catMotors') },
      { id: 'drivers', label: i18n.t('workbench.palette.catDrivers') },
      { id: 'power', label: i18n.t('workbench.palette.catPower') },
      { id: 'displays', label: i18n.t('workbench.palette.catDisplays') },
      { id: 'leds', label: i18n.t('workbench.palette.catLeds') },
      { id: 'buttons', label: i18n.t('workbench.palette.catButtons') },
      { id: 'passives', label: i18n.t('workbench.palette.catPassives') },
      { id: 'audio', label: i18n.t('workbench.palette.catAudio') },
      { id: 'robotics', label: i18n.t('workbench.palette.catChassis') },
      { id: 'robots', label: i18n.t('workbench.palette.catRobots') },
      { id: 'props', label: i18n.t('workbench.palette.catProps') },
      { id: 'custom', label: i18n.t('workbench.palette.catCustom') }
    ];
  }

  _renderCatalogGridMarkup(catalogItems) {
    return catalogItems
      .map((item) => {
        const isPreviewed = item.typeId === this.previewTypeId;
        return `
          <article
            class="wb-part-item ${isPreviewed ? 'is-previewed' : ''}"
            data-type-id="${item.typeId}"
            tabindex="0"
          >
            <div class="wb-part-top">
              <span class="wb-part-category">${item.category}</span>
              <button type="button" class="wb-btn wb-btn-sm wb-part-spawn-btn" data-spawn-type="${item.typeId}">
                ${i18n.t('workbench.palette.spawn_short_btn')}
              </button>
            </div>
            <div class="wb-part-meta">
              <strong class="wb-part-name" title="${item.name.replace(/"/g, '&quot;')}">${item.name}</strong>
              <span class="wb-part-summary">${item.summary || ''}</span>
              <span class="wb-part-id">${item.typeId}</span>
            </div>
          </article>
        `;
      })
      .join('');
  }

  _buildPreviewMetaMarkup() {
    if (this.activeTab === 'studio') {
      const draft = DynamicComponentBuilder.normalizeSpec(this.studioDraft);
      const pins = this.previewComponent?.getAllPins?.() || [];
      return `
        <div class="wb-preview-meta-top">
          <span class="wb-part-category">${draft.isEnvironmentProp ? '0-PIN PROP' : draft.category}</span>
          <span class="wb-part-id">${draft.typeId}</span>
        </div>
        <strong class="wb-preview-title" data-role="preview-name">${draft.name}</strong>
        <p class="wb-preview-desc" data-role="preview-summary">${draft.summary || draft.description || ''}</p>
        <div class="wb-preview-pins-block">
          <span class="wb-preview-pins-label">
            ${draft.isEnvironmentProp ? '🧱 0-Pin Sahne Nesnesi' : `${i18n.t('workbench.palette.previewPinsLabel')} (${pins.length})`} · ${draft.parts.length} Parça
          </span>
          <div class="wb-preview-pins-list" data-role="preview-pins">
            ${
              pins.length > 0
                ? pins.map((p) => `<span class="wb-preview-pin-chip">${p.name} (${p.direction})</span>`).join('')
                : `<span class="wb-preview-pin-chip">Ultrasonic/IR Obstacle</span>`
            }
          </div>
        </div>
        <button
          type="button"
          class="wb-btn wb-btn-primary wb-preview-spawn-cta"
          data-studio-act="save-and-spawn"
        >
          ${i18n.t('workbench.palette.studioSaveSpawnBtn')}
        </button>
      `;
    }

    const allCatalog = this.registry.getCatalog();
    const item =
      allCatalog.find((entry) => entry.typeId === this.previewTypeId) ||
      allCatalog[0] || {
        typeId: this.previewTypeId,
        category: 'boards',
        name: this.previewTypeId,
        summary: '',
        description: ''
      };

    const pins = this.previewComponent?.getAllPins?.() || [];
    const visiblePins = pins.slice(0, 6);
    const extraPinsCount = Math.max(0, pins.length - visiblePins.length);

    return `
      <div class="wb-preview-meta-top">
        <span class="wb-part-category">${item.category}</span>
        <span class="wb-part-id">${item.typeId}</span>
      </div>
      <strong class="wb-preview-title" data-role="preview-name">${item.name}</strong>
      <p class="wb-preview-desc" data-role="preview-summary">${item.description || item.summary || ''}</p>
      ${
        visiblePins.length > 0
          ? `
        <div class="wb-preview-pins-block">
          <span class="wb-preview-pins-label">${i18n.t('workbench.palette.previewPinsLabel')} (${pins.length})</span>
          <div class="wb-preview-pins-list" data-role="preview-pins">
            ${visiblePins
              .map(
                (p) => `<span class="wb-preview-pin-chip">${p.name}</span>`
              )
              .join('')}
            ${extraPinsCount > 0 ? `<span class="wb-preview-pin-chip wb-preview-pin-chip--more">+${extraPinsCount}</span>` : ''}
          </div>
        </div>
      `
          : ''
      }
      <button
        type="button"
        class="wb-btn wb-btn-primary wb-preview-spawn-cta"
        data-role="preview-spawn-btn"
        data-spawn-type="${item.typeId}"
      >
        ${i18n.t('workbench.palette.addStageBtn')}
      </button>
    `;
  }

  _renderStudioTabMarkup() {
    const draft = this.studioDraft || STUDIO_TEMPLATES.logic_inverter_gate;
    const isProp = Boolean(draft.isEnvironmentProp);
    const parts = Array.isArray(draft.parts) ? draft.parts : [];
    const pins = Array.isArray(draft.pins) ? draft.pins : [];
    const materialPresetNames = Object.keys(PBR_MATERIAL_PRESETS);

    return `
      <div class="wb-palette-body wb-palette-body--catalog wb-studio-body" data-role="custom-component-studio">
        <div class="wb-palette-catalog-col wb-studio-editor-col">
          <div class="wb-studio-head-card">
            <div class="wb-studio-head-top">
              <div>
                <strong class="wb-studio-title">${i18n.t('workbench.palette.studioTitle')}</strong>
                <p class="wb-studio-subtitle">${i18n.t('workbench.palette.studioDesc')}</p>
              </div>
              <div class="wb-studio-mode-switch" role="group" aria-label="Component Archetype">
                <button
                  type="button"
                  class="wb-chip-btn ${!isProp ? 'is-active' : ''}"
                  data-studio-mode="node"
                >${i18n.t('workbench.palette.studioModeNode')}</button>
                <button
                  type="button"
                  class="wb-chip-btn ${isProp ? 'is-active' : ''}"
                  data-studio-mode="prop"
                >${i18n.t('workbench.palette.studioModeProp')}</button>
              </div>
            </div>

            <div class="wb-studio-preset-row">
              <span class="wb-studio-preset-label">Hazır Şablonlar:</span>
              <button type="button" class="wb-chip-btn ${this.studioPresetKey === 'logic_inverter_gate' ? 'is-active' : ''}" data-studio-preset="logic_inverter_gate">
                ⚡ NOT Lojik Evirici (74HC04)
              </button>
              <button type="button" class="wb-chip-btn ${this.studioPresetKey === 'threshold_sensor_node' ? 'is-active' : ''}" data-studio-preset="threshold_sensor_node">
                📡 4-Pin Eşik Sensörü (2.54mm)
              </button>
              <button type="button" class="wb-chip-btn ${this.studioPresetKey === 'rotor_fan_module' ? 'is-active' : ''}" data-studio-preset="rotor_fan_module">
                🌀 5V Rotorlu Soğutucu Fan
              </button>
              <button type="button" class="wb-chip-btn ${this.studioPresetKey === 'arena_barrier_prop' ? 'is-active' : ''}" data-studio-preset="arena_barrier_prop">
                🧱 0-Pin Sumo/Sonar Engeli
              </button>
            </div>
          </div>

          <div class="wb-studio-form-grid">
            <label class="wb-studio-field">
              <span>Bileşen Adı</span>
              <input type="text" class="wb-input" data-studio-input="name" value="${String(draft.name || '').replace(/"/g, '&quot;')}" />
            </label>
            <label class="wb-studio-field">
              <span>Type ID (<code>custom.*</code>)</span>
              <input type="text" class="wb-input" data-studio-input="typeId" value="${String(draft.typeId || '').replace(/"/g, '&quot;')}" />
            </label>
            <label class="wb-studio-field">
              <span>Kategori</span>
              <select class="wb-input" data-studio-input="category">
                ${['custom', 'sensors', 'boards', 'motors', 'leds', 'buttons', 'props']
                  .map(
                    (cat) => `<option value="${cat}" ${draft.category === cat ? 'selected' : ''}>${cat}</option>`
                  )
                  .join('')}
              </select>
            </label>
          </div>

          <div class="wb-studio-section">
            <div class="wb-studio-section-head">
              <strong>🧱 3B Parça Ağacı (<code>parts[]</code> + <code>attach</code> + PBR Materyal + <code>partRole</code>)</strong>
              <button type="button" class="wb-btn wb-btn-sm" data-studio-act="add-part">
                ${i18n.t('workbench.palette.studioAddPartBtn')}
              </button>
            </div>
            <div class="wb-studio-parts-list" data-role="studio-parts-list">
              ${parts
                .map(
                  (part, idx) => `
                <div class="wb-studio-part-row" data-part-index="${idx}">
                  <input type="text" class="wb-input wb-input-xs" data-part-field="id" data-part-idx="${idx}" value="${String(part.id || `part_${idx + 1}`).replace(/"/g, '&quot;')}" title="Part ID" />
                  <select class="wb-input wb-input-xs" data-part-field="primitive" data-part-idx="${idx}" title="CAD Primitive">
                    ${['rounded_box', 'box', 'cylinder', 'tube', 'capsule', 'lathe', 'sphere', 'cone', 'torus']
                      .map((prim) => `<option value="${prim}" ${(part.primitive || 'box') === prim ? 'selected' : ''}>${prim}</option>`)
                      .join('')}
                  </select>
                  <select class="wb-input wb-input-xs" data-part-field="materialPreset" data-part-idx="${idx}" title="PBR Material Preset">
                    ${materialPresetNames
                      .map((mat) => `<option value="${mat}" ${(part.materialPreset || 'fr4_pcb') === mat ? 'selected' : ''}>${mat}</option>`)
                      .join('')}
                  </select>
                  <select class="wb-input wb-input-xs" data-part-field="attachSide" data-part-idx="${idx}" title="Attach Side">
                    ${['none', 'top', 'bottom', 'left', 'right', 'front', 'back', 'center']
                      .map((side) => `<option value="${side}" ${(part.attach?.side || 'none') === side ? 'selected' : ''}>attach:${side}</option>`)
                      .join('')}
                  </select>
                  <select class="wb-input wb-input-xs" data-part-field="partRole" data-part-idx="${idx}" title="Reactive Part Role">
                    ${['', 'emissive', 'rotor', 'pivot', 'plunger']
                      .map((role) => `<option value="${role}" ${(part.partRole || '') === role ? 'selected' : ''}>${role ? `role:${role}` : 'role:static'}</option>`)
                      .join('')}
                  </select>
                  <button type="button" class="wb-btn wb-btn-sm" data-studio-remove-part="${idx}" title="Remove Part">✕</button>
                </div>
              `
                )
                .join('')}
            </div>
          </div>

          ${
            !isProp
              ? `
            <div class="wb-studio-section">
              <div class="wb-studio-section-head">
                <strong>3B Pin & Terminal Tanımları ve 2.54mm Pin Dizisi (<code>pinGenerator</code>)</strong>
                <div class="wb-studio-inline-btns">
                  <button type="button" class="wb-btn wb-btn-sm" data-studio-act="add-pin">
                    ${i18n.t('workbench.palette.studioAddPinBtn')}
                  </button>
                  <button type="button" class="wb-btn wb-btn-sm" data-studio-act="generate-header">
                    ${i18n.t('workbench.palette.studioGenHeaderBtn')}
                  </button>
                </div>
              </div>
              <div class="wb-studio-pins-list" data-role="studio-pins-list">
                ${pins
                  .map(
                    (pin, idx) => `
                  <div class="wb-studio-pin-row" data-pin-index="${idx}">
                    <input type="text" class="wb-input wb-input-xs" data-pin-field="name" data-pin-idx="${idx}" value="${String(pin.name || '').replace(/"/g, '&quot;')}" placeholder="Pin (VCC, IN, OUT)" />
                    <select class="wb-input wb-input-xs" data-pin-field="direction" data-pin-idx="${idx}">
                      ${['input', 'output', 'power', 'ground', 'analog', 'pwm', 'i2c', 'bidirectional']
                        .map((dir) => `<option value="${dir}" ${(pin.direction || 'bidirectional') === dir ? 'selected' : ''}>${dir}</option>`)
                        .join('')}
                    </select>
                    <select class="wb-input wb-input-xs" data-pin-field="edge" data-pin-idx="${idx}">
                      ${['bottom', 'top', 'left', 'right']
                        .map((edge) => `<option value="${edge}" ${(pin.edge || 'bottom') === edge ? 'selected' : ''}>edge:${edge}</option>`)
                        .join('')}
                    </select>
                    <button type="button" class="wb-btn wb-btn-sm" data-studio-remove-pin="${idx}">✕</button>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>

            <div class="wb-studio-section">
              <div class="wb-studio-section-head">
                <strong>Bileşen Çalışma Mantığı (Sinyal & Çıkış Kodu): <code>evaluate({ pins, state, dt, stageEnv, report })</code></strong>
              </div>
              <textarea
                class="wb-input wb-studio-code"
                data-role="studio-eval-script"
                rows="5"
                spellcheck="false"
              >${String(draft.evaluateScript || '')}</textarea>
            </div>
          `
              : `
            <div class="wb-studio-section">
              <div class="wb-studio-section-head">
                <strong>🧱 0-Pin Fiziksel Sahne Nesnesi / Engel Profili (<code>obstacleProfile</code>)</strong>
              </div>
              <div class="wb-studio-prop-flags">
                <label><input type="checkbox" data-studio-prop-flag="blocksUltrasonic" ${draft.obstacleProfile?.blocksUltrasonic !== false ? 'checked' : ''} /> Ultrasonik Sonar Yankısı (HC-SR04 Engel)</label>
                <label><input type="checkbox" data-studio-prop-flag="blocksInfrared" ${draft.obstacleProfile?.blocksInfrared !== false ? 'checked' : ''} /> Kızılötesi / Lazer ToF Yansıması</label>
              </div>
            </div>
          `
          }

          ${
            this.studioError
              ? `<div class="wb-studio-alert wb-studio-alert--error" role="alert">⚠️ ${this.studioError}</div>`
              : ''
          }
          ${
            this.studioSavedMessage
              ? `<div class="wb-studio-alert wb-studio-alert--ok" role="status">✅ Kaydedildi ve sahneye eklendi: ${this.studioSavedMessage}</div>`
              : ''
          }
        </div>

        <aside class="wb-palette-preview-pane" data-role="catalog-preview-pane">
          <div class="wb-preview-header">
            <span class="wb-preview-badge">
              <span class="wb-preview-live-dot"></span>
              ${i18n.t('workbench.palette.previewBadge')}
            </span>
            <button type="button" class="wb-btn wb-btn-sm" data-studio-act="refresh-preview">
              ${i18n.t('workbench.palette.studioRefreshPreviewBtn')}
            </button>
          </div>
          <div class="wb-preview-stage" data-role="catalog-preview-stage"></div>
          <div class="wb-preview-meta" data-role="catalog-preview-meta">
            ${this._buildPreviewMetaMarkup()}
          </div>
        </aside>
      </div>
    `;
  }

  _highlightPreviewedCardDom(typeId) {
    if (!this.rootEl || typeof this.rootEl.querySelectorAll !== 'function') return;
    const cards = this.rootEl.querySelectorAll('.wb-part-item[data-type-id]');
    cards.forEach((card) => {
      const cardType = card.getAttribute('data-type-id');
      card.classList.toggle('is-previewed', cardType === typeId);
    });
  }

  _updatePreviewMetaDom() {
    if (!this.rootEl || typeof this.rootEl.querySelector !== 'function') return;
    const metaEl = this.rootEl.querySelector('[data-role="catalog-preview-meta"]');
    if (!metaEl) return;
    metaEl.innerHTML = this._buildPreviewMetaMarkup();
    const spawnBtn = metaEl.querySelector('[data-role="preview-spawn-btn"]');
    spawnBtn?.addEventListener('click', () => {
      const typeId = spawnBtn.getAttribute('data-spawn-type');
      if (typeId) {
        this.onSpawnComponent?.(typeId);
      }
    });
    const studioSaveBtn = metaEl.querySelector('[data-studio-act="save-and-spawn"]');
    studioSaveBtn?.addEventListener('click', () => {
      this.saveAndSpawnStudioComponent();
    });
  }

  render() {
    if (!this.rootEl) return;

    if (!this.isOpen) {
      this._stopPreviewLoop();
      this.rootEl.hidden = true;
      this.rootEl.setAttribute?.('aria-hidden', 'true');
      return;
    }

    this.rootEl.hidden = false;
    this.rootEl.setAttribute?.('aria-hidden', 'false');

    const totalCatalogCount = this.registry.searchCatalog({ query: '', category: 'all' }).length;
    const catalogItems = this.registry.searchCatalog({
      query: this.searchQuery,
      category: this.activeCategory
    });

    if (this.activeTab === 'studio') {
      this.setPreviewCustomSpec(this.studioDraft);
    } else {
      if (
        catalogItems.length > 0 &&
        !catalogItems.some((item) => item.typeId === this.previewTypeId)
      ) {
        this.previewTypeId = catalogItems[0].typeId;
      }
      this.setPreviewComponent(this.previewTypeId);
    }

    const categories = this._getCategories();

    this.rootEl.innerHTML = `
      <section class="wb-palette-card" aria-label="${i18n.t('workbench.palette.title')}">
        <header class="wb-palette-header">
          <div class="wb-drawer-title-group">
            <span class="wb-drawer-title">${i18n.t('workbench.palette.title')}</span>
            <div class="wb-palette-tabs" role="tablist">
              <button type="button" class="wb-tab-btn ${this.activeTab === 'catalog' ? 'is-active' : ''}" data-palette-tab="catalog">
                ${i18n.t('workbench.palette.tabCatalog', { count: totalCatalogCount })}
              </button>
              <button type="button" class="wb-tab-btn ${this.activeTab === 'studio' ? 'is-active' : ''}" data-palette-tab="studio">
                ${i18n.t('workbench.palette.tabStudio')}
              </button>
              <button type="button" class="wb-tab-btn ${this.activeTab === 'datasheet' ? 'is-active' : ''}" data-palette-tab="datasheet">
                ${i18n.t('workbench.palette.tabDatasheet')}
              </button>
              <a
                href="/studio"
                class="wb-tab-btn wb-tab-btn--studio-launch"
                data-action="open-full-studio"
                title="${i18n.getLocale() === 'tr' ? 'Tam Ekran 3B Özel Bileşen Stüdyosunu Aç (/studio)' : 'Open Full-Screen 3D Custom Component Studio (/studio)'}"
              >
                ${i18n.getLocale() === 'tr' ? 'Tam Ekran 3B Stüdyo (/studio) ↗' : 'Full-Screen 3D Studio (/studio) ↗'}
              </a>
            </div>
          </div>
          <button type="button" class="wb-icon-btn" data-action="close-palette" aria-label="Close">
            <svg class="wb-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </header>

        ${
          this.activeTab === 'catalog'
            ? `
          <div class="wb-palette-body wb-palette-body--catalog">
            <div class="wb-palette-catalog-col">
              <div class="wb-palette-search-row">
                <input
                  type="search"
                  class="wb-input"
                  data-role="catalog-search"
                  value="${this.searchQuery.replace(/"/g, '&quot;')}"
                  placeholder="${i18n.t('workbench.palette.searchPlaceholder')}"
                />
                <div class="wb-category-chips">
                  ${categories
                    .map(
                      (cat) => `
                    <button
                      type="button"
                      class="wb-chip-btn ${this.activeCategory === cat.id ? 'is-active' : ''}"
                      data-cat="${cat.id}"
                    >${cat.label}</button>
                  `
                    )
                    .join('')}
                </div>
              </div>
              <div class="wb-palette-grid" data-role="catalog-grid">
                ${this._renderCatalogGridMarkup(catalogItems)}
              </div>
            </div>

            <aside class="wb-palette-preview-pane" data-role="catalog-preview-pane">
              <div class="wb-preview-header">
                <span class="wb-preview-badge">
                  <span class="wb-preview-live-dot"></span>
                  ${i18n.t('workbench.palette.previewBadge')}
                </span>
                <span class="wb-preview-hint">${i18n.t('workbench.palette.previewRotateHint')}</span>
              </div>
              <div class="wb-preview-stage" data-role="catalog-preview-stage"></div>
              <div class="wb-preview-meta" data-role="catalog-preview-meta">
                ${this._buildPreviewMetaMarkup()}
              </div>
            </aside>
          </div>
        `
            : this.activeTab === 'studio'
              ? this._renderStudioTabMarkup()
              : `
          <div class="wb-palette-body wb-datasheet-body">
            <div class="wb-datasheet-intro">
              <strong>${i18n.t('workbench.palette.datasheetTitle')}</strong>
              <p>${i18n.t('workbench.palette.datasheetDesc')}</p>
            </div>
            <form class="wb-datasheet-form" data-role="datasheet-form">
              <input
                type="text"
                class="wb-input"
                data-role="datasheet-input"
                value="${this.datasheetCode.replace(/"/g, '&quot;')}"
                placeholder="${i18n.t('workbench.palette.partInputPlaceholder')}"
              />
              <button type="submit" class="wb-btn wb-btn-primary" ${this.isSynthesizing ? 'disabled' : ''}>
                ${i18n.t('workbench.palette.synthesizeBtn')}
              </button>
            </form>
            <div class="wb-datasheet-presets">
              <button type="button" class="wb-chip-btn" data-preset-code="BME280">BME280 (I2C Env)</button>
              <button type="button" class="wb-chip-btn" data-preset-code="MPU6050">MPU6050 (6-DOF IMU)</button>
              <button type="button" class="wb-chip-btn" data-preset-code="INA219">INA219 (Power Monitor)</button>
            </div>
            ${
              this.lastSynthesizedSpec
                ? `
              <div class="wb-datasheet-preview" data-role="datasheet-preview">
                <strong>${this.lastSynthesizedSpec.name}</strong>
                <span>${this.lastSynthesizedSpec.typeId} · ${this.lastSynthesizedSpec.pins.map((p) => p.name).join(', ')}</span>
              </div>
            `
                : ''
            }
          </div>
        `
        }
      </section>
    `;

    this._mountPreviewCanvasIntoDom();
    this._bindEvents();

    if (this.activeTab === 'catalog' || this.activeTab === 'studio') {
      this._startPreviewLoop();
    } else {
      this._stopPreviewLoop();
    }
  }

  _mountPreviewCanvasIntoDom() {
    if (!this.rootEl || typeof this.rootEl.querySelector !== 'function') return;
    const stageEl = this.rootEl.querySelector('[data-role="catalog-preview-stage"]');
    if (!stageEl) return;
    const canvas = this._ensurePreviewCanvasAndRenderer();
    if (canvas && canvas.parentElement !== stageEl) {
      stageEl.innerHTML = '';
      stageEl.appendChild(canvas);
    }
    this._renderPreviewFrame();
  }

  _bindCatalogGridEvents() {
    if (!this.rootEl || typeof this.rootEl.querySelectorAll !== 'function') return;

    const cards = this.rootEl.querySelectorAll('.wb-part-item[data-type-id]');
    cards.forEach((card) => {
      const typeId = card.getAttribute('data-type-id');
      if (!typeId) return;

      card.addEventListener('pointerenter', () => {
        this.setPreviewComponent(typeId);
      });
      card.addEventListener('pointerover', () => {
        this.setPreviewComponent(typeId);
      });
      card.addEventListener('mouseover', () => {
        this.setPreviewComponent(typeId);
      });
      card.addEventListener('focus', () => {
        this.setPreviewComponent(typeId);
      });
      card.addEventListener('click', (e) => {
        if (e.target?.closest?.('[data-spawn-type]')) return;
        this.setPreviewComponent(typeId);
      });
    });

    const spawnBtns = this.rootEl.querySelectorAll('[data-spawn-type]');
    spawnBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const typeId = btn.getAttribute('data-spawn-type');
        if (typeId) {
          this.setPreviewComponent(typeId);
          this.onSpawnComponent?.(typeId);
        }
      });
    });
  }

  _bindStudioEvents() {
    if (!this.rootEl || typeof this.rootEl.querySelector !== 'function') return;

    this.rootEl.querySelectorAll('[data-studio-preset]')?.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-studio-preset');
        if (key) this.loadStudioPreset(key);
      });
    });

    this.rootEl.querySelectorAll('[data-studio-mode]')?.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-studio-mode');
        this.studioDraft.isEnvironmentProp = mode === 'prop';
        if (mode === 'prop') {
          this.studioDraft.category = 'props';
        } else if (this.studioDraft.category === 'props') {
          this.studioDraft.category = 'custom';
        }
        this.render();
      });
    });

    this.rootEl.querySelectorAll('[data-studio-input]')?.forEach((inputEl) => {
      const field = inputEl.getAttribute('data-studio-input');
      inputEl.addEventListener('input', (e) => {
        if (!field) return;
        this.studioDraft[field] = e.target.value;
        this.setPreviewCustomSpec(this.studioDraft);
        this._updatePreviewMetaDom();
      });
    });

    this.rootEl.querySelectorAll('[data-part-field]')?.forEach((el) => {
      el.addEventListener('change', (e) => {
        const idx = Number(el.getAttribute('data-part-idx'));
        const field = el.getAttribute('data-part-field');
        const part = this.studioDraft.parts?.[idx];
        if (!part || !field) return;
        const val = e.target.value;
        if (field === 'attachSide') {
          if (val === 'none') {
            delete part.attach;
          } else {
            const baseId = this.studioDraft.parts?.[0]?.id || 'pcb_base';
            part.attach = {
              to: part.attach?.to || (idx > 0 ? baseId : ''),
              side: val,
              gap: Number(part.attach?.gap ?? 0),
              offset: part.attach?.offset || [0, 0, 0]
            };
          }
        } else if (field === 'partRole') {
          if (!val) {
            delete part.partRole;
          } else {
            part.partRole = val;
          }
        } else {
          part[field] = val;
        }
        this.setPreviewCustomSpec(this.studioDraft);
        this._updatePreviewMetaDom();
      });
    });

    this.rootEl.querySelectorAll('[data-studio-remove-part]')?.forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-studio-remove-part'));
        if (Array.isArray(this.studioDraft.parts) && this.studioDraft.parts.length > 1) {
          this.studioDraft.parts.splice(idx, 1);
          this.render();
        }
      });
    });

    this.rootEl.querySelector('[data-studio-act="add-part"]')?.addEventListener('click', () => {
      if (!Array.isArray(this.studioDraft.parts)) this.studioDraft.parts = [];
      const baseId = this.studioDraft.parts[0]?.id || 'pcb_base';
      const nextIdx = this.studioDraft.parts.length + 1;
      this.studioDraft.parts.push({
        id: `part_${nextIdx}`,
        primitive: 'rounded_box',
        size: [4, 2, 4],
        radius: 0.25,
        attach: { to: baseId, side: 'top', gap: 0, offset: [0, 0, 0] },
        materialPreset: 'ic_epoxy'
      });
      this.render();
    });

    this.rootEl.querySelectorAll('[data-pin-field]')?.forEach((el) => {
      el.addEventListener('change', (e) => {
        const idx = Number(el.getAttribute('data-pin-idx'));
        const field = el.getAttribute('data-pin-field');
        const pin = this.studioDraft.pins?.[idx];
        if (!pin || !field) return;
        pin[field] = e.target.value;
        this.setPreviewCustomSpec(this.studioDraft);
        this._updatePreviewMetaDom();
      });
    });

    this.rootEl.querySelectorAll('[data-studio-remove-pin]')?.forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-studio-remove-pin'));
        if (Array.isArray(this.studioDraft.pins)) {
          this.studioDraft.pins.splice(idx, 1);
          this.render();
        }
      });
    });

    this.rootEl.querySelector('[data-studio-act="add-pin"]')?.addEventListener('click', () => {
      if (!Array.isArray(this.studioDraft.pins)) this.studioDraft.pins = [];
      const nextIdx = this.studioDraft.pins.length + 1;
      this.studioDraft.pins.push({
        name: `IO${nextIdx}`,
        direction: 'bidirectional',
        edge: 'bottom',
        nominalVoltage: 5.0
      });
      this.render();
    });

    this.rootEl.querySelector('[data-studio-act="generate-header"]')?.addEventListener('click', () => {
      const generated = DynamicComponentBuilder.expandPinGenerators(
        {
          prefix: 'P',
          count: 4,
          edge: 'bottom',
          pitchMm: 2.54,
          labels: ['VCC', 'GND', 'IN', 'OUT'],
          directions: ['power', 'ground', 'input', 'output']
        },
        this.studioDraft.dimensions || { width: 14, height: 1.6, depth: 12 }
      );
      this.studioDraft.pins = generated;
      delete this.studioDraft.pinGenerator;
      this.render();
    });

    const evalTextarea = this.rootEl.querySelector('[data-role="studio-eval-script"]');
    evalTextarea?.addEventListener('input', (e) => {
      this.studioDraft.evaluateScript = e.target.value;
    });

    this.rootEl.querySelectorAll('[data-studio-prop-flag]')?.forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const flag = chk.getAttribute('data-studio-prop-flag');
        if (!this.studioDraft.obstacleProfile) this.studioDraft.obstacleProfile = {};
        if (flag) {
          this.studioDraft.obstacleProfile[flag] = Boolean(e.target.checked);
        }
      });
    });

    this.rootEl.querySelector('[data-studio-act="refresh-preview"]')?.addEventListener('click', () => {
      this.setPreviewCustomSpec(this.studioDraft);
      this._updatePreviewMetaDom();
    });

    this.rootEl.querySelectorAll('[data-studio-act="save-and-spawn"]')?.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.saveAndSpawnStudioComponent();
      });
    });
  }

  _bindEvents() {
    if (!this.rootEl || typeof this.rootEl.querySelector !== 'function') return;

    const closeBtn = this.rootEl.querySelector('[data-action="close-palette"]');
    closeBtn?.addEventListener('click', () => this.close());

    const openFullStudioBtn = this.rootEl.querySelector('[data-action="open-full-studio"]');
    openFullStudioBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.close();
      this.onOpenFullStudio?.();
    });

    const tabBtns = this.rootEl.querySelectorAll('[data-palette-tab]');
    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.getAttribute('data-palette-tab') || 'catalog';
        this.render();
      });
    });

    const searchInput = this.rootEl.querySelector('[data-role="catalog-search"]');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      const gridEl = this.rootEl.querySelector('[data-role="catalog-grid"]');
      const filtered = this.registry.searchCatalog({
        query: this.searchQuery,
        category: this.activeCategory
      });
      if (gridEl) {
        gridEl.innerHTML = this._renderCatalogGridMarkup(filtered);
        if (filtered.length > 0 && !filtered.some((item) => item.typeId === this.previewTypeId)) {
          this.setPreviewComponent(filtered[0].typeId);
        }
        this._bindCatalogGridEvents();
      }
    });

    const catBtns = this.rootEl.querySelectorAll('[data-cat]');
    catBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeCategory = btn.getAttribute('data-cat') || 'all';
        this.render();
      });
    });

    this._bindCatalogGridEvents();
    this._bindStudioEvents();

    const dsForm = this.rootEl.querySelector('[data-role="datasheet-form"]');
    const dsInput = this.rootEl.querySelector('[data-role="datasheet-input"]');
    dsInput?.addEventListener('input', (e) => {
      this.datasheetCode = e.target.value;
    });
    dsForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.synthesizeAndSpawn(this.datasheetCode);
    });

    const presetBtns = this.rootEl.querySelectorAll('[data-preset-code]');
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-preset-code');
        if (code) {
          this.synthesizeAndSpawn(code);
        }
      });
    });
  }

  destroy() {
    this._stopPreviewLoop();
    this._disposePreviewComponent();
    if (this._previewRenderer) {
      try {
        this._previewRenderer.dispose?.();
      } catch {
        // Ignore renderer disposal errors
      }
      this._previewRenderer = null;
    }
    this._unsubLocale?.();
  }
}
