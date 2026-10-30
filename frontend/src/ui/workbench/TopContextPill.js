import { i18n } from '../../core/i18n/I18nService.js';
import { themeService } from '../../core/theme/ThemeService.js';

export const SUPPORTED_HOST_BOARDS = Object.freeze([
  { id: 'board.arduino_uno', label: 'Arduino Uno R3 (5V ATmega328P)' },
  { id: 'board.esp32_devkit', label: 'ESP32 DevKit V1 (3.3V Dual-Core)' },
  { id: 'board.jetson_nano', label: 'NVIDIA Jetson Nano (3.3V Edge AI)' }
]);

/**
 * TopContextPill — Floating top bar in the 3D Hardware Workbench.
 *
 * Hosts:
 *  - Brand / Showcase switcher (`#btn-open-showcase`)
 *  - Host board selector (`#wb-board-select`)
 *  - Live multimeter & short-circuit badge (`.wb-multimeter-badge`)
 *  - Dipole X-Ray toggle (`#btn-toggle-xray`), TR/EN toggle, Dark/Light toggle
 *  - Cloud Workspace Dashboard & Auto-Save status button (`#btn-open-dashboard`)
 *  - Top-right Account identity pill + direct Logout button when logged in,
 *    or Login + Register buttons when logged out.
 */
export class TopContextPill {
  constructor({
    rootEl,
    activeBoardId = 'board.arduino_uno',
    onSelectBoard,
    onToggleXRay,
    onOpenAuthModal,
    onOpenShowcase,
    onOpenDashboard,
    onOpenCreditStore,
    onOpenStudio,
    onLogout
  } = {}) {
    this.rootEl = rootEl;
    this.activeBoardId = activeBoardId;
    this.onSelectBoard = onSelectBoard;
    this.onToggleXRay = onToggleXRay;
    this.onOpenAuthModal = onOpenAuthModal;
    this.onOpenShowcase = onOpenShowcase;
    this.onOpenDashboard = onOpenDashboard;
    this.onOpenCreditStore = onOpenCreditStore;
    this.onOpenStudio = onOpenStudio;
    this.onLogout = onLogout;

    this.xrayEnabled = false;
    this.sessionUser = null;
    this.credits = null;
    this.workspaceStatus = {
      state: 'idle', // 'idle' | 'saving' | 'saved' | 'guest'
      title: ''
    };
    this.lastFlowSummary = {
      closedLoopCount: 0,
      totalCurrentMa: 0,
      hasShortCircuit: false,
      faultCount: 0
    };

    this._unsubLocale = i18n.onChange(() => this.render());
    this._unsubTheme = themeService.onChange(() => this.render());
  }

  mount() {
    this.render();
    return this;
  }

  setActiveBoard(boardId) {
    this.activeBoardId = boardId || 'none';
    this.render();
  }

  setSessionUser(user) {
    this.sessionUser = user || null;
    if (!this.sessionUser || !this.sessionUser.email) {
      this.credits = null;
      this.render();
      return;
    }
    const rawCredits = user?.credits || user?.credit_balance || null;
    if (rawCredits && typeof rawCredits === 'object') {
      const promo = Number(rawCredits.promotional_credits ?? 0);
      const purchased = Number(rawCredits.purchased_credits ?? 0);
      const avail = Number(rawCredits.available_credits ?? rawCredits.total_credits ?? promo + purchased);
      this.credits = {
        promotional_credits: Math.round(promo * 100) / 100,
        purchased_credits: Math.round(purchased * 100) / 100,
        available_credits: Math.round(avail * 100) / 100
      };
    }
    this.render();
  }

  setCredits(credits = null) {
    if (!credits || typeof credits !== 'object') {
      this.credits = null;
      this.render();
      return;
    }
    const promo = Number(credits.promotional_credits ?? this.credits?.promotional_credits ?? 0);
    const purchased = Number(credits.purchased_credits ?? this.credits?.purchased_credits ?? 0);
    const avail = Number(credits.available_credits ?? credits.total_credits ?? promo + purchased);
    this.credits = {
      promotional_credits: Math.round(promo * 100) / 100,
      purchased_credits: Math.round(purchased * 100) / 100,
      available_credits: Math.round(avail * 100) / 100
    };
    this.render();
  }

  setWorkspaceStatus({ state = 'idle', title = '' } = {}) {
    this.workspaceStatus = {
      state,
      title: title || this.workspaceStatus.title || ''
    };
    this.render();
  }

  updateFlowSummary(flowResult = {}) {
    const loops = Array.isArray(flowResult.loops) ? flowResult.loops : [];
    const faults = Array.isArray(flowResult.faults) ? flowResult.faults : [];
    const totalCurrentA = loops.reduce(
      (sum, loop) => sum + (Number(loop.currentAmps ?? loop.currentA) || 0),
      0
    );
    const hasShort = faults.some(
      (f) => f.type === 'SHORT_CIRCUIT' || f.code === 'elec.fault.short_circuit'
    );

    this.lastFlowSummary = {
      closedLoopCount: Number(flowResult.closedLoopCount ?? loops.length),
      totalCurrentMa:
        flowResult.totalCurrentMa !== undefined
          ? Number(flowResult.totalCurrentMa)
          : Math.round(totalCurrentA * 1000 * 10) / 10,
      hasShortCircuit: Boolean(flowResult.hasShortCircuit || hasShort),
      faultCount: faults.length
    };
    this.render();
  }

