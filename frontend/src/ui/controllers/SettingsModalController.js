import { i18n } from '../../core/i18n/I18nService.js';
import { userSettings, PIN_VISIBILITY_MODES } from '../../core/settings/UserSettingsService.js';

/**
 * Central Settings & Cloud Profile Synchronization Modal Controller (`SettingsModalController`).
 *
 * Strictly adheres to Single Responsibility Principle:
 * - Renders the interactive Central Settings modal (`#settings-modal`).
 * - Allows switching Pin Visibility Mode (`'pin_hover'` default, `'component_hover'`, `'always'`),
 *   toggling Nearest Same-Class Drag Highlighting (`wiring.highlightNearestClassOnDrag`),
 *   configuring Stage/Language/Catalog layout preferences, and testing/inspecting Backend Cloud Profile Hydration.
 */
export class SettingsModalController {
  /**
   * @param {object} deps
   * @param {HTMLElement} [deps.stageEl]
   * @param {import('../../stage/BoardStage.js').BoardStage} [deps.stage]
   * @param {import('../../sim/simulator.js').SketchSimulator} [deps.simulator]
   * @param {import('./ComponentCatalogModal.js').ComponentCatalogModal} [deps.catalogModal]
   * @param {import('../../core/settings/UserSettingsService.js').UserSettingsService} [deps.settings]
   */
  constructor({ stageEl, stage, simulator, catalogModal, settings = userSettings } = {}) {
    this.stageEl = stageEl || null;
    this.stage = stage || null;
    this.simulator = simulator || null;
    this.catalogModal = catalogModal || null;
    this.settings = settings || userSettings;
    this.isOpen = false;

    if (this.stageEl && typeof document !== 'undefined') {
      this._mountDom();
    }

    // Apply initial persisted settings to stage, simulator, catalog, and i18n
    this._applySettingsToSubsystems();

    this._unsubscribeSettings = this.settings.onChange(({ key, value }) => {
      this._applySettingKey(key, value);
      if (this.isOpen) {
        this.render();
      }
    });

    this._unsubscribeI18n = i18n.onChange((locale) => {
      if (this.settings.get('ui.locale') !== locale) {
        this.settings.set('ui.locale', locale, { source: 'i18n' });
      }
      if (this.isOpen) {
        this.render();
      }
    });
  }

  _mountDom() {
    this.backdropEl = document.createElement('div');
    this.backdropEl.className = 'settings-modal-backdrop';
    this.backdropEl.hidden = true;

    this.backdropEl.addEventListener('click', (e) => {
      if (e.target === this.backdropEl) {
        this.close();
      }
    });

    this.stageEl.appendChild(this.backdropEl);
  }

  _applySettingsToSubsystems() {
    const all = this.settings.getAll();
    for (const [k, v] of Object.entries(all)) {
      this._applySettingKey(k, v);
    }
  }

  _applySettingKey(key, value) {
    if (key === 'stage.showGrid' && this.stage?.grid) {
      this.stage.grid.visible = Boolean(value);
    } else if (key === 'stage.soundEnabled' && this.simulator) {
      this.simulator.soundEnabled = Boolean(value);
    } else if (key === 'stage.hostBoardOverride' && this.stage?.setHostBoardOverride) {
      const target = value === 'auto' ? null : value;
      if (this.stage.circuitBuilder?.overrideHostBoardTypeId !== target) {
        this.stage.setHostBoardOverride(target);
      }
    } else if (key === 'ui.catalogDockMode' && this.catalogModal?.setDockMode) {
      if (this.catalogModal.dockMode !== value) {
        this.catalogModal.setDockMode(value);
      }
    } else if (key === 'ui.locale' && i18n.getLocale() !== value) {
      i18n.setLocale(value);
    }
  }

  open() {
    this.isOpen = true;
    if (this.backdropEl) {
      this.backdropEl.hidden = false;
      this.render();
    }
  }

