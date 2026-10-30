import { hardwareRegistry } from '../../core/registry/ComponentRegistry.js';
import { i18n } from '../../core/i18n/I18nService.js';

const DOCK_STORAGE_KEY = 'learn_arduino_catalog_dock';
export const VALID_DOCK_MODES = ['modal', 'left', 'right', 'bottom'];

const CATEGORY_ICONS = {
  all: '❖',
  boards: '🎛️',
  leds: '💡',
  passives: '〰️',
  buttons: '🔘',
  sensors: '📡',
  audio: '🔊',
  motors: '⚙️'
};

/**
 * Single-Responsibility UI Controller for the Categorized, Searchable Component Catalog
 * with multi-docking (`modal`, `left`, `right`, `bottom`) and Unlimited Independent Stage Spawning.
 */
export class ComponentCatalogModal {
  /**
   * @param {object} deps
   * @param {HTMLElement} deps.stageEl
   * @param {import('../../stage/BoardStage.js').BoardStage} deps.stage
   * @param {import('../../core/registry/ComponentRegistry.js').ComponentRegistry} [deps.registry]
   * @param {(inst: import('../../core/components/HardwareComponent.js').HardwareComponent) => void} [deps.onComponentSpawned]
   */
  constructor({ stageEl, stage, registry = hardwareRegistry, onComponentSpawned }) {
    this.stageEl = stageEl;
    this.stage = stage;
    this.registry = registry;
    this.onComponentSpawned = onComponentSpawned;

    this.isOpen = false;
    this.searchQuery = '';
    this.activeCategory = 'all';
    this.dockMode = this._loadSavedDockMode();

    this.mountUI();

    this._unsubscribeI18n = i18n.onChange(() => {
      if (this.isOpen) this.render();
    });

    if (this.stage?.onStageComponentsChange) {
      this._unsubscribeStage = this.stage.onStageComponentsChange(() => {
        if (this.isOpen) this.renderResultsAndStageList();
      });
    }

    if (this.stage?.transformController?.onSelectionChange) {
      this._unsubscribeSelection = this.stage.transformController.onSelectionChange(() => {
        if (this.isOpen) this.renderResultsAndStageList();
      });
    }
  }