  _renderAutosaveLabel() {
    const { state, title } = this.workspaceStatus;
    const prefix = title ? `${title} · ` : '';
    if (state === 'saving') {
      return `${prefix}${i18n.t('workbench.top.autosave_saving')}`;
    }
    if (state === 'saved') {
      return `${prefix}${i18n.t('workbench.top.autosave_saved')}`;
    }
    if (!this.sessionUser?.email) {
      return i18n.t('workbench.top.autosave_guest');
    }
    return title || i18n.t('workbench.top.dashboard_btn');
  }

  render() {
    if (!this.rootEl) return;

    const { closedLoopCount, totalCurrentMa, hasShortCircuit } = this.lastFlowSummary;
    const locale = i18n.getLocale().toUpperCase();
    const isLight = themeService.getTheme() === 'light';

    let statusClass = 'status-idle';
    let statusText = `${totalCurrentMa.toFixed(1)} mA · ${i18n.t('workbench.top.open_circuit')}`;
    if (hasShortCircuit) {
      statusClass = 'status-fault';
      statusText = i18n.t('workbench.top.short_circuit');
    } else if (closedLoopCount > 0) {
      statusClass = 'status-closed';
      statusText = `${totalCurrentMa.toFixed(1)} mA · ${i18n.t('workbench.top.closed_loop')}`;
    }

    const isAuthenticated = Boolean(this.sessionUser && this.sessionUser.email);
    const userDisplayName = this.sessionUser?.name || this.sessionUser?.email?.split('@')[0] || '';
    const userEmail = this.sessionUser?.email || '';
    const userRole = String(
      this.sessionUser?.role ||
        (Array.isArray(this.sessionUser?.roles) && this.sessionUser.roles[0]) ||
        'free'
    ).toUpperCase();
    const userInitial = (userDisplayName || userEmail || 'U').trim().charAt(0).toUpperCase();
    const autosaveState = this.workspaceStatus.state || (isAuthenticated ? 'saved' : 'guest');

    this.rootEl.innerHTML = `
      <header class="wb-top-bar" role="banner" aria-label="CircuitLab 3D Workbench Bar">
        <div class="wb-pill-cluster wb-pill-left">
          <a
            href="/"
            class="wb-brand-mark wb-brand-showcase-btn"
            id="btn-open-showcase"
            title="${i18n.t('workbench.top.showcase_btn')}"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
              <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3"/>
            </svg>
            <span class="wb-brand-name">${i18n.t('workbench.top.brand')}</span>
          </a>

          <span class="wb-pill-divider" aria-hidden="true"></span>

          <label class="sr-only" for="wb-board-select">${i18n.t('workbench.top.board_label')}</label>
          <select id="wb-board-select" class="wb-board-select" aria-label="${i18n.t('workbench.top.board_label')}">
            <option value="none" ${this.activeBoardId === 'none' ? 'selected' : ''}>
              ${i18n.t('workbench.top.no_host_board')}
            </option>
            ${SUPPORTED_HOST_BOARDS.map(
              (b) => `<option value="${b.id}" ${b.id === this.activeBoardId ? 'selected' : ''}>${b.label}</option>`
            ).join('')}
          </select>

          <div class="wb-multimeter-badge ${statusClass}" role="status" aria-live="polite">
            <span class="wb-status-dot"></span>
            <span class="wb-multimeter-value">${statusText}</span>
          </div>
        </div>

        <div class="wb-pill-cluster wb-pill-right">
          <a
            href="/studio"
            class="wb-pill-btn"
            id="btn-open-studio"
            data-action="open-studio"
            title="${locale === 'EN' ? 'Open 3D Custom Component Studio (/studio)' : '3B Özel Bileşen Stüdyosu (/studio)'}"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            <span>${locale === 'EN' ? '3D Studio' : '3B Stüdyo'}</span>
          </a>

          <button
            type="button"
            class="wb-pill-btn ${this.xrayEnabled ? 'is-active' : ''}"
            id="btn-toggle-xray"
            aria-pressed="${this.xrayEnabled}"
            title="${i18n.t('workbench.top.xray_hint')}"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/>
            </svg>
            <span>${i18n.t('workbench.top.xray')}</span>
          </button>

          <button
            type="button"
            class="wb-pill-btn wb-pill-icon-text"
            id="btn-toggle-locale"
            aria-label="Toggle Language (${locale})"
          >
            <span>${locale}</span>
          </button>

          <button
            type="button"
            class="wb-pill-btn"
            id="btn-toggle-theme"
            aria-label="Toggle Theme"
          >
            ${
              isLight
                ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
                : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`
            }
          </button>

          <span class="wb-pill-divider" aria-hidden="true"></span>

