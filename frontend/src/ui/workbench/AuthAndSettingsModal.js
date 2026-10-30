import { i18n } from '../../core/i18n/I18nService.js';
import { BackendApiClient, backendApiClient } from '../../core/ai/BackendApiClient.js';

/**
 * AuthAndSettingsModal — Customer Authentication & Account Modal.
 *
 * Key architecture guarantees:
 *  - Valid email & password registration and login verified against the Laravel backend (`/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/me`).
 *  - Judge Quick Login and BYOK / AI model configuration tabs are completely removed.
 *  - Accessible from both the Landing Showcase and the 3D Hardware Workbench.
 */
export class AuthAndSettingsModal {
  constructor({
    rootEl,
    apiClient = backendApiClient,
    onSessionChange,
    onOpenDashboard
  } = {}) {
    this.rootEl = rootEl;
    this.apiClient = apiClient;
    this.onSessionChange = onSessionChange;
    this.onOpenDashboard = onOpenDashboard;

    this.isOpen = false;
    this.activeTab = 'login'; // 'login' | 'register'
    this.sessionUser = this.apiClient?.user || null;
    this.statusMessage = '';
    this.errorMessage = '';
    this.isSubmitting = false;

    this._containerEl = null;
    this._unsubLocale = i18n.onChange(() => {
      if (this.isOpen) this.render();
    });
  }

  mount() {
    if (!this.rootEl) return this;
    this._containerEl = document.createElement('div');
    this._containerEl.className = 'wb-modal-backdrop wb-auth-modal-backdrop is-hidden';
    this._containerEl.dataset.testid = 'auth-settings-modal';
    this.rootEl.appendChild(this._containerEl);
    return this;
  }

  async open(tab = 'login') {
    const normalizedTab = tab === 'register' ? 'register' : 'login';
    this.activeTab = normalizedTab;
    this.isOpen = true;
    this.statusMessage = '';
    this.errorMessage = '';
    this.sessionUser = this.apiClient?.user || this.sessionUser || null;
    if (this.rootEl) {
      this.rootEl.hidden = false;
      this.rootEl.removeAttribute?.('hidden');
    }
    this.render();
  }

  close() {
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
  }

  setSessionUser(user) {
    this.sessionUser = user || null;
    if (this.isOpen) {
      this.render();
    }
  }

  async submitLogin({ email, password } = {}) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const rawPassword = String(password || '');

    this.statusMessage = '';
    this.errorMessage = '';

    if (!BackendApiClient.isValidEmail(normalizedEmail)) {
      this.errorMessage = i18n.t('workbench.auth.invalid_email_error');
      this.render();
      throw new Error(this.errorMessage);
    }

    if (rawPassword.length < 6) {
      this.errorMessage = i18n.t('workbench.auth.short_password_error');
      this.render();
      throw new Error(this.errorMessage);
    }

    this.isSubmitting = true;
    this.render();

