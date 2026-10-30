import { i18n } from '../../core/i18n/I18nService.js';
import { ScenarioSerializer } from '../../core/scenario/ScenarioSerializer.js';
import { DynamicComponentBuilder } from '../../core/components/DynamicComponentBuilder.js';
import { hardwareRegistry } from '../../core/registry/ComponentRegistry.js';
import { backendApiClient } from '../../core/ai/BackendApiClient.js';

/**
 * Built-in curated 3D reference projects (`CircuitScenarioSchema v2`) covering
 * all 3 host boards (`Arduino Uno R3`, `ESP32 DevKit V1`, `NVIDIA Jetson Nano`).
 */
export const REFERENCE_3D_PROJECTS = Object.freeze([
  Object.freeze({
    id: 'ref-arduino-traffic-servo',
    slug: 'arduino-uno-traffic-barrier',
    title: 'Arduino Uno — Akıllı Bariyer & Mesafe Radarı (HC-SR04 + SG90)',
    description:
      'HC-SR04 ultrasonik sensör ile 25cm altında yaklaşan aracı algılayıp SG90 servo bariyeri kaldıran ve durum LED’ini yakan kapalı çevrim devre.',
    board_type: 'board.arduino_uno',
    code: [
      'void setup() {',
      '  Serial.begin(115200);',
      '  pinMode(9, OUTPUT);',
      '  pinMode(13, OUTPUT);',
      '}',
      'void loop() {',
      '  digitalWrite(13, HIGH);',
      '  analogWrite(9, 180);',
      '  Serial.println("BARRIER_OPEN: 90 deg | LED: ON");',
      '  delay(500);',
      '}'
    ].join('\n'),
    circuit_json: {
      version: '2.0',
      boards: [
        {
          id: 'uno_host',
          typeId: 'board.arduino_uno',
          position: [0, 0, 0]
        }
      ],
      components: [
        {
          id: 'bb_main',
          typeId: 'board.breadboard',
          position: [0, 0, 7.2]
        },
        {
          id: 'ultrasonic_1',
          typeId: 'sensor.ultrasonic',
          position: [-4.5, 0, 6.8],
          state: { distanceCm: 18 }
        },
        {
          id: 'servo_barrier',
          typeId: 'actuator.servo',
          position: [4.8, 0, 6.5]
        },
        {
          id: 'res_status',
          typeId: 'passive.resistor',
          position: [-1.2, 0, 6.8],
          state: { ohms: 220 }
        },
        {
          id: 'led_status',
          typeId: 'led.single',
          position: [0.8, 0, 6.8],
          color: 0x00ff66
        }
      ],
      connections: [
        { id: 'w1', from: 'uno_host.PIN13', to: 'res_status.LEAD_A', color: '#00f2ff' },
        { id: 'w2', from: 'res_status.LEAD_B', to: 'led_status.ANODE', color: '#ffaa00' },
        { id: 'w3', from: 'led_status.CATHODE', to: 'uno_host.GND', color: '#1e2430' },
        { id: 'w4', from: 'uno_host.5V', to: 'servo_barrier.VCC', color: '#ff3355' },
        { id: 'w5', from: 'uno_host.PIN9', to: 'servo_barrier.SIGNAL', color: '#a855f7' },
        { id: 'w6', from: 'servo_barrier.GND', to: 'uno_host.GND', color: '#1e2430' }
      ],
      customComponents: []
    }
  }),

  Object.freeze({
    id: 'ref-esp32-iot-telemetry',
    slug: 'esp32-greenhouse-dht22-telemetry',
    title: 'ESP32 DevKit V1 — Akıllı Sera Telemetri & Özel Sensör (3.3V)',
    description:
      'ESP32 3.3V lojik hattı üzerinde potansiyometre, durum LED’i ve çalışma zamanında sentezlenmiş özel DHT22 Nem/Sıcaklık sensörü.',
    board_type: 'board.esp32_devkit',
    code: [
      'void setup() {',
      '  Serial.begin(115200);',
      '  pinMode(2, OUTPUT);',
      '}',
      'void loop() {',
      '  digitalWrite(2, HIGH);',
      '  Serial.println("ESP32_TELEMETRY: Temp=24.6C Hum=58%");',
      '  delay(500);',
      '}'
    ].join('\n'),
    circuit_json: {
      version: '2.0',
      boards: [
        {
          id: 'esp32_host',
          typeId: 'board.esp32_devkit',
          position: [0, 0, 0]
        }
      ],
      components: [
        {
          id: 'res_esp',
          typeId: 'passive.resistor',
          position: [-2.0, 0, 5.5],
          state: { ohms: 220 }
        },
        {
          id: 'led_esp',
          typeId: 'led.single',
          position: [0.5, 0, 5.5],
          color: 0x38bdf8
        },
        {
          id: 'dht_custom_1',
          typeId: 'sensor.dht22_probe',
          position: [3.6, 0, 5.5]
        }
      ],
      connections: [
        { id: 'e1', from: 'esp32_host.GPIO2', to: 'res_esp.LEAD_A', color: '#38bdf8' },
        { id: 'e2', from: 'res_esp.LEAD_B', to: 'led_esp.ANODE', color: '#00ff88' },
        { id: 'e3', from: 'led_esp.CATHODE', to: 'esp32_host.GND', color: '#1e2430' },
        { id: 'e4', from: 'esp32_host.3V3', to: 'dht_custom_1.VCC', color: '#ef4444' },
        { id: 'e5', from: 'dht_custom_1.SDA', to: 'esp32_host.GPIO4', color: '#f59e0b' },
        { id: 'e6', from: 'dht_custom_1.GND', to: 'esp32_host.GND', color: '#1e2430' }
      ],
      customComponents: [
        {
          typeId: 'sensor.dht22_probe',
          name: 'DHT22 Digital Temp/Humidity Probe',
          category: 'sensor',
          description: 'Single-bus digital temperature and humidity sensor module',
          packageType: 'breakout',
          color: '#0F766E',
          dimensions: [12.0, 1.8, 15.0],
          pins: [
            { name: 'VCC', position: [-2.54, -2.2, 5.5], direction: 'IN', role: 'VCC_IN', protocol: 'DC', maxVoltage: 5.5 },
            { name: 'SDA', position: [0.0, -2.2, 5.5], direction: 'IO', role: 'DATA', protocol: 'GPIO', maxVoltage: 5.5 },
            { name: 'GND', position: [2.54, -2.2, 5.5], direction: 'IN', role: 'GND_IN', protocol: 'DC', maxVoltage: 5.5 }
          ],
          dipoles: [
            { pinA: 'VCC', pinB: 'GND', resistance: 1200, forwardVoltage: 0, unidirectional: false, maxCurrent: 0.05 }
          ]
        }
      ]
    }
  }),

  Object.freeze({
    id: 'ref-jetson-edge-rover',
    slug: 'jetson-nano-vision-rover-telemetry',
    title: 'NVIDIA Jetson Nano — Edge AI Otonom Rover & Motor PWM Sürücü',
    description:
      'Jetson Nano 40-pin J41 başlığı üzerinden PWM32/PWM33 ve I2C1 hatlarıyla otonom eyleyici ve durum göstergesi kontrolü.',
    board_type: 'board.jetson_nano',
    code: [
      'void setup() {',
      '  Serial.begin(115200);',
      '  pinMode(33, OUTPUT);',
      '}',
      'void loop() {',
      '  digitalWrite(33, HIGH);',
      '  Serial.println("JETSON_CUDA_VISION: Target locked @ 60 FPS");',
      '  delay(500);',
      '}'
    ].join('\n'),
    circuit_json: {
      version: '2.0',
      boards: [
        {
          id: 'jetson_host',
          typeId: 'board.jetson_nano',
          position: [0, 0, 0]
        }
      ],
      components: [
        {
          id: 'res_jet',
          typeId: 'passive.resistor',
          position: [-2.2, 0, 6.2],
          state: { ohms: 220 }
        },
        {
          id: 'led_jet',
          typeId: 'led.single',
          position: [0.6, 0, 6.2],
          color: 0x76b900
        },
        {
          id: 'servo_pan',
          typeId: 'actuator.servo',
          position: [4.2, 0, 6.2]
        }
      ],
      connections: [
        { id: 'j1', from: 'jetson_host.PWM_PIN33', to: 'res_jet.LEAD_A', color: '#76b900' },
        { id: 'j2', from: 'res_jet.LEAD_B', to: 'led_jet.ANODE', color: '#00f2ff' },
        { id: 'j3', from: 'led_jet.CATHODE', to: 'jetson_host.GND', color: '#1e2430' }
      ],
      customComponents: []
    }
  })
]);