          ${
            isAuthenticated || this.credits !== null
              ? `
                <button
                  type="button"
                  class="wb-pill-btn wb-credit-pill ${Number(this.credits?.available_credits ?? 0) <= 10 ? 'is-low' : ''}"
                  id="btn-open-credits"
                  data-testid="top-credit-badge"
                  title="${locale === 'EN' ? 'AI Credits Store' : 'AI Kredi Mağazası'}"
                >
                  <span class="wb-credit-bolt" aria-hidden="true">⚡</span>
                  <span class="wb-credit-amount">${Number(this.credits?.available_credits ?? 0).toFixed(1)} ${locale === 'EN' ? 'Credits' : 'Kredi'}</span>
                </button>
              `
              : ''
          }

          <button
            type="button"
            class="wb-pill-btn wb-autosave-pill is-${autosaveState}"
            id="btn-open-dashboard"
            data-testid="top-autosave-badge"
            title="${i18n.t('workbench.top.dashboard_btn')}"
          >
            <span class="wb-autosave-dot" aria-hidden="true"></span>
            <span class="wb-autosave-text">${this._renderAutosaveLabel()}</span>
          </button>

          ${
            isAuthenticated
              ? `
                <div class="wb-account-cluster" data-testid="top-account-cluster">
                  <button
                    type="button"
                    class="wb-pill-btn wb-account-pill is-authenticated"
                    id="btn-open-auth"
                    data-testid="top-account-badge"
                    title="${userEmail} (${userRole})"
                  >
                    <span class="wb-account-avatar" aria-hidden="true">${userInitial}</span>
                    <span class="wb-account-meta">
                      <strong class="wb-account-name">${userDisplayName} <span class="wb-role-badge" data-testid="top-role-badge" style="font-size:10px;padding:1px 5px;border-radius:999px;background:rgba(16,185,129,0.16);color:#10b981;margin-left:4px;">${userRole}</span></strong>
                      <small class="wb-account-email">${userEmail}</small>
                    </span>
                  </button>
                  <button
                    type="button"
                    class="wb-pill-btn wb-logout-pill"
                    id="btn-top-logout"
                    data-testid="top-logout-btn"
                    title="${i18n.t('workbench.top.logout_btn')}"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    <span>${i18n.t('workbench.top.logout_btn')}</span>
                  </button>
                </div>
              `
              : `
                <div class="wb-guest-auth-cluster" data-testid="top-guest-cluster">
                  <button
                    type="button"
                    class="wb-pill-btn wb-login-pill"
                    id="btn-open-auth"
                    data-testid="top-login-btn"
                  >
                    <span>${i18n.t('workbench.top.login_btn')}</span>
                  </button>
                  <button
                    type="button"
                    class="wb-pill-btn wb-register-pill"
                    id="btn-open-register"
                    data-testid="top-register-btn"
                  >
                    <span>${i18n.t('workbench.top.register_btn')}</span>
                  </button>
                </div>
              `
          }
        </div>
      </header>
    `;

    if (typeof this.rootEl.querySelector !== 'function') return;

    const boardSelect = this.rootEl.querySelector('#wb-board-select');
    boardSelect?.addEventListener('change', (e) => {
      this.activeBoardId = e.target.value;
      this.onSelectBoard?.(this.activeBoardId);
    });

    const xrayBtn = this.rootEl.querySelector('#btn-toggle-xray');
    xrayBtn?.addEventListener('click', () => {
      this.xrayEnabled = !this.xrayEnabled;
      this.onToggleXRay?.(this.xrayEnabled);
      this.render();
    });

    const localeBtn = this.rootEl.querySelector('#btn-toggle-locale');
    localeBtn?.addEventListener('click', () => {
      i18n.toggleLocale();
    });

    const themeBtn = this.rootEl.querySelector('#btn-toggle-theme');
    themeBtn?.addEventListener('click', () => {
      themeService.toggleTheme();
    });

    const creditsBtn = this.rootEl.querySelector('#btn-open-credits');
    creditsBtn?.addEventListener('click', () => {
      this.onOpenCreditStore?.('packages');
    });

    const dashboardBtn = this.rootEl.querySelector('#btn-open-dashboard');
    dashboardBtn?.addEventListener('click', () => {
      this.onOpenDashboard?.();
    });

    const authBtn = this.rootEl.querySelector('#btn-open-auth');
    authBtn?.addEventListener('click', () => {
      this.onOpenAuthModal?.(isAuthenticated ? 'login' : 'login');
    });

    const registerBtn = this.rootEl.querySelector('#btn-open-register');
    registerBtn?.addEventListener('click', () => {
      this.onOpenAuthModal?.('register');
    });

    const logoutBtn = this.rootEl.querySelector('#btn-top-logout');
    logoutBtn?.addEventListener('click', () => {
      this.onLogout?.();
    });

    const showcaseBtn = this.rootEl.querySelector('#btn-open-showcase');
    showcaseBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.onOpenShowcase?.();
    });

    const studioBtn = this.rootEl.querySelector('#btn-open-studio');
    studioBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.onOpenStudio?.();
    });
  }

  destroy() {
    this._unsubLocale?.();
    this._unsubTheme?.();
  }
}