  close() {
    this.isOpen = false;
    if (this.backdropEl) {
      this.backdropEl.hidden = true;
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  render() {
    if (!this.backdropEl) return;

    const pinVisMode = this.settings.get('wiring.pinVisibilityMode');
    const highlightNearest = this.settings.get('wiring.highlightNearestClassOnDrag');
    const showGrid = this.settings.get('stage.showGrid');
    const soundEnabled = this.settings.get('stage.soundEnabled');
    const hostOverride = this.settings.get('stage.hostBoardOverride');
    const dockMode = this.settings.get('ui.catalogDockMode');
    const locale = i18n.getLocale().toUpperCase();

    const session = this.settings.userSession;
    const syncStatusText = session
      ? i18n.t('ui.settings.cloudStatusSynced', { user: session.email || session.userId })
      : i18n.t('ui.settings.cloudStatusLocal');

    this.backdropEl.innerHTML = `
      <div class="settings-modal-panel" role="dialog" aria-modal="true">
        <div class="settings-modal-header">
          <div>
            <h3>${i18n.t('ui.settings.modalTitle')}</h3>
            <p>${i18n.t('ui.settings.modalSubtitle')}</p>
          </div>
          <button type="button" class="settings-modal-close" data-settings-action="close">${i18n.t('ui.settings.close')} ✕</button>
        </div>

        <div class="settings-modal-body">
          <!-- 1. Smart Wiring & Pin Visibility Section -->
          <section class="settings-section">
            <h4>${i18n.t('ui.settings.sectionWiring')}</h4>
            <div class="settings-field">
              <div class="settings-field-info">
                <b>${i18n.t('ui.settings.pinVisTitle')}</b>
                <span>${i18n.t('ui.settings.pinVisDesc')}</span>
              </div>
              <div class="settings-radio-cards">
                <button type="button" class="settings-radio-card ${pinVisMode === PIN_VISIBILITY_MODES.PIN_HOVER ? 'is-active' : ''}" data-pin-vis="${PIN_VISIBILITY_MODES.PIN_HOVER}">
                  <b>${i18n.t('ui.settings.pinVisPinHover')}</b>
                  <span>${i18n.t('ui.settings.pinVisPinHoverDesc')}</span>
                </button>
                <button type="button" class="settings-radio-card ${pinVisMode === PIN_VISIBILITY_MODES.COMPONENT_HOVER ? 'is-active' : ''}" data-pin-vis="${PIN_VISIBILITY_MODES.COMPONENT_HOVER}">
                  <b>${i18n.t('ui.settings.pinVisCompHover')}</b>
                  <span>${i18n.t('ui.settings.pinVisCompHoverDesc')}</span>
                </button>
                <button type="button" class="settings-radio-card ${pinVisMode === PIN_VISIBILITY_MODES.ALWAYS ? 'is-active' : ''}" data-pin-vis="${PIN_VISIBILITY_MODES.ALWAYS}">
                  <b>${i18n.t('ui.settings.pinVisAlways')}</b>
                  <span>${i18n.t('ui.settings.pinVisAlwaysDesc')}</span>
                </button>
              </div>
            </div>

            <div class="settings-row">
              <div class="settings-field-info">
                <b>${i18n.t('ui.settings.nearestDragTitle')}</b>
                <span>${i18n.t('ui.settings.nearestDragDesc')}</span>
              </div>
              <button type="button" class="settings-toggle-btn ${highlightNearest ? 'is-on' : ''}" data-settings-action="toggle-nearest-drag">
                ${highlightNearest ? i18n.t('ui.flyout.stateOn') : i18n.t('ui.flyout.stateOff')}
              </button>
            </div>
          </section>

          <!-- 2. Stage, Language & Catalog Preferences -->
          <section class="settings-section">
            <h4>${i18n.t('ui.settings.sectionStage')}</h4>
            <div class="settings-grid-two">
              <button type="button" class="settings-action-card" data-settings-action="toggle-lang">
                <b>${i18n.t('ui.flyout.langTitle', { lang: locale })}</b>
                <span>${i18n.t('ui.flyout.langDesc')}</span>
              </button>
              <button type="button" class="settings-action-card" data-settings-action="cycle-dock">
                <b>${i18n.t('ui.flyout.catalogDockTitle', { dock: dockMode.toUpperCase() })}</b>
                <span>${i18n.t('ui.flyout.catalogDockDesc')}</span>
              </button>
              <button type="button" class="settings-action-card ${showGrid ? 'is-active' : ''}" data-settings-action="toggle-grid">
                <b>${i18n.t('ui.flyout.gridTitle', { state: showGrid ? i18n.t('ui.flyout.stateOn') : i18n.t('ui.flyout.stateOff') })}</b>
                <span>${i18n.t('ui.flyout.gridDesc')}</span>
              </button>
              <button type="button" class="settings-action-card ${soundEnabled ? 'is-active' : ''}" data-settings-action="toggle-sound">
                <b>${i18n.t('ui.flyout.soundTitle', { state: soundEnabled ? i18n.t('ui.flyout.stateOn') : i18n.t('ui.flyout.stateOff') })}</b>
                <span>${i18n.t('ui.flyout.soundDesc')}</span>
              </button>
            </div>

            <div class="settings-host-chips">
              <button type="button" class="settings-chip ${hostOverride === 'auto' ? 'is-active' : ''}" data-host-override="auto">
                ${i18n.t('ui.flyout.hostAutoTitle')}
              </button>
              <button type="button" class="settings-chip ${hostOverride === 'board.arduino_uno' ? 'is-active' : ''}" data-host-override="board.arduino_uno">
                Arduino Uno R3 (5V)
              </button>
              <button type="button" class="settings-chip ${hostOverride === 'board.esp32_devkit' ? 'is-active' : ''}" data-host-override="board.esp32_devkit">
                ESP32 DevKit V1 (3.3V)
              </button>
            </div>
          </section>

          <!-- 3. User Session & Backend Profile Sync -->
          <section class="settings-section">
            <h4>${i18n.t('ui.settings.sectionCloud')}</h4>
            <div class="settings-cloud-bar">
              <div class="settings-cloud-status">
                <span class="settings-cloud-dot ${session ? 'is-synced' : ''}"></span>
                <span>${syncStatusText}</span>
              </div>
              <div class="settings-cloud-actions">
                ${
                  session
                    ? `<button type="button" class="settings-mini-btn" data-settings-action="cloud-logout">${i18n.t('ui.settings.cloudLogoutBtn')}</button>`
                    : `<button type="button" class="settings-mini-btn is-primary" data-settings-action="cloud-login">${i18n.t('ui.settings.cloudLoginSimulateBtn')}</button>`
                }
                <button type="button" class="settings-mini-btn" data-settings-action="reset-defaults">${i18n.t('ui.settings.resetBtn')}</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    `;

    this.backdropEl.querySelectorAll('[data-pin-vis]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.settings.set('wiring.pinVisibilityMode', btn.dataset.pinVis);
      });
    });