    try {
      const result = await this.apiClient.login({
        email: normalizedEmail,
        password: rawPassword
      });
      this.sessionUser = result.user;
      this.statusMessage = i18n.t('workbench.auth.auth_success_status', {
        email: this.sessionUser.email
      });
      this.isSubmitting = false;
      this.onSessionChange?.(this.sessionUser);
      this.render();
      return {
        user: this.sessionUser,
        token: this.apiClient.token,
        verifiedByBackend: Boolean(result.verifiedByBackend ?? true)
      };
    } catch (err) {
      this.isSubmitting = false;
      this.errorMessage = err?.message || i18n.t('workbench.auth.invalid_credentials_error');
      this.render();
      throw err;
    }
  }

  async submitRegister({ name, email, password } = {}) {
    const cleanName = String(name || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const rawPassword = String(password || '');

    this.statusMessage = '';
    this.errorMessage = '';

    if (cleanName.length < 2) {
      this.errorMessage = i18n.t('workbench.auth.missing_name_error');
      this.render();
      throw new Error(this.errorMessage);
    }

    if (!BackendApiClient.isValidEmail(normalizedEmail)) {
      this.errorMessage = i18n.t('workbench.auth.invalid_email_error');
      this.render();
      throw new Error(this.errorMessage);
    }

    if (rawPassword.length < 6) {
      this.errorMessage = i18n.t('workbench.auth.short_password_error');
      this.render();
      throw new Error(this.errorMessage);
    }

    this.isSubmitting = true;
    this.render();

    try {
      const result = await this.apiClient.register({
        name: cleanName,
        email: normalizedEmail,
        password: rawPassword
      });
      this.sessionUser = result.user;
      this.statusMessage = i18n.t('workbench.auth.register_success_status', {
        email: this.sessionUser.email
      });
      this.isSubmitting = false;
      this.onSessionChange?.(this.sessionUser);
      this.render();
      return {
        user: this.sessionUser,
        token: this.apiClient.token,
        verifiedByBackend: Boolean(result.verifiedByBackend ?? true)
      };
    } catch (err) {
      this.isSubmitting = false;
      this.errorMessage = err?.message || i18n.t('workbench.auth.invalid_credentials_error');
      this.render();
      throw err;
    }
  }

  async logout() {
    await this.apiClient?.logout();
    this.sessionUser = null;
    this.statusMessage = i18n.t('workbench.auth.logged_out_status');
    this.errorMessage = '';
    this.onSessionChange?.(null);
    if (this.isOpen) {
      this.render();
    }
    return { loggedOut: true };
  }

  async submitLogout() {
    return this.logout();
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
    const userInitial = (this.sessionUser?.name || this.sessionUser?.email || 'U')
      .trim()
      .charAt(0)
      .toUpperCase();
    const userRole = String(
      this.sessionUser?.role ||
        (Array.isArray(this.sessionUser?.roles) && this.sessionUser.roles[0]) ||
        this.sessionUser?.tier ||
        'free'
    ).toUpperCase();
    const availableCredits = Number(
      this.apiClient?.getCredits?.()?.available_credits ??
        this.sessionUser?.credits?.available_credits ??
        0
    ).toFixed(1);

    this._containerEl.innerHTML = `
      <div class="wb-modal-dialog wb-auth-dialog" role="dialog" aria-modal="true" aria-labelledby="wb-auth-title">
        <div class="wb-auth-split-layout">
          <aside class="wb-auth-brand-pane">
            <div class="wb-auth-brand-top">
              <div class="wb-auth-brand-badge">
                <span class="wb-auth-brand-dot"></span>
                <span>CIRCUITLAB 3D CLOUD</span>
              </div>
              <h2 id="wb-auth-title" class="wb-auth-hero-title">${i18n.t('workbench.auth.title')}</h2>
              <p class="wb-auth-hero-subtitle">${i18n.t('workbench.auth.subtitle')}</p>
            </div>

            <ul class="wb-auth-feature-list">
              <li class="wb-auth-feature-item">
                <span class="wb-auth-feature-icon" aria-hidden="true">01</span>
                <div>
                  <strong>${i18n.t('workbench.auth.featureCloudTitle')}</strong>
                  <p>${i18n.t('workbench.auth.featureCloudDesc')}</p>
                </div>
              </li>
              <li class="wb-auth-feature-item">
                <span class="wb-auth-feature-icon" aria-hidden="true">02</span>
                <div>
                  <strong>${i18n.t('workbench.auth.featureDashboardTitle')}</strong>
                  <p>${i18n.t('workbench.auth.featureDashboardDesc')}</p>
                </div>
              </li>
              <li class="wb-auth-feature-item">
                <span class="wb-auth-feature-icon" aria-hidden="true">03</span>
                <div>
                  <strong>${i18n.t('workbench.auth.featureAiAssistantTitle')}</strong>
                  <p>${i18n.t('workbench.auth.featureAiAssistantDesc')}</p>
                </div>
              </li>
            </ul>

            <div class="wb-auth-brand-footer">
              <span class="wb-auth-security-pill">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>${i18n.t('workbench.auth.securityPill')}</span>
              </span>
            </div>
          </aside>

          <div class="wb-auth-main-pane">
            <header class="wb-auth-pane-header">
              <div class="wb-tab-strip wb-auth-tabs" role="tablist">
                ${
                  isAuthenticated
                    ? `
                      <button
                        type="button"
                        class="wb-tab-btn is-active"
                        data-tab="login"
                        data-testid="auth-tab-account"
                      >
                        ${i18n.t('workbench.auth.accountTab')}
                      </button>
                    `
                    : `
                      <button
                        type="button"
                        class="wb-tab-btn ${this.activeTab === 'login' ? 'is-active' : ''}"
                        data-tab="login"
                        data-testid="auth-tab-login"
                      >
                        ${i18n.t('workbench.auth.tab_login')}
                      </button>
                      <button
                        type="button"
                        class="wb-tab-btn ${this.activeTab === 'register' ? 'is-active' : ''}"
                        data-tab="register"
                        data-testid="auth-tab-register"
                      >
                        ${i18n.t('workbench.auth.tab_register')}
                      </button>
                    `
                }
              </div>

              <button
                type="button"
                class="wb-icon-btn"
                id="btn-close-auth-modal"
                aria-label="${i18n.t('workbench.auth.close')}"
              >
                ✕
              </button>
            </header>

            <div class="wb-modal-body wb-auth-pane-body">
              ${
                this.errorMessage
                  ? `<div class="wb-auth-alert wb-auth-alert-error" id="wb-auth-error" role="alert">${this.errorMessage}</div>`
                  : ''
              }
              ${
                this.statusMessage
                  ? `<div class="wb-auth-alert wb-auth-alert-success" id="wb-auth-status" role="status">${this.statusMessage}</div>`
                  : ''
              }

              ${
                isAuthenticated
                  ? `
                    <div class="wb-auth-account-card" data-testid="auth-active-session-card">
                      <div class="wb-auth-account-header">
                        <div class="wb-auth-avatar-lg">${userInitial}</div>
                        <div class="wb-auth-account-info">
                          <span class="wb-auth-verified-tag">${i18n.t('workbench.auth.session_verified_badge')}</span>
                          <h4>${this.sessionUser.name || this.sessionUser.email}</h4>
                          <p>${this.sessionUser.email}</p>
                        </div>
                      </div>

                      <div class="wb-auth-account-meta-grid">
                        <div class="wb-auth-meta-box">
                          <span class="wb-auth-meta-label">${i18n.t('workbench.auth.account_role_label')}</span>
                          <strong>${userRole}</strong>
                        </div>
                        <div class="wb-auth-meta-box">
                          <span class="wb-auth-meta-label">${i18n.t('workbench.auth.account_credits_label')}</span>
                          <strong>⚡ ${availableCredits}</strong>
                        </div>
                      </div>

                      <div class="wb-auth-account-actions">
                        <button
                          type="button"
                          class="wb-primary-btn"
                          id="btn-auth-open-dashboard"
                          data-testid="auth-open-dashboard-btn"
                        >
                          ${i18n.t('workbench.auth.open_dashboard_cta')}
                        </button>
                        <button
                          type="button"
                          class="wb-secondary-btn wb-danger-outline-btn"
                          id="btn-auth-logout"
                          data-testid="auth-modal-logout-btn"
                        >
                          ${i18n.t('workbench.auth.logout_btn')}
                        </button>
                      </div>
                    </div>
                  `
                  : this.activeTab === 'register'
                  ? `
                    <form id="wb-register-form" class="wb-auth-form" novalidate>
                      <label class="wb-field-label">
                        <span>${i18n.t('workbench.auth.name_label')}</span>
                        <input
                          type="text"
                          id="wb-register-name"
                          class="wb-text-input"
                          placeholder="${i18n.t('workbench.auth.name_placeholder')}"
                          autocomplete="name"
                          required
                        />
                      </label>
                      <label class="wb-field-label">
                        <span>${i18n.t('workbench.auth.email_label')}</span>
                        <input
                          type="email"
                          id="wb-register-email"
                          class="wb-text-input"
                          placeholder="${i18n.t('workbench.auth.email_placeholder')}"
                          autocomplete="email"
                          required
                        />
                      </label>
                      <label class="wb-field-label">
                        <span>${i18n.t('workbench.auth.password_label')}</span>
                        <input
                          type="password"
                          id="wb-register-password"
                          class="wb-text-input"
                          placeholder="${i18n.t('workbench.auth.password_placeholder')}"
                          autocomplete="new-password"
                          required
                        />
                      </label>
                      <button
                        type="submit"
                        class="wb-primary-btn wb-auth-submit-btn"
                        id="btn-submit-register"
                        data-testid="auth-register-submit"
                        ${this.isSubmitting ? 'disabled' : ''}
                      >
                        ${i18n.t('workbench.auth.register_submit')}
                      </button>

                      <div class="wb-auth-switch-row">
                        <button type="button" class="wb-link-btn" id="btn-switch-to-login">
                          ${i18n.t('workbench.auth.switch_to_login')}
                        </button>
                      </div>
                    </form>
                  `
                  : `
                    <form id="wb-login-form" class="wb-auth-form" novalidate>
                      <label class="wb-field-label">
                        <span>${i18n.t('workbench.auth.email_label')}</span>
                        <input
                          type="email"
                          id="wb-login-email"
                          class="wb-text-input"
                          placeholder="${i18n.t('workbench.auth.email_placeholder')}"
                          autocomplete="email"
                          required
                        />
                      </label>
                      <label class="wb-field-label">
                        <span>${i18n.t('workbench.auth.password_label')}</span>
                        <input
                          type="password"
                          id="wb-login-password"
                          class="wb-text-input"
                          placeholder="${i18n.t('workbench.auth.password_placeholder')}"
                          autocomplete="current-password"
                          required
                        />
                      </label>
                      <button
                        type="submit"
                        class="wb-primary-btn wb-auth-submit-btn"
                        id="btn-submit-login"
                        data-testid="auth-login-submit"
                        ${this.isSubmitting ? 'disabled' : ''}
                      >
                        ${i18n.t('workbench.auth.login_submit')}
                      </button>

                      <div class="wb-auth-switch-row">
                        <button type="button" class="wb-link-btn" id="btn-switch-to-register">
                          ${i18n.t('workbench.auth.switch_to_register')}
                        </button>
                      </div>
                    </form>
                  `
              }
            </div>
          </div>
        </div>
      </div>
    `;

    this._containerEl.querySelector('#btn-close-auth-modal')?.addEventListener('click', () => this.close());
    this._containerEl.addEventListener('click', (e) => {
      if (e.target === this._containerEl) this.close();
    });

    this._containerEl.querySelectorAll('.wb-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab === 'register' ? 'register' : 'login';
        this.errorMessage = '';
        this.statusMessage = '';
        this.render();
      });
    });

    this._containerEl.querySelector('#btn-switch-to-register')?.addEventListener('click', () => {
      this.activeTab = 'register';
      this.errorMessage = '';
      this.statusMessage = '';
      this.render();
    });

    this._containerEl.querySelector('#btn-switch-to-login')?.addEventListener('click', () => {
      this.activeTab = 'login';
      this.errorMessage = '';
      this.statusMessage = '';
      this.render();
    });

    this._containerEl.querySelector('#wb-login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = this._containerEl.querySelector('#wb-login-email')?.value || '';
      const password = this._containerEl.querySelector('#wb-login-password')?.value || '';
      try {
        await this.submitLogin({ email, password });
      } catch {
        // Error state already rendered
      }
    });

    this._containerEl.querySelector('#wb-register-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = this._containerEl.querySelector('#wb-register-name')?.value || '';
      const email = this._containerEl.querySelector('#wb-register-email')?.value || '';
      const password = this._containerEl.querySelector('#wb-register-password')?.value || '';
      try {
        await this.submitRegister({ name, email, password });
      } catch {
        // Error state already rendered
      }
    });

    this._containerEl.querySelector('#btn-auth-logout')?.addEventListener('click', async () => {
      await this.logout();
    });

    this._containerEl.querySelector('#btn-auth-open-dashboard')?.addEventListener('click', () => {
      this.close();
      this.onOpenDashboard?.();
    });
  }

  destroy() {
    this._unsubLocale?.();
    this._containerEl?.remove?.();
  }
}
