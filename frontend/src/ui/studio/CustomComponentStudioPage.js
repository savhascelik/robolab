import * as THREE from 'three';
import { i18n } from '../../core/i18n/I18nService.js';
import { themeService } from '../../core/theme/ThemeService.js';
import {
  DynamicComponentBuilder,
  PBR_MATERIAL_PRESETS
} from '../../core/components/DynamicComponentBuilder.js';
import {
  StudioModelingSDK,
  STUDIO_MODELING_TOOL_DEFINITIONS,
  CUSTOM_COMPONENT_TEMPLATES
} from '../../core/ai/StudioModelingSDK.js';

const t = (key, fallback = '') => {
  const val = i18n.t(key);
  return val && val !== key ? val : fallback;
};

const PRIMITIVE_LABELS = Object.freeze({
  tr: {
    rounded_box: 'Yuvarlatılmış Kutu (PCB / Gövde)',
    box: 'Kutu / Blok',
    cylinder: 'Silindir (Şaft / Rotor)',
    tube: 'Boru / Sensör Yuvası',
    sphere: 'Küre (LED / Mercek)',
    capsule: 'Kapsül (Kubbe / LED)',
    lathe: 'Torna Profili (Huni / Kubbe)',
    cone: 'Koni',
    torus: 'Halka (Torus)'
  },
  en: {
    rounded_box: 'Rounded Box (PCB / Body)',
    box: 'Box / Block',
    cylinder: 'Cylinder (Shaft / Rotor)',
    tube: 'Tube / Sensor Shroud',
    sphere: 'Sphere (LED / Lens)',
    capsule: 'Capsule (Dome / LED)',
    lathe: 'Lathe Profile (Horn / Dome)',
    cone: 'Cone',
    torus: 'Torus Ring'
  }
});

const MATERIAL_PRESET_LABELS = Object.freeze({
  tr: {
    fr4_pcb: 'FR4 Devre Kartı (Yeşil)',
    fr4_pcb_teal: 'FR4 Devre Kartı (Turkuaz)',
    fr4_pcb_black: 'FR4 Devre Kartı (Mat Siyah)',
    fr4_pcb_red: 'FR4 Devre Kartı (Kırmızı)',
    fr4_pcb_blue: 'FR4 Devre Kartı (Mavi)',
    ic_epoxy: 'Entegre Çip Gövdesi (Siyah Epoksi)',
    brushed_aluminum: 'Fırçalanmış Alüminyum (Metal)',
    gold_pin: 'Altın Pin / Pirinç Terminal',
    copper: 'Bakır Bobin / İletken',
    frosted_led: 'Buzlu LED Merceği (Işıklı Kubbe)',
    ceramic: 'Seramik Gövde',
    rubber_tire: 'Kauçuk / Lastik Tampon',
    matte_plastic: 'Mat Endüstriyel Plastik',
    dark_steel: 'Koyu Çelik'
  },
  en: {
    fr4_pcb: 'FR4 Circuit Board (Green)',
    fr4_pcb_teal: 'FR4 Circuit Board (Teal)',
    fr4_pcb_black: 'FR4 Circuit Board (Matte Black)',
    fr4_pcb_red: 'FR4 Circuit Board (Red)',
    fr4_pcb_blue: 'FR4 Circuit Board (Blue)',
    ic_epoxy: 'IC Package (Black Epoxy)',
    brushed_aluminum: 'Brushed Aluminum (Metal)',
    gold_pin: 'Gold Pin / Brass Terminal',
    copper: 'Copper Coil / Conductor',
    frosted_led: 'Frosted LED Lens (Emissive)',
    ceramic: 'Ceramic Body',
    rubber_tire: 'Rubber / Bumper Pad',
    matte_plastic: 'Matte Industrial Plastic',
    dark_steel: 'Dark Steel'
  }
});

const ATTACH_SIDE_LABELS = Object.freeze({
  tr: {
    top: 'Üst Yüzey (+Y)',
    bottom: 'Alt Yüzey (-Y)',
    front: 'Ön Yüzey (+Z)',
    back: 'Arka Yüzey (-Z)',
    left: 'Sol Yüzey (-X)',
    right: 'Sağ Yüzey (+X)',
    center: 'Merkez (0,0,0)'
  },
  en: {
    top: 'Top Surface (+Y)',
    bottom: 'Bottom Surface (-Y)',
    front: 'Front Surface (+Z)',
    back: 'Back Surface (-Z)',
    left: 'Left Surface (-X)',
    right: 'Right Surface (+X)',
    center: 'Center (0,0,0)'
  }
});

const PART_ROLE_LABELS = Object.freeze({
  tr: {
    static: 'Sabit Gövde (Statik)',
    emissive: 'Işıklı Parça / LED (Emissive)',
    rotor: 'Dönen Parça / Fan (Rotor)',
    pivot: 'Açısal Kol / Servo (Pivot)',
    plunger: 'Doğrusal İtici / Buton (Plunger)'
  },
  en: {
    static: 'Static Body',
    emissive: 'Illuminated / LED (Emissive)',
    rotor: 'Spinning Rotor / Fan',
    pivot: 'Angular Pivot / Servo',
    plunger: 'Linear Plunger / Actuator'
  }
});

const PIN_TYPE_LABELS = Object.freeze({
  tr: {
    power: 'Güç (VCC/5V)',
    ground: 'Toprak (GND)',
    digital: 'Dijital G/Ç',
    analog: 'Analog',
    pwm: 'PWM',
    i2c: 'I2C',
    spi: 'SPI',
    uart: 'UART'
  },
  en: {
    power: 'Power (VCC/5V)',
    ground: 'Ground (GND)',
    digital: 'Digital I/O',
    analog: 'Analog',
    pwm: 'PWM',
    i2c: 'I2C',
    spi: 'SPI',
    uart: 'UART'
  }
});

const PIN_DIR_LABELS = Object.freeze({
  tr: {
    input: 'Giriş (IN)',
    output: 'Çıkış (OUT)',
    power: 'Besleme (VCC)',
    ground: 'Toprak (GND)',
    analog: 'Analog',
    bidirectional: 'Çift Yönlü (G/Ç)'
  },
  en: {
    input: 'Input (IN)',
    output: 'Output (OUT)',
    power: 'Power (VCC)',
    ground: 'Ground (GND)',
    analog: 'Analog',
    bidirectional: 'Bidirectional (I/O)'
  }
});

const PIN_EDGE_LABELS = Object.freeze({
  tr: {
    bottom: 'Alt Kenar',
    top: 'Üst Kenar',
    left: 'Sol Kenar',
    right: 'Sağ Kenar',
    front: 'Ön Kenar',
    back: 'Arka Kenar'
  },
  en: {
    bottom: 'Bottom Edge',
    top: 'Top Edge',
    left: 'Left Edge',
    right: 'Right Edge',
    front: 'Front Edge',
    back: 'Back Edge'
  }
});

const CAMERA_VIEW_LABELS = Object.freeze({
  tr: {
    iso: 'İZOMETRİK',
    top: 'ÜST',
    front: 'ÖN',
    side: 'YAN'
  },
  en: {
    iso: 'ISO',
    top: 'TOP',
    front: 'FRONT',
    side: 'SIDE'
  }
});

/**
 * CustomComponentStudioPage — Full-Screen Dedicated 3D Custom Component Studio (/studio).
 *
 * Implements Faz 17 (Task 17.1, Task 17.2, Task 17.3, Task 17.4):
 * - Dedicated full-viewport (`/studio`) 3-column engineering environment.
 * - Left Column: Visual 3D CAD `parts[]` tree, relative surface `attach` inspector,
 *   electronic PBR material selector, `partRole` reactive binding, `2.54mm` header generator,
 *   and `evaluate({ pins, state, dt, stageEnv, report })` editor.
 * - Center Column: Interactive Three.js 3D CAD & Pin Pedestal (`ISO | TOP | FRONT | SIDE`,
 *   X-Ray bounding-box mode, 3D Pin/Handle telemetry pills) + Live Handle & Physics Test Bench.
 * - Right Column: Codex Modeling Studio style LLM Studio Architect powered by `StudioModelingSDK`
 *   with granular 3D CAD tools (`addPart`, `attachPart`, `setPartMaterial`, `addPinRow`,
 *   `setEvaluateScript`, `testComponentBehavior`) and automatic self-verification.
 *
 * Strict Design System Compliance:
 * - Zero gradients, zero decorative AI emojis, 1px solid hairline borders (`--border-hairline`),
 *   real electronic signal colors, Dark/Light theme and TR/EN i18n parity.
 */