const BOARD_LABELS = Object.freeze({
  'board.arduino_uno': 'Arduino Uno R3 (5V)',
  'board.esp32_devkit': 'ESP32 DevKit V1 (3.3V)',
  'board.jetson_nano': 'NVIDIA Jetson Nano (3.3V)'
});

/**
 * ProjectsAndGroupsModal — User Workspace Dashboard (`Çalışma Alanlarım`),
 * 3D Reference Scenarios, Study Groups, Real-Time Cloud Auto-Save, and Guest Mode Prompt.
 */
const LAST_ACTIVE_WORKSPACE_KEY = 'circuitlab_last_active_workspace_slug';
const WORKSPACE_SNAPSHOT_PREFIX = 'circuitlab_ws_snapshot_';

export class ProjectsAndGroupsModal {
  constructor({
    rootEl,
    stage = null,
    registry = hardwareRegistry,
    apiClient = backendApiClient,
    getCurrentCode = null,
    onScenarioLoaded = null,
    onOpenAuthModal = null,
    onWorkspaceStatusChange = null,
    onActiveWorkspaceChange = null,
    onRouteSync = null,
    onCloseToWorkbench = null,
    onOpenCreditStore = null,
    onLogout = null,
    onProfileUpdated = null
  } = {}) {
    this.rootEl = rootEl;
    this.stage = stage;
    this.registry = registry;
    this.apiClient = apiClient;
    this.getCurrentCode = getCurrentCode;
    this.onScenarioLoaded = onScenarioLoaded;
    this.onOpenAuthModal = onOpenAuthModal;
    this.onWorkspaceStatusChange = onWorkspaceStatusChange;
    this.onActiveWorkspaceChange = onActiveWorkspaceChange;
    this.onRouteSync = onRouteSync;
    this.onCloseToWorkbench = onCloseToWorkbench;
    this.onOpenCreditStore = onOpenCreditStore;
    this.onLogout = onLogout;
    this.onProfileUpdated = onProfileUpdated;

    this.isOpen = false;
    this.activeTab = 'workspaces'; // 'workspaces' | 'groups' | 'presets' | 'account'
    this.projects = [...REFERENCE_3D_PROJECTS];
    this.userWorkspaces = [];
    this.activeWorkspace = null;
    this.sessionUser = this.apiClient?.user || null;
    this.groups = [];
    this.statusMessage = '';
    this.guestPromptDismissed = false;
    this.isGuestPromptVisible = false;

    this._lastLoadedDeserialized = null;
    this._autoSaveTimer = null;
    this._isHydratingStage = false;
    this._containerEl = null;
    this._guestBannerEl = null;

    this._onBeforeUnload = () => {
      if (this._autoSaveTimer) {
        clearTimeout(this._autoSaveTimer);
        this._autoSaveTimer = null;
        this._writeLocalWorkspaceSnapshot(this.activeWorkspace, { dirty: true });
        this.autoSaveActiveWorkspace({ reason: 'beforeunload' });
      }
    };
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('beforeunload', this._onBeforeUnload);
    }