  _loadSavedDockMode() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(DOCK_STORAGE_KEY);
        if (saved && VALID_DOCK_MODES.includes(saved)) {
          return saved;
        }
      }
    } catch {
      // ignore storage errors
    }
    return 'modal';
  }

  /**
   * Sets the catalog layout/dock mode (`modal` | `left` | `right` | `bottom`).
   * @param {'modal'|'left'|'right'|'bottom'} mode
   */
  setDockMode(mode) {
    if (!VALID_DOCK_MODES.includes(mode)) return this.dockMode;
    this.dockMode = mode;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(DOCK_STORAGE_KEY, mode);
      }
    } catch {
      // ignore storage errors
    }
    if (this.rootEl) {
      this.rootEl.dataset.dock = this.dockMode;
    }
    if (this.isOpen) {
      this.render();
    }
    return this.dockMode;
  }

  /**
   * Cycles to the next dock mode (`modal` -> `left` -> `right` -> `bottom`).
   */
  cycleDockMode() {
    const idx = VALID_DOCK_MODES.indexOf(this.dockMode);
    const next = VALID_DOCK_MODES[(idx + 1) % VALID_DOCK_MODES.length];
    return this.setDockMode(next);
  }

  mountUI() {
    if (!this.stageEl || typeof document === 'undefined') return;
    this.rootEl = document.createElement('div');
    this.rootEl.id = 'component-catalog-shell';
    this.rootEl.className = 'catalog-shell';
    this.rootEl.dataset.dock = this.dockMode;
    this.rootEl.hidden = true;
    this.stageEl.appendChild(this.rootEl);
  }

  open(initialCategory) {
    if (initialCategory) {
      this.activeCategory = initialCategory;
    }
    this.isOpen = true;
    if (this.rootEl) {
      this.rootEl.hidden = false;
      this.rootEl.dataset.dock = this.dockMode;
    }
    this.render();
    const searchInput = this.rootEl?.querySelector('[data-catalog-search]');
    searchInput?.focus();
  }

  close() {
    this.isOpen = false;
    if (this.rootEl) {
      this.rootEl.hidden = true;
    }
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Spawns a new independent instance of `typeId` onto the 3D stage.
   * @param {string} typeId
   */
  spawnFromCatalog(typeId) {
    const inst = this.stage.spawnIndependentComponent(typeId, { autoSelect: true });
    if (inst) {
      this.onComponentSpawned?.(inst);
      this.renderResultsAndStageList();
    }
    return inst;
  }

  render() {
    if (!this.rootEl) return;
    this.rootEl.dataset.dock = this.dockMode;

    const categories = ['all', ...this.registry.getCategories()];

    const dockModes = [
      { id: 'modal', icon: '🗔', label: i18n.t('ui.catalog.dockModal') },
      { id: 'left', icon: '◧', label: i18n.t('ui.catalog.dockLeft') },
      { id: 'right', icon: '◨', label: i18n.t('ui.catalog.dockRight') },
      { id: 'bottom', icon: '⬓', label: i18n.t('ui.catalog.dockBottom') }
    ];

    this.rootEl.innerHTML = `
      <div class="catalog-panel" role="dialog" aria-label="${i18n.t('ui.catalog.title')}">
        <div class="catalog-header">
          <div class="catalog-title-wrap">
            <h3>🧩 ${i18n.t('ui.catalog.title')}</h3>
            <p>${i18n.t('ui.catalog.subtitle')}</p>
          </div>
          <div class="catalog-dock-bar" title="${i18n.t('ui.catalog.dockLabel')}">
            <span class="catalog-dock-label">${i18n.t('ui.catalog.dockLabel')}:</span>
            ${dockModes
              .map(
                (d) => `
              <button type="button" class="catalog-dock-btn ${this.dockMode === d.id ? 'is-active' : ''}" data-dock-mode="${d.id}" title="${d.label}">
                <span>${d.icon}</span> <small>${d.label}</small>
              </button>`
              )
              .join('')}
            <button type="button" class="catalog-close-btn" data-catalog-close title="${i18n.t('ui.catalog.close')}">✕</button>
          </div>
        </div>

        <div class="catalog-toolbar">
          <div class="catalog-search-wrap">
            <span class="catalog-search-icon">🔍</span>
            <input
              type="search"
              class="catalog-search-input"
              data-catalog-search
              placeholder="${i18n.t('ui.catalog.searchPlaceholder')}"
              value="${this.searchQuery.replace(/"/g, '&quot;')}"
            />
          </div>
          <div class="catalog-categories" role="tablist">
            ${categories
              .map((cat) => {
                const icon = CATEGORY_ICONS[cat] || '📦';
                const label = i18n.t(`ui.catalog.categories.${cat}`);
                return `
                  <button
                    type="button"
                    class="catalog-cat-pill ${this.activeCategory === cat ? 'is-active' : ''}"
                    data-catalog-cat="${cat}"
                  >
                    <span>${icon}</span> ${label}
                  </button>`;
              })
              .join('')}
          </div>
        </div>

        <div class="catalog-body">
          <div class="catalog-grid" data-catalog-grid></div>
          <div class="catalog-stage-section" data-catalog-stage-list></div>
        </div>
      </div>
    `;

    this.rootEl.querySelector('[data-catalog-close]')?.addEventListener('click', () => {
      this.close();
    });

    this.rootEl.querySelectorAll('[data-dock-mode]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.setDockMode(btn.dataset.dockMode);
      });
    });

    const searchInput = this.rootEl.querySelector('[data-catalog-search]');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value || '';
      this.renderResultsAndStageList();
    });

    this.rootEl.querySelectorAll('[data-catalog-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeCategory = btn.dataset.catalogCat || 'all';
        this.rootEl.querySelectorAll('[data-catalog-cat]').forEach((b) => {
          b.classList.toggle('is-active', b.dataset.catalogCat === this.activeCategory);
        });
        this.renderResultsAndStageList();
      });
    });

    this.renderResultsAndStageList();
  }

  renderResultsAndStageList() {
    if (!this.rootEl) return;
    const gridEl = this.rootEl.querySelector('[data-catalog-grid]');
    const stageListEl = this.rootEl.querySelector('[data-catalog-stage-list]');
    if (!gridEl || !stageListEl) return;

    const items = this.registry.searchCatalog({
      query: this.searchQuery,
      category: this.activeCategory,
      includeWire: false
    });

    if (items.length === 0) {
      gridEl.innerHTML = `<div class="catalog-empty">${i18n.t('ui.catalog.emptySearch')}</div>`;
    } else {
      gridEl.innerHTML = items
        .map((item) => {
          const icon = CATEGORY_ICONS[item.category] || '📦';
          const catLabel = i18n.t(`ui.catalog.categories.${item.category}`);
          return `
            <div class="catalog-card" data-card-type="${item.typeId}">
              <div class="catalog-card-top">
                <span class="catalog-card-cat">${icon} ${catLabel}</span>
                <span class="catalog-card-count ${item.instanceCount > 0 ? 'has-instances' : ''}">
                  ${i18n.t('ui.catalog.instanceCount', { count: item.instanceCount })}
                </span>
              </div>
              <h4 class="catalog-card-title">${item.displayName}</h4>
              <code class="catalog-card-type">${item.typeId}</code>
              <p class="catalog-card-summary">${item.summary}</p>
              <div class="catalog-card-actions">
                <button type="button" class="catalog-spawn-btn" data-spawn-type="${item.typeId}">
                  ${i18n.t('ui.catalog.spawnBtn')}
                </button>
              </div>
            </div>
          `;
        })
        .join('');
    }

    gridEl.querySelectorAll('[data-spawn-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.spawnFromCatalog(btn.dataset.spawnType);
      });
    });

    // Active Stage Instances list
    const activeInstances = [...this.registry.instancesById.values()].filter(
      (c) => c.typeId !== 'passive.wire'
    );
    const selectedId = this.stage.transformController?.selectedComponent?.id || null;

    stageListEl.innerHTML = `
      <div class="catalog-stage-head">
        <strong>🎯 ${i18n.t('ui.catalog.activeStageTitle', { count: activeInstances.length })}</strong>
      </div>
      <div class="catalog-stage-items">
        ${activeInstances
          .map((inst) => {
            const p = inst.group.position;
            const isSelected = inst.id === selectedId;
            const isPrimary = inst.id.startsWith('main.');
            return `
              <div class="catalog-stage-row ${isSelected ? 'is-selected' : ''}">
                <div class="catalog-stage-info">
                  <b>${inst.constructor.displayName}</b>
                  <code>${inst.id}</code>
                  <small>(${p.x.toFixed(0)}, ${p.y.toFixed(0)}, ${p.z.toFixed(0)})</small>
                </div>
                <div class="catalog-stage-btns">
                  <button type="button" class="catalog-mini-btn ${isSelected ? 'is-active' : ''}" data-select-inst="${inst.id}">
                    ✥ ${i18n.t('ui.catalog.selectBtn')}
                  </button>
                  <button type="button" class="catalog-mini-btn" data-dup-inst="${inst.id}" title="${i18n.t('ui.gizmo.duplicate')}">
                    ⧉
                  </button>
                  ${
                    !isPrimary
                      ? `<button type="button" class="catalog-mini-btn is-danger" data-del-inst="${inst.id}" title="${i18n.t('ui.catalog.removeBtn')}">
                          🗑
                        </button>`
                      : ''
                  }
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    `;

    stageListEl.querySelectorAll('[data-select-inst]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const inst = this.stage.transformController?.selectById(btn.dataset.selectInst);
        if (inst) {
          this.stage.cameraController?.setGoalXZ(inst.group.position.x, inst.group.position.z);
        }
      });
    });

    stageListEl.querySelectorAll('[data-dup-inst]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.stage.duplicateComponent(btn.dataset.dupInst);
      });
    });

    stageListEl.querySelectorAll('[data-del-inst]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.stage.removeComponent(btn.dataset.delInst);
      });
    });
  }
}