    this.backdropEl.querySelectorAll('[data-host-override]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.settings.set('stage.hostBoardOverride', btn.dataset.hostOverride);
      });
    });

    this.backdropEl.querySelector('[data-settings-action="close"]')?.addEventListener('click', () => {
      this.close();
    });

    this.backdropEl.querySelector('[data-settings-action="toggle-nearest-drag"]')?.addEventListener('click', () => {
      this.settings.set('wiring.highlightNearestClassOnDrag', !this.settings.get('wiring.highlightNearestClassOnDrag'));
    });

    this.backdropEl.querySelector('[data-settings-action="toggle-lang"]')?.addEventListener('click', () => {
      const next = i18n.getLocale() === 'tr' ? 'en' : 'tr';
      this.settings.set('ui.locale', next);
    });

    this.backdropEl.querySelector('[data-settings-action="cycle-dock"]')?.addEventListener('click', () => {
      const order = ['modal', 'left', 'right', 'bottom'];
      const cur = this.settings.get('ui.catalogDockMode') || 'modal';
      const next = order[(order.indexOf(cur) + 1) % order.length];
      this.settings.set('ui.catalogDockMode', next);
    });

    this.backdropEl.querySelector('[data-settings-action="toggle-grid"]')?.addEventListener('click', () => {
      this.settings.set('stage.showGrid', !this.settings.get('stage.showGrid'));
    });

    this.backdropEl.querySelector('[data-settings-action="toggle-sound"]')?.addEventListener('click', () => {
      this.settings.set('stage.soundEnabled', !this.settings.get('stage.soundEnabled'));
    });

    this.backdropEl.querySelector('[data-settings-action="reset-defaults"]')?.addEventListener('click', () => {
      this.settings.resetToDefaults();
    });

    this.backdropEl.querySelector('[data-settings-action="cloud-login"]')?.addEventListener('click', async () => {
      await this.settings.loginAndHydrate({
        userId: 'maker_cloud_01',
        email: 'maker@arduino3d.lab',
        displayName: 'Maker Cloud Profile',
        cloudSettings: {
          'wiring.pinVisibilityMode': this.settings.get('wiring.pinVisibilityMode'),
          'wiring.highlightNearestClassOnDrag': true
        }
      });
      this.render();
    });

    this.backdropEl.querySelector('[data-settings-action="cloud-logout"]')?.addEventListener('click', () => {
      this.settings.logout();
      this.render();
    });
  }
}