    this._unsubLocale = i18n.onChange(() => {
      if (this.isOpen) this.render();
      if (this.isGuestPromptVisible) this._renderGuestBanner();
    });
  }

  _getStorage() {
    if (this.apiClient?.storage) return this.apiClient.storage;
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    return null;
  }

  _getLastActiveWorkspaceSlug() {
    try {
      return this._getStorage()?.getItem(LAST_ACTIVE_WORKSPACE_KEY) || null;
    } catch {
      return null;
    }
  }

  _setLastActiveWorkspaceSlug(slug) {
    if (!slug) return;
    try {
      this._getStorage()?.setItem(LAST_ACTIVE_WORKSPACE_KEY, String(slug));
    } catch {
      // Ignore storage quota errors
    }
  }

  _writeLocalWorkspaceSnapshot(workspace, { circuitJson = null, code = null, dirty = false } = {}) {
    if (!workspace?.slug) return;
    const storage = this._getStorage();
    if (!storage) return;
    try {
      const resolvedCircuit = circuitJson || this.serializeActiveStage(workspace.title);
      const resolvedCode = code ?? this.getCurrentCode?.() ?? resolvedCircuit?.code ?? workspace.code ?? '';
      const snapshot = {
        id: workspace.id,
        slug: workspace.slug,
        title: workspace.title,
        board_type:
          this.stage?.hostBoard?.typeId ||
          resolvedCircuit?.boards?.[0]?.typeId ||
          workspace.board_type ||
          'board.arduino_uno',
        circuit_json: resolvedCircuit,
        code: resolvedCode,
        updated_at: new Date().toISOString(),
        dirty: Boolean(dirty)
      };
      storage.setItem(`${WORKSPACE_SNAPSHOT_PREFIX}${workspace.slug}`, JSON.stringify(snapshot));
    } catch {
      // Ignore storage quota errors
    }
  }

  _readLocalWorkspaceSnapshot(slug) {
    if (!slug) return null;
    const storage = this._getStorage();
    if (!storage) return null;
    try {
      const raw = storage.getItem(`${WORKSPACE_SNAPSHOT_PREFIX}${slug}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  mount() {
    if (!this.rootEl) return this;
    this._containerEl = document.createElement('div');
    this._containerEl.className = 'wb-modal-backdrop wb-workspace-page-overlay is-hidden';
    this._containerEl.dataset.testid = 'projects-groups-modal';
    this._containerEl.dataset.viewMode = 'page';
    this.rootEl.appendChild(this._containerEl);

    const hostParent = this.rootEl.parentElement || document.body;
    if (hostParent && typeof document !== 'undefined') {
      this._guestBannerEl = document.createElement('div');
      this._guestBannerEl.className = 'wb-guest-prompt-layer is-hidden';
      this._guestBannerEl.dataset.testid = 'wb-guest-prompt-layer';
      hostParent.appendChild(this._guestBannerEl);
    }
    return this;
  }

  async open(tab = 'workspaces', options = {}) {
    const allowedTabs = ['workspaces', 'presets', 'groups', 'account'];
    this.activeTab = allowedTabs.includes(tab) ? tab : 'workspaces';
    this.isOpen = true;
    this.statusMessage = '';
    this.sessionUser = this.apiClient?.user || this.sessionUser || null;
    if (this.rootEl) {
      this.rootEl.hidden = false;
      this.rootEl.removeAttribute?.('hidden');
    }
    if (!options?.fromRouter) {
      this.onRouteSync?.(this.activeTab);
    }
    this.render();
    await this.refreshRemoteProjects();
    await this.refreshStudyGroups();
    if (this.sessionUser?.email) {
      await this.refreshUserWorkspaces();
    }
  }

  close(options = {}) {
    const wasOpen = this.isOpen;
    this.isOpen = false;
    if (this._containerEl) {
      this._containerEl.classList.add('is-hidden');
      this._containerEl.innerHTML = '';
    }
    if (this.rootEl) {
      const anyVisibleModal = this.rootEl.querySelector?.('.wb-modal-backdrop:not(.is-hidden)');
      if (!anyVisibleModal) {
        this.rootEl.hidden = true;
        this.rootEl.setAttribute?.('hidden', '');
      }
    }
    if (wasOpen && !options?.fromRouter) {
      this.onCloseToWorkbench?.(this.activeWorkspace);
    }
  }

  toggle(tab = 'workspaces') {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(tab);
    }
  }

  async setSessionUser(
    user,
    { autoCreateWorkspaceIfEmpty = true, targetWorkspaceSlug = null } = {}
  ) {
    this.sessionUser = user || null;
    if (this.sessionUser?.email) {
      this.hideGuestPrompt();
      await this.refreshUserWorkspaces();
      if (targetWorkspaceSlug) {
        let matched = this.userWorkspaces.find(
          (w) => w.slug === targetWorkspaceSlug || String(w.id) === String(targetWorkspaceSlug)
        );
        if (!matched) {
          const localSnap = this._readLocalWorkspaceSnapshot(targetWorkspaceSlug);
          if (localSnap?.circuit_json) {
            matched = await this.createNewWorkspace({
              title: localSnap.title || `${this.sessionUser.name || 'Maker'} — Çalışma Alanı #1`,
              boardType: localSnap.board_type || this.stage?.hostBoard?.typeId || 'board.arduino_uno',
              seedCurrentStage: false,
              resetStage: false
            });
          }
        }
        const isKnownPresetSlug = this.projects.some((p) => p.slug === targetWorkspaceSlug);
        if (!matched && isKnownPresetSlug && typeof this.apiClient?.getProject === 'function') {
          const fetched = await this.apiClient.getProject(targetWorkspaceSlug);
          if (fetched && fetched.circuit_json) {
            matched = fetched;
            this.userWorkspaces = [
              fetched,
              ...this.userWorkspaces.filter((w) => w.slug !== fetched.slug)
            ];
          }
        }
        if (matched) {
          this.loadUserWorkspace(matched.slug || matched.id);
          if (this.isOpen) this.render();
          return;
        }
      }
      if (autoCreateWorkspaceIfEmpty && !this.activeWorkspace) {
        if (this.userWorkspaces.length > 0) {
          const preferredSlug = targetWorkspaceSlug || this._getLastActiveWorkspaceSlug();
          const target =
            (preferredSlug &&
              this.userWorkspaces.find(
                (w) => w.slug === preferredSlug || String(w.id) === String(preferredSlug)
              )) ||
            this.userWorkspaces[0];
          this.loadUserWorkspace(target.slug || target.id);
        } else {
          await this.createNewWorkspace({
            title: `${this.sessionUser.name || 'Maker'} — Çalışma Alanı #1`,
            boardType: this.stage?.hostBoard?.typeId || 'board.arduino_uno',
            seedCurrentStage: true,
            resetStage: false
          });
        }
      }
    } else {
      this.activeWorkspace = null;
      this.userWorkspaces = [];
      this._emitWorkspaceStatus('guest');
    }

    if (this.isOpen) {
      this.render();
    }
  }

  _emitWorkspaceStatus(state = 'idle') {
    this.onWorkspaceStatusChange?.({
      state,
      title: this.activeWorkspace?.title || '',
      slug: this.activeWorkspace?.slug || '',
      workspace: this.activeWorkspace || null
    });
  }

  async refreshRemoteProjects() {
    if (!this.apiClient) return this.projects;
    const res = await this.apiClient.listProjects();
    const remoteList = Array.isArray(res) ? res : Array.isArray(res?.projects) ? res.projects : [];
    const bySlug = new Map();
    for (const ref of REFERENCE_3D_PROJECTS) {
      bySlug.set(ref.slug, ref);
    }
    for (const remote of remoteList) {
      if (remote?.slug && remote?.circuit_json) {
        bySlug.set(remote.slug, remote);
      }
    }
    this.projects = Array.from(bySlug.values());
    if (this.isOpen) this.render();
    return this.projects;
  }

  async refreshUserWorkspaces() {
    if (!this.apiClient || !this.sessionUser?.email) {
      this.userWorkspaces = [];
      return this.userWorkspaces;
    }
    const res = await this.apiClient.listUserWorkspaces();
    const rawWorkspaces = Array.isArray(res) ? res : Array.isArray(res?.workspaces) ? res.workspaces : [];
    const workspaces = [];
    for (const ws of rawWorkspaces) {
      const localSnap = ws?.slug ? this._readLocalWorkspaceSnapshot(ws.slug) : null;
      if (localSnap?.dirty && localSnap?.circuit_json) {
        const merged = {
          ...ws,
          board_type: localSnap.board_type || ws.board_type,
          circuit_json: localSnap.circuit_json,
          code: localSnap.code ?? ws.code ?? ''
        };
        workspaces.push(merged);
        this.apiClient
          .updateWorkspace(ws.slug || ws.id, {
            title: merged.title,
            board_type: merged.board_type,
            circuit_json: merged.circuit_json,
            code: merged.code
          })
          .then((synced) => {
            if (synced?.slug) {
              this._writeLocalWorkspaceSnapshot(synced, {
                circuitJson: synced.circuit_json || merged.circuit_json,
                code: synced.code ?? merged.code,
                dirty: false
              });
            }
          })
          .catch(() => {});
      } else {
        workspaces.push(ws);
      }
    }
    this.userWorkspaces = workspaces;
    if (this.activeWorkspace) {
      const updated = workspaces.find(
        (w) => w.id === this.activeWorkspace.id || w.slug === this.activeWorkspace.slug
      );
      if (updated) {
        this.activeWorkspace = updated;
      }
    }
    if (this.isOpen) this.render();
    return this.userWorkspaces;
  }

  /**
   * Called when the user enters or starts working in the 3D Workbench (`/workbench` or `/workspace/<slug>`).
   * - If authenticated: loads the requested `/workspace/<slug>` (or most recent workspace) onto the 3D stage,
   *   or creates a workspace if the user has none. NEVER overwrites a saved workspace with an empty stage on boot!
   * - If unauthenticated (guest): prompts the user to log in while allowing them to continue in guest mode.
   */
  async handleWorkbenchSessionStart({
    source = 'workbench',
    project = null,
    workspaceSlug = null
  } = {}) {
    this.sessionUser = this.apiClient?.user || this.sessionUser || null;
    if (this.sessionUser?.email) {
      this.hideGuestPrompt();
      await this.refreshUserWorkspaces();

      if (project) {
        const created = await this.createNewWorkspace({
          title: project.title || `Çalışma Alanı (${source})`,
          boardType: project.board_type || this.stage?.hostBoard?.typeId || 'board.arduino_uno',
          seedCurrentStage: true,
          resetStage: false
        });
        return { mode: 'authenticated', workspace: created };
      }

      if (workspaceSlug) {
        let targetWs = this.userWorkspaces.find(
          (w) => w.slug === workspaceSlug || String(w.id) === String(workspaceSlug)
        );
        if (!targetWs) {
          const localSnap = this._readLocalWorkspaceSnapshot(workspaceSlug);
          if (localSnap?.circuit_json) {
            const restored = await this.createNewWorkspace({
              title: localSnap.title || `${this.sessionUser.name || 'Maker'} — Çalışma Alanı #1`,
              boardType: localSnap.board_type || this.stage?.hostBoard?.typeId || 'board.arduino_uno',
              seedCurrentStage: false,
              resetStage: false
            });
            if (restored) {
              this.loadProjectOntoStage({
                ...restored,
                board_type: localSnap.board_type || restored.board_type,
                circuit_json: localSnap.circuit_json,
                code: localSnap.code || restored.code || ''
              });
              await this.saveActiveWorkspace({ immediate: true });
              return { mode: 'authenticated', workspace: this.activeWorkspace };
            }
          }
        }
        if (targetWs) {
          this.loadUserWorkspace(targetWs.slug || targetWs.id);
          return { mode: 'authenticated', workspace: this.activeWorkspace };
        }
        // Check if it matches a reference preset
        const presetMatch = this.projects.find((p) => p.slug === workspaceSlug);
        if (presetMatch) {
          this.loadProjectOntoStage(presetMatch);
          return { mode: 'authenticated', workspace: presetMatch };
        }
      }

      if (this.userWorkspaces.length > 0) {
        const preferredSlug =
          workspaceSlug || this.activeWorkspace?.slug || this._getLastActiveWorkspaceSlug();
        const targetWs =
          (preferredSlug &&
            this.userWorkspaces.find(
              (w) => w.slug === preferredSlug || String(w.id) === String(preferredSlug)
            )) ||
          this.userWorkspaces[0];
        this.loadUserWorkspace(targetWs.slug || targetWs.id);
      } else {
        await this.createNewWorkspace({
          title: `${this.sessionUser.name || 'Maker'} — Çalışma Alanı #1`,
          boardType: this.stage?.hostBoard?.typeId || 'board.arduino_uno',
          seedCurrentStage: true,
          resetStage: false
        });
      }

      return { mode: 'authenticated', workspace: this.activeWorkspace };
    }

    // Unauthenticated guest: if a workspaceSlug or local snapshot exists, try hydrating it
    if (workspaceSlug) {
      const localSnap = this._readLocalWorkspaceSnapshot(workspaceSlug);
      if (localSnap?.circuit_json) {
        this.loadProjectOntoStage(localSnap);
      } else {
        const presetMatch = this.projects.find((p) => p.slug === workspaceSlug);
        if (presetMatch) {
          this.loadProjectOntoStage(presetMatch);
        }
      }
    }

    // Show non-blocking guest prompt unless already dismissed
    if (!this.guestPromptDismissed) {
      this.showGuestPrompt();
    }
    this._emitWorkspaceStatus('guest');
    return {
      mode: 'guest',
      promptShown: this.isGuestPromptVisible
    };
  }

  showGuestPrompt() {
    this.isGuestPromptVisible = true;
    this._renderGuestBanner();
  }

  hideGuestPrompt() {
    this.isGuestPromptVisible = false;
    if (this._guestBannerEl) {
      this._guestBannerEl.classList.add('is-hidden');
      this._guestBannerEl.innerHTML = '';
    }
  }

  continueAsGuest() {
    this.guestPromptDismissed = true;
    this.hideGuestPrompt();
    this._emitWorkspaceStatus('guest');
    return { continuedAsGuest: true };
  }

  _renderGuestBanner() {
    if (!this._guestBannerEl) return;
    if (!this.isGuestPromptVisible || this.sessionUser?.email) {
      this._guestBannerEl.classList.add('is-hidden');
      this._guestBannerEl.innerHTML = '';
      return;
    }

    this._guestBannerEl.classList.remove('is-hidden');
    this._guestBannerEl.innerHTML = `
      <div class="wb-guest-auth-prompt" id="wb-guest-auth-prompt" role="region" aria-label="${i18n.t('workbench.guest_prompt.title')}">
        <div class="wb-guest-prompt-copy">
          <span class="wb-guest-prompt-dot" aria-hidden="true"></span>
          <div>
            <strong>${i18n.t('workbench.guest_prompt.title')}</strong>
            <p>${i18n.t('workbench.guest_prompt.body')}</p>
          </div>
        </div>
        <div class="wb-guest-prompt-actions">
          <button
            type="button"
            class="wb-primary-btn wb-sm-btn"
            id="wb-guest-login-btn"
            data-testid="wb-guest-login-btn"
          >
            ${i18n.t('workbench.guest_prompt.login_cta')}
          </button>
          <button
            type="button"
            class="wb-secondary-btn wb-sm-btn"
            id="wb-guest-continue-btn"
            data-testid="wb-guest-continue-btn"
          >
            ${i18n.t('workbench.guest_prompt.continue_guest_cta')}
          </button>
        </div>
      </div>
    `;

    this._guestBannerEl.querySelector('#wb-guest-login-btn')?.addEventListener('click', () => {
      this.onOpenAuthModal?.('login');
    });

    this._guestBannerEl.querySelector('#wb-guest-continue-btn')?.addEventListener('click', () => {
      this.continueAsGuest();
    });
  }

  /**
   * Creates a new user workspace in the dashboard and binds the 3D stage to it.
   */
  async createNewWorkspace({
    title = '',
    boardType = 'board.arduino_uno',
    seedCurrentStage = false,
    resetStage = true
  } = {}) {
    const cleanTitle =
      String(title || '').trim() ||
      `Çalışma Alanı #${this.userWorkspaces.length + 1}`;
    const targetBoard = boardType || 'board.arduino_uno';

    if (resetStage && !seedCurrentStage && this.stage) {
      this._isHydratingStage = true;
      try {
        this.stage.clearStage?.({ keepHostBoard: targetBoard !== 'none', hostBoardTypeId: targetBoard });
      } finally {
        this._isHydratingStage = false;
      }
    }

    const circuitJson = seedCurrentStage
      ? this.serializeActiveStage(cleanTitle)
      : {
          version: '2.0',
          meta: { title: cleanTitle },
          boards:
            targetBoard === 'none'
              ? []
              : [
                  {
                    id: 'host_board_1',
                    typeId: targetBoard,
                    position: [0, 0, 0]
                  }
                ],
          components: [],
          connections: [],
          customComponents: [],
          code: this.getCurrentCode?.() || ''
        };

    const code = this.getCurrentCode?.() || circuitJson.code || '';

    this._emitWorkspaceStatus('saving');
    let created = null;
    try {
      created = await this.apiClient.createProject({
        title: cleanTitle,
        description: `${BOARD_LABELS[targetBoard] || targetBoard} · Bulut Çalışma Alanı`,
        board_type: targetBoard,
        circuit_json: circuitJson,
        code,
        is_public: false
      });
    } catch (err) {
      this.statusMessage = err?.message || 'Çalışma alanı oluşturulamadı.';
      this._emitWorkspaceStatus(this.activeWorkspace ? 'saved' : 'idle');
      if (this.isOpen) this.render();
      throw err;
    }

    this.activeWorkspace = created;
    this._setLastActiveWorkspaceSlug(created.slug);
    this._writeLocalWorkspaceSnapshot(created, {
      circuitJson: created.circuit_json || circuitJson,
      code: created.code ?? code,
      dirty: false
    });
    this.userWorkspaces = [
      created,
      ...this.userWorkspaces.filter((w) => w.id !== created.id && w.slug !== created.slug)
    ];

    if (resetStage && !seedCurrentStage) {
      this.loadProjectOntoStage(created, { preserveActiveWorkspace: true });
    }

    this.statusMessage = `${i18n.t('workbench.projects.workspace_created_toast')}: ${created.title}`;
    this._emitWorkspaceStatus('saved');
    this.onActiveWorkspaceChange?.(created);
    if (this.isOpen) this.render();
    return created;
  }

  /**
   * Loads one of the user's saved workspaces onto the 3D stage and marks it as the active workspace.
   */
  loadUserWorkspace(idOrSlug) {
    const found = this.userWorkspaces.find(
      (w) => String(w.id) === String(idOrSlug) || w.slug === idOrSlug
    );
    if (!found) {
      return { loaded: false, reason: `Workspace "${idOrSlug}" not found.` };
    }
    this.activeWorkspace = found;
    this._setLastActiveWorkspaceSlug(found.slug);
    const res = this.loadProjectOntoStage(found, { preserveActiveWorkspace: true });
    this._emitWorkspaceStatus('saved');
    this.onActiveWorkspaceChange?.(found);
    return {
      ...res,
      workspace: found
    };
  }

  async deleteUserWorkspace(idOrSlug) {
    if (!idOrSlug) return { deleted: false };
    await this.apiClient?.deleteProject(idOrSlug);
    this.userWorkspaces = this.userWorkspaces.filter(
      (w) => String(w.id) !== String(idOrSlug) && w.slug !== idOrSlug
    );
    if (
      this.activeWorkspace &&
      (String(this.activeWorkspace.id) === String(idOrSlug) || this.activeWorkspace.slug === idOrSlug)
    ) {
      this.activeWorkspace = this.userWorkspaces[0] || null;
      if (this.activeWorkspace) {
        this._setLastActiveWorkspaceSlug(this.activeWorkspace.slug);
      }
    }
    this.statusMessage = i18n.t('workbench.projects.workspace_deleted_toast');
    this._emitWorkspaceStatus(this.activeWorkspace ? 'saved' : 'idle');
    if (this.isOpen) this.render();
    return { deleted: true };
  }

  /**
   * Schedules a debounced auto-save whenever the 3D stage, wiring, or code changes.
   * Immediately writes a local snapshot so even an instant page refresh (`F5`) never loses state.
   */
  scheduleAutoSave(reason = 'stage_change', delayMs = 420) {
    if (this._isHydratingStage) return false;
    if (!this.sessionUser?.email) {
      if (!this.guestPromptDismissed && !this.isGuestPromptVisible) {
        this.showGuestPrompt();
      }
      this._emitWorkspaceStatus('guest');
      return false;
    }

    if (this.activeWorkspace) {
      this._writeLocalWorkspaceSnapshot(this.activeWorkspace, { dirty: true });
    }

    this._emitWorkspaceStatus('saving');
    if (this._autoSaveTimer) {
      clearTimeout(this._autoSaveTimer);
    }
    this._autoSaveTimer = setTimeout(() => {
      this._autoSaveTimer = null;
      this.autoSaveActiveWorkspace({ reason });
    }, Math.max(0, Number(delayMs) || 0));
    return true;
  }

  /**
   * Immediately persists the current 3D stage & code into the user's active cloud workspace.
   */
  async autoSaveActiveWorkspace({ reason = 'edit' } = {}) {
    if (this._isHydratingStage) {
      return { saved: false, reason: 'hydrating' };
    }
    const user = this.sessionUser || this.apiClient?.user || null;
    if (!user?.email) {
      this._emitWorkspaceStatus('guest');
      return { saved: false, reason: 'unauthenticated' };
    }

    this._emitWorkspaceStatus('saving');

    if (!this.activeWorkspace) {
      const created = await this.createNewWorkspace({
        title: `${user.name || 'Maker'} — Çalışma Alanı #1`,
        boardType: this.stage?.hostBoard?.typeId || 'board.arduino_uno',
        seedCurrentStage: true,
        resetStage: false
      });
      return {
        saved: true,
        createdNew: true,
        reason,
        workspace: created
      };
    }

    const circuitJson = this.serializeActiveStage(this.activeWorkspace.title);
    const boardType =
      this.stage?.hostBoard?.typeId ||
      circuitJson.boards?.[0]?.typeId ||
      circuitJson.boards?.[0]?.type ||
      this.activeWorkspace.board_type ||
      'board.arduino_uno';
    const code = this.getCurrentCode?.() ?? circuitJson.code ?? this.activeWorkspace.code ?? '';

    this._writeLocalWorkspaceSnapshot(this.activeWorkspace, {
      circuitJson,
      code,
      dirty: true
    });

    const updated = await this.apiClient.updateProject(
      this.activeWorkspace.id || this.activeWorkspace.slug,
      {
        title: this.activeWorkspace.title,
        description: this.activeWorkspace.description,
        board_type: boardType,
        circuit_json: circuitJson,
        code
      }
    );

    this.activeWorkspace = updated;
    this._setLastActiveWorkspaceSlug(updated.slug);
    this._writeLocalWorkspaceSnapshot(updated, {
      circuitJson: updated.circuit_json || circuitJson,
      code: updated.code ?? code,
      dirty: false
    });
    this.userWorkspaces = [
      updated,
      ...this.userWorkspaces.filter((w) => w.id !== updated.id && w.slug !== updated.slug)
    ];

    this._emitWorkspaceStatus('saved');
    if (this.isOpen) this.render();
    return {
      saved: true,
      createdNew: false,
      reason,
      workspace: updated
    };
  }

  /**
   * Hydrates a `CircuitScenarioSchema v2` project onto the live 3D `BoardStage`,
   * including any custom components synthesized via `DynamicComponentBuilder`.
   */
  loadProjectOntoStage(project, { preserveActiveWorkspace = false } = {}) {
    if (!project || !project.circuit_json) {
      return { loaded: false, reason: 'Invalid project payload' };
    }

    // Check if there is an unsynced local snapshot for this workspace from an immediate refresh
    const localSnap = project.slug ? this._readLocalWorkspaceSnapshot(project.slug) : null;
    const effectiveProject =
      localSnap && localSnap.dirty && localSnap.circuit_json
        ? {
            ...project,
            circuit_json: localSnap.circuit_json,
            code: localSnap.code ?? project.code,
            board_type: localSnap.board_type || project.board_type
          }
        : project;

    const rawCircuit = effectiveProject.circuit_json || {};
    const normalizedScenario = {
      version: '2.0',
      id: rawCircuit.id || `scenario.${effectiveProject.slug || effectiveProject.id || 'workspace'}`,
      mode: 'freeform',
      meta: {
        title: effectiveProject.title || rawCircuit.meta?.title || 'CircuitLab 3D Workspace',
        ...(rawCircuit.meta || {})
      },
      boards: Array.isArray(rawCircuit.boards)
        ? rawCircuit.boards.map((b, i) => ({
            ...b,
            id: b.id || `host_board_${i + 1}`,
            typeId: b.typeId || b.type || effectiveProject.board_type || 'board.arduino_uno',
            position: Array.isArray(b.position) ? b.position : [0, 0, 0]
          }))
        : effectiveProject.board_type && effectiveProject.board_type !== 'none'
        ? [{ id: 'host_board_1', typeId: effectiveProject.board_type, position: [0, 0, 0] }]
        : [],
      components: Array.isArray(rawCircuit.components)
        ? rawCircuit.components.map((c, i) => ({
            ...c,
            id: c.id || `comp_${i + 1}`,
            typeId: c.typeId || c.type
          }))
        : [],
      connections: Array.isArray(rawCircuit.connections) ? rawCircuit.connections : [],
      customComponents: Array.isArray(rawCircuit.customComponents) ? rawCircuit.customComponents : [],
      code: effectiveProject.code ?? rawCircuit.code ?? ''
    };

    this._isHydratingStage = true;
    try {
      const customSpecs = normalizedScenario.customComponents;
      for (const spec of customSpecs) {
        DynamicComponentBuilder.registerFromSpec(spec, this.registry);
      }

      const deserialized =
        typeof this.stage?.loadScenario === 'function'
          ? this.stage.loadScenario(normalizedScenario)
          : ScenarioSerializer.deserializeToStage(normalizedScenario, {
              registry: this.registry,
              stageGroup: this.stage?.lessonGroup || null,
              reusePrimaryBoard: this.stage?.hostBoard || null
            });

      this._lastLoadedDeserialized = {
        project: effectiveProject,
        deserialized
      };

      this.statusMessage = `${i18n.t('workbench.projects.loaded_toast')}: ${effectiveProject.title}`;
      this.onScenarioLoaded?.({
        project: effectiveProject,
        deserialized,
        code: normalizedScenario.code
      });

      if (
        !preserveActiveWorkspace &&
        this.sessionUser?.email &&
        effectiveProject.user_id === this.sessionUser.id
      ) {
        this.activeWorkspace = effectiveProject;
        this._setLastActiveWorkspaceSlug(effectiveProject.slug);
      }

      if (this.isOpen) this.render();

      // If we hydrated a dirty local snapshot, flush it to the backend asynchronously
      if (localSnap?.dirty && this.sessionUser?.email && this.activeWorkspace?.slug === effectiveProject.slug) {
        Promise.resolve().then(() => {
          this.autoSaveActiveWorkspace({ reason: 'recover_dirty_snapshot' });
        });
      }

      return {
        loaded: true,
        boardType: effectiveProject.board_type,
        customComponentsCount: customSpecs.length,
        deserialized
      };
    } finally {
      this._isHydratingStage = false;
    }
  }

  loadProjectBySlug(slug) {
    const project =
      this.projects.find((p) => p.slug === slug) ||
      this.userWorkspaces.find((w) => w.slug === slug);
    if (!project) {
      return { loaded: false, reason: `Project slug "${slug}" not found.` };
    }
    return this.loadProjectOntoStage(project);
  }

  async forkProject(slug) {
    const project =
      this.projects.find((p) => p.slug === slug) ||
      this.userWorkspaces.find((w) => w.slug === slug);
    if (!project) {
      return { loaded: false, reason: `Project slug "${slug}" not found.` };
    }

    let forkedRecord = null;
    if (this.apiClient) {
      try {
        forkedRecord = await this.apiClient.forkProject(slug);
      } catch (err) {
        this.statusMessage = err?.message || 'Çalışma alanı kopyalanamadı.';
        if (this.isOpen) this.render();
        throw err;
      }
    }

    const hydrated = this.loadProjectOntoStage(project);
    const forkedProject = forkedRecord || {
      ...project,
      slug: `${project.slug}-fork-${Date.now().toString(36)}`,
      title: `${project.title} (Fork)`
    };

    if (this.sessionUser?.email) {
      this.activeWorkspace = forkedProject;
      this._setLastActiveWorkspaceSlug(forkedProject.slug);
      this.userWorkspaces = [
        forkedProject,
        ...this.userWorkspaces.filter((w) => w.slug !== forkedProject.slug)
      ];
      this._emitWorkspaceStatus('saved');
      this.onActiveWorkspaceChange?.(forkedProject);
    }

    return {
      ...hydrated,
      project: forkedProject
    };
  }

  /**
   * Serializes the current live 3D stage (host board + components + wires + custom components + code)
   * into a `CircuitScenarioSchema v2` payload.
   */
  serializeActiveStage(title = 'CircuitLab 3D Scene') {
    const hasLiveStage = typeof this.stage?.getIndependentComponents === 'function';
    const hostBoard = this.stage?.hostBoard;
    const boards = hasLiveStage
      ? hostBoard
        ? [hostBoard]
        : []
      : hostBoard
      ? [hostBoard]
      : this._lastLoadedDeserialized?.deserialized?.boards || [];

    const stageComponents = this.stage?.getIndependentComponents?.() || [];
    const components = hasLiveStage
      ? stageComponents
      : stageComponents.length > 0
      ? stageComponents
      : this._lastLoadedDeserialized?.deserialized?.components || [];

    const liveConnections = this.stage?.wireTool?.getConnections?.() || [];
    const mapConnections = (conns) =>
      conns.map((w, idx) => ({
        id: w.id || `wire_${idx + 1}`,
        from:
          typeof w.from === 'string'
            ? w.from
            : `${w.fromPin?.component?.id || 'host_board_1'}.${w.fromPin?.name || 'PIN13'}`,
        to:
          typeof w.to === 'string'
            ? w.to
            : `${w.toPin?.component?.id || 'comp_1'}.${w.toPin?.name || 'LEAD_A'}`,
        color:
          typeof w.color === 'string'
            ? w.color
            : typeof w.colorHex === 'number'
            ? `#${w.colorHex.toString(16).padStart(6, '0')}`
            : '#00f2ff'
      }));

    const connections = hasLiveStage
      ? mapConnections(liveConnections)
      : liveConnections.length > 0
      ? mapConnections(liveConnections)
      : this._lastLoadedDeserialized?.deserialized?.connections || [];

    const customComponents = DynamicComponentBuilder.getRegisteredSpecs();
    const code = this.getCurrentCode?.() ?? this._lastLoadedDeserialized?.project?.code ?? '';

    return ScenarioSerializer.serializeStage({
      boards,
      components,
      connections,
      customComponents,
      code,
      meta: { title }
    });
  }

  async shareActiveStageToGroup(title = 'Shared 3D Circuit') {
    const circuitJson = this.serializeActiveStage(title);
    const boardType =
      circuitJson.boards[0]?.typeId ||
      circuitJson.boards[0]?.type ||
      'board.arduino_uno';
    const created = await this.apiClient?.createProject({
      title,
      description: 'Paylaşılan 3B devre sahnesi (özel bileşenlerle birlikte)',
      board_type: boardType,
      circuit_json: circuitJson,
      code: circuitJson.code || '',
      is_public: true
    });
    if (created) {
      this.projects = [created, ...this.projects];
      if (this.sessionUser?.email) {
        this.userWorkspaces = [
          created,
          ...this.userWorkspaces.filter((w) => w.id !== created.id && w.slug !== created.slug)
        ];
      }
      if (this.isOpen) this.render();
    }
    return created;
  }

  async createGroup(name) {
    if (!name || !name.trim()) return null;
    let group = null;
    try {
      group = await this.apiClient?.createStudyGroup({ name: name.trim() });
    } catch (err) {
      this.statusMessage = err?.message || 'Çalışma grubu oluşturulamadı.';
      if (this.isOpen) this.render();
      throw err;
    }
    if (group) {
      this.groups = [group, ...this.groups];
      if (this.isOpen) this.render();
    }
    return group;
  }

  async joinGroupByCode(inviteCode) {
    if (!inviteCode || !inviteCode.trim()) return null;
    const group = await this.apiClient?.joinStudyGroup({ inviteCode: inviteCode.trim() });
    if (group) {
      this.groups = [group, ...this.groups.filter((g) => g.invite_code !== group.invite_code)];
      if (this.isOpen) this.render();
    }
    return group;
  }

  async joinGroup(inviteCode) {
    return this.joinGroupByCode(inviteCode);
  }

  async refreshStudyGroups() {
    if (!this.apiClient || typeof this.apiClient.listStudyGroups !== 'function') {
      return this.groups;
    }
    try {
      const remoteGroups = await this.apiClient.listStudyGroups();
      if (Array.isArray(remoteGroups) && remoteGroups.length > 0) {
        const byCode = new Map();
        for (const g of remoteGroups) {
          if (g?.invite_code || g?.id) {
            byCode.set(g.invite_code || String(g.id), g);
          }
        }
        for (const localG of this.groups) {
          if (localG?.invite_code || localG?.id) {
            byCode.set(localG.invite_code || String(localG.id), localG);
          }
        }
        this.groups = Array.from(byCode.values());
        if (this.isOpen) this.render();
      }
    } catch {
      // Keep local groups on error
    }
    return this.groups;
  }

  async updateAccountProfile({ name = '', email = '' } = {}) {
    if (!this.apiClient) return { ok: false, error: 'no_api_client' };
    try {
      const res = await this.apiClient.updateProfile({ name, email });
      if (res?.user) {
        this.sessionUser = res.user;
        this.onProfileUpdated?.(this.sessionUser);
      }
      this.statusMessage = res?.message || i18n.t('workbench.projects.profile_updated_toast');
      if (this.isOpen) this.render();
      return { ok: true, ...res };
    } catch (err) {
      this.statusMessage = err?.message || 'Profil bilgileri güncellenemedi.';
      if (this.isOpen) this.render();
      return { ok: false, error: this.statusMessage };
    }
  }

  async updateAccountPassword(payload = {}) {
    if (!this.apiClient) return { ok: false, error: 'no_api_client' };
    const currentPassword = payload.currentPassword ?? payload.current_password ?? '';
    const newPassword = payload.newPassword ?? payload.password ?? '';
    const newPasswordConfirmation =
      payload.newPasswordConfirmation ?? payload.password_confirmation ?? '';
    try {
      const res = await this.apiClient.changePassword({
        currentPassword,
        newPassword,
        newPasswordConfirmation
      });
      this.statusMessage = res?.message || i18n.t('workbench.projects.password_updated_toast');
      if (this.isOpen) this.render();
      return { ok: true, ...res };
    } catch (err) {
      this.statusMessage = err?.message || 'Parola güncellenemedi.';
      if (this.isOpen) this.render();
      return { ok: false, error: this.statusMessage };
    }
  }

  _countWorkspaceSummary(workspace) {
    const cj = workspace?.circuit_json || {};
    const compCount = Array.isArray(cj.components) ? cj.components.length : 0;
    const wireCount = Array.isArray(cj.connections) ? cj.connections.length : 0;
    return `${compCount} parça · ${wireCount} kablo`;
  }

  render() {
    if (!this._containerEl) return;
    if (!this.isOpen) {
      this._containerEl.classList.add('is-hidden');
      this._containerEl.innerHTML = '';
      return;
    }

    this._containerEl.classList.remove('is-hidden');
    const isAuthenticated = Boolean(this.sessionUser && this.sessionUser.email);
    const userRole = String(this.apiClient?.getUserRole?.() || this.sessionUser?.role || 'free').toUpperCase();
    const quotas = this.apiClient?.getQuotas?.() || this.sessionUser?.quotas || null;
    const maxWorkspaces =
      quotas?.workspaces?.limit !== undefined
        ? Number(quotas.workspaces.limit)
        : userRole === 'PRO' || userRole === 'ADMIN'
        ? -1
        : 3;
    const quotaLabel =
      maxWorkspaces === -1
        ? `${userRole} PLAN · ${this.userWorkspaces.length} / ∞ Çalışma Alanı`
        : `${userRole} PLAN · ${this.userWorkspaces.length} / ${maxWorkspaces} Çalışma Alanı`;
    const creditsObj = this.apiClient?.getCredits?.() || null;
    const availableCredits = creditsObj?.available_credits;
    const promoCredits = Number(creditsObj?.promotional_credits ?? 0);
    const purchasedCredits = Number(creditsObj?.purchased_credits ?? 0);
    const isLowCredits =
      isAuthenticated && typeof availableCredits === 'number' && availableCredits < 20;

    this._containerEl.innerHTML = `
      <div class="wb-modal-dialog wb-modal-lg wb-workspace-page-shell" role="region" aria-labelledby="wb-projects-title">
        <header class="wb-modal-header wb-workspace-page-header">
          <div class="wb-workspace-page-brand">
            <span class="wb-workspace-page-badge wb-workspace-url-badge" data-testid="workspace-url-badge">CIRCUITLAB 3D PORTAL · ${this.activeTab === 'workspaces' ? '/workspace' : `/workspace?tab=${this.activeTab}`}</span>
            <h3 id="wb-projects-title">${i18n.t('workbench.projects.title')}</h3>
            <p class="wb-modal-subtitle">${i18n.t('workbench.projects.workspace_AutoSave_hint')}</p>
          </div>
          <div class="wb-workspace-header-actions">
            ${
              isAuthenticated
                ? `<span class="wb-board-tag" data-testid="header-user-pill">👤 ${this.sessionUser.name || this.sessionUser.email} (${userRole})</span>`
                : ''
            }
            <button
              type="button"
              class="wb-primary-btn wb-sm-btn"
              id="btn-return-workbench"
              data-testid="return-to-workbench-btn"
            >
              ⚡ ${i18n.t('workbench.projects.return_workbench_btn')}
            </button>
            <button
              type="button"
              class="wb-icon-btn"
              id="btn-close-projects-modal"
              aria-label="${i18n.t('workbench.projects.close')}"
              title="${i18n.t('workbench.projects.return_workbench_btn')}"
            >✕</button>
          </div>
        </header>

        <div class="wb-tab-strip wb-workspace-nav-tabs" role="tablist">
          <button
            type="button"
            class="wb-tab-btn ${this.activeTab === 'workspaces' ? 'is-active' : ''}"
            data-tab="workspaces"
            data-testid="tab-user-workspaces"
          >
            📁 ${i18n.t('workbench.projects.tab_workspaces')} (${this.userWorkspaces.length})
          </button>
          <button
            type="button"
            class="wb-tab-btn ${this.activeTab === 'groups' ? 'is-active' : ''}"
            data-tab="groups"
            data-testid="tab-study-groups"
          >
            👥 ${i18n.t('workbench.projects.tab_groups')} (${this.groups.length})
          </button>
          <button
            type="button"
            class="wb-tab-btn ${this.activeTab === 'presets' ? 'is-active' : ''}"
            data-tab="presets"
            data-testid="tab-preset-projects"
          >
            🤖 ${i18n.t('workbench.projects.tab_presets')}
          </button>
          <button
            type="button"
            class="wb-tab-btn ${this.activeTab === 'account' ? 'is-active' : ''}"
            data-tab="account"
            data-testid="tab-account-settings"
          >
            🔐 ${i18n.t('workbench.projects.tab_account')}
          </button>
        </div>

        <div class="wb-modal-body wb-workspace-page-body">
          ${this.statusMessage ? `<div class="wb-status-banner" data-testid="workspace-status-banner">${this.statusMessage}</div>` : ''}

          ${
            this.activeTab === 'workspaces'
              ? isAuthenticated
                ? `
                  <div class="wb-workspace-dashboard" data-testid="user-workspace-dashboard">
                    <div class="wb-project-meta" style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                      <span class="wb-board-tag" data-testid="workspace-quota-badge">${quotaLabel}</span>
                      ${
                        isLowCredits
                          ? `<span class="wb-custom-tag" data-testid="low-credit-warning" style="color:#f59e0b;">⚡ Düşük AI Kredisi (${availableCredits.toFixed(1)} Kredi)</span>`
                          : ''
                      }
                    </div>
                    <form id="wb-new-workspace-form" class="wb-new-workspace-bar">
                      <input
                        type="text"
                        id="wb-new-workspace-title"
                        class="wb-text-input"
                        placeholder="${i18n.t('workbench.projects.new_workspace_title_placeholder')}"
                      />
                      <select id="wb-new-workspace-board" class="wb-select-input" aria-label="${i18n.t('workbench.projects.new_workspace_board_label')}">
                        <option value="board.arduino_uno">Arduino Uno R3 (5V)</option>
                        <option value="board.esp32_devkit">ESP32 DevKit V1 (3.3V)</option>
                        <option value="board.jetson_nano">NVIDIA Jetson Nano (3.3V)</option>
                      </select>
                      <button
                        type="submit"
                        class="wb-primary-btn"
                        id="btn-create-workspace"
                        data-testid="create-workspace-btn"
                      >
                        ${i18n.t('workbench.projects.new_workspace_btn')}
                      </button>
                    </form>

                    ${
                      this.userWorkspaces.length === 0
                        ? `<p class="wb-empty-note">${i18n.t('workbench.projects.empty_workspaces')}</p>`
                        : `
                          <div class="wb-projects-grid wb-workspaces-grid">
                            ${this.userWorkspaces
                              .map((ws) => {
                                const isCurrent =
                                  this.activeWorkspace &&
                                  (this.activeWorkspace.id === ws.id || this.activeWorkspace.slug === ws.slug);
                                return `
                                  <article
                                    class="wb-project-card wb-workspace-card ${isCurrent ? 'is-active-workspace' : ''}"
                                    data-workspace-slug="${ws.slug}"
                                  >
                                    <div class="wb-project-meta">
                                      <span class="wb-board-tag">${BOARD_LABELS[ws.board_type] || ws.board_type}</span>
                                      ${
                                        isCurrent
                                          ? `<span class="wb-workspace-active-pill">${i18n.t('workbench.projects.workspace_active_badge')}</span>`
                                          : `<span class="wb-workspace-meta-pill">${this._countWorkspaceSummary(ws)}</span>`
                                      }
                                    </div>
                                    <h4>${ws.title}</h4>
                                    <div class="wb-workspace-url-row">
                                      <code class="wb-workspace-slug-badge" data-testid="workspace-card-url">/workspace/${ws.slug}</code>
                                    </div>
                                    <p>${ws.description || this._countWorkspaceSummary(ws)}</p>
                                    <div class="wb-project-actions">
                                      <button
                                        type="button"
                                        class="wb-primary-btn"
                                        data-load-workspace="${ws.slug}"
                                      >
                                        ${i18n.t('workbench.projects.workspace_open_btn')}
                                      </button>
                                      <button
                                        type="button"
                                        class="wb-secondary-btn wb-danger-outline-btn"
                                        data-delete-workspace="${ws.slug}"
                                      >
                                        ${i18n.t('workbench.projects.workspace_delete_btn')}
                                      </button>
                                    </div>
                                  </article>
                                `;
                              })
                              .join('')}
                          </div>
                        `
                    }
                  </div>
                `
                : `
                  <div class="wb-workspace-guest-callout" data-testid="workspace-guest-callout">
                    <div class="wb-guest-callout-badge">CLOUD WORKSPACE SYNC</div>
                    <h4>${i18n.t('workbench.projects.guest_workspace_title')}</h4>
                    <p>${i18n.t('workbench.projects.guest_workspace_desc')}</p>
                    <div class="wb-guest-callout-actions">
                      <button
                        type="button"
                        class="wb-primary-btn"
                        id="btn-dashboard-open-login"
                        data-testid="dashboard-open-login-btn"
                      >
                        ${i18n.t('workbench.projects.guest_login_cta')}
                      </button>
                      <button
                        type="button"
                        class="wb-secondary-btn"
                        id="btn-dashboard-continue-guest"
                      >
                        ${i18n.t('workbench.guest_prompt.continue_guest_cta')}
                      </button>
                    </div>
                  </div>
                `
              : this.activeTab === 'presets'
              ? `
                <div class="wb-projects-grid">
                  ${this.projects
                    .map(
                      (p) => `
                        <article class="wb-project-card" data-project-slug="${p.slug}">
                          <div class="wb-project-meta">
                            <span class="wb-board-tag">${BOARD_LABELS[p.board_type] || p.board_type}</span>
                            ${
                              p.circuit_json?.customComponents?.length
                                ? `<span class="wb-custom-tag">+${p.circuit_json.customComponents.length} Özel Parça</span>`
                                : ''
                            }
                          </div>
                          <h4>${p.title}</h4>
                          <p>${p.description || ''}</p>
                          <div class="wb-project-actions">
                            <button type="button" class="wb-primary-btn" data-load-slug="${p.slug}">
                              ${i18n.t('workbench.projects.load_btn')}
                            </button>
                            <button type="button" class="wb-secondary-btn" data-fork-slug="${p.slug}">
                              ${i18n.t('workbench.projects.fork_btn')}
                            </button>
                          </div>
                        </article>
                      `
                    )
                    .join('')}
                </div>
              `
              : this.activeTab === 'groups'
              ? `
                <div class="wb-groups-layout" data-testid="user-study-groups-panel">
                  <div class="wb-group-forms">
                    <div class="wb-group-box">
                      <h4>${i18n.t('workbench.projects.create_group_label')}</h4>
                      <div class="wb-inline-input">
                        <input
                          type="text"
                          id="wb-new-group-name"
                          class="wb-text-input"
                          placeholder="${i18n.t('workbench.projects.group_name_placeholder')}"
                        />
                        <button type="button" class="wb-primary-btn" id="btn-create-group">
                          ${i18n.t('workbench.projects.create_group_btn')}
                        </button>
                      </div>
                    </div>

                    <div class="wb-group-box">
                      <h4>${i18n.t('workbench.projects.join_group_label')}</h4>
                      <div class="wb-inline-input">
                        <input
                          type="text"
                          id="wb-join-group-code"
                          class="wb-text-input"
                          placeholder="${i18n.t('workbench.projects.invite_code_placeholder')}"
                        />
                        <button type="button" class="wb-secondary-btn" id="btn-join-group">
                          ${i18n.t('workbench.projects.join_group_btn')}
                        </button>
                      </div>
                    </div>

                    <div class="wb-group-box">
                      <button type="button" class="wb-primary-btn" id="btn-share-stage">
                        ${i18n.t('workbench.projects.share_stage_btn')}
                      </button>
                    </div>
                  </div>

                  <div class="wb-groups-list">
                    ${
                      this.groups.length === 0
                        ? `<p class="wb-empty-note">Henüz aktif çalışma grubu yok. Yeni bir grup oluşturun veya davet kodu girin.</p>`
                        : this.groups
                            .map(
                              (g) => `
                                <div class="wb-group-item" data-group-invite="${g.invite_code}">
                                  <div>
                                    <strong>${g.name}</strong>
                                    ${
                                      g.description
                                        ? `<p style="margin:4px 0 0;font-size:12px;color:var(--text-muted);">${g.description}</p>`
                                        : ''
                                    }
                                  </div>
                                  <span class="wb-invite-pill">Davet Kodu: <code>${g.invite_code}</code></span>
                                </div>
                              `
                            )
                            .join('')
                    }
                  </div>
                </div>
              `
              : isAuthenticated
              ? `
                <div class="wb-account-settings-grid" data-testid="user-account-panel">
                  <section class="wb-project-card wb-account-card">
                    <div class="wb-project-meta">
                      <span class="wb-board-tag">${userRole} PLAN</span>
                      <span class="wb-workspace-active-pill">${i18n.t('workbench.auth.verifiedSessionBadge')}</span>
                    </div>
                    <h4>${i18n.t('workbench.projects.plan_summary_title')}</h4>
                    <p>${quotaLabel}</p>
                    <div class="wb-account-credit-summary">
                      <div>
                        <span>Kullanılabilir Toplam AI Kredisi</span>
                        <strong data-testid="account-total-credits">⚡ ${typeof availableCredits === 'number' ? availableCredits.toFixed(1) : '0.0'} Kredi</strong>
                      </div>
                      <div>
                        <span>Promosyon / Satın Alınan</span>
                        <strong>${promoCredits.toFixed(1)} / ${purchasedCredits.toFixed(1)}</strong>
                      </div>
                    </div>
                    <div class="wb-project-actions" style="margin-top:14px;">
                      <button
                        type="button"
                        class="wb-primary-btn"
                        id="btn-account-topup"
                        data-testid="account-topup-btn"
                      >
                        ⚡ Kredi Yükle
                      </button>
                      <button
                        type="button"
                        class="wb-secondary-btn wb-danger-outline-btn"
                        id="btn-account-logout"
                        data-testid="account-logout-btn"
                      >
                        ${i18n.t('workbench.auth.logoutBtn')}
                      </button>
                    </div>
                  </section>

                  <section class="wb-project-card wb-account-card">
                    <h4>${i18n.t('workbench.projects.profile_section_title')}</h4>
                    <p>${i18n.t('workbench.projects.profile_section_desc')}</p>
                    <form id="wb-profile-update-form" class="wb-account-form" data-testid="profile-update-form">
                      <label class="wb-field-label">
                        <span>${i18n.t('workbench.auth.name_label')}</span>
                        <input
                          type="text"
                          id="wb-profile-name"
                          class="wb-text-input"
                          value="${this.sessionUser.name || ''}"
                          required
                        />
                      </label>
                      <label class="wb-field-label">
                        <span>${i18n.t('workbench.auth.email_label')}</span>
                        <input
                          type="email"
                          id="wb-profile-email"
                          class="wb-text-input"
                          value="${this.sessionUser.email || ''}"
                          required
                        />
                      </label>
                      <button
                        type="submit"
                        class="wb-primary-btn"
                        id="btn-save-profile"
                        data-testid="save-profile-btn"
                      >
                        ${i18n.t('workbench.projects.profile_save_btn')}
                      </button>
                    </form>
                  </section>

                  <section class="wb-project-card wb-account-card">
                    <h4>${i18n.t('workbench.projects.password_section_title')}</h4>
                    <p>${i18n.t('workbench.projects.password_section_desc')}</p>
                    <form id="wb-password-change-form" class="wb-account-form" data-testid="password-change-form">
                      <label class="wb-field-label">
                        <span>${i18n.t('workbench.projects.current_password_label')}</span>
                        <input
                          type="password"
                          id="wb-current-password"
                          class="wb-text-input"
                          placeholder="••••••••"
                          autocomplete="current-password"
                          required
                        />
                      </label>
                      <label class="wb-field-label">
                        <span>${i18n.t('workbench.projects.new_password_label')}</span>
                        <input
                          type="password"
                          id="wb-new-password"
                          class="wb-text-input"
                          placeholder="${i18n.t('workbench.auth.password_placeholder')}"
                          autocomplete="new-password"
                          required
                        />
                      </label>
                      <label class="wb-field-label">
                        <span>${i18n.t('workbench.projects.new_password_confirm_label')}</span>
                        <input
                          type="password"
                          id="wb-new-password-confirm"
                          class="wb-text-input"
                          placeholder="${i18n.t('workbench.auth.password_placeholder')}"
                          autocomplete="new-password"
                          required
                        />
                      </label>
                      <button
                        type="submit"
                        class="wb-primary-btn"
                        id="btn-save-password"
                        data-testid="save-password-btn"
                      >
                        ${i18n.t('workbench.projects.password_save_btn')}
                      </button>
                    </form>
                  </section>
                </div>
              `
              : `
                <div class="wb-workspace-guest-callout" data-testid="workspace-guest-callout">
                  <div class="wb-guest-callout-badge">ACCOUNT & SECURITY</div>
                  <h4>${i18n.t('workbench.projects.guest_workspace_title')}</h4>
                  <p>${i18n.t('workbench.projects.guest_workspace_desc')}</p>
                  <div class="wb-guest-callout-actions">
                    <button
                      type="button"
                      class="wb-primary-btn"
                      id="btn-dashboard-open-login"
                      data-testid="dashboard-open-login-btn"
                    >
                      ${i18n.t('workbench.projects.guest_login_cta')}
                    </button>
                  </div>
                </div>
              `
          }
        </div>
      </div>
    `;

    this._containerEl.querySelector('#btn-close-projects-modal')?.addEventListener('click', () => this.close());
    this._containerEl.querySelector('#btn-return-workbench')?.addEventListener('click', () => this.close());

    this._containerEl.querySelectorAll('.wb-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        this.statusMessage = '';
        this.onRouteSync?.(this.activeTab);
        this.render();
      });
    });

    this._containerEl.querySelector('#wb-new-workspace-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = this._containerEl.querySelector('#wb-new-workspace-title')?.value || '';
      const boardType =
        this._containerEl.querySelector('#wb-new-workspace-board')?.value || 'board.arduino_uno';
      try {
        await this.createNewWorkspace({
          title,
          boardType,
          seedCurrentStage: false,
          resetStage: true
        });
        this.close();
      } catch (_err) {
        // Error message already displayed in statusMessage
      }
    });

    this._containerEl.querySelectorAll('[data-load-workspace]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const slug = btn.dataset.loadWorkspace;
        await this.loadUserWorkspace(slug);
        this.close();
      });
    });

    this._containerEl.querySelectorAll('[data-delete-workspace]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const slug = btn.dataset.deleteWorkspace;
        await this.deleteUserWorkspace(slug);
      });
    });

    this._containerEl.querySelector('#btn-dashboard-open-login')?.addEventListener('click', () => {
      this.close();
      this.onOpenAuthModal?.('login');
    });

    this._containerEl.querySelector('#btn-dashboard-continue-guest')?.addEventListener('click', () => {
      this.continueAsGuest();
      this.close();
    });

    this._containerEl.querySelectorAll('[data-load-slug]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const slug = btn.dataset.loadSlug;
        this.loadProjectBySlug(slug);
        this.close();
      });
    });

    this._containerEl.querySelectorAll('[data-fork-slug]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const slug = btn.dataset.forkSlug;
        await this.forkProject(slug);
        this.close();
      });
    });

    this._containerEl.querySelector('#btn-create-group')?.addEventListener('click', async () => {
      const input = this._containerEl.querySelector('#wb-new-group-name');
      await this.createGroup(input?.value || '');
    });

    this._containerEl.querySelector('#btn-join-group')?.addEventListener('click', async () => {
      const input = this._containerEl.querySelector('#wb-join-group-code');
      await this.joinGroupByCode(input?.value || '');
    });

    this._containerEl.querySelector('#btn-share-stage')?.addEventListener('click', async () => {
      await this.shareActiveStageToGroup('Paylaşılan 3B Devre');
    });

    this._containerEl.querySelector('#wb-profile-update-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = this._containerEl.querySelector('#wb-profile-name')?.value || '';
      const email = this._containerEl.querySelector('#wb-profile-email')?.value || '';
      try {
        await this.updateAccountProfile({ name, email });
      } catch (_err) {
        // Error shown in statusMessage
      }
    });

    this._containerEl.querySelector('#wb-password-change-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = this._containerEl.querySelector('#wb-current-password')?.value || '';
      const newPassword = this._containerEl.querySelector('#wb-new-password')?.value || '';
      const newPasswordConfirmation =
        this._containerEl.querySelector('#wb-new-password-confirm')?.value || '';
      try {
        await this.updateAccountPassword({
          currentPassword,
          newPassword,
          newPasswordConfirmation
        });
      } catch (_err) {
        // Error shown in statusMessage
      }
    });

    this._containerEl.querySelector('#btn-account-topup')?.addEventListener('click', () => {
      this.close();
      this.onOpenCreditStore?.('packages');
    });

    this._containerEl.querySelector('#btn-account-logout')?.addEventListener('click', () => {
      this.close();
      this.onLogout?.();
    });
  }

  destroy() {
    if (this._autoSaveTimer) {
      clearTimeout(this._autoSaveTimer);
    }
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function' && this._onBeforeUnload) {
      window.removeEventListener('beforeunload', this._onBeforeUnload);
    }
    this._unsubLocale?.();
    this._containerEl?.remove();
    this._guestBannerEl?.remove();
  }
}
