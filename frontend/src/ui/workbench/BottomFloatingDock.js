import { i18n } from '../../core/i18n/I18nService.js';

/**
 * BottomFloatingDock — Bottom-center floating command dock with quick tools,
 * integrated natural-language circuit command bar, and on-demand panel triggers.
 */
export class BottomFloatingDock {
  /**
   * @param {object} opts
   * @param {HTMLElement|null} [opts.rootEl]
   * @param {(tool: 'select' | 'wire') => void} [opts.onSelectTool]
   * @param {() => void} [opts.onTogglePalette]
   * @param {() => void} [opts.onToggleSimulation]
   * @param {(promptText: string) => Promise<void>|void} [opts.onSubmitCommand]
   * @param {() => void} [opts.onUndoAiCommand]
   * @param {() => void} [opts.onToggleCodeDrawer]
   * @param {() => void} [opts.onOpenProjectsModal]
   */
  constructor(opts = {}) {
    this.rootEl =
      opts.rootEl ||
      (typeof document !== 'undefined' ? document.getElementById('bottom-dock-root') : null);
    this.activeTool = 'select';
    this.isRunning = false;
    this.isCodeDrawerOpen = false;
    this.isPaletteOpen = false;
    this.canUndoAi = false;
    this.isBusy = false;
    this.draftCommand = '';
    this.agentStatusText = '';

    this.onSelectTool = opts.onSelectTool || null;
    this.onTogglePalette = opts.onTogglePalette || opts.onTogglePartPalette || null;
    this.onToggleSimulation = opts.onToggleSimulation || null;
    this.onSubmitCommand = opts.onSubmitCommand || opts.onSubmitCircuitCommand || null;
    this.onUndoAiCommand = opts.onUndoAiCommand || opts.onUndoLastCommand || null;
    this.onToggleCodeDrawer = opts.onToggleCodeDrawer || null;
    this.onOpenProjectsModal = opts.onOpenProjectsModal || null;
    this.onOpenStudio = opts.onOpenStudio || null;
    this.onToggleAiSidebar = opts.onToggleAiSidebar || null;
    this.onAttachStageScreenshot = opts.onAttachStageScreenshot || null;
    this.isAiSidebarOpen = false;

    this._unsubLocale = i18n.onChange(() => this.render());
  }

  mount() {
    this.render();
    return this;
  }

  setRunning(running) {
    return this.setSimulationRunning(running);
  }

  setActiveTool(tool) {
    if (tool !== 'select' && tool !== 'wire') return;
    this.activeTool = tool;
    this.render();
  }

  setSimulationRunning(running) {
    this.isRunning = Boolean(running);
    this.render();
  }

  setCodeDrawerOpen(open) {
    this.isCodeDrawerOpen = Boolean(open);
    this.render();
  }

  setPaletteOpen(open) {
    this.isPaletteOpen = Boolean(open);
    this.render();
  }

  setCanUndoAi(canUndo) {
    this.canUndoAi = Boolean(canUndo);
    this.render();
  }

  setBusy(busy) {
    this.isBusy = Boolean(busy);
    this.render();
  }

  setAgentStatus(statusText = '') {
    this.agentStatusText = String(statusText || '').trim();
    this.render();
  }

  setAiSidebarOpen(open) {
    this.isAiSidebarOpen = Boolean(open);
    this.render();
  }