export class CustomComponentStudioPage {
  /**
   * Normalizes any `typeId` or URL slug (e.g. `custom.threshold_sensor_node`, `fire_truck_beacon`)
   * into a clean URL-safe slug (`threshold-sensor-node`, `fire-truck-beacon`).
   * @param {string} raw
   * @returns {string}
   */
  static toComponentSlug(raw = '') {
    return (
      String(raw || 'threshold-sensor-node')
        .trim()
        .replace(/^custom\./i, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/_/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase() || 'threshold-sensor-node'
    );
  }

  /**
   * @param {object} [opts]
   * @param {HTMLElement} [opts.container]
   * @param {import('../../core/components/ComponentRegistry.js').ComponentRegistry} [opts.registry]
   * @param {import('../../core/ai/BackendApiClient.js').BackendApiClient} [opts.backendClient]
   * @param {object} [opts.themeService]
   * @param {object|null} [opts.sessionUser]
   * @param {object|null} [opts.credits]
   * @param {(componentSlug: string, draft: object) => void} [opts.onRouteChange]
   * @param {(tab?: string) => void} [opts.onOpenAuthModal]
   * @param {(tab?: string) => void} [opts.onOpenDashboard]
   * @param {(tab?: string) => void} [opts.onOpenCreditStore]
   * @param {() => void} [opts.onLogout]
   * @param {(savedSchema: object) => void} [opts.onSaveComponent]
   * @param {(savedSchema: object) => void} [opts.onSpawnToWorkbench]
   * @param {() => void} [opts.onBackToWorkbench]
   */
  constructor(opts = {}) {
    this.container = opts.container || null;
    this.registry = opts.registry || null;
    this.backendClient = opts.backendClient || null;
    this.themeService = opts.themeService || themeService;
    this.sessionUser = opts.sessionUser || null;
    this.credits = opts.credits || null;
    this.onRouteChange = opts.onRouteChange || null;
    this.onOpenAuthModal = opts.onOpenAuthModal || null;
    this.onOpenDashboard = opts.onOpenDashboard || null;
    this.onOpenCreditStore = opts.onOpenCreditStore || null;
    this.onLogout = opts.onLogout || null;
    this.onSaveComponent = opts.onSaveComponent || null;
    this.onSpawnToWorkbench = opts.onSpawnToWorkbench || null;
    this.onBackToWorkbench = opts.onBackToWorkbench || null;

    this.isOpen = false;
    this.activeTemplateKey = 'threshold_sensor_node';
    this.selectedPartId = null;
    this.statusMessage = '';
    this.statusTone = 'info';
    this._customComponentCounter = 1;

    // Test Bench state
    this.testPinVoltages = {
      VCC: 5.0,
      GND: 0.0,
      IN: 5.0,
      TRIG: 5.0
    };
    this.testDistanceCm = 12;
    this.testEnvParams = {
      nearestObstacleCm: 12,
      temperatureC: 25,
      lightLux: 500,
      gasPpm: 120,
      humidityPct: 45,
      potRatio: 0.5
    };
    this.lastTestReport = null;

    // Studio Architect state
    this.architectMessages = [
      {
        role: 'assistant',
        text:
          i18n.getLocale() === 'tr'
            ? 'StudioModelingSDK hazır (19 granüler 3B CAD & Pin aracı aktif). Doğal dille veya `studio.*` komutlarıyla parçaları yüzeylere yapıştırabilir (`attachPart`), 2.54mm pin dizisi üretebilir (`addPinRow`) ve davranışı canlı test edebilirsiniz (`testComponentBehavior`).'
            : 'StudioModelingSDK ready (19 granular 3D CAD & Pin tools active). Use natural language or `studio.*` commands to attach parts to surfaces (`attachPart`), generate 2.54mm pin headers (`addPinRow`), and verify behavior (`testComponentBehavior`).',
        tools: []
      }
    ];

    this.sdk = new StudioModelingSDK({
      initialDraft: CUSTOM_COMPONENT_TEMPLATES.threshold_sensor_node,
      onChange: (draft, meta) => {
        this._onSdkDraftChanged(draft, meta);
      }
    });
    this._syncLocalizedTemplateMeta();

    const initialParts = this.sdk.getDraft().geometry?.parts || [];
    this.selectedPartId = initialParts[0]?.id || null;

    // 3D WebGL Pedestal state
    this._studioScene = null;
    this._studioCamera = null;
    this._studioRenderer = null;
    this._studioComponent = null;
    this._studioPreviewGroup = null;
    this._studioXRayGroup = null;
    this._studioPedestalGrid = null;
    this._studioRafId = null;
    this._turntableYaw = 0.58;
    this._turntablePitch = 0.42;
    this._cameraDistanceScale = 1.0;
    this._isDraggingViewport = false;
    this._dragPrevX = 0;
    this._dragPrevY = 0;

    if (this.container) {
      this.mount(this.container);
    }

    this._unsubLocale = i18n.onChange(() => {
      this._syncLocalizedTemplateMeta();
      if (this.architectMessages.length === 1 && this.architectMessages[0].role === 'assistant') {
        this.architectMessages[0].text =
          i18n.getLocale() === 'tr'
            ? 'StudioModelingSDK hazır (19 granüler 3B CAD & Pin aracı aktif). Doğal dille veya `studio.*` komutlarıyla parçaları yüzeylere yapıştırabilir (`attachPart`), 2.54mm pin dizisi üretebilir (`addPinRow`) ve davranışı canlı test edebilirsiniz (`testComponentBehavior`).'
            : 'StudioModelingSDK ready (19 granular 3D CAD & Pin tools active). Use natural language or `studio.*` commands to attach parts to surfaces (`attachPart`), generate 2.54mm pin headers (`addPinRow`), and verify behavior (`testComponentBehavior`).';
      }
      if (this.container) {
        this.render();
      }
    });

    this._unsubTheme =
      typeof this.themeService?.onChange === 'function'
        ? this.themeService.onChange(() => {
            if (this.container) {
              this.render();
            }
          })
        : null;
  }

  /**
   * Synchronizes the authenticated user session into the `/studio` header.
   * @param {object|null} user
   */
  setSessionUser(user) {
    this.sessionUser = user || null;
    if (!this.sessionUser) {
      this.credits = null;
    }
    if (this.container && this.isOpen) {
      this.render();
    }
  }

  /**
   * Synchronizes the user's AI credit balance into the `/studio` header.
   * @param {object|null} credits
   */
  setCredits(credits) {
    this.credits = credits && typeof credits === 'object' ? { ...credits } : null;
    if (this.container && this.isOpen) {
      this.render();
    }
  }

  /**
   * Localizes built-in starter template names/descriptions when the active locale changes,
   * unless the user has customized the title.
   */
  _syncLocalizedTemplateMeta() {
    const draft = this.sdk?.getDraft?.();
    if (!draft) return;
    const isTr = i18n.getLocale() === 'tr';
    for (const tpl of Object.values(CUSTOM_COMPONENT_TEMPLATES)) {
      if (!tpl || tpl.typeId !== draft.typeId) continue;
      const trName = tpl.nameTr || tpl.name;
      const enName = tpl.nameEn || tpl.name;
      if (!draft.name || draft.name === trName || draft.name === enName || draft.name === tpl.name) {
        draft.name = isTr ? trName : enName;
      }
      const trDesc = tpl.descriptionTr || tpl.summaryTr || tpl.description || tpl.summary || '';
      const enDesc = tpl.descriptionEn || tpl.summaryEn || tpl.description || tpl.summary || '';
      if (
        !draft.description ||
        draft.description === trDesc ||
        draft.description === enDesc ||
        draft.description === tpl.description ||
        draft.description === tpl.summary
      ) {
        draft.description = isTr ? trDesc : enDesc;
      }
    }
  }

  /**
   * Returns the clean URL slug for the active component (e.g. `threshold-sensor-node`, `fire-truck-beacon`).
   * @param {object} [draft]
   * @returns {string}
   */
  getComponentSlug(draft = this.sdk.getDraft()) {
    return CustomComponentStudioPage.toComponentSlug(
      draft?.typeId || this.activeTemplateKey || 'threshold-sensor-node'
    );
  }

  /**
   * Returns all saved custom components from `ComponentRegistry` plus the 4 built-in Studio templates
   * so the user can switch between multiple custom components via `/studio/<slug>`.
   */
  getAvailableComponents() {
    const isTr = i18n.getLocale() === 'tr';
    const itemsBySlug = new Map();

    // 1. Saved custom components registered in ComponentRegistry
    const allRegistered =
      typeof this.registry?.getAll === 'function' ? this.registry.getAll() : [];
    for (const entry of allRegistered) {
      if (!entry?.typeId) continue;
      const isCustom =
        String(entry.typeId).startsWith('custom.') ||
        entry.category === 'custom' ||
        Boolean(entry.customSpec || entry.spec);
      if (!isCustom) continue;
      const slug = CustomComponentStudioPage.toComponentSlug(entry.typeId);
      const tplMatch = Object.values(CUSTOM_COMPONENT_TEMPLATES).find(
        (tpl) => tpl.typeId === entry.typeId
      );
      const displayName = tplMatch
        ? isTr
          ? tplMatch.nameTr || entry.name
          : tplMatch.nameEn || entry.name
        : entry.name || entry.typeId;
      itemsBySlug.set(slug, {
        slug,
        typeId: entry.typeId,
        name: displayName,
        isTemplate: Boolean(tplMatch),
        isSaved: true,
        spec: entry.customSpec || entry.spec || tplMatch || null
      });
    }

    // 2. Built-in starter templates
    for (const [key, tpl] of Object.entries(CUSTOM_COMPONENT_TEMPLATES)) {
      const slug = CustomComponentStudioPage.toComponentSlug(tpl.typeId || key);
      if (!itemsBySlug.has(slug)) {
        itemsBySlug.set(slug, {
          slug,
          templateKey: key,
          typeId: tpl.typeId,
          name: isTr ? tpl.nameTr || tpl.name : tpl.nameEn || tpl.name,
          isTemplate: true,
          isSaved: false,
          spec: tpl
        });
      }
    }

    // 3. Ensure current active draft is always in the list
    const currentDraft = this.sdk?.getDraft?.();
    if (currentDraft?.typeId) {
      const currentSlug = CustomComponentStudioPage.toComponentSlug(currentDraft.typeId);
      if (!itemsBySlug.has(currentSlug)) {
        itemsBySlug.set(currentSlug, {
          slug: currentSlug,
          typeId: currentDraft.typeId,
          name: currentDraft.name || currentDraft.typeId,
          isTemplate: false,
          isSaved: false,
          spec: currentDraft
        });
      }
    }

    return Array.from(itemsBySlug.values());
  }

  /**
   * Opens a saved custom component or starter template by its URL slug (e.g. `threshold-sensor-node`,
   * `fire-truck-beacon`, `custom.fire_truck_beacon`, or `new`).
   * @param {string} rawSlug
   * @param {{ notifyRoute?: boolean }} [opts]
   */
  openComponentBySlug(rawSlug, opts = {}) {
    const cleanRaw = String(rawSlug || '').trim();
    if (!cleanRaw) {
      return this.sdk.getDraft();
    }

    if (cleanRaw.toLowerCase() === 'new') {
      return this.createNewComponent({ notifyRoute: opts.notifyRoute !== false });
    }

    const targetSlug = CustomComponentStudioPage.toComponentSlug(cleanRaw);
    const underscoreKey = targetSlug.replace(/-/g, '_');

    // 1. Check saved custom components in ComponentRegistry first
    const allRegistered =
      typeof this.registry?.getAll === 'function' ? this.registry.getAll() : [];
    const savedEntry = allRegistered.find(
      (entry) =>
        entry?.typeId &&
        (CustomComponentStudioPage.toComponentSlug(entry.typeId) === targetSlug ||
          String(entry.typeId).toLowerCase() === cleanRaw.toLowerCase() ||
          String(entry.typeId).toLowerCase() === `custom.${underscoreKey}`)
    );

    if (savedEntry && (savedEntry.customSpec || savedEntry.spec)) {
      this.activeTemplateKey = CUSTOM_COMPONENT_TEMPLATES[underscoreKey] ? underscoreKey : null;
      return this.setDraft(savedEntry.customSpec || savedEntry.spec, {
        notifyRoute: opts.notifyRoute !== false
      });
    }

    // 2. Check built-in templates (`threshold_sensor_node`, `logic_inverter_gate`, etc.)
    if (CUSTOM_COMPONENT_TEMPLATES[underscoreKey]) {
      return this.loadTemplate(underscoreKey, {
        notifyRoute: opts.notifyRoute !== false
      });
    }
    const matchingTemplateEntry = Object.entries(CUSTOM_COMPONENT_TEMPLATES).find(
      ([key, tpl]) =>
        CustomComponentStudioPage.toComponentSlug(key) === targetSlug ||
        CustomComponentStudioPage.toComponentSlug(tpl.typeId) === targetSlug
    );
    if (matchingTemplateEntry) {
      return this.loadTemplate(matchingTemplateEntry[0], {
        notifyRoute: opts.notifyRoute !== false
      });
    }

    // 3. Check if current draft already matches
    if (this.getComponentSlug() === targetSlug) {
      if (opts.notifyRoute !== false) {
        this.onRouteChange?.(targetSlug, this.sdk.getDraft());
      }
      return this.sdk.getDraft();
    }

    // 4. Otherwise initialize a custom component draft with this slug
    const isTr = i18n.getLocale() === 'tr';
    const humanTitle = targetSlug
      .split('-')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    this.activeTemplateKey = null;
    this.sdk.loadTemplate('threshold_sensor_node');
    this.sdk.setComponentMeta({
      typeId: `custom.${underscoreKey}`,
      name: humanTitle || (isTr ? 'Özel Elektronik Modül' : 'Custom Electronic Module')
    });
    this._syncDefaultPinVoltages();
    this.runLiveSelfTest();
    if (this.container) this.render();
    if (opts.notifyRoute !== false) {
      this.onRouteChange?.(this.getComponentSlug(), this.sdk.getDraft());
    }
    return this.sdk.getDraft();
  }

  /**
   * Creates a brand-new custom component with a unique `typeId` and `/studio/<slug>` URL.
   * @param {{ notifyRoute?: boolean }} [opts]
   */
  createNewComponent(opts = {}) {
    const isTr = i18n.getLocale() === 'tr';
    const existingSlugs = new Set(this.getAvailableComponents().map((c) => c.slug));
    let idx = this._customComponentCounter;
    let candidateSlug = `ozel-modul-${idx}`;
    while (existingSlugs.has(candidateSlug)) {
      idx += 1;
      candidateSlug = `ozel-modul-${idx}`;
    }
    this._customComponentCounter = idx + 1;

    const typeId = `custom.ozel_modul_${idx}`;
    const name = isTr ? `Özel Elektronik Modül #${idx}` : `Custom Electronic Module #${idx}`;
    this.activeTemplateKey = null;

    const freshSpec = {
      typeId,
      name,
      category: 'custom',
      isEnvironmentProp: false,
      description: isTr
        ? 'Kullanıcı tarafından tasarlanan özel pinli 3B elektronik devre modülü.'
        : 'User-designed custom 3D electronic circuit module with pins.',
      dimensions: { width: 14, height: 1.6, depth: 12 },
      parts: [
        {
          id: 'pcb_base',
          primitive: 'rounded_box',
          size: [2.8, 0.2, 2.2],
          radius: 0.08,
          position: [0, 0, 0],
          materialPreset: 'fr4_pcb',
          color: '#065f46',
          partRole: 'static'
        },
        {
          id: 'driver_chip',
          primitive: 'rounded_box',
          size: [1.1, 0.24, 0.8],
          radius: 0.04,
          attach: { to: 'pcb_base', side: 'top', gap: 0, offset: [-0.2, 0, 0] },
          materialPreset: 'ic_epoxy',
          color: '#1e293b',
          partRole: 'static'
        },
        {
          id: 'status_led',
          primitive: 'capsule',
          size: [0.32, 0.38, 0.32],
          attach: { to: 'pcb_base', side: 'top', gap: 0, offset: [0.85, 0, 0] },
          materialPreset: 'frosted_led',
          color: '#22c55e',
          partRole: 'emissive'
        }
      ],
      pins: [
        { id: 'VCC', name: 'VCC', type: 'power', direction: 'power', edge: 'bottom', nominalVoltage: 5.0 },
        { id: 'GND', name: 'GND', type: 'ground', direction: 'ground', edge: 'bottom', nominalVoltage: 0.0 },
        { id: 'IN', name: 'IN', type: 'digital', direction: 'input', edge: 'left', nominalVoltage: 5.0 },
        { id: 'OUT', name: 'OUT', type: 'digital', direction: 'output', edge: 'right', nominalVoltage: 5.0 }
      ],
      dipoles: [
        { pinA: 'VCC', pinB: 'GND', resistanceOhms: 680 },
        { pinA: 'IN', pinB: 'GND', resistanceOhms: 10000 }
      ],
      evaluateScript: `const vcc = Number(pins.VCC?.voltage ?? 5.0);
const inV = Number(pins.IN?.voltage ?? 0.0);
const active = vcc >= 2.5 && inV >= 2.0;
state.active = active;
return {
  outputs: {
    OUT: { voltage: active ? 5.0 : 0.0, logicLevel: active ? 1 : 0 }
  },
  state: { active }
};`
    };

    return this.setDraft(freshSpec, { notifyRoute: opts.notifyRoute !== false });
  }

  /**
   * Returns the StudioModelingSDK instance for programmatic & LLM tool access.
   */
  getSDK() {
    return this.sdk;
  }

  /**
   * Returns available Studio tool definitions.
   */
  getToolDefinitions() {
    return STUDIO_MODELING_TOOL_DEFINITIONS;
  }

  /**
   * Mounts the full-screen Studio page into a DOM element.
   * @param {HTMLElement} container
   */
  mount(container) {
    this.container = container;
    this.render();
    this._bindEvents();
    this.runLiveSelfTest();
    return this;
  }

  /**
   * Opens/activates the full-screen `/studio` or `/studio/<componentSlug>` view.
   * @param {{ templateKey?: string, componentSlug?: string, draft?: object }} [opts]
   */
  open(opts = {}) {
    if (opts.draft && typeof opts.draft === 'object') {
      this.setDraft(opts.draft, { notifyRoute: false });
    } else if (opts.templateKey && CUSTOM_COMPONENT_TEMPLATES[opts.templateKey]) {
      this.loadTemplate(opts.templateKey, { notifyRoute: false });
    } else if (opts.componentSlug) {
      this.openComponentBySlug(opts.componentSlug, { notifyRoute: false });
    } else {
      this._syncLocalizedTemplateMeta();
    }
    this.isOpen = true;
    if (this.container) {
      this.container.hidden = false;
      this.container.classList?.add?.('is-open');
      this.render();
      this.runLiveSelfTest();
    }
    this.onRouteChange?.(this.getComponentSlug(), this.sdk.getDraft());
    return this;
  }

  /**
   * Closes/hides the `/studio` view.
   */
  close() {
    this.isOpen = false;
    if (this.container) {
      this.container.hidden = true;
      this.container.classList?.remove?.('is-open');
    }
    this._stopStudioLoop();
    return this;
  }

  /**
   * Loads one of the built-in v2 templates (`logic_inverter_gate`, `threshold_sensor_node`, `rotor_fan_module`, `arena_barrier_prop`).
   * @param {string} templateKey
   * @param {{ notifyRoute?: boolean }} [opts]
   */
  loadTemplate(templateKey, opts = {}) {
    const res = this.sdk.loadTemplate(templateKey);
    if (res.ok) {
      this.activeTemplateKey = templateKey;
      this._syncLocalizedTemplateMeta();
      const parts = this.sdk.getDraft().geometry?.parts || [];
      this.selectedPartId = parts[0]?.id || null;
      this._syncDefaultPinVoltages();
      this.runLiveSelfTest();
      if (this.container) this.render();
      if (opts.notifyRoute !== false) {
        this.onRouteChange?.(this.getComponentSlug(), this.sdk.getDraft());
      }
    }
    return res.draft;
  }

  /**
   * Replaces the active studio draft.
   * @param {object} draft
   * @param {{ notifyRoute?: boolean }} [opts]
   */
  setDraft(draft, opts = {}) {
    this.sdk.setDraft(draft);
    this._syncLocalizedTemplateMeta();
    const parts = this.sdk.getDraft().geometry?.parts || [];
    if (!parts.some((p) => p.id === this.selectedPartId)) {
      this.selectedPartId = parts[0]?.id || null;
    }
    this._syncDefaultPinVoltages();
    this.runLiveSelfTest();
    if (this.container) this.render();
    if (opts.notifyRoute !== false) {
      this.onRouteChange?.(this.getComponentSlug(), this.sdk.getDraft());
    }
    return this.sdk.getDraft();
  }

  getDraft() {
    return this.sdk.getDraft();
  }

  _syncDefaultPinVoltages() {
    const draft = this.sdk.getDraft();
    const nextVoltages = {};
    for (const pin of draft.pins || []) {
      const idUpper = String(pin.id || '').toUpperCase();
      if (idUpper === 'VCC' || idUpper === '5V' || pin.type === 'power') {
        nextVoltages[pin.id] = 5.0;
      } else if (idUpper === '3V3') {
        nextVoltages[pin.id] = 3.3;
      } else if (idUpper === 'GND' || pin.type === 'ground') {
        nextVoltages[pin.id] = 0.0;
      } else if (pin.direction === 'input' || pin.direction === 'bidirectional') {
        nextVoltages[pin.id] =
          this.testPinVoltages[pin.id] !== undefined ? Number(this.testPinVoltages[pin.id]) : 5.0;
      }
    }
    this.testPinVoltages = nextVoltages;
  }

  _onSdkDraftChanged(draft, meta = {}) {
    const parts = draft?.geometry?.parts || [];
    if (meta.selectedPartId !== undefined) {
      this.selectedPartId = meta.selectedPartId;
    } else if (!parts.some((p) => p.id === this.selectedPartId)) {
      this.selectedPartId = parts[0]?.id || null;
    }
    this._rebuildStudioMesh();
  }

  /**
   * Drives the current Test Bench voltages & virtual obstacle distance onto the mounted
   * 3D preview component (`this._studioComponent`) so `emissive`, `rotor`, `pivot`, and `plunger`
   * parts animate live in the `/studio` 3D viewport.
   */
  _applyTestBenchToPreviewComponent() {
    if (!this._studioComponent) return;

    for (const [rawPin, rawV] of Object.entries(this.testPinVoltages || {})) {
      const pinName =
        typeof this._studioComponent.resolvePinName === 'function'
          ? this._studioComponent.resolvePinName(rawPin)
          : rawPin;
      const ePin = this._studioComponent.electricalPins?.get?.(pinName);
      if (ePin && typeof ePin.driveVoltage === 'function') {
        const v = Number(rawV) || 0;
        ePin.driveVoltage(v, {
          digital: v >= 2.0 ? 1 : 0,
          logicLevel: v >= 2.0 ? 1 : 0,
          pwmDuty: v >= 2.0 ? 1.0 : 0.0
        });
      }
    }

    const vccPin =
      this._studioComponent.electricalPins?.get?.('VCC') ||
      this._studioComponent.electricalPins?.get?.('5V') ||
      this._studioComponent.electricalPins?.get?.('3V3');
    const hasPower = vccPin ? Number(vccPin.voltage || 0) >= 2.5 : true;
    const report = {
      closedLoop: hasPower,
      powered: hasPower,
      current: hasPower ? 0.015 : 0,
      currentMa: hasPower ? 15 : 0,
      voltageDrop: hasPower ? Number(vccPin?.voltage || 5.0) : 0
    };
    const stageEnv = {
      ...(this.testEnvParams || {}),
      nearestObstacleCm: Number(this.testDistanceCm) || 18,
      distanceCm: Number(this.testDistanceCm) || 18,
      ultrasonicDistanceCm: Number(this.testDistanceCm) || 18,
      irReflectance: (Number(this.testDistanceCm) || 18) <= 35 ? 0.92 : 0.05,
      getNearestObstacleDistanceCm: () => Number(this.testDistanceCm) || 18,
      raycastObstacleDistanceCm: () => Number(this.testDistanceCm) || 18
    };

    if (this.testEnvParams && typeof this.testEnvParams === 'object') {
      this._studioComponent.setState?.(this.testEnvParams);
    }
    this._studioComponent.onElectricalFlow?.(report);
    this._studioComponent.runNodeEvaluation?.({
      report,
      stageEnv,
      dt: 0.05
    });
    this._studioComponent.onTick?.(0.05);
  }

  /**
   * Returns only the physical/environmental Test Bench controls (`nearestObstacleCm`, `temperatureC`, `lightLux`, `gasPpm`, `humidityPct`, `potRatio`)
   * that are actually referenced by the component's `evaluateScript` or `testControls` definition.
   * Pure electrical/signal components (e.g. Fire-Truck Strobe Lightbar, Logic Gate, Relay, Fan) return `[]` so no irrelevant distance slider is shown.
   */
  _getActiveTestControls(draft = this.sdk.getDraft(), isTr = i18n.getLocale() === 'tr') {
    if (Array.isArray(draft?.testControls) && draft.testControls.length > 0) {
      return draft.testControls.map((ctrl) => ({
        key: ctrl.key,
        fieldAttr: ctrl.key === 'nearestObstacleCm' || ctrl.key === 'distanceCm' ? 'test-distance-cm' : `test-env-${ctrl.key}`,
        readoutAttr: ctrl.key === 'nearestObstacleCm' || ctrl.key === 'distanceCm' ? 'test-distance-cm' : `test-env-${ctrl.key}`,
        label: ctrl.label || ctrl.key,
        min: Number(ctrl.min ?? 0),
        max: Number(ctrl.max ?? 100),
        step: Number(ctrl.step ?? 1),
        unit: String(ctrl.unit || ''),
        value:
          ctrl.key === 'nearestObstacleCm' || ctrl.key === 'distanceCm'
            ? this.testDistanceCm
            : Number(this.testEnvParams?.[ctrl.key] ?? ctrl.defaultValue ?? 25)
      }));
    }

    const isProp = Boolean(draft?.isProp || draft?.isEnvironmentProp || draft?.archetype === 'prop');
    const script = String(draft?.evaluateScript || draft?.behavior?.evaluate || '');
    const controls = [];

    if (isProp || /nearestObstacleCm|distanceCm|ultrasonicDistanceCm|raycast|irReflectance/i.test(script)) {
      controls.push({
        key: 'nearestObstacleCm',
        fieldAttr: 'test-distance-cm',
        readoutAttr: 'test-distance-cm',
        label: isTr
          ? 'Sanal Engel Mesafesi (stageEnv.nearestObstacleCm):'
          : 'Virtual Obstacle Distance (nearestObstacleCm):',
        min: 2,
        max: 150,
        step: 1,
        unit: 'cm',
        value: this.testDistanceCm
      });
    }
    if (/temperatureC|tempC/i.test(script)) {
      controls.push({
        key: 'temperatureC',
        fieldAttr: 'test-env-temperatureC',
        readoutAttr: 'test-env-temperatureC',
        label: isTr ? 'Ortam Sıcaklığı (stageEnv.temperatureC):' : 'Ambient Temperature (temperatureC):',
        min: -20,
        max: 120,
        step: 1,
        unit: '°C',
        value: Number(this.testEnvParams?.temperatureC ?? 25)
      });
    }
    if (/lightLux|\blux\b/i.test(script)) {
      controls.push({
        key: 'lightLux',
        fieldAttr: 'test-env-lightLux',
        readoutAttr: 'test-env-lightLux',
        label: isTr ? 'Ortam Işık Şiddeti (stageEnv.lightLux):' : 'Ambient Light (lightLux):',
        min: 0,
        max: 2000,
        step: 10,
        unit: 'lx',
        value: Number(this.testEnvParams?.lightLux ?? 500)
      });
    }
    if (/gasPpm|smokePpm/i.test(script)) {
      controls.push({
        key: 'gasPpm',
        fieldAttr: 'test-env-gasPpm',
        readoutAttr: 'test-env-gasPpm',
        label: isTr ? 'Gaz / Duman Yoğunluğu (stageEnv.gasPpm):' : 'Gas / Smoke Concentration (gasPpm):',
        min: 0,
        max: 1000,
        step: 5,
        unit: 'ppm',
        value: Number(this.testEnvParams?.gasPpm ?? 120)
      });
    }
    if (/humidityPct|humidity/i.test(script)) {
      controls.push({
        key: 'humidityPct',
        fieldAttr: 'test-env-humidityPct',
        readoutAttr: 'test-env-humidityPct',
        label: isTr ? 'Bağıl Nem (stageEnv.humidityPct):' : 'Relative Humidity (humidityPct):',
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
        value: Number(this.testEnvParams?.humidityPct ?? 45)
      });
    }
    if (/potRatio|\bknob\b/i.test(script)) {
      controls.push({
        key: 'potRatio',
        fieldAttr: 'test-env-potRatio',
        readoutAttr: 'test-env-potRatio',
        label: isTr ? 'Analog Pot Oranı (stageEnv.potRatio):' : 'Analog Pot Ratio (potRatio):',
        min: 0,
        max: 1,
        step: 0.05,
        unit: '',
        value: Number(this.testEnvParams?.potRatio ?? 0.5)
      });
    }

    return controls;
  }

  /**
   * Runs `StudioModelingSDK.testComponentBehavior` with the current Test Bench voltages
   * and virtual obstacle distance (`testDistanceCm`), updating both the live report and 3D preview.
   * @param {{ pinVoltages?: Record<string, number>, distanceCm?: number, envParams?: Record<string, number>, recordTool?: boolean }} [overrides]
   */
  runLiveSelfTest(overrides = {}) {
    if (overrides.pinVoltages && typeof overrides.pinVoltages === 'object') {
      this.testPinVoltages = {
        ...this.testPinVoltages,
        ...overrides.pinVoltages
      };
    }
    if (overrides.distanceCm !== undefined) {
      this.testDistanceCm = Math.max(1, Math.min(400, Number(overrides.distanceCm) || 12));
      this.testEnvParams.nearestObstacleCm = this.testDistanceCm;
    }
    if (overrides.envParams && typeof overrides.envParams === 'object') {
      this.testEnvParams = {
        ...this.testEnvParams,
        ...overrides.envParams
      };
      if (overrides.envParams.nearestObstacleCm !== undefined || overrides.envParams.distanceCm !== undefined) {
        this.testDistanceCm = Number(
          overrides.envParams.nearestObstacleCm ?? overrides.envParams.distanceCm ?? this.testDistanceCm
        );
      }
    }

    const report = this.sdk.testComponentBehavior({
      pinVoltages: this.testPinVoltages,
      distanceCm: this.testDistanceCm,
      envParams: {
        ...this.testEnvParams,
        nearestObstacleCm: this.testDistanceCm,
        distanceCm: this.testDistanceCm
      },
      dt: 0.16,
      recordTool: overrides.recordTool !== undefined ? Boolean(overrides.recordTool) : true
    });
    this.lastTestReport = report;

    this._applyTestBenchToPreviewComponent();
    this._updateTestBenchDOM();
    return report;
  }

  /**
   * Executes a natural language command or `studio.*` script via the Backend LLM (`/api/v1/ai/studio-modeling`)
   * and `StudioModelingSDK`, runs self-test verification, and logs the granular tool trace.
   * @param {string} promptText
   */
  async executeArchitectPrompt(promptText = '') {
    const cleanPrompt = String(promptText || '').trim();
    if (!cleanPrompt) return null;

    const isTr = i18n.getLocale() === 'tr';
    this.architectMessages.push({
      role: 'user',
      text: cleanPrompt,
      tools: []
    });

    this.isArchitectBusy = true;
    this.statusTone = 'info';
    this.statusMessage = isTr
      ? 'Backend LLM ile 3B CAD parçaları, PBR materyaller ve sinyal mantığı sentezleniyor...'
      : 'Synthesizing 3D CAD parts, PBR materials, and signal logic via Backend LLM...';
    if (this.container) {
      const statusEl = this.container.querySelector('.studio-status-inline');
      if (statusEl) statusEl.textContent = this.statusMessage;
      const runBtn = this.container.querySelector('[data-action="studio-run-architect"]');
      if (runBtn) runBtn.setAttribute('disabled', 'disabled');
    }

    const prevLogLen = this.sdk.toolLog.length;
    let executionResult = null;

    try {
      // 1. Direct `studio.` JavaScript Code Mode snippet
      if (/\bstudio\s*\./.test(cleanPrompt)) {
        const codeRes = this.sdk.executeStudioCode(cleanPrompt);
        executionResult = {
          ok: true,
          mode: 'code_mode',
          summary: isTr
            ? `${codeRes.executedTools.length} adet Studio SDK aracı çalıştırıldı.`
            : `Executed ${codeRes.executedTools.length} Studio SDK tool calls.`,
          executedTools: codeRes.executedTools,
          snapshot: codeRes.snapshot
        };
      } else if (
        this.backendClient &&
        typeof this.backendClient.requestStudioModeling === 'function'
      ) {
        // 2. Call Backend LLM (`POST /api/v1/ai/studio-modeling`) with full Studio tool catalog
        try {
          const llmRes = await this.backendClient.requestStudioModeling({
            prompt: cleanPrompt,
            currentDraft: this.sdk.getDraft(),
            snapshot: this.sdk.getComponentSnapshot({ recordTool: false }),
            history: this.architectMessages.slice(-6).map((m) => ({
              role: m.role,
              text: m.text
            })),
            tools: STUDIO_MODELING_TOOL_DEFINITIONS,
            toolResults: this.sdk.toolLog.slice(-6),
            observationText: this.lastTestResult
              ? `lastSelfTest: active=${Boolean(this.lastTestResult?.state?.active)} outputs=${JSON.stringify(this.lastTestResult?.outputVoltages || {})}`
              : '',
            round: 1,
            maxRounds: 6,
            locale: i18n.getLocale()
          });

          if (llmRes && typeof llmRes.studio_code === 'string' && llmRes.studio_code.includes('studio.')) {
            const codeRes = this.sdk.executeStudioCode(llmRes.studio_code);
            executionResult = {
              ok: true,
              mode: 'backend_llm',
              thought: llmRes.thought || '',
              summary:
                llmRes.summary ||
                (isTr ? '3B bileşen modeli LLM tarafından güncellendi.' : '3D component model updated by LLM.'),
              modelUsed: llmRes.meta?.model_used || null,
              executedTools: codeRes.executedTools,
              toolCalls: llmRes.tool_calls || [],
              snapshot: codeRes.snapshot
            };
          } else if (llmRes && Array.isArray(llmRes.tool_calls) && llmRes.tool_calls.length > 0) {
            const callsRes = this.sdk.executeToolCalls(llmRes.tool_calls);
            executionResult = {
              ok: true,
              mode: 'backend_llm_tools',
              thought: llmRes.thought || '',
              summary:
                llmRes.summary ||
                (isTr ? '3B bileşen modeli LLM araçlarıyla güncellendi.' : '3D component model updated by LLM tools.'),
              modelUsed: llmRes.meta?.model_used || null,
              executedTools: callsRes.executedTools,
              toolCalls: llmRes.tool_calls,
              snapshot: callsRes.snapshot
            };
          } else {
            executionResult = await this.sdk.applyNaturalLanguageCommand(cleanPrompt);
          }
        } catch {
          // Offline / test fallback when backend is unreachable
          executionResult = await this.sdk.applyNaturalLanguageCommand(cleanPrompt);
        }
      } else {
        // 3. Local SDK fallback if no backendClient was injected
        executionResult = await this.sdk.applyNaturalLanguageCommand(cleanPrompt);
      }
    } catch (err) {
      executionResult = {
        ok: false,
        error: err?.message || String(err)
      };
    } finally {
      this.isArchitectBusy = false;
    }

    // Sync default test bench voltages for any newly created pins
    this._syncDefaultPinVoltages();
    const draftTypeId = String(this.sdk.getDraft().typeId || '');
    if (this.testPinVoltages.IN !== undefined) {
      this.testPinVoltages.IN = draftTypeId.includes('inverter') ? 0.0 : 5.0;
    }

    // Check if `testComponentBehavior` was already recorded during the script execution
    const alreadyTestedInTurn = this.sdk.toolLog
      .slice(prevLogLen)
      .some((entry) => entry.tool === 'testComponentBehavior');
    const selfTest = this.runLiveSelfTest({ recordTool: !alreadyTestedInTurn });
    const newTools = this.sdk.toolLog.slice(prevLogLen);

    const summaryText = executionResult?.ok
      ? isTr
        ? `${executionResult.summary || '3B model güncellendi.'} Kendi kendini doğrulama (Self-Test): ${
            selfTest.ok ? 'BAŞARILI' : 'HATA'
          } — Parça: ${(this.sdk.getDraft().geometry?.parts || []).length}, Pin: ${
            (this.sdk.getDraft().pins || []).length
          }.`
        : `${executionResult.summary || '3D model updated.'} Self-Test: ${
            selfTest.ok ? 'PASSED' : 'ERROR'
          } — Parts: ${(this.sdk.getDraft().geometry?.parts || []).length}, Pins: ${
            (this.sdk.getDraft().pins || []).length
          }.`
      : `${isTr ? 'Hata' : 'Error'}: ${executionResult?.error || 'Unknown error'}`;

    this.architectMessages.push({
      role: 'assistant',
      thought: executionResult?.thought || '',
      modelUsed: executionResult?.modelUsed || null,
      text: summaryText,
      tools: newTools,
      selfTest
    });

    this.statusMessage = summaryText;
    this.statusTone = executionResult?.ok ? 'success' : 'error';

    if (typeof this.onRouteChange === 'function') {
      this.onRouteChange(this.getComponentSlug(), this.sdk.getDraft());
    }

    if (this.container) {
      this.render();
    }

    return {
      ok: Boolean(executionResult?.ok),
      result: executionResult,
      selfTest,
      tools: newTools,
      draft: this.sdk.getDraft()
    };
  }

  /**
   * Saves the current Studio component into `ComponentRegistry` + Backend `/api/v1/custom-components`
   * and optionally spawns it directly onto the 3D Workbench (`BoardStage`).
   * @param {{ spawnToWorkbench?: boolean }} [opts]
   */
  async saveStudioComponent(opts = {}) {
    let normalized;
    try {
      normalized = DynamicComponentBuilder.normalizeSpec(this.sdk.getDraft());
    } catch (err) {
      this.statusTone = 'error';
      this.statusMessage = err?.message || 'Invalid component schema';
      if (this.container) this.render();
      return { ok: false, errors: [this.statusMessage] };
    }

    DynamicComponentBuilder.registerFromSpec(normalized, this.registry || undefined);

    if (this.backendClient && typeof this.backendClient.saveCustomComponent === 'function') {
      try {
        await this.backendClient.saveCustomComponent(normalized);
      } catch {
        // Offline / local fallback already handled inside BackendApiClient
      }
    }

    if (typeof this.onSaveComponent === 'function') {
      this.onSaveComponent(normalized);
    }

    if (typeof this.onRouteChange === 'function') {
      this.onRouteChange(this.getComponentSlug(normalized), normalized);
    }

    const isTr = i18n.getLocale() === 'tr';
    this.statusTone = 'success';
    this.statusMessage = isTr
      ? `"${normalized.name}" (${normalized.typeId}) kütüphaneye kaydedildi.`
      : `"${normalized.name}" (${normalized.typeId}) saved to component library.`;

    if (opts.spawnToWorkbench && typeof this.onSpawnToWorkbench === 'function') {
      this.onSpawnToWorkbench(normalized);
    }

    if (this.container) {
      this.render();
    }

    return {
      ok: true,
      schema: normalized
    };
  }

  render() {
    if (!this.container) return;

    const loc = i18n.getLocale() === 'en' ? 'en' : 'tr';
    const isTr = loc === 'tr';
    const currentTheme = this.themeService?.getTheme?.() || 'dark';
    const isDarkTheme = currentTheme === 'dark';
    const draft = this.sdk.getDraft();
    const activeSlug = this.getComponentSlug(draft);
    const availableComponents = this.getAvailableComponents();
    const isProp = draft.isProp || draft.archetype === 'prop';
    const parts = draft.geometry?.parts || [];
    const pins = draft.pins || [];
    const selectedPart = parts.find((p) => p.id === this.selectedPartId) || parts[0] || null;
    if (selectedPart && selectedPart.id !== this.selectedPartId) {
      this.selectedPartId = selectedPart.id;
    }

    const selectedBoundsRes = selectedPart
      ? this.sdk.getPartBounds(selectedPart.id, { recordTool: false })
      : null;
    const selectedBounds = selectedBoundsRes?.bounds || null;
    const materialKeys = Object.keys(PBR_MATERIAL_PRESETS);
    const primMap = PRIMITIVE_LABELS[loc] || PRIMITIVE_LABELS.tr;
    const matMap = MATERIAL_PRESET_LABELS[loc] || MATERIAL_PRESET_LABELS.tr;
    const sideMap = ATTACH_SIDE_LABELS[loc] || ATTACH_SIDE_LABELS.tr;
    const roleMap = PART_ROLE_LABELS[loc] || PART_ROLE_LABELS.tr;
    const pinTypeMap = PIN_TYPE_LABELS[loc] || PIN_TYPE_LABELS.tr;
    const pinDirMap = PIN_DIR_LABELS[loc] || PIN_DIR_LABELS.tr;
    const pinEdgeMap = PIN_EDGE_LABELS[loc] || PIN_EDGE_LABELS.tr;
    const camMap = CAMERA_VIEW_LABELS[loc] || CAMERA_VIEW_LABELS.tr;

    const creditsBalance =
      this.credits && typeof this.credits.balance === 'number' ? this.credits.balance : null;
    const userDisplayName = this.sessionUser
      ? this.sessionUser.name || this.sessionUser.email || (isTr ? 'Hesabım' : 'Account')
      : null;

    this.container.innerHTML = `
      <div class="studio-page-shell" data-view="studio" data-archetype="${isProp ? 'prop' : 'node'}" data-component-slug="${this._escapeAttr(activeSlug)}">
        <!-- Top Industrial Command Bar -->
        <header class="studio-page-header">
          <div class="studio-page-header__left">
            <a
              href="/workbench"
              class="studio-btn studio-btn--ghost"
              data-action="back-to-workbench"
              title="${isTr ? '3B Atölye Sahnesine Dön (/workbench)' : 'Back to 3D Workbench (/workbench)'}"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              <span>${t('studioPage.backToWorkbench', isTr ? 'Atölyeye Dön' : 'Back to Workbench')}</span>
            </a>
            <span class="studio-header-divider"></span>
            <div class="studio-page-title-block">
              <span class="studio-page-kicker">${t('studioPage.kicker', isTr ? '3B ÖZEL BİLEŞEN STÜDYOSU' : '3D CUSTOM COMPONENT STUDIO')}</span>
              <div class="studio-page-title-row">
                <strong class="studio-page-title">${this._escapeHtml(draft.name)}</strong>
                <code class="studio-page-url" title="${isTr ? 'Bileşen kalıcı bağlantısı' : 'Component URL'}">/studio/${this._escapeHtml(activeSlug)}</code>
                <span class="studio-badge ${isProp ? 'studio-badge--prop' : 'studio-badge--node'}">
                  ${isProp ? (isTr ? 'PİNSİZ SAHNE NESNESİ' : '0-PIN STAGE OBJECT') : (isTr ? `PİNLİ ELEKTRONİK MODÜL (${pins.length} PİN)` : `ELECTRONIC MODULE (${pins.length} PINS)`)}
                </span>
                <span class="studio-badge studio-badge--neutral">
                  ${parts.length} ${isTr ? '3B PARÇA' : '3D PARTS'}
                </span>
              </div>
            </div>
          </div>

          <!-- Component Switcher (/studio/<slug>) & Starter Templates -->
          <div class="studio-page-header__templates" role="group" aria-label="${isTr ? 'Bileşen Seçici ve Hazır Şablonlar' : 'Component Switcher and Starter Templates'}">
            <label class="studio-component-picker" title="${isTr ? 'Kayıtlı özel bileşenler veya şablonlar arasında geçiş yapın' : 'Switch between saved custom components or starter templates'}">
              <span class="studio-component-picker__label">${isTr ? 'Bileşen:' : 'Component:'}</span>
              <select
                class="studio-component-select"
                data-field="studio-component-select"
                aria-label="${isTr ? 'Aktif Özel Bileşeni Seç' : 'Select Active Custom Component'}"
              >
                ${availableComponents
                  .map(
                    (item) => `
                  <option value="${this._escapeAttr(item.slug)}" ${item.slug === activeSlug ? 'selected' : ''}>
                    ${this._escapeHtml(item.name)} (/studio/${this._escapeHtml(item.slug)})
                  </option>
                `
                  )
                  .join('')}
              </select>
            </label>

            <button
              type="button"
              class="studio-chip studio-chip--new"
              data-action="studio-new-component"
              title="${isTr ? 'Yeni boş bir özel elektronik modül oluştur' : 'Create a new custom electronic module'}"
            >+ ${isTr ? 'Yeni Bileşen' : 'New Component'}</button>

            <button
              type="button"
              class="studio-chip ${this.activeTemplateKey === 'threshold_sensor_node' ? 'is-active' : ''}"
              data-studio-template="threshold_sensor_node"
            >${isTr ? 'Kızılötesi Sensör' : 'Optical Sensor'}</button>
            <button
              type="button"
              class="studio-chip ${this.activeTemplateKey === 'logic_inverter_gate' ? 'is-active' : ''}"
              data-studio-template="logic_inverter_gate"
            >${isTr ? 'NOT Mantık Kapısı' : 'NOT Logic Gate'}</button>
            <button
              type="button"
              class="studio-chip ${this.activeTemplateKey === 'rotor_fan_module' ? 'is-active' : ''}"
              data-studio-template="rotor_fan_module"
            >${isTr ? '5V Soğutma Fanı' : '5V Cooling Fan'}</button>
            <button
              type="button"
              class="studio-chip ${this.activeTemplateKey === 'arena_barrier_prop' ? 'is-active' : ''}"
              data-studio-template="arena_barrier_prop"
            >${isTr ? 'Parkur Bariyeri' : 'Arena Barrier'}</button>
          </div>

          <!-- Save, Spawn & Global Account / Theme / Language Controls -->
          <div class="studio-page-header__actions">
            <button
              type="button"
              class="studio-btn studio-btn--secondary"
              data-action="studio-save-library"
            >
              ${t('studioPage.saveLibrary', isTr ? 'Kütüphaneye Kaydet' : 'Save to Library')}
            </button>
            <button
              type="button"
              class="studio-btn studio-btn--primary"
              data-action="studio-save-and-spawn"
            >
              ${t('studioPage.saveAndSpawn', isTr ? 'Kaydet & Atölye Sahnesine Ekle' : 'Save & Spawn to Workbench')}
            </button>

            <span class="studio-header-divider"></span>

            <div class="studio-page-header__global" role="group" aria-label="${isTr ? 'Dil, Tema ve Hesap Menüsü' : 'Language, Theme and Account Menu'}">
              ${
                this.sessionUser && creditsBalance !== null
                  ? `
                <button
                  type="button"
                  id="studio-btn-open-credits"
                  class="studio-btn studio-btn--ghost studio-global-pill"
                  data-action="studio-open-credits"
                  title="${isTr ? 'AI Kredi Mağazasını Aç' : 'Open AI Credit Store'}"
                >
                  <span>${creditsBalance} ${isTr ? 'Kredi' : 'Credits'}</span>
                </button>
              `
                  : ''
              }

              ${
                this.sessionUser
                  ? `
                <button
                  type="button"
                  id="studio-btn-open-account"
                  class="studio-btn studio-btn--ghost studio-global-pill"
                  data-action="studio-open-account"
                  title="${isTr ? 'Çalışma Alanlarım ve Hesap Paneli' : 'My Workspaces and Account Dashboard'}"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
                  </svg>
                  <span>${this._escapeHtml(userDisplayName)}</span>
                </button>
                <button
                  type="button"
                  id="studio-btn-logout"
                  class="studio-btn studio-btn--ghost studio-global-pill"
                  data-action="studio-logout"
                  title="${isTr ? 'Oturumu Kapat' : 'Sign Out'}"
                >
                  <span>${isTr ? 'Çıkış' : 'Sign Out'}</span>
                </button>
              `
                  : `
                <button
                  type="button"
                  id="studio-btn-open-auth"
                  class="studio-btn studio-btn--ghost studio-global-pill"
                  data-action="studio-open-auth"
                  title="${isTr ? 'Hesabınıza Giriş Yapın' : 'Sign In to Your Account'}"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
                  </svg>
                  <span>${isTr ? 'Giriş Yap' : 'Sign In'}</span>
                </button>
                <button
                  type="button"
                  id="studio-btn-open-register"
                  class="studio-btn studio-btn--ghost studio-global-pill"
                  data-action="studio-open-register"
                  title="${isTr ? 'Yeni Hesap Oluştur' : 'Create Account'}"
                >
                  <span>${isTr ? 'Kayıt Ol' : 'Register'}</span>
                </button>
              `
              }

              <button
                type="button"
                id="studio-btn-toggle-locale"
                class="studio-btn studio-btn--ghost studio-global-pill"
                data-action="studio-toggle-locale"
                title="${isTr ? 'Dili Değiştir (Türkçe / İngilizce)' : 'Switch Language (Turkish / English)'}"
                aria-label="${isTr ? 'Dili Değiştir' : 'Switch Language'}"
              >
                <strong>${loc.toUpperCase()}</strong>
              </button>

              <button
                type="button"
                id="studio-btn-toggle-theme"
                class="studio-btn studio-btn--ghost studio-global-pill"
                data-action="studio-toggle-theme"
                data-theme-state="${currentTheme}"
                title="${isTr ? (isDarkTheme ? 'Açık Temaya Geç' : 'Koyu Temaya Geç') : (isDarkTheme ? 'Switch to Light Mode' : 'Switch to Dark Mode')}"
                aria-label="${isTr ? 'Temayı Değiştir (Koyu / Açık Mod)' : 'Toggle Theme (Dark / Light Mode)'}"
              >
                ${
                  isDarkTheme
                    ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><span>${isTr ? 'Koyu Mod' : 'Dark'}</span>`
                    : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg><span>${isTr ? 'Açık Mod' : 'Light'}</span>`
                }
              </button>
            </div>
          </div>
        </header>

        <!-- 3-Column Dedicated Studio Body -->
        <div class="studio-page-grid">
          <!-- LEFT COLUMN: Visual CAD Parts, Attach, Pin Generator & Behavior Inspector -->
          <aside class="studio-page-inspector" aria-label="${isTr ? 'Görsel CAD ve Pin Denetçisi' : 'Visual CAD and Pin Inspector'}">
            <!-- Section 1: Component Type & Identity -->
            <section class="studio-panel-section">
              <div class="studio-section-header">
                <span class="studio-section-title">${isTr ? '1. BİLEŞEN TÜRÜ & KİMLİK' : '1. COMPONENT TYPE & IDENTITY'}</span>
                <code class="studio-section-meta">${draft.geometry.width}×${draft.geometry.height}×${draft.geometry.depth}cm</code>
              </div>

              <div class="studio-archetype-switch" role="radiogroup">
                <button
                  type="button"
                  class="studio-archetype-btn ${!isProp ? 'is-active' : ''}"
                  data-action="set-archetype"
                  data-archetype="node"
                >
                  <strong>${isTr ? 'Pinli Elektronik Modül' : 'Electronic Module (With Pins)'}</strong>
                  <span>${isTr ? 'Sensör, sürücü, aktüatör veya devre kartı' : 'Sensor, driver, actuator, or circuit board'}</span>
                </button>
                <button
                  type="button"
                  class="studio-archetype-btn ${isProp ? 'is-active' : ''}"
                  data-action="set-archetype"
                  data-archetype="prop"
                >
                  <strong>${isTr ? 'Pinsiz Sahne Nesnesi' : 'Stage Object (No Pins)'}</strong>
                  <span>${isTr ? 'Fiziksel engel, duvar veya parkur hedefi' : 'Physical obstacle, wall, or arena target'}</span>
                </button>
              </div>

              <div class="studio-form-grid">
                <label class="studio-field">
                  <span>${isTr ? 'Bileşen Adı' : 'Component Name'}</span>
                  <input type="text" data-studio-meta="name" value="${this._escapeAttr(draft.name)}" />
                </label>
                <label class="studio-field">
                  <span>${isTr ? 'Bileşen Kodu (URL Kimliği)' : 'Component ID (URL Slug)'}</span>
                  <input type="text" data-studio-meta="typeId" value="${this._escapeAttr(draft.typeId)}" />
                </label>
              </div>

              <div class="studio-form-grid studio-form-grid--3">
                <label class="studio-field">
                  <span>${isTr ? 'Genişlik (X)' : 'Width (X)'}</span>
                  <input type="number" step="0.2" min="0.4" max="30" data-studio-dim="width" value="${draft.geometry.width}" />
                </label>
                <label class="studio-field">
                  <span>${isTr ? 'Yükseklik (Y)' : 'Height (Y)'}</span>
                  <input type="number" step="0.1" min="0.2" max="20" data-studio-dim="height" value="${draft.geometry.height}" />
                </label>
                <label class="studio-field">
                  <span>${isTr ? 'Derinlik (Z)' : 'Depth (Z)'}</span>
                  <input type="number" step="0.2" min="0.4" max="30" data-studio-dim="depth" value="${draft.geometry.depth}" />
                </label>
              </div>
            </section>

            <!-- Section 2: Declarative 3D CAD Parts Tree & Relative Attach Inspector -->
            <section class="studio-panel-section">
              <div class="studio-section-header">
                <span class="studio-section-title">${isTr ? '2. 3B GÖVDE PARÇA AĞACI' : '2. 3D CAD PARTS TREE'}</span>
                <button type="button" class="studio-btn studio-btn--xs" data-action="studio-add-part">
                  + ${isTr ? 'Parça Ekle' : 'Add Part'}
                </button>
              </div>

              <div class="studio-parts-list" role="listbox" aria-label="${isTr ? '3B CAD Parçaları' : '3D CAD Parts'}">
                ${parts
                  .map((p) => {
                    const isSelected = selectedPart && p.id === selectedPart.id;
                    const sideLabel = p.attach?.to
                      ? sideMap[p.attach.side || 'top'] || p.attach.side || 'top'
                      : null;
                    const attachInfo = p.attach?.to
                      ? `↳ ${p.attach.to} (${sideLabel})`
                      : isTr
                        ? 'Ana Gövde'
                        : 'Root Base';
                    const primLabel = primMap[p.primitive] || p.primitive;
                    const roleLabel = roleMap[p.partRole] || p.partRole;
                    return `
                      <div class="studio-part-item ${isSelected ? 'is-selected' : ''}" data-select-part="${this._escapeAttr(p.id)}">
                        <div class="studio-part-item__main">
                          <span class="studio-part-swatch" style="background:${this._escapeAttr(p.color || '#3b82f6')}"></span>
                          <strong class="studio-part-id">${this._escapeHtml(p.id)}</strong>
                          <code class="studio-part-prim">${this._escapeHtml(primLabel)}</code>
                          <span class="studio-part-attach">${this._escapeHtml(attachInfo)}</span>
                          ${p.partRole && p.partRole !== 'static' ? `<span class="studio-part-role">${this._escapeHtml(roleLabel)}</span>` : ''}
                        </div>
                        ${
                          parts.length > 1
                            ? `<button type="button" class="studio-icon-del" data-remove-part="${this._escapeAttr(p.id)}" title="${isTr ? 'Parçayı Sil' : 'Delete Part'}">×</button>`
                            : ''
                        }
                      </div>
                    `;
                  })
                  .join('')}
              </div>

              ${
                selectedPart
                  ? `
                <div class="studio-selected-part-editor" data-selected-part-id="${this._escapeAttr(selectedPart.id)}">
                  <div class="studio-subsection-header">
                    <strong>${isTr ? 'Seçili Parça:' : 'Selected Part:'} <code>${this._escapeHtml(selectedPart.id)}</code></strong>
                    ${
                      selectedBounds
                        ? `<code class="studio-bounds-pill">[${selectedBounds.size.join('×')} cm]</code>`
                        : ''
                    }
                  </div>

                  <div class="studio-form-grid">
                    <label class="studio-field">
                      <span>${isTr ? '3B Geometrik Şekil' : '3D CAD Primitive'}</span>
                      <select data-part-prop="primitive">
                        ${[
                          'rounded_box',
                          'box',
                          'cylinder',
                          'tube',
                          'sphere',
                          'capsule',
                          'lathe',
                          'cone',
                          'torus'
                        ]
                          .map(
                            (prim) =>
                              `<option value="${prim}" ${selectedPart.primitive === prim ? 'selected' : ''}>${this._escapeHtml(primMap[prim] || prim)}</option>`
                          )
                          .join('')}
                      </select>
                    </label>

                    <label class="studio-field">
                      <span>${isTr ? 'Yüzey Materyali (PBR)' : 'Surface Material (PBR)'}</span>
                      <select data-part-prop="materialPreset">
                        ${materialKeys
                          .map(
                            (matKey) =>
                              `<option value="${matKey}" ${selectedPart.materialPreset === matKey ? 'selected' : ''}>${this._escapeHtml(matMap[matKey] || matKey)}</option>`
                          )
                          .join('')}
                      </select>
                    </label>
                  </div>

                  <div class="studio-form-grid studio-form-grid--3">
                    <label class="studio-field">
                      <span>${isTr ? 'Genişlik (G)' : 'Size W'}</span>
                      <input type="number" step="0.05" min="0.04" max="30" data-part-size="0" value="${selectedPart.size?.[0] ?? 1}" />
                    </label>
                    <label class="studio-field">
                      <span>${isTr ? 'Yükseklik (Y)' : 'Size H'}</span>
                      <input type="number" step="0.05" min="0.04" max="30" data-part-size="1" value="${selectedPart.size?.[1] ?? 0.4}" />
                    </label>
                    <label class="studio-field">
                      <span>${isTr ? 'Derinlik (D)' : 'Size D'}</span>
                      <input type="number" step="0.05" min="0.04" max="30" data-part-size="2" value="${selectedPart.size?.[2] ?? 1}" />
                    </label>
                  </div>

                  <!-- Relative Surface Attachment (attach: { to, side, gap, offset }) -->
                  <div class="studio-form-grid">
                    <label class="studio-field">
                      <span>${isTr ? 'Hangi Parçaya Monte Edilsin?' : 'Mount Onto Part'}</span>
                      <select data-part-attach="to">
                        <option value="">${isTr ? '— Ana Gövde (Serbest Konum) —' : '— Root Base (Free Position) —'}</option>
                        ${parts
                          .filter((other) => other.id !== selectedPart.id)
                          .map(
                            (other) =>
                              `<option value="${this._escapeAttr(other.id)}" ${
                                selectedPart.attach?.to === other.id ? 'selected' : ''
                              }>${this._escapeHtml(other.id)}</option>`
                          )
                          .join('')}
                      </select>
                    </label>

                    <label class="studio-field">
                      <span>${isTr ? 'Montaj Yüzeyi' : 'Mount Surface'}</span>
                      <select data-part-attach="side">
                        ${['top', 'bottom', 'front', 'back', 'left', 'right', 'center']
                          .map(
                            (side) =>
                              `<option value="${side}" ${(selectedPart.attach?.side || 'top') === side ? 'selected' : ''}>${this._escapeHtml(sideMap[side] || side)}</option>`
                          )
                          .join('')}
                      </select>
                    </label>
                  </div>

                  <div class="studio-form-grid">
                    <label class="studio-field">
                      <span>${isTr ? 'Fiziksel / Görsel Davranış' : 'Physical / Visual Behavior'}</span>
                      <select data-part-prop="partRole">
                        ${['static', 'emissive', 'rotor', 'pivot', 'plunger']
                          .map(
                            (role) =>
                              `<option value="${role}" ${(selectedPart.partRole || 'static') === role ? 'selected' : ''}>${this._escapeHtml(roleMap[role] || role)}</option>`
                          )
                          .join('')}
                      </select>
                    </label>

                    <label class="studio-field">
                      <span>${isTr ? 'Parça Rengi (#HEX)' : 'Part Color (#HEX)'}</span>
                      <input type="text" data-part-prop="color" value="${this._escapeAttr(selectedPart.color || '#3b82f6')}" />
                    </label>
                  </div>
                </div>
              `
                  : ''
              }
            </section>

            <!-- Section 3: Pin / Terminal & 2.54mm Header Generator (OR Obstacle Profile) -->
            ${
              !isProp
                ? `
              <section class="studio-panel-section">
                <div class="studio-section-header">
                  <span class="studio-section-title">${isTr ? '3. ELEKTRONİK PİNLER & 2.54MM DİZİ ÜRETİCİ' : '3. ELECTRONIC PINS & 2.54MM HEADER GENERATOR'}</span>
                  <div class="studio-inline-actions">
                    <button type="button" class="studio-btn studio-btn--xs" data-action="studio-add-pin">
                      + ${isTr ? 'Pin Ekle' : 'Add Pin'}
                    </button>
                    <button type="button" class="studio-btn studio-btn--xs" data-action="studio-add-pin-row-4" title="${isTr ? '2.54mm standart aralıklı 4 pinli sıra ekle' : 'Generate 2.54mm 1x4 pin header'}">
                      + 1×4 (2.54mm)
                    </button>
                  </div>
                </div>

                <div class="studio-pins-list">
                  ${pins
                    .map(
                      (pin) => `
                    <div class="studio-pin-row" data-pin-row="${this._escapeAttr(pin.id)}">
                      <code class="studio-pin-id">${this._escapeHtml(pin.id)}</code>
                      <span class="studio-pin-badge studio-pin-badge--${this._escapeAttr(pin.type || 'digital')}">
                        ${this._escapeHtml(pinTypeMap[pin.type || 'digital'] || pin.type || 'digital')}
                      </span>
                      <span class="studio-pin-dir">${this._escapeHtml(pinDirMap[pin.direction || 'bidirectional'] || pin.direction || 'bidirectional')}</span>
                      <span class="studio-pin-edge">${this._escapeHtml(pinEdgeMap[pin.edge || 'bottom'] || pin.edge || 'bottom')}</span>
                      <button type="button" class="studio-icon-del" data-remove-pin="${this._escapeAttr(pin.id)}" title="${isTr ? 'Pini Sil' : 'Remove Pin'}">×</button>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              </section>
            `
                : `
              <section class="studio-panel-section">
                <div class="studio-section-header">
                  <span class="studio-section-title">${isTr ? '3. FİZİKSEL ENGEL PROFİLİ (SENSÖR ETKİLEŞİMİ)' : '3. PHYSICAL OBSTACLE PROFILE (SENSOR INTERACTION)'}</span>
                </div>
                <div class="studio-prop-flags">
                  <label class="studio-checkbox">
                    <input type="checkbox" data-prop-flag="reflectsUltrasonic" ${draft.obstacleProfile?.reflectsUltrasonic !== false ? 'checked' : ''} />
                    <span>${isTr ? 'Ultrasonik (HC-SR04) Ses Dalgalarını Yansıtır' : 'Reflects Ultrasonic (HC-SR04) Sound Waves'}</span>
                  </label>
                  <label class="studio-checkbox">
                    <input type="checkbox" data-prop-flag="blocksInfrared" ${draft.obstacleProfile?.blocksInfrared !== false ? 'checked' : ''} />
                    <span>${isTr ? 'Kızılötesi / Optik Görüş Işınlarını Keser' : 'Blocks Infrared / Optical FOV Rays'}</span>
                  </label>
                </div>
              </section>
            `
            }

            <!-- Section 4: Sandboxed Component Behavior Logic Editor -->
            ${
              !isProp
                ? `
              <section class="studio-panel-section">
                <div class="studio-section-header">
                  <span class="studio-section-title">${isTr ? '4. BİLEŞEN ÇALIŞMA MANTIĞI (SİNYAL & ÇIKIŞ KODU)' : '4. COMPONENT BEHAVIOR LOGIC (SIGNAL & OUTPUT CODE)'}</span>
                  <button type="button" class="studio-btn studio-btn--xs" data-action="studio-apply-evaluate">
                    ${isTr ? 'Uygula & Test Et' : 'Apply & Test'}
                  </button>
                </div>
                <textarea
                  class="studio-code-textarea"
                  data-field="evaluate-script"
                  rows="6"
                  spellcheck="false"
                >${this._escapeHtml(draft.behavior?.evaluate || '')}</textarea>
              </section>
            `
                : ''
            }
          </aside>

          <!-- CENTER COLUMN: Live 3D WebGL CAD Pedestal + Live Pin & Physics Test Bench -->
          <main class="studio-page-viewport-col">
            <!-- Viewport Overlay Toolbar -->
            <div class="studio-viewport-stage">
              <div class="studio-viewport-hud-top">
                <div class="studio-camera-pills" role="group" aria-label="${isTr ? 'Kamera Açıları' : 'Camera Presets'}">
                  ${['iso', 'top', 'front', 'side']
                    .map(
                      (viewKey) => `
                    <button
                      type="button"
                      class="studio-cam-btn ${this.sdk.cameraView === viewKey ? 'is-active' : ''}"
                      data-camera-view="${viewKey}"
                    >${this._escapeHtml(camMap[viewKey] || viewKey.toUpperCase())}</button>
                  `
                    )
                    .join('')}
                  <button
                    type="button"
                    class="studio-cam-btn ${this.sdk.xRayMode ? 'is-active' : ''}"
                    data-action="toggle-xray"
                  >${isTr ? 'TEL KAFES / ÖLÇÜ KUTUSU' : 'WIREFRAME / BOUNDS'}</button>
                </div>

                <div class="studio-viewport-telemetry">
                  <span>${isTr ? 'Sol Tık + Sürükle: 360° Döndür · Tekerlek: Yakınlaştır' : 'Drag: 360° Orbit · Wheel: Zoom'}</span>
                </div>
              </div>

              <!-- 3D WebGL Mount Target -->
              <div id="studio-page-canvas-wrap" class="studio-page-canvas-wrap"></div>

              <!-- Floating 3D Pin Badges Overlay -->
              <div class="studio-viewport-pin-strip" aria-label="${isTr ? '3B Pin Terminalleri' : '3D Pin Terminals'}">
                ${
                  !isProp
                    ? pins
                        .map((pin) => {
                          const v =
                            this.lastTestReport?.outputVoltages?.[pin.id] ??
                            this.testPinVoltages[pin.id] ??
                            0;
                          return `
                            <span class="studio-live-pin-pill" data-pin-type="${this._escapeAttr(pin.type || 'digital')}">
                              <strong>${this._escapeHtml(pin.id)}</strong>
                              <code>${Number(v).toFixed(1)}V</code>
                            </span>
                          `;
                        })
                        .join('')
                    : `<span class="studio-live-pin-pill" data-pin-type="prop">${isTr ? 'Pinsiz Fiziksel Sahne Nesnesi (Sensör Hedefi)' : '0-Pin Physical Stage Object (Sensor Target)'}</span>`
                }
              </div>
            </div>

            <!-- Bottom Live Pin & Physics Test Bench -->
            ${(() => {
              const activeEnvControls = this._getActiveTestControls(draft, isTr);
              const benchSubtitle =
                activeEnvControls.length > 0
                  ? isTr
                    ? 'Giriş pinlerine voltaj verin veya sensör/çevre büyüklüğünü kaydırarak çıkış voltajlarını ve 3B parça hareketlerini sahnede doğrulayın.'
                    : 'Inject input voltages or adjust environmental sensor parameters to verify output pin voltages and 3D part reactions live.'
                  : isTr
                    ? 'Giriş pinlerine (0V / 3.3V / 5V) sinyal uygulayarak çıkış voltajlarını ve 3B fiziksel parça tepkisini (LED / Rotor / Kol) canlı doğrulayın.'
                    : 'Apply input pin voltages (0V / 3.3V / 5V) to verify output pin voltages and 3D physical part reactions (LED / Rotor / Arm) live.';
              return `
            <section class="studio-test-bench" aria-label="${isTr ? 'Canlı Pin ve Fizik Test Tezgahı' : 'Live Pin and Physics Test Bench'}">
              <div class="studio-test-bench__header">
                <div class="studio-test-bench__title">
                  <strong>${isTr ? 'CANLI PİN & FİZİK TEST TEZGAHI' : 'LIVE PIN & PHYSICS TEST BENCH'}</strong>
                  <span>${benchSubtitle}</span>
                </div>
                <button
                  type="button"
                  class="studio-btn studio-btn--xs studio-btn--primary"
                  data-action="studio-run-selftest"
                >${isTr ? 'Canlı Testi Çalıştır' : 'Run Self-Test'}</button>
              </div>

              <div class="studio-test-bench__body">
                <!-- Input Voltage Injectors -->
                <div class="studio-test-inputs">
                  ${
                    !isProp
                      ? pins
                          .filter((p) => p.direction !== 'output')
                          .map((pin) => {
                            const currentV = Number(this.testPinVoltages[pin.id] ?? 0);
                            return `
                              <div class="studio-voltage-injector" data-injector-pin="${this._escapeAttr(pin.id)}">
                                <span class="studio-voltage-injector__label">
                                  <code>${this._escapeHtml(pin.id)}</code>
                                  <small>${this._escapeHtml(pinTypeMap[pin.type || 'digital'] || pin.type)}</small>
                                </span>
                                <div class="studio-voltage-btns">
                                  ${[0, 3.3, 5.0]
                                    .map(
                                      (v) => `
                                    <button
                                      type="button"
                                      class="studio-v-btn ${Math.abs(currentV - v) < 0.15 ? 'is-active' : ''}"
                                      data-test-pin="${this._escapeAttr(pin.id)}"
                                      data-test-voltage="${v}"
                                    >${v}V</button>
                                  `
                                    )
                                    .join('')}
                                </div>
                              </div>
                            `;
                          })
                          .join('')
                      : ''
                  }

                  ${activeEnvControls
                    .map(
                      (ctrl) => `
                    <div class="studio-distance-injector" data-env-control="${this._escapeAttr(ctrl.key)}">
                      <label>
                        <span>${this._escapeHtml(ctrl.label)}</span>
                        <strong data-readout="${this._escapeAttr(ctrl.readoutAttr)}">${ctrl.value}${ctrl.unit ? ` ${this._escapeHtml(ctrl.unit)}` : ''}</strong>
                      </label>
                      <input
                        type="range"
                        min="${ctrl.min}"
                        max="${ctrl.max}"
                        step="${ctrl.step}"
                        value="${ctrl.value}"
                        data-field="${this._escapeAttr(ctrl.fieldAttr)}"
                        data-test-env-key="${this._escapeAttr(ctrl.key)}"
                        data-test-env-unit="${this._escapeAttr(ctrl.unit || '')}"
                      />
                    </div>
                  `
                    )
                    .join('')}
                </div>

                <!-- Live Output Voltages & 3D Part Reaction Readout -->
                <div class="studio-test-outputs" data-region="test-bench-outputs">
                  ${this._renderTestBenchOutputsHtml()}
                </div>
              </div>
            </section>`;
            })()}
          </main>

          <!-- RIGHT COLUMN: Dedicated LLM Studio Architect & StudioModelingSDK Tool Trace -->
          <aside class="studio-page-architect" aria-label="${isTr ? 'Yapay Zeka Donanım Mimarı ve Araç Kaydı' : 'AI Hardware Architect and Tool Trace'}">
            <div class="studio-section-header">
              <span class="studio-section-title">${isTr ? 'YAPAY ZEKA DONANIM MİMARI (AI TASARIMCI)' : 'AI HARDWARE ARCHITECT (STUDIO SDK)'}</span>
              <code class="studio-section-meta">${STUDIO_MODELING_TOOL_DEFINITIONS.length} ${isTr ? 'ARAÇ' : 'TOOLS'}</code>
            </div>

            <!-- Quick Engineering Prompt Chips -->
            <div class="studio-prompt-chips">
              <button
                type="button"
                class="studio-prompt-chip"
                data-studio-prompt="${isTr ? 'Bana kendisine gelen sinyalle çakarlı kırmızı-mavi yanan ve ortasında reflektörü dönen bir itfaiye ışığı yapar mısın?' : 'Build a red-blue emergency fire-truck strobe lightbar with a spinning central reflector triggered by input signal'}"
              >${isTr ? '+ Sinyalli İtfaiye Çakar Lambası Tasarla' : '+ Design Fire-Truck Strobe Lightbar'}</button>

              <button
                type="button"
                class="studio-prompt-chip"
                data-studio-prompt="${isTr ? '5V verildiğinde dönen rotorlu soğutucu fan modülü tasarla ve test et' : 'Design and test a 5V spinning rotor cooling fan module'}"
              >${isTr ? '+ 5V Dönen Rotorlu Fan Tasarla & Test Et' : '+ Design & Self-Test 5V Rotor Fan'}</button>

              <button
                type="button"
                class="studio-prompt-chip"
                data-studio-prompt="${isTr ? 'Ön kenara 2.54mm aralıklı 4 pinli (VCC, TRIG, ECHO, GND) header dizisi ekle' : 'Add a 4-pin 2.54mm header row (VCC, TRIG, ECHO, GND) on the front edge'}"
              >${isTr ? '+ 1×4 (2.54mm) Pin Header Dizisi Üret' : '+ Generate 1×4 (2.54mm) Pin Header'}</button>

              <button
                type="button"
                class="studio-prompt-chip"
                data-studio-prompt="${isTr ? 'Ultrasonik sensörü yansıtan 0-pin metalik sumo bariyer engeli oluştur' : 'Create a 0-pin metallic sumo barrier obstacle that reflects ultrasonic waves'}"
              >${isTr ? '+ Pinsiz Ultrasonik Parkur Bariyeri Üret' : '+ Create 0-Pin Ultrasonic Barrier Prop'}</button>
            </div>

            <!-- Conversation & Tool Execution Stream -->
            <div class="studio-architect-stream" data-region="architect-stream">
              ${this.architectMessages
                .map(
                  (msg) => `
                <article class="studio-arch-msg studio-arch-msg--${this._escapeAttr(msg.role)}">
                  <header class="studio-arch-msg__head">
                    <strong>${msg.role === 'user' ? (isTr ? 'TASARIM İSTEĞİ' : 'DESIGN PROMPT') : (isTr ? 'DONANIM MİMARI (SDK)' : 'STUDIO MODELING SDK')}</strong>
                    <div style="display:inline-flex;align-items:center;gap:6px;">
                      ${
                        msg.modelUsed
                          ? `<code class="studio-section-meta">${this._escapeHtml(msg.modelUsed)}</code>`
                          : ''
                      }
                      ${
                        msg.selfTest
                          ? `<span class="studio-selftest-pill ${msg.selfTest.ok ? 'is-pass' : 'is-fail'}">${
                              msg.selfTest.ok
                                ? isTr
                                  ? 'SELF-TEST PASS · DOĞRULANDI'
                                  : 'SELF-TEST PASS'
                                : isTr
                                  ? 'SELF-TEST FAIL · HATA'
                                  : 'SELF-TEST FAIL'
                            }</span>`
                          : ''
                      }
                    </div>
                  </header>
                  ${
                    msg.thought
                      ? `<p class="studio-arch-msg__thought" style="margin:0 0 6px;font-size:11px;color:var(--text-muted);border-left:2px solid var(--border-hairline);padding-left:8px;">${this._escapeHtml(
                          msg.thought
                        )}</p>`
                      : ''
                  }
                  <p class="studio-arch-msg__text">${this._escapeHtml(msg.text)}</p>
                  ${
                    Array.isArray(msg.tools) && msg.tools.length > 0
                      ? `
                    <div class="studio-arch-tools">
                      ${msg.tools
                        .map(
                          (tCall) => `
                        <div class="studio-arch-tool-call" title="${this._escapeAttr(tCall.summary || '')}">
                          <code>studio.${this._escapeHtml(tCall.tool)}()</code>
                          ${
                            tCall.summary
                              ? `<span style="margin-left:6px;font-size:10px;color:var(--text-muted);">${this._escapeHtml(
                                  tCall.summary
                                )}</span>`
                              : ''
                          }
                        </div>
                      `
                        )
                        .join('')}
                    </div>
                  `
                      : ''
                  }
                </article>
              `
                )
                .join('')}
            </div>

            <!-- Prompt / Code Mode Input Box -->
            <div class="studio-architect-composer">
              <textarea
                class="studio-architect-input"
                data-field="architect-prompt"
                rows="3"
                placeholder="${
                  isTr
                    ? 'Üretmek istediğiniz elektronik modülü tarif edin (örn: "Ses şiddetine göre 3 kademeli yanan VU-metre LED barı tasarla") veya studio.* kodu yazın...'
                    : 'Describe the electronic module you want to build or enter studio.* SDK commands...'
                }"
              ></textarea>
              <div class="studio-architect-composer__footer">
                <span class="studio-status-inline" data-tone="${this._escapeAttr(this.statusTone)}">
                  ${this._escapeHtml(this.statusMessage)}
                </span>
                <button
                  type="button"
                  class="studio-btn studio-btn--primary"
                  data-action="studio-run-architect"
                >
                  ${isTr ? 'Tasarımı Uygula & Test Et' : 'Apply & Self-Test'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    `;

    this._mountStudioCanvas();
  }

  _renderTestBenchOutputsHtml() {
    const isTr = i18n.getLocale() === 'tr';
    const report = this.lastTestReport || this.sdk.testComponentBehavior({
      pinVoltages: this.testPinVoltages,
      distanceCm: this.testDistanceCm,
      recordTool: false
    });
    const draft = this.sdk.getDraft();
    const isProp = draft.isProp || draft.archetype === 'prop';

    const outEntries = Object.entries(report.outputVoltages || {});
    const anim = report.partAnimations || {};

    return `
      <div class="studio-test-telemetry-grid">
        <div class="studio-test-telemetry-card">
          <span class="studio-test-card-label">${isTr ? 'ÇIKIŞ PİN VOLTAJLARI' : 'OUTPUT PIN VOLTAGES'}</span>
          <div class="studio-test-card-values">
            ${
              !isProp && outEntries.length > 0
                ? outEntries
                    .map(
                      ([pinId, volts]) => `
                  <span class="studio-out-pill ${Number(volts) >= 2.5 ? 'is-high' : 'is-low'}">
                    <strong>${this._escapeHtml(pinId)}:</strong> ${Number(volts).toFixed(2)}V (${Number(volts) >= 2.5 ? (isTr ? 'YÜKSEK / HIGH' : 'HIGH') : (isTr ? 'DÜŞÜK / LOW' : 'LOW')})
                  </span>
                `
                    )
                    .join('')
                : `<span>${isProp ? (isTr ? 'Pinsiz Engel: Sensör Algılama Aktif' : '0-Pin Object: Sensor Raycast Active') : '—'}</span>`
            }
          </div>
        </div>

        <div class="studio-test-telemetry-card">
          <span class="studio-test-card-label">${isTr ? '3B FİZİKSEL PARÇA TEPKİSİ' : '3D PHYSICAL PART REACTION'}</span>
          <div class="studio-test-card-values">
            <span class="studio-role-pill ${anim.emissiveLit ? 'is-active' : ''}">
              ${isTr ? 'IŞIK / LED:' : 'LED / EMISSIVE:'} <strong>${anim.emissiveLit ? (isTr ? 'YANIYOR (ON)' : 'ON (LIT)') : (isTr ? 'KAPALI (OFF)' : 'OFF')}</strong>
            </span>
            <span class="studio-role-pill ${anim.rotorSpinning ? 'is-active' : ''}">
              ${isTr ? 'MOTOR / ROTOR:' : 'ROTOR:'} <strong>${anim.rotorSpinning ? `${isTr ? 'DÖNÜYOR' : 'SPIN'} (${anim.rotorDeltaRad} rad)` : (isTr ? 'DURUYOR' : 'IDLE')}</strong>
            </span>
          </div>
        </div>
      </div>
    `;
  }

  _updateTestBenchDOM() {
    if (!this.container) return;
    const outRegion = this.container.querySelector('[data-region="test-bench-outputs"]');
    if (outRegion) {
      outRegion.innerHTML = this._renderTestBenchOutputsHtml();
    }
    const distReadout = this.container.querySelector('[data-readout="test-distance-cm"]');
    if (distReadout) {
      distReadout.textContent = `${this.testDistanceCm} cm`;
    }
  }

  _bindEvents() {
    if (!this.container || this._eventsBound) return;
    this._eventsBound = true;

    this.container.addEventListener('click', async (event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;

      // Back to workbench
      const backBtn = target.closest('[data-action="back-to-workbench"]');
      if (backBtn) {
        event.preventDefault();
        if (typeof this.onBackToWorkbench === 'function') {
          this.onBackToWorkbench();
        }
        return;
      }

      // Create a brand new custom component (/studio/ozel-modul-N)
      if (target.closest('[data-action="studio-new-component"]')) {
        this.createNewComponent();
        return;
      }

      // Global Header: Toggle Language (TR / EN)
      if (target.closest('[data-action="studio-toggle-locale"]')) {
        const nextLocale = i18n.getLocale() === 'tr' ? 'en' : 'tr';
        i18n.setLocale(nextLocale);
        return;
      }

      // Global Header: Toggle Dark / Light Theme
      if (target.closest('[data-action="studio-toggle-theme"]')) {
        if (this.themeService && typeof this.themeService.toggleTheme === 'function') {
          this.themeService.toggleTheme();
        }
        this.render();
        return;
      }

      // Global Header: Open AI Credit Store
      if (target.closest('[data-action="studio-open-credits"]')) {
        if (typeof this.onOpenCreditStore === 'function') {
          this.onOpenCreditStore();
        }
        return;
      }

      // Global Header: Open User Workspaces & Account Dashboard
      if (target.closest('[data-action="studio-open-account"]')) {
        if (typeof this.onOpenDashboard === 'function') {
          this.onOpenDashboard();
        }
        return;
      }

      // Global Header: Sign In / Register / Sign Out
      if (target.closest('[data-action="studio-open-auth"]')) {
        if (typeof this.onOpenAuthModal === 'function') {
          this.onOpenAuthModal('login');
        }
        return;
      }

      if (target.closest('[data-action="studio-open-register"]')) {
        if (typeof this.onOpenAuthModal === 'function') {
          this.onOpenAuthModal('register');
        }
        return;
      }

      if (target.closest('[data-action="studio-logout"]')) {
        if (typeof this.onLogout === 'function') {
          await this.onLogout();
        }
        return;
      }

      // Template preset buttons
      const tplBtn = target.closest('[data-studio-template]');
      if (tplBtn) {
        const key = tplBtn.getAttribute('data-studio-template');
        if (key) this.loadTemplate(key);
        return;
      }

      // Archetype switch
      const archBtn = target.closest('[data-action="set-archetype"]');
      if (archBtn) {
        const archetype = archBtn.getAttribute('data-archetype') || 'node';
        this.sdk.setComponentMeta({
          archetype,
          isProp: archetype === 'prop'
        });
        this.runLiveSelfTest();
        this.render();
        return;
      }

      // Camera view preset
      const camBtn = target.closest('[data-camera-view]');
      if (camBtn) {
        const view = camBtn.getAttribute('data-camera-view') || 'iso';
        this.sdk.setCameraView(view);
        this._applyCameraPreset(view);
        this.render();
        return;
      }

      // X-Ray mode toggle
      const xrayBtn = target.closest('[data-action="toggle-xray"]');
      if (xrayBtn) {
        this.sdk.setXRayMode(!this.sdk.xRayMode);
        this.render();
        return;
      }

      // Select part in tree
      const removePartBtn = target.closest('[data-remove-part]');
      if (removePartBtn) {
        event.stopPropagation();
        const partId = removePartBtn.getAttribute('data-remove-part');
        if (partId) {
          this.sdk.removePart(partId);
          this.runLiveSelfTest();
          this.render();
        }
        return;
      }

      const selectPartEl = target.closest('[data-select-part]');
      if (selectPartEl) {
        const partId = selectPartEl.getAttribute('data-select-part');
        if (partId) {
          this.selectedPartId = partId;
          this.sdk.selectPart(partId);
          this.render();
        }
        return;
      }

      // Add new CAD part
      if (target.closest('[data-action="studio-add-part"]')) {
        const parts = this.sdk.getDraft().geometry?.parts || [];
        const rootId = parts[0]?.id || null;
        const newId = `part_${parts.length + 1}`;
        this.sdk.addPart({
          id: newId,
          primitive: 'rounded_box',
          size: [0.6, 0.3, 0.6],
          materialPreset: 'ic_epoxy',
          color: '#1e293b',
          partRole: 'static',
          attach: rootId ? { to: rootId, side: 'top', gap: 0, offset: [0, 0, 0] } : undefined
        });
        this.selectedPartId = newId;
        this.runLiveSelfTest();
        this.render();
        return;
      }

      // Add single pin
      if (target.closest('[data-action="studio-add-pin"]')) {
        const pins = this.sdk.getDraft().pins || [];
        const newPinId = `IO${pins.length + 1}`;
        this.sdk.addPin({
          id: newPinId,
          label: newPinId,
          type: 'digital',
          direction: 'bidirectional',
          edge: 'bottom'
        });
        this._syncDefaultPinVoltages();
        this.runLiveSelfTest();
        this.render();
        return;
      }

      // Add 2.54mm 1x4 pin header row
      if (target.closest('[data-action="studio-add-pin-row-4"]')) {
        this.sdk.addPinRow({
          prefix: 'HDR',
          count: 4,
          edge: 'front',
          pitchMm: 2.54,
          labels: ['VCC', 'TRIG', 'ECHO', 'GND'],
          types: ['power', 'digital', 'digital', 'ground'],
          directions: ['input', 'input', 'output', 'ground']
        });
        this._syncDefaultPinVoltages();
        this.runLiveSelfTest();
        this.render();
        return;
      }

      // Remove pin
      const removePinBtn = target.closest('[data-remove-pin]');
      if (removePinBtn) {
        const pinId = removePinBtn.getAttribute('data-remove-pin');
        if (pinId) {
          this.sdk.removePin(pinId);
          this._syncDefaultPinVoltages();
          this.runLiveSelfTest();
          this.render();
        }
        return;
      }

      // Apply evaluate() script
      if (target.closest('[data-action="studio-apply-evaluate"]')) {
        const textarea = this.container.querySelector('[data-field="evaluate-script"]');
        if (textarea) {
          this.sdk.setEvaluateScript(textarea.value);
          this.runLiveSelfTest();
          this.render();
        }
        return;
      }

      // Voltage injector button in Live Test Bench
      const vBtn = target.closest('[data-test-pin][data-test-voltage]');
      if (vBtn) {
        const pinId = vBtn.getAttribute('data-test-pin');
        const voltage = Number(vBtn.getAttribute('data-test-voltage') || 0);
        if (pinId) {
          this.runLiveSelfTest({
            pinVoltages: { [pinId]: voltage }
          });
          this.render();
        }
        return;
      }

      // Run Self-Test button
      if (target.closest('[data-action="studio-run-selftest"]')) {
        this.runLiveSelfTest();
        this.render();
        return;
      }

      // Quick Prompt Chip in Studio Architect
      const promptChip = target.closest('[data-studio-prompt]');
      if (promptChip) {
        const promptText = promptChip.getAttribute('data-studio-prompt') || '';
        await this.executeArchitectPrompt(promptText);
        return;
      }

      // Run Studio Architect button
      if (target.closest('[data-action="studio-run-architect"]')) {
        const inputEl = this.container.querySelector('[data-field="architect-prompt"]');
        const promptText = inputEl ? inputEl.value : '';
        if (promptText.trim()) {
          await this.executeArchitectPrompt(promptText);
        }
        return;
      }

      // Save to Library
      if (target.closest('[data-action="studio-save-library"]')) {
        await this.saveStudioComponent({ spawnToWorkbench: false });
        return;
      }

      // Save & Spawn to Workbench
      if (target.closest('[data-action="studio-save-and-spawn"]')) {
        await this.saveStudioComponent({ spawnToWorkbench: true });
        return;
      }
    });

    // Form input & select changes
    this.container.addEventListener('change', (event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;

      // Component switcher dropdown (/studio/<slug>)
      if (target.getAttribute('data-field') === 'studio-component-select') {
        const nextSlug = target.value;
        if (nextSlug) {
          this.openComponentBySlug(nextSlug);
        }
        return;
      }

      // Component meta (name, typeId)
      const metaKey = target.getAttribute('data-studio-meta');
      if (metaKey) {
        this.sdk.setComponentMeta({ [metaKey]: target.value });
        if (metaKey === 'typeId') {
          this.activeComponentSlug = this.getComponentSlug();
          if (typeof this.onRouteChange === 'function') {
            this.onRouteChange(this.activeComponentSlug, this.sdk.getDraft());
          }
        }
        this.render();
        return;
      }

      // Component dimensions (width, height, depth)
      const dimKey = target.getAttribute('data-studio-dim');
      if (dimKey) {
        this.sdk.setComponentMeta({ [dimKey]: Number(target.value) || 2.4 });
        this.runLiveSelfTest();
        this.render();
        return;
      }

      // Selected Part properties
      if (this.selectedPartId) {
        const partProp = target.getAttribute('data-part-prop');
        if (partProp) {
          this.sdk.updatePart(this.selectedPartId, { [partProp]: target.value });
          this.runLiveSelfTest();
          this.render();
          return;
        }

        const sizeIdx = target.getAttribute('data-part-size');
        if (sizeIdx !== null) {
          const part = (this.sdk.getDraft().geometry?.parts || []).find(
            (p) => p.id === this.selectedPartId
          );
          if (part) {
            const nextSize = Array.isArray(part.size) ? [...part.size] : [1, 0.4, 1];
            nextSize[Number(sizeIdx)] = Math.max(0.04, Number(target.value) || 0.2);
            this.sdk.updatePart(this.selectedPartId, { size: nextSize });
            this.runLiveSelfTest();
            this.render();
          }
          return;
        }

        const attachField = target.getAttribute('data-part-attach');
        if (attachField) {
          const part = (this.sdk.getDraft().geometry?.parts || []).find(
            (p) => p.id === this.selectedPartId
          );
          if (part) {
            const toVal =
              attachField === 'to' ? target.value : part.attach?.to || '';
            const sideVal =
              attachField === 'side' ? target.value : part.attach?.side || 'top';
            if (!toVal) {
              this.sdk.updatePart(this.selectedPartId, { attach: null });
            } else {
              this.sdk.attachPart({
                partId: this.selectedPartId,
                to: toVal,
                side: sideVal,
                gap: part.attach?.gap ?? 0,
                offset: part.attach?.offset || [0, 0, 0]
              });
            }
            this.runLiveSelfTest();
            this.render();
          }
          return;
        }
      }

      // Prop obstacle flags
      const propFlag = target.getAttribute('data-prop-flag');
      if (propFlag && 'checked' in target) {
        const draft = this.sdk.getDraft();
        draft.obstacleProfile = {
          ...(draft.obstacleProfile || {}),
          [propFlag]: Boolean(target.checked)
        };
        this.sdk.setDraft(draft);
        this.render();
      }
    });

    // Live distance / environmental slider input
    this.container.addEventListener('input', (event) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (!target) return;
      if (target.getAttribute('data-field') === 'test-distance-cm') {
        this.runLiveSelfTest({ distanceCm: Number(target.value) || 12 });
        return;
      }
      const envKey = target.getAttribute('data-test-env-key');
      if (envKey) {
        const val = Number(target.value);
        const unit = target.getAttribute('data-test-env-unit') || '';
        this.runLiveSelfTest({ envParams: { [envKey]: val } });
        const readout = this.container.querySelector(`[data-readout="test-env-${envKey}"]`);
        if (readout) {
          readout.textContent = `${val}${unit ? ` ${unit}` : ''}`;
        }
      }
    });
  }

  _applyCameraPreset(view = 'iso') {
    const v = String(view || 'iso').toLowerCase();
    if (v === 'top') {
      this._turntableYaw = 0;
      this._turntablePitch = 1.42;
    } else if (v === 'front') {
      this._turntableYaw = 0;
      this._turntablePitch = 0.12;
    } else if (v === 'side') {
      this._turntableYaw = Math.PI / 2;
      this._turntablePitch = 0.12;
    } else {
      this._turntableYaw = 0.58;
      this._turntablePitch = 0.42;
    }
    this._syncStudioCameraPosition();
  }

  _syncStudioCameraPosition() {
    if (!this._studioCamera) return;
    const draft = this.sdk.getDraft();
    const maxDim = Math.max(
      Number(draft.geometry?.width) || 2.6,
      Number(draft.geometry?.height) || 1.2,
      Number(draft.geometry?.depth) || 2.2
    );
    const radius = Math.max(4.6, maxDim * 1.95) * this._cameraDistanceScale;
    const y = Math.max(0.8, Math.sin(this._turntablePitch) * radius);
    const horiz = Math.cos(this._turntablePitch) * radius;
    const x = Math.sin(this._turntableYaw) * horiz;
    const z = Math.cos(this._turntableYaw) * horiz;

    this._studioCamera.position.set(x, y, z);
    this._studioCamera.lookAt(0, 0.25, 0);
  }

  _mountStudioCanvas() {
    if (!this.container || typeof document === 'undefined') return;
    const wrap = this.container.querySelector('#studio-page-canvas-wrap');
    if (!wrap) return;

    try {
      if (!this._studioScene) {
        this._studioScene = new THREE.Scene();
        this._studioCamera = new THREE.PerspectiveCamera(38, 16 / 10, 0.1, 120);

        const ambient = new THREE.AmbientLight(0xffffff, 0.92);
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
        keyLight.position.set(6, 10, 7);
        const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.55);
        rimLight.position.set(-6, 5, -5);
        this._studioScene.add(ambient, keyLight, rimLight);

        this._studioPedestalGrid = new THREE.GridHelper(12, 24, 0x334155, 0x1e293b);
        this._studioPedestalGrid.position.y = -0.35;
        this._studioScene.add(this._studioPedestalGrid);
      }

      if (!this._studioRenderer && typeof WebGLRenderingContext !== 'undefined') {
        this._studioRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this._studioRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      }

      if (this._studioRenderer) {
        const width = Math.max(480, wrap.clientWidth || 720);
        const height = Math.max(320, wrap.clientHeight || 440);
        this._studioRenderer.setSize(width, height, false);
        this._studioCamera.aspect = width / height;
        this._studioCamera.updateProjectionMatrix();

        wrap.innerHTML = '';
        wrap.appendChild(this._studioRenderer.domElement);
        this._bindCanvasOrbitEvents(this._studioRenderer.domElement);
      }

      this._rebuildStudioMesh();
      this._startStudioLoop();
    } catch {
      // Headless / JSDOM fallback where WebGL context is unavailable
    }
  }

  _bindCanvasOrbitEvents(canvas) {
    if (!canvas || canvas._studioOrbitBound) return;
    canvas._studioOrbitBound = true;

    canvas.addEventListener('pointerdown', (e) => {
      this._isDraggingViewport = true;
      this._dragPrevX = e.clientX;
      this._dragPrevY = e.clientY;
    });

    window.addEventListener('pointermove', (e) => {
      if (!this._isDraggingViewport) return;
      const dx = e.clientX - this._dragPrevX;
      const dy = e.clientY - this._dragPrevY;
      this._dragPrevX = e.clientX;
      this._dragPrevY = e.clientY;
      this._turntableYaw -= dx * 0.01;
      this._turntablePitch = Math.max(0.08, Math.min(1.48, this._turntablePitch + dy * 0.008));
      this._syncStudioCameraPosition();
    });

    window.addEventListener('pointerup', () => {
      this._isDraggingViewport = false;
    });

    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1.08 : 0.92;
        this._cameraDistanceScale = Math.max(0.45, Math.min(2.6, this._cameraDistanceScale * factor));
        this._syncStudioCameraPosition();
      },
      { passive: false }
    );
  }

  _rebuildStudioMesh() {
    if (!this._studioScene) return;

    if (this._studioPreviewGroup) {
      this._studioScene.remove(this._studioPreviewGroup);
      this._studioPreviewGroup = null;
    }
    if (this._studioXRayGroup) {
      this._studioScene.remove(this._studioXRayGroup);
      this._studioXRayGroup = null;
    }

    const draft = this.sdk.getDraft();
    const { ComponentClass } = DynamicComponentBuilder.createClassFromSpec(draft);
    this._studioComponent = new ComponentClass({ id: 'studio_live_preview' });
    this._studioPreviewGroup = this._studioComponent.group;
    this._studioScene.add(this._studioPreviewGroup);

    // Apply current Test Bench voltages onto the new 3D mesh
    this._applyTestBenchToPreviewComponent();

    // Build X-Ray / Selected Part Bounding-Box overlay
    this._studioXRayGroup = new THREE.Group();
    const parts = draft.geometry?.parts || [];
    for (const part of parts) {
      const isSelected = part.id === this.selectedPartId;
      if (!this.sdk.xRayMode && !isSelected) continue;
      const boundsRes = this.sdk.getPartBounds(part.id, { recordTool: false });
      if (!boundsRes?.ok || !boundsRes.bounds) continue;
      const [sx, sy, sz] = boundsRes.bounds.size;
      const [cx, cy, cz] = boundsRes.bounds.center;
      const boxGeo = new THREE.BoxGeometry(sx + 0.03, sy + 0.03, sz + 0.03);
      const edges = new THREE.EdgesGeometry(boxGeo);
      const lineMat = new THREE.LineBasicMaterial({
        color: isSelected ? 0x38bdf8 : 0x94a3b8
      });
      const wire = new THREE.LineSegments(edges, lineMat);
      wire.position.set(cx, cy, cz);
      this._studioXRayGroup.add(wire);
    }
    this._studioScene.add(this._studioXRayGroup);

    this._syncStudioCameraPosition();
  }

  _startStudioLoop() {
    if (this._studioRafId || typeof requestAnimationFrame !== 'function') return;
    const tick = () => {
      if (!this.isOpen && this.container?.hidden) {
        this._studioRafId = null;
        return;
      }
      if (this._studioComponent && typeof this._studioComponent.onTick === 'function') {
        this._studioComponent.onTick(0.016);
      }
      if (this._studioRenderer && this._studioScene && this._studioCamera) {
        this._studioRenderer.render(this._studioScene, this._studioCamera);
      }
      this._studioRafId = requestAnimationFrame(tick);
    };
    this._studioRafId = requestAnimationFrame(tick);
  }

  _stopStudioLoop() {
    if (this._studioRafId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this._studioRafId);
    }
    this._studioRafId = null;
  }

  _escapeHtml(str = '') {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  _escapeAttr(str = '') {
    return this._escapeHtml(str).replace(/"/g, '&quot;');
  }

  destroy() {
    this._stopStudioLoop();
    if (typeof this._unsubLocale === 'function') {
      this._unsubLocale();
    }
    if (typeof this._unsubTheme === 'function') {
      this._unsubTheme();
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