  render() {
    if (!this.rootEl) return;

    const simLabel = this.isRunning
      ? i18n.t('workbench.dock.simStop')
      : i18n.t('workbench.dock.simRun');

    this.rootEl.innerHTML = `
      ${
        this.agentStatusText
          ? `<div class="dock-agent-status-pill" data-testid="dock-agent-status-pill" role="status" aria-live="polite">
              <span class="dock-agent-pulse"></span>
              <span>${this.agentStatusText}</span>
            </div>`
          : ''
      }
      <div class="command-dock" role="toolbar" aria-label="Hardware Workbench Command Dock">
        <div class="dock-group">
          <button
            type="button"
            id="dock-tool-select"
            class="dock-btn ${this.activeTool === 'select' ? 'is-active' : ''}"
            title="${i18n.t('workbench.dock.toolSelect')}"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 4l13 7-6 2-2 6z" />
            </svg>
            <span>${i18n.t('workbench.dock.toolSelect')}</span>
          </button>

          <button
            type="button"
            id="dock-tool-wire"
            class="dock-btn ${this.activeTool === 'wire' ? 'is-active' : ''}"
            title="${i18n.t('workbench.dock.toolWire')}"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="6" cy="18" r="2.5" />
              <circle cx="18" cy="6" r="2.5" />
              <path d="M8 16c2.5-2.5 5.5-5.5 8-8" />
            </svg>
            <span>${i18n.t('workbench.dock.toolWire')}</span>
          </button>

          <button
            type="button"
            id="dock-btn-palette"
            class="dock-btn ${this.isPaletteOpen ? 'is-active' : ''}"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>${i18n.t('workbench.dock.toolAddPart')}</span>
          </button>

          <button
            type="button"
            id="dock-btn-sim"
            class="dock-btn dock-btn-run"
            data-running="${this.isRunning ? 'true' : 'false'}"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              ${
                this.isRunning
                  ? '<rect x="7" y="7" width="10" height="10" rx="1.5" />'
                  : '<path d="M8 5.5v13L18.5 12z" />'
              }
            </svg>
            <span>${simLabel}</span>
          </button>
        </div>

        <span class="pill-divider" aria-hidden="true"></span>

        <form id="dock-command-form" class="dock-command-form">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="6 9 11 12 6 15" />
            <line x1="13" y1="15" x2="18" y2="15" />
          </svg>
          <input
            type="text"
            id="dock-command-input"
            class="dock-command-input"
            autocomplete="off"
            value="${this.draftCommand.replace(/"/g, '&quot;')}"
            placeholder="${i18n.t('workbench.dock.commandPlaceholder')}"
            ${this.isBusy ? 'disabled' : ''}
          />
          <button
            type="button"
            id="dock-btn-attach-screenshot"
            data-testid="dock-attach-screenshot-btn"
            class="dock-inline-icon-btn"
            title="${i18n.t('workbench.aiChat.attachStageShot')}"
          >
            📎
          </button>
          <button
            type="button"
            id="dock-btn-pin-sidebar"
            data-testid="dock-pin-sidebar-btn"
            class="dock-inline-icon-btn ${this.isAiSidebarOpen ? 'is-active' : ''}"
            title="${
              this.isAiSidebarOpen
                ? i18n.t('workbench.aiChat.minimizeToDock')
                : i18n.t('workbench.aiChat.pinToSidebar')
            }"
          >
            ${this.isAiSidebarOpen ? '↙' : '⇥'}
          </button>
          <button
            type="submit"
            id="dock-command-submit"
            class="dock-command-submit"
            ${this.isBusy ? 'disabled' : ''}
          >
            ${i18n.t('workbench.dock.commandSubmit')}
          </button>
          ${
            this.canUndoAi
              ? `<button
                  type="button"
                  id="btn-undo-ai"
                  class="dock-undo-btn"
                  title="${i18n.t('workbench.dock.undoAiTitle')}"
                >
                  ${i18n.t('workbench.dock.undoAiBtn')}
                </button>`
              : ''
          }
        </form>

        <span class="pill-divider" aria-hidden="true"></span>

        <div class="dock-group">
          <button
            type="button"
            id="btn-toggle-code"
            class="dock-btn ${this.isCodeDrawerOpen ? 'is-active' : ''}"
            title="${i18n.t('workbench.dock.codeBtnTitle')}"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="8 8 4 12 8 16" />
              <polyline points="16 8 20 12 16 16" />
              <line x1="13.5" y1="6" x2="10.5" y2="18" />
            </svg>
            <span>${i18n.t('workbench.dock.codeBtn')}</span>
          </button>

          <button
            type="button"
            id="btn-open-projects"
            class="dock-btn"
            title="${i18n.t('workbench.dock.projectsBtnTitle')}"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="4" width="7" height="7" rx="1.2" />
              <rect x="13" y="4" width="7" height="7" rx="1.2" />
              <rect x="4" y="13" width="7" height="7" rx="1.2" />
              <rect x="13" y="13" width="7" height="7" rx="1.2" />
            </svg>
            <span>${i18n.t('workbench.dock.projectsBtn')}</span>
          </button>

          <button
            type="button"
            id="dock-btn-open-studio"
            class="dock-btn"
            data-action="open-studio"
            title="3D Component Studio (/studio)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
              <path d="M3 7l9 5 9-5M12 22V12" />
            </svg>
            <span>3D Studio</span>
          </button>
        </div>
      </div>
    `;

    const selectBtn = this.rootEl.querySelector('#dock-tool-select');
    if (selectBtn) {
      selectBtn.addEventListener('click', () => {
        this.setActiveTool('select');
        if (this.onSelectTool) this.onSelectTool('select');
      });
    }

    const wireBtn = this.rootEl.querySelector('#dock-tool-wire');
    if (wireBtn) {
      wireBtn.addEventListener('click', () => {
        this.setActiveTool('wire');
        if (this.onSelectTool) this.onSelectTool('wire');
      });
    }

    const paletteBtn = this.rootEl.querySelector('#dock-btn-palette');
    if (paletteBtn) {
      paletteBtn.addEventListener('click', () => {
        if (this.onTogglePalette) this.onTogglePalette();
      });
    }

    const simBtn = this.rootEl.querySelector('#dock-btn-sim');
    if (simBtn) {
      simBtn.addEventListener('click', () => {
        if (this.onToggleSimulation) this.onToggleSimulation(!this.isRunning);
      });
    }

    const commandInput = this.rootEl.querySelector('#dock-command-input');
    if (commandInput) {
      commandInput.addEventListener('input', (e) => {
        this.draftCommand = e.target.value;
      });
    }

    const commandForm = this.rootEl.querySelector('#dock-command-form');
    if (commandForm) {
      commandForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const promptText = String(commandInput?.value || this.draftCommand || '').trim();
        if (!promptText || this.isBusy) return;
        this.draftCommand = '';
        if (this.onSubmitCommand) this.onSubmitCommand(promptText);
        this.render();
      });
    }

    const undoBtn = this.rootEl.querySelector('#btn-undo-ai');
    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        if (this.onUndoAiCommand) this.onUndoAiCommand();
      });
    }

    const attachShotBtn = this.rootEl.querySelector('#dock-btn-attach-screenshot');
    if (attachShotBtn) {
      attachShotBtn.addEventListener('click', () => {
        if (this.onAttachStageScreenshot) this.onAttachStageScreenshot();
      });
    }

    const pinSidebarBtn = this.rootEl.querySelector('#dock-btn-pin-sidebar');
    if (pinSidebarBtn) {
      pinSidebarBtn.addEventListener('click', () => {
        if (this.onToggleAiSidebar) this.onToggleAiSidebar();
      });
    }

    const codeBtn = this.rootEl.querySelector('#btn-toggle-code');
    if (codeBtn) {
      codeBtn.addEventListener('click', () => {
        if (this.onToggleCodeDrawer) this.onToggleCodeDrawer();
      });
    }

    const projectsBtn = this.rootEl.querySelector('#btn-open-projects');
    if (projectsBtn) {
      projectsBtn.addEventListener('click', () => {
        if (this.onOpenProjectsModal) this.onOpenProjectsModal();
      });
    }

    const studioBtn = this.rootEl.querySelector('#dock-btn-open-studio');
    if (studioBtn) {
      studioBtn.addEventListener('click', () => {
        if (this.onOpenStudio) this.onOpenStudio();
      });
    }
  }

  destroy() {
    if (this._unsubLocale) this._unsubLocale();
  }
}
