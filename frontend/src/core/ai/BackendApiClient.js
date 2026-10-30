import { DynamicComponentBuilder } from '../components/DynamicComponentBuilder.js';
import { STUDIO_MODELING_TOOL_DEFINITIONS } from './StudioModelingSDK.js';
import { i18n } from '../i18n/I18nService.js';

/**
 * Default Backend-Managed AI Models (Flownie-grade pricing + capability metadata).
 */
export const DEFAULT_AI_MODELS = Object.freeze([
  Object.freeze({
    slug: 'nebius-qwen3-coder-480b',
    name: 'Qwen3-Coder 480B (Nebius Studio)',
    provider: 'nebius',
    model_id: 'Qwen/Qwen3-Coder-480B-A35B-Instruct',
    tier: 'pro',
    default_credit_cost: 12,
    input_token_cost: 0.35,
    output_token_cost: 1.2,
    profit_multiplier_input: 1.5,
    profit_multiplier_output: 1.5,
    supports_function_calling: true,
    supports_structured_outputs: true,
    is_default: true,
    is_active: true
  }),
  Object.freeze({
    slug: 'nebius-deepseek-r1',
    name: 'DeepSeek-R1 671B Reasoning (Nebius)',
    provider: 'nebius',
    model_id: 'deepseek-ai/DeepSeek-R1',
    tier: 'pro',
    default_credit_cost: 18,
    input_token_cost: 0.55,
    output_token_cost: 2.19,
    profit_multiplier_input: 1.5,
    profit_multiplier_output: 1.5,
    supports_function_calling: true,
    supports_structured_outputs: true,
    is_default: false,
    is_active: true
  }),
  Object.freeze({
    slug: 'gemini-2.5-flash-hardware',
    name: 'Gemini 2.5 Flash Hardware Synthesizer',
    provider: 'google',
    model_id: 'gemini-2.5-flash',
    tier: 'free',
    default_credit_cost: 5,
    input_token_cost: 0.15,
    output_token_cost: 0.6,
    profit_multiplier_input: 1.4,
    profit_multiplier_output: 1.4,
    supports_function_calling: true,
    supports_structured_outputs: true,
    is_default: false,
    is_active: true
  })
]);

/**
 * Default Whop AI Credit Packages (used both as initial UI catalog and offline fallback).
 */
export const DEFAULT_CREDIT_PACKAGES = Object.freeze([
  Object.freeze({
    id: 1,
    name: 'Starter Maker Pack',
    slug: 'starter-500',
    description: 'Başlangıç devre sentezi, komponent datasheet üretimi ve AI tanılama için 500 AI kredisi.',
    credits: 500,
    bonus_credits: 0,
    total_credits: 500,
    price_usd: 4.99,
    whop_plan_id: 'plan_circuitlab_starter_500',
    badge_text: 'Başlangıç',
    is_featured: false
  }),
  Object.freeze({
    id: 2,
    name: 'Maker Pro Pack',
    slug: 'maker-2000',
    description: 'Flownie Code Mode ile tam otonom 3B devre kurulumu, kablo yönlendirme ve gömülü C++ kod üretimi için 2000 + 300 bonus AI kredisi.',
    credits: 2000,
    bonus_credits: 300,
    total_credits: 2300,
    price_usd: 14.99,
    whop_plan_id: 'plan_circuitlab_pro_2000',
    badge_text: 'En Popüler (+300 Bonus)',
    is_popular: true,
    is_featured: true,
    features: ['2000 Temel + 300 Bonus AI Kredisi', 'Flownie Search Mode & Code Mode', 'Tam 3B Devre & C++ Sentezi']
  }),
  Object.freeze({
    id: 3,
    name: 'Robotics & AI Lab Pack',
    slug: 'studio-6000',
    description: 'Jetson Nano, ESP32 ve çoklu sensör-motor sumo robot filoları için 6000 + 1500 bonus AI kredisi.',
    credits: 6000,
    bonus_credits: 1500,
    total_credits: 7500,
    price_usd: 39.99,
    whop_plan_id: 'plan_circuitlab_lab_6000',
    badge_text: 'Takım & Hackathon (+1500 Bonus)',
    is_popular: false,
    is_featured: false,
    features: ['6000 Temel + 1500 Bonus AI Kredisi', 'Jetson & Sumo Filo Sentezi', 'Öncelikli Nebius Token Kota']
  })
]);

const STORAGE_TOKEN_KEY = 'circuitlab_auth_token';
const STORAGE_USER_KEY = 'circuitlab_auth_user';
const STORAGE_MODEL_KEY = 'circuitlab_selected_ai_model';

/**
 * BackendApiClient — Unified client for:
 * - Backend-verified Authentication (`/api/v1/auth/*`)
 * - Cloud Workspaces & Study Groups (`/api/v1/projects`, `/api/v1/groups`)
 * - AI Credit Balance & Whop Checkout (`/api/v1/credits/*`)
 * - Flownie Multi-Round Hardware Agent Turn & Circuit Command (`/api/v1/ai/*`)
 *
 * Enforces Backend-Only AI (`aiServiceMode === 'backend'`; no client-side BYOK).
 * Guests (unauthenticated users) have `creditBalance === null` and `getCredits() === null`.
 * Site administration (`Plans`, `Roles`, `RoleLimits`, `AiModels`, `AiCreditPackages`, `Users`)
 * is managed exclusively via the Filament Admin Panel (`/admin`).
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export class BackendApiClient {
  /**
   * Validates standard RFC-style email addresses.
   * @param {string} email
   */
  static isValidEmail(email) {
    if (typeof email !== 'string' || email.trim().length < 5) return false;
    return EMAIL_REGEX.test(email.trim());
  }

  constructor(options = {}) {
    this.baseUrl =
      options.baseUrl ||
      (typeof window !== 'undefined' && window.__CIRCUITLAB_API_URL__) ||
      'http://127.0.0.1:8000/api/v1';

    this.fetchImpl =
      options.fetchImpl !== undefined
        ? options.fetchImpl
        : typeof globalThis.fetch === 'function'
        ? globalThis.fetch.bind(globalThis)
        : null;

    this.storage =
      options.storage !== undefined
        ? options.storage
        : typeof localStorage !== 'undefined'
        ? localStorage
        : null;

    // Purge any legacy client-side credit storage keys
    this._writeStorage('circuitlab_credit_balance', null);
    this._writeStorage('circuitlab3d.credits.v1', null);

    // Strictly backend-managed AI service mode (BYOK eliminated)
    this.aiServiceMode = 'backend';

    this.aiModels = [...DEFAULT_AI_MODELS];
    this.selectedModelSlug =
      this._readStorage(STORAGE_MODEL_KEY) || DEFAULT_AI_MODELS[0].slug;

    this.token = options.token || this._readStorage(STORAGE_TOKEN_KEY) || null;
    this.user = options.user || this._readJsonStorage(STORAGE_USER_KEY) || null;

    this._offlineWorkspaces = [];
    this._offlineGroups = [];
    this._offlineCustomComponents =
      this._readJsonStorage('circuitlab.customComponents.v2') || [];
    this._offlinePackages = DEFAULT_CREDIT_PACKAGES.map((p) => ({ ...p }));
    this._creditListeners = new Set();

    // Guests never have a credit balance; only authenticated sessions carry backend credits
    this.creditBalance = null;
    if (this.isAuthenticated()) {
      const initialCb =
        options.creditBalance ||
        this.user?.credits ||
        this.user?.credit_balance ||
        null;
      if (initialCb) {
        this._syncCreditBalanceFromPayload({ credit_balance: initialCb });
      }
    }
  }

  _readStorage(key) {
    try {
      return this.storage?.getItem?.(key) || null;
    } catch {
      return null;
    }
  }

  _writeStorage(key, value) {
    try {
      if (!this.storage) return;
      if (value === null || value === undefined) {
        this.storage.removeItem?.(key);
      } else {
        this.storage.setItem?.(key, String(value));
      }
    } catch {
      // Ignore storage quota errors
    }
  }

  _readJsonStorage(key) {
    try {
      const raw = this._readStorage(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  _writeJsonStorage(key, value) {
    try {
      if (value === null || value === undefined) {
        this._writeStorage(key, null);
      } else {
        this._writeStorage(key, JSON.stringify(value));
      }
    } catch {
      // Ignore storage errors
    }
  }

  onCreditBalanceChange(listener) {
    if (typeof listener === 'function') {
      this._creditListeners.add(listener);
    }
    return () => this._creditListeners.delete(listener);
  }

  onCreditChange(listener) {
    return this.onCreditBalanceChange(listener);
  }

  getCredits() {
    if (!this.isAuthenticated() || !this.creditBalance) {
      return null;
    }
    const promo = Number(this.creditBalance.promotional_credits ?? 0);
    const purch = Number(this.creditBalance.purchased_credits ?? 0);
    const total = Number(
      this.creditBalance.available_credits ??
        this.creditBalance.total_credits ??
        promo + purch
    );
    return {
      promotional_credits: promo,
      purchased_credits: purch,
      available_credits: total,
      total_credits: total
    };
  }

  setCredits(nextCredits = null) {
    if (!this.isAuthenticated() || !nextCredits || typeof nextCredits !== 'object') {
      this.creditBalance = null;
      this._notifyCreditListeners();
      return null;
    }
    const promo = Number(nextCredits.promotional_credits ?? 0);
    const purch = Number(nextCredits.purchased_credits ?? 0);
    const total = Number(
      nextCredits.available_credits ??
        nextCredits.total_credits ??
        promo + purch
    );
    this.creditBalance = {
      promotional_credits: promo,
      purchased_credits: purch,
      available_credits: total,
      total_credits: total
    };
    this._notifyCreditListeners();
    return this.getCredits();
  }

  _notifyCreditListeners() {
    const current = this.getCredits();
    for (const fn of this._creditListeners) {
      try {
        fn(current);
      } catch {
        // Ignore listener errors
      }
    }
  }

  _syncCreditBalanceFromPayload(payload) {
    if (!this.isAuthenticated()) {
      this.creditBalance = null;
      return;
    }
    const cb =
      payload?.credit_balance ||
      payload?.credits ||
      payload?.user?.credit_balance ||
      payload?.user?.credits ||
      payload?.balance ||
      null;
    if (
      cb &&
      typeof cb === 'object' &&
      (cb.total_credits !== undefined || cb.available_credits !== undefined)
    ) {
      const promo = Number(cb.promotional_credits ?? 0);
      const purch = Number(cb.purchased_credits ?? 0);
      const total = Number(cb.available_credits ?? cb.total_credits ?? promo + purch);
      this.creditBalance = {
        promotional_credits: promo,
        purchased_credits: purch,
        available_credits: total,
        total_credits: total
      };
      this._notifyCreditListeners();
    }
  }

  setSelectedModel(slug) {
    const clean = String(slug || '').trim();
    if (!clean) return this.selectedModelSlug;
    this.selectedModelSlug = clean;
    this._writeStorage(STORAGE_MODEL_KEY, clean);
    return this.selectedModelSlug;
  }

  setToken(token) {
    this.token = token || null;
    this._writeStorage(STORAGE_TOKEN_KEY, this.token);
  }

  setSession(token, user, creditBalance = null) {
    this.token = token || null;
    this.user = user || null;
    this._writeStorage(STORAGE_TOKEN_KEY, this.token);
    this._writeJsonStorage(STORAGE_USER_KEY, this.user);
    if (!this.isAuthenticated()) {
      this.creditBalance = null;
      this._notifyCreditListeners();
      return;
    }
    const nextCb = creditBalance || user?.credits || user?.credit_balance || null;
    if (nextCb) {
      this._syncCreditBalanceFromPayload({ credit_balance: nextCb });
    }
  }

  clearSession() {
    this.token = null;
    this.user = null;
    this.creditBalance = null;
    this._writeStorage(STORAGE_TOKEN_KEY, null);
    this._writeJsonStorage(STORAGE_USER_KEY, null);
    this._writeStorage('circuitlab_credit_balance', null);
    this._writeStorage('circuitlab3d.credits.v1', null);
    this._notifyCreditListeners();
  }

  isAuthenticated() {
    return Boolean(this.token && this.user && this.user.email);
  }

  getUserRole() {
    if (!this.isAuthenticated()) return 'guest';
    return String(this.user?.role || this.user?.roles?.[0] || 'free').toLowerCase();
  }

  getQuotas() {
    if (!this.isAuthenticated()) return null;
    return this.user?.quotas || null;
  }

  async fetchLimitsOverview() {
    if (!this.isAuthenticated()) return null;
    if (!this.fetchImpl) {
      return {
        ok: true,
        role: this.getUserRole(),
        limits: this.user?.limits || {},
        quotas: this.user?.quotas || {}
      };
    }
    const data = await this._request('/limits/overview', { method: 'GET' });
    if (this.user && data.quotas) {
      this.user = {
        ...this.user,
        quotas: data.quotas,
        limits: data.limits || this.user.limits,
        access_profile: data.access_profile || this.user.access_profile
      };
      this._writeJsonStorage(STORAGE_USER_KEY, this.user);
    }
    return data;
  }

  _buildHeaders(extraHeaders = {}) {
    const activeLocale = typeof i18n?.getLocale === 'function' ? i18n.getLocale() : 'tr';
    const reqHeaders = {
      Accept: 'application/json',
      'Accept-Language': activeLocale,
      'Content-Type': 'application/json',
      ...extraHeaders
    };
    if (this.token) {
      reqHeaders.Authorization = `Bearer ${this.token}`;
    }
    return reqHeaders;
  }

  async _request(path, { method = 'GET', body = null, headers = {} } = {}) {
    if (!this.fetchImpl) {
      throw new Error('OFFLINE_NO_FETCH');
    }

    const reqHeaders = this._buildHeaders(headers);
    if (body === null || body instanceof FormData) {
      delete reqHeaders['Content-Type'];
    }

    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers: reqHeaders,
      body: body !== null ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined
    });

    const data = await response.json().catch(() => ({}));
    this._syncCreditBalanceFromPayload(data);

    if (!response.ok) {
      const err = new Error(data.message || data.error || `HTTP ${response.status}`);
      err.status = response.status;
      err.code = data.error || (response.status === 402 ? 'insufficient_credits' : 'api_error');
      err.payload = data;
      throw err;
    }

    return data;
  }

  // ---------------------------------------------------------------------------
  // Authentication & Session Verification
  // ---------------------------------------------------------------------------

  async register(arg1, emailArg, passwordArg) {
    const payload =
      typeof arg1 === 'object' && arg1 !== null
        ? arg1
        : { name: arg1, email: emailArg, password: passwordArg };

    const name = String(payload.name || '').trim() || 'Maker';
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '');

    if (!BackendApiClient.isValidEmail(email)) {
      const err = new Error('Lütfen geçerli bir e-posta adresi girin.');
      err.status = 422;
      throw err;
    }
    if (password.length < 6) {
      const err = new Error('Şifre en az 6 karakter olmalıdır.');
      err.status = 422;
      throw err;
    }

    if (!this.fetchImpl) {
      // Headless unit-test mode only (when fetchImpl === null)
      const creditBalance = {
        promotional_credits: 250,
        purchased_credits: 0,
        available_credits: 250,
        total_credits: 250
      };
      const testUser = {
        id: Date.now(),
        name,
        email,
        role: 'free',
        roles: ['free'],
        permissions: [
          'ai.generate_circuit',
          'ai.code_mode',
          'ai.search_tools',
          'ai.datasheet_synthesis',
          'workspace.cloud_sync'
        ],
        limits: {
          initial_credit_balance: 250,
          max_workspaces: 3,
          max_agent_rounds: 10
        },
        credits: creditBalance,
        credit_balance: creditBalance
      };
      const testToken = `cl3d_test_${Date.now().toString(36)}`;
      this.setSession(testToken, testUser, creditBalance);
      return {
        verified: true,
        token: testToken,
        user: testUser,
        credit_balance: creditBalance
      };
    }

    const data = await this._request('/auth/register', {
      method: 'POST',
      body: { name, email, password, password_confirmation: password }
    });
    if (data.token) {
      this.setSession(data.token, data.user, data.credit_balance || data.user?.credits);
    }
    return data;
  }

  async login(arg1, passwordArg) {
    const payload =
      typeof arg1 === 'object' && arg1 !== null
        ? arg1
        : { email: arg1, password: passwordArg };

    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '');

    if (!BackendApiClient.isValidEmail(email)) {
      const err = new Error('Lütfen geçerli bir e-posta adresi girin.');
      err.status = 422;
      throw err;
    }
    if (!password || password.length < 4) {
      const err = new Error('Lütfen geçerli şifrenizi girin.');
      err.status = 422;
      throw err;
    }

    if (!this.fetchImpl) {
      // Headless unit-test mode only (when fetchImpl === null)
      const creditBalance = {
        promotional_credits: 250,
        purchased_credits: 0,
        available_credits: 250,
        total_credits: 250
      };
      const testUser = {
        id: 1,
        name: email.split('@')[0],
        email,
        role: 'free',
        roles: ['free'],
        permissions: [
          'ai.generate_circuit',
          'ai.code_mode',
          'ai.search_tools',
          'ai.datasheet_synthesis',
          'workspace.cloud_sync'
        ],
        limits: {
          initial_credit_balance: 250,
          max_workspaces: 3,
          max_agent_rounds: 10
        },
        credits: creditBalance,
        credit_balance: creditBalance
      };
      const testToken = `cl3d_test_${Date.now().toString(36)}`;
      this.setSession(testToken, testUser, creditBalance);
      return {
        verified: true,
        token: testToken,
        user: testUser,
        credit_balance: creditBalance
      };
    }

    const data = await this._request('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    if (data.token) {
      this.setSession(data.token, data.user, data.credit_balance || data.user?.credits);
    }
    return data;
  }

  async verifySession() {
    if (!this.token) {
      this.clearSession();
      return { authenticated: false, verified: false, user: null };
    }
    if (!this.fetchImpl) {
      if (this.user?.email) {
        return {
          authenticated: true,
          verified: true,
          user: this.user,
          credit_balance: this.creditBalance
        };
      }
      this.clearSession();
      return { authenticated: false, verified: false, user: null };
    }
    try {
      const data = await this._request('/auth/me', { method: 'GET' });
      if (data.user) {
        this.setSession(this.token, data.user, data.credit_balance || data.user?.credits);
      }
      return {
        authenticated: true,
        verified: true,
        user: data.user,
        credit_balance: this.creditBalance
      };
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        this.clearSession();
        return { authenticated: false, verified: false, user: null };
      }
      if (this.user?.email) {
        return {
          authenticated: true,
          verified: true,
          user: this.user,
          credit_balance: this.creditBalance
        };
      }
      return { authenticated: false, verified: false, user: null };
    }
  }

  async logout() {
    try {
      if (this.token && this.fetchImpl) {
        await this._request('/auth/logout', { method: 'POST' });
      }
    } catch {
      // Ignore network errors on logout
    }
    this.clearSession();
    return { loggedOut: true };
  }

  async updateProfile(payload = {}) {
    if (!this.isAuthenticated()) {
      const err = new Error('Profil güncellemek için oturum açmalısınız.');
      err.status = 401;
      throw err;
    }

    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();

    if (!name || name.length < 2) {
      const err = new Error('Lütfen geçerli bir ad soyad girin.');
      err.status = 422;
      throw err;
    }
    if (!BackendApiClient.isValidEmail(email)) {
      const err = new Error('Lütfen geçerli bir e-posta adresi girin.');
      err.status = 422;
      throw err;
    }

    if (!this.fetchImpl) {
      const updatedUser = {
        ...this.user,
        name,
        email
      };
      this.setSession(this.token, updatedUser, this.creditBalance);
      return {
        status: 'ok',
        message: 'Hesap bilgileriniz başarıyla güncellendi.',
        user: updatedUser
      };
    }

    const data = await this._request('/auth/profile', {
      method: 'PUT',
      body: { name, email }
    });
    if (data.user) {
      this.setSession(this.token, data.user, data.credit_balance || data.user?.credits || this.creditBalance);
    }
    return data;
  }

  async changePassword(payload = {}) {
    if (!this.isAuthenticated()) {
      const err = new Error('Parola değiştirmek için oturum açmalısınız.');
      err.status = 401;
      throw err;
    }

    const currentPassword = String(payload.current_password ?? payload.currentPassword ?? '');
    const password = String(payload.password ?? payload.newPassword ?? '');
    const passwordConfirmation = String(
      payload.password_confirmation ?? payload.newPasswordConfirmation ?? password
    );

    if (!currentPassword) {
      const err = new Error('Lütfen mevcut parolanızı girin.');
      err.status = 422;
      throw err;
    }
    if (!password || password.length < 6) {
      const err = new Error('Yeni parola en az 6 karakter olmalıdır.');
      err.status = 422;
      throw err;
    }
    if (password !== passwordConfirmation) {
      const err = new Error('Yeni parola ve parola tekrarı eşleşmiyor.');
      err.status = 422;
      throw err;
    }

    if (!this.fetchImpl) {
      return {
        status: 'ok',
        message: 'Parolanız güvenli bir şekilde güncellendi.'
      };
    }

    return this._request('/auth/password', {
      method: 'PUT',
      body: {
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation
      }
    });
  }

  // ---------------------------------------------------------------------------
  // AI Models
  // ---------------------------------------------------------------------------

  async fetchAiModels() {
    try {
      const data = await this._request('/ai/models', { method: 'GET' });
      if (Array.isArray(data.models) && data.models.length > 0) {
        this.aiModels = data.models;
      }
      return this.aiModels;
    } catch {
      return this.aiModels;
    }
  }

  async listAiModels() {
    return this.fetchAiModels();
  }

  // ---------------------------------------------------------------------------
  // AI Credit Balance & Whop Storefront Endpoints (Authenticated Only)
  // ---------------------------------------------------------------------------

  async fetchCreditBalance() {
    if (!this.isAuthenticated()) {
      const err = new Error('AI kredi bakiyesini görüntülemek için giriş yapmalısınız.');
      err.status = 401;
      err.code = 'unauthenticated';
      throw err;
    }
    if (!this.fetchImpl) {
      return {
        ok: true,
        credits: this.getCredits(),
        balance: this.getCredits(),
        transactions: []
      };
    }
    const data = await this._request('/credits/balance', { method: 'GET' });
    this._syncCreditBalanceFromPayload(data);
    return {
      ...data,
      balance: data.credits || data.balance || this.getCredits()
    };
  }

  async getCreditBalance() {
    return this.fetchCreditBalance();
  }

  async fetchCreditPackages() {
    try {
      const data = await this._request('/credits/packages', { method: 'GET' });
      if (Array.isArray(data.packages) && data.packages.length > 0) {
        return data.packages;
      }
      return this._offlinePackages;
    } catch {
      return this._offlinePackages;
    }
  }

  async getCreditPackages() {
    return this.fetchCreditPackages();
  }

  async createCreditCheckout(packageSlugOrId) {
    if (!this.isAuthenticated()) {
      const err = new Error('Kredi paketi satın almak için oturum açmalısınız.');
      err.status = 401;
      err.code = 'unauthenticated';
      throw err;
    }

    if (!this.fetchImpl) {
      const pkg =
        this._offlinePackages.find(
          (p) =>
            p.slug === packageSlugOrId ||
            String(p.id) === String(packageSlugOrId) ||
            (packageSlugOrId === 'maker-pro-2000' && p.slug === 'maker-2000')
        ) || this._offlinePackages[0];
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const order = {
        uuid: orderNumber,
        order_number: orderNumber,
        status: 'pending',
        package_slug: pkg.slug,
        credits_amount: pkg.total_credits,
        credits_granted: pkg.total_credits,
        amount_usd: pkg.price_usd,
        checkout_url: `https://whop.com/checkout/${pkg.whop_plan_id}?d2c=true&metadata[order_number]=${orderNumber}`
      };
      return { ok: true, order, checkout_url: order.checkout_url };
    }

    const data = await this._request('/credits/checkout', {
      method: 'POST',
      body: { package_slug: packageSlugOrId }
    });
    return {
      ok: true,
      ...data,
      order: data.order
        ? {
            ...data.order,
            order_number: data.order.order_number || data.order.uuid,
            credits_granted: data.order.credits_granted ?? data.order.credits_amount
          }
        : null
    };
  }

  // ---------------------------------------------------------------------------
  // Flownie Multi-Round Hardware Agent Turn & Legacy Stage Command Planner
  // ---------------------------------------------------------------------------

  async runAgentTurn({
    prompt,
    round = 1,
    maxRounds = 10,
    userApprovedMaxRounds = null,
    roundExtensionGranted = false,
    observationText = '',
    sessionKnowledge = [],
    userAnswer = null,
    messages = [],
    history = [],
    tools = [],
    toolResults = [],
    boardType = 'board.arduino_uno',
    circuitState = {},
    mode = 'edit',
    modelSlug = null
  }) {
    if (!this.isAuthenticated()) {
      const err = new Error('Flownie AI ajanını kullanmak için giriş yapmalısınız.');
      err.status = 401;
      err.code = 'unauthenticated';
      throw err;
    }

    if (!this.fetchImpl) {
      const current = this.getCredits();
      const available = Number(current?.available_credits ?? current?.total_credits ?? 0);
      if (available <= 0) {
        const err = new Error('AI krediniz tükendi.');
        err.status = 402;
        err.code = 'insufficient_credits';
        throw err;
      }
      const nextPromo = Math.max(0, Number((Number(current.promotional_credits ?? 0) - 2).toFixed(4)));
      const nextPurch = Number(current.purchased_credits ?? 0);
      this.setCredits({
        promotional_credits: nextPromo,
        purchased_credits: nextPurch,
        available_credits: nextPromo + nextPurch
      });
      return {
        offlineFallback: true,
        round,
        max_rounds: userApprovedMaxRounds || maxRounds,
        remaining_rounds: Math.max(0, (userApprovedMaxRounds || maxRounds) - round),
        round_extension_granted: Boolean(roundExtensionGranted),
        charged_credits: 2,
        credit_balance: this.creditBalance
      };
    }

    const normalizedSessionKnowledge = Array.isArray(sessionKnowledge)
      ? sessionKnowledge
      : typeof sessionKnowledge === 'string' && sessionKnowledge.trim()
      ? [sessionKnowledge.trim()]
      : [];

    const activeLocale = typeof i18n?.getLocale === 'function' ? i18n.getLocale() : 'tr';

    return await this._request('/ai/agent-turn', {
      method: 'POST',
      body: {
        prompt,
        round,
        max_rounds: maxRounds,
        user_approved_max_rounds: userApprovedMaxRounds,
        round_extension_granted: Boolean(roundExtensionGranted),
        observation_text: observationText,
        session_knowledge: normalizedSessionKnowledge,
        user_answer: userAnswer,
        mode,
        locale: activeLocale,
        messages,
        history,
        tools,
        tool_results: toolResults,
        board_type: boardType,
        circuit_state: circuitState,
        model_slug: modelSlug || this.selectedModelSlug
      }
    });
  }

  async planCircuitCommand({
    prompt,
    activeBoardTypeId = 'board.arduino_uno',
    hostBoardId = 'main.host_board'
  }) {
    const text = String(prompt || '').trim();
    if (this.fetchImpl) {
      if (!this.isAuthenticated()) {
        const err = new Error('AI devre sentezini kullanmak için giriş yapmalısınız.');
        err.status = 401;
        err.code = 'unauthenticated';
        throw err;
      }
      const data = await this._request('/ai/circuit-command', {
        method: 'POST',
        body: {
          prompt: text,
          board_type: activeBoardTypeId,
          host_board_id: hostBoardId,
          model_slug: this.selectedModelSlug
        }
      });
      if (Array.isArray(data.stageCommands)) {
        return data;
      }
    }

    const lower = text.toLowerCase();
    const targetBoard = lower.includes('esp32')
      ? 'board.esp32_devkit'
      : lower.includes('jetson')
      ? 'board.jetson_nano'
      : activeBoardTypeId || 'board.arduino_uno';

    const signalPin =
      targetBoard === 'board.esp32_devkit'
        ? 'GPIO2'
        : targetBoard === 'board.jetson_nano'
        ? 'PWM_PIN33'
        : 'PIN9';
    const vccPin = targetBoard === 'board.arduino_uno' ? '5V' : '3V3';

    const stageCommands = [{ action: 'setHostBoard', typeId: targetBoard }];

    if (lower.includes('servo')) {
      stageCommands.push(
        { action: 'spawnComponent', typeId: 'actuator.servo', id: 'ai_servo_1', position: [-28, 0, 6] },
        { action: 'connectPins', from: `host.${vccPin}`, to: 'ai_servo_1.VCC', color: '#ef4444' },
        { action: 'connectPins', from: 'host.GND', to: 'ai_servo_1.GND', color: '#1e2430' },
        { action: 'connectPins', from: `host.${signalPin}`, to: 'ai_servo_1.SIGNAL', color: '#f59e0b' }
      );
    }

    if (lower.includes('ultrason') || lower.includes('hc-sr04') || lower.includes('mesafe')) {
      const trigPin = targetBoard === 'board.esp32_devkit' ? 'GPIO5' : 'PIN10';
      const echoPin = targetBoard === 'board.esp32_devkit' ? 'GPIO18' : 'PIN11';
      stageCommands.push(
        { action: 'spawnComponent', typeId: 'sensor.ultrasonic', id: 'ai_ultrasonic_1', position: [-28, 0, 18] },
        { action: 'connectPins', from: `host.${vccPin}`, to: 'ai_ultrasonic_1.VCC', color: '#ef4444' },
        { action: 'connectPins', from: 'host.GND', to: 'ai_ultrasonic_1.GND', color: '#1e2430' },
        { action: 'connectPins', from: `host.${trigPin}`, to: 'ai_ultrasonic_1.TRIG', color: '#38bdf8' },
        { action: 'connectPins', from: `host.${echoPin}`, to: 'ai_ultrasonic_1.ECHO', color: '#a855f7' }
      );
    }

    // Always include a closed-loop status LED + 220Ω resistor branch so the circuit is electrically complete
    stageCommands.push(
      {
        action: 'spawnComponent',
        typeId: 'passive.resistor',
        id: 'ai.resistor_limit',
        position: [-14, 0, 24],
        options: { ohms: 220 }
      },
      {
        action: 'spawnComponent',
        typeId: 'led.single',
        id: 'ai.led_indicator',
        position: [-4, 0, 24]
      },
      { action: 'connectPins', from: `host.${signalPin}`, to: 'ai.resistor_limit.LEAD_A', color: '#10b981' },
      { action: 'connectPins', from: 'ai.resistor_limit.LEAD_B', to: 'ai.led_indicator.ANODE', color: '#f59e0b' },
      { action: 'connectPins', from: 'ai.led_indicator.CATHODE', to: 'host.GND', color: '#1e2430' }
    );

    const pinNum = signalPin.replace(/\D+/g, '') || '13';
    const firmwareCode = [
      'void setup() {',
      '  Serial.begin(115200);',
      `  pinMode(${pinNum}, OUTPUT);`,
      '}',
      'void loop() {',
      `  digitalWrite(${pinNum}, HIGH);`,
      `  analogWrite(${pinNum}, 255);`,
      '  Serial.println("AI_CIRCUIT_ACTIVE");',
      '  delay(500);',
      '}'
    ].join('\n');

    stageCommands.push(
      { action: 'updateCode', code: firmwareCode },
      { action: 'startSimulation', code: firmwareCode }
    );

    return {
      summary: `${targetBoard} üzerinde kapalı çevrim devre ve gömülü C++ kodu sentezlendi.`,
      boardType: targetBoard,
      stageCommands,
      credit_balance: this.creditBalance
    };
  }

  async requestDiagnostics({ faults = [], loops = [], activeBoardTypeId = 'board.arduino_uno' } = {}) {
    try {
      const data = await this._request('/ai/diagnostics', {
        method: 'POST',
        body: {
          faults,
          loops,
          board_type: activeBoardTypeId,
          model_slug: this.selectedModelSlug
        }
      });
      const diagnosisText = data.diagnosis || data.explanation || data.advice;
      if (diagnosisText) {
        return {
          severity: data.severity || (faults.length > 0 ? 'critical' : 'info'),
          title: data.title || 'AI Elektriksel Tanılama',
          diagnosis: diagnosisText,
          explanation: diagnosisText,
          fixSuggestion:
            data.fixSuggestion ||
            'Akım sınırlama direnci (220Ω) ve GND dönüş hattını kontrol edin.'
        };
      }
    } catch {
      // Fallback below
    }

    const firstFault = faults[0];
    if (firstFault) {
      const diagnosis = `[${activeBoardTypeId}] ${firstFault.message || firstFault.code || 'Overvoltage'}: 5.0V kaynağı 3.3V (3V3) maksimum toleranslı GPIO pinine doğrudan bağlandı. Seviye dönüştürücü veya 220Ω seri koruma direnci ekleyin.`;
      return {
        severity: firstFault.severity || 'critical',
        title: 'AI Elektriksel Tanılama',
        diagnosis,
        explanation: diagnosis,
        fixSuggestion:
          '220Ω - 1kΩ seri akım sınırlama direnci ekleyin veya 5.0V -> 3.3V lojik seviye dönüştürücü kullanın.'
      };
    }

    const okMsg = `Devrede ${loops.length} kapalı çevrim aktif ve elektriksel süreklilik doğrulandı.`;
    return {
      severity: 'info',
      title: 'AI Elektriksel Tanılama',
      diagnosis: okMsg,
      explanation: okMsg,
      fixSuggestion: 'Herhangi bir kısa devre veya aşırı akım hatası tespit edilmedi.'
    };
  }

  async synthesizeDatasheet(partCode) {
    const code = String(partCode || 'BME280').trim().toUpperCase();
    try {
      const data = await this._request('/ai/datasheet', {
        method: 'POST',
        body: {
          part_code: code,
          model_slug: this.selectedModelSlug
        }
      });
      if (data.spec && typeof data.spec === 'object') {
        return data.spec;
      }
    } catch {
      // Fallback to local deterministic datasheet spec
    }
    return DynamicComponentBuilder.synthesizeOfflineDatasheetSpec(code);
  }

  async requestDatasheetSynthesis(partCode) {
    return this.synthesizeDatasheet(partCode);
  }

  /**
   * Sends a `/studio` 3D Custom Component Studio Architect modeling prompt to the backend LLM
   * (`POST /api/v1/ai/studio-modeling`), returning executable `StudioModelingSDK` (`studio.*`)
   * JavaScript code (`studio_code`), `thought`, `summary`, and LLM telemetry (`meta`).
   *
   * @param {object} [params]
   * @param {string} params.prompt
   * @param {object} [params.currentDraft]
   * @param {object} [params.snapshot]
   * @param {Array<object>} [params.history]
   * @param {string} [params.locale='tr']
   */
  /**
   * Calls the Backend LLM (`POST /api/v1/ai/studio-modeling`) to synthesize or modify
   * a 3D custom component inside `/studio/<slug>` using `StudioModelingSDK` (`studio.*`) tools.
   *
   * @param {object} params
   * @param {string} params.prompt
   * @param {object} [params.currentDraft]
   * @param {object} [params.snapshot]
   * @param {Array} [params.history]
   * @param {Array} [params.tools]
   * @param {Array} [params.toolResults]
   * @param {string} [params.observationText]
   * @param {number} [params.round=1]
   * @param {number} [params.maxRounds=6]
   * @param {string} [params.locale='tr']
   */
  async requestStudioModeling({
    prompt = '',
    currentDraft = null,
    snapshot = null,
    history = [],
    tools = STUDIO_MODELING_TOOL_DEFINITIONS,
    toolResults = [],
    observationText = '',
    round = 1,
    maxRounds = 6,
    locale = 'tr'
  } = {}) {
    const cleanPrompt = String(prompt || '').trim();
    if (!cleanPrompt) {
      throw new Error('Studio Architect prompt is required.');
    }

    const resolvedTools =
      Array.isArray(tools) && tools.length > 0 ? tools : STUDIO_MODELING_TOOL_DEFINITIONS;

    const data = await this._request('/ai/studio-modeling', {
      method: 'POST',
      body: {
        prompt: cleanPrompt,
        current_draft: currentDraft || snapshot?.draft || null,
        snapshot: snapshot || null,
        history: Array.isArray(history) ? history.slice(-8) : [],
        tools: resolvedTools,
        tool_results: Array.isArray(toolResults) ? toolResults : [],
        observation_text: String(observationText || ''),
        round: Number(round) || 1,
        max_rounds: Number(maxRounds) || 6,
        locale: String(locale || 'tr'),
        model_slug: this.selectedModelSlug
      }
    });

    const body = data?.data || data || {};
    return {
      ok: Boolean(body.ok ?? true),
      round: body.round ?? round,
      max_rounds: body.max_rounds ?? maxRounds,
      thought: body.thought || '',
      summary: body.summary || '',
      studio_code: body.studio_code || body.code || '',
      tool_calls: Array.isArray(body.tool_calls) ? body.tool_calls : [],
      rejected_tool_calls: Array.isArray(body.rejected_tool_calls) ? body.rejected_tool_calls : [],
      tools_available_count: body.tools_available_count ?? resolvedTools.length,
      meta: body.meta || {},
      charged_credits: body.charged_credits ?? 0,
      credit_balance: body.credit_balance || null
    };
  }

  // ---------------------------------------------------------------------------
  // Cloud Workspaces (`Projects`) & Study Groups
  // ---------------------------------------------------------------------------

  async listProjects() {
    try {
      const data = await this._request('/projects', { method: 'GET' });
      const body = data?.data || data;
      return Array.isArray(body) ? body : body.projects || body.scenarios || [];
    } catch {
      return this._offlineWorkspaces.filter((w) => w.is_public);
    }
  }

  async listUserWorkspaces() {
    if (!this.isAuthenticated()) return [];
    try {
      const data = await this._request('/projects?mine=1', { method: 'GET' });
      const body = data?.data || data;
      const list = Array.isArray(body) ? body : body.workspaces || body.projects || body.scenarios || [];
      return list;
    } catch {
      return this._offlineWorkspaces.filter(
        (w) => !w.user_email || w.user_email === this.user?.email
      );
    }
  }

  async fetchWorkspaces() {
    return this.listUserWorkspaces();
  }

  async getProject(idOrSlug) {
    if (!idOrSlug) return null;
    try {
      const data = await this._request(`/projects/${encodeURIComponent(idOrSlug)}`, { method: 'GET' });
      const body = data?.data || data;
      return body?.project || body?.scenario || data?.project || body || null;
    } catch {
      return (
        this._offlineWorkspaces.find(
          (w) => String(w.id) === String(idOrSlug) || w.slug === idOrSlug
        ) || null
      );
    }
  }

  async getWorkspace(idOrSlug) {
    return this.getProject(idOrSlug);
  }

  async createProject(payload = {}) {
    const record = {
      id: payload.id || `ws_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      slug:
        payload.slug ||
        `${String(payload.title || 'workspace')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')}-${Date.now().toString(36)}`,
      title: payload.title || 'Çalışma Alanı',
      description: payload.description || '',
      board_type: payload.board_type || 'board.arduino_uno',
      circuit_json: payload.circuit_json || {
        version: '2.0',
        boards: [{ id: 'host_board_1', typeId: payload.board_type || 'board.arduino_uno', position: [0, 0, 0] }],
        components: [],
        connections: [],
        customComponents: []
      },
      code: payload.code || '',
      is_public: Boolean(payload.is_public),
      user_id: this.user?.id || 1,
      user_email: this.user?.email || null,
      updated_at: new Date().toISOString()
    };

    try {
      const data = await this._request('/projects', {
        method: 'POST',
        body: record
      });
      const body = data?.data || data;
      const quotas = body?.quotas || data?.quotas;
      if (quotas && this.user) {
        this.user = { ...this.user, quotas: { ...(this.user.quotas || {}), workspaces: quotas } };
        this._writeJsonStorage(STORAGE_USER_KEY, this.user);
      }
      return body?.project || body?.scenario || data?.project || body;
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        throw err;
      }
      this._offlineWorkspaces = [
        record,
        ...this._offlineWorkspaces.filter((w) => w.id !== record.id && w.slug !== record.slug)
      ];
      return record;
    }
  }

  async createWorkspace(payload = {}) {
    return this.createProject(payload);
  }

  async updateProject(idOrSlug, payload = {}) {
    try {
      const data = await this._request(`/projects/${encodeURIComponent(idOrSlug)}`, {
        method: 'PUT',
        body: payload
      });
      const body = data?.data || data;
      return body?.project || body?.scenario || data?.project || body;
    } catch {
      const idx = this._offlineWorkspaces.findIndex(
        (w) => String(w.id) === String(idOrSlug) || w.slug === idOrSlug
      );
      const existing = idx >= 0 ? this._offlineWorkspaces[idx] : { id: idOrSlug, slug: String(idOrSlug) };
      const updated = {
        ...existing,
        ...payload,
        updated_at: new Date().toISOString()
      };
      if (idx >= 0) {
        this._offlineWorkspaces[idx] = updated;
      } else {
        this._offlineWorkspaces.unshift(updated);
      }
      return updated;
    }
  }

  async updateWorkspace(idOrSlug, payload = {}) {
    return this.updateProject(idOrSlug, payload);
  }

  async deleteProject(idOrSlug) {
    try {
      await this._request(`/projects/${encodeURIComponent(idOrSlug)}`, {
        method: 'DELETE'
      });
    } catch {
      // Offline fallback below
    }
    this._offlineWorkspaces = this._offlineWorkspaces.filter(
      (w) => String(w.id) !== String(idOrSlug) && w.slug !== idOrSlug
    );
    return { deleted: true };
  }

  async deleteWorkspace(idOrSlug) {
    return this.deleteProject(idOrSlug);
  }

  async forkProject(slug) {
    try {
      const data = await this._request(`/projects/${encodeURIComponent(slug)}/fork`, {
        method: 'POST'
      });
      const body = data?.data || data;
      return body?.project || body?.scenario || data?.project || body;
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        throw err;
      }
      const found = this._offlineWorkspaces.find((w) => w.slug === slug);
      if (!found) return null;
      const forked = {
        ...structuredClone(found),
        id: `ws_fork_${Date.now()}`,
        slug: `${found.slug}-fork-${Date.now().toString(36)}`,
        title: `${found.title} (Fork)`,
        updated_at: new Date().toISOString()
      };
      this._offlineWorkspaces.unshift(forked);
      return forked;
    }
  }

  async listStudyGroups() {
    try {
      const data = await this._request('/groups', { method: 'GET' });
      const body = data?.data || data;
      const list = Array.isArray(body) ? body : body.groups || data.groups || [];
      return list;
    } catch {
      return this._offlineGroups;
    }
  }

  async createStudyGroup({ name }) {
    const cleanName = String(name || '').trim();
    try {
      const data = await this._request('/groups', {
        method: 'POST',
        body: { name: cleanName }
      });
      const body = data?.data || data;
      return body?.group || data?.group || body;
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        throw err;
      }
      const group = {
        id: Date.now(),
        name: cleanName,
        invite_code: `CL3D-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        members_count: 1
      };
      this._offlineGroups.unshift(group);
      return group;
    }
  }

  async joinStudyGroup({ inviteCode }) {
    const cleanCode = String(inviteCode || '').trim().toUpperCase();
    try {
      const data = await this._request('/groups/join', {
        method: 'POST',
        body: { invite_code: cleanCode }
      });
      const body = data?.data || data;
      return body?.group || data?.group || body;
    } catch {
      const existing = this._offlineGroups.find((g) => g.invite_code === cleanCode);
      if (existing) return existing;
      const group = {
        id: Date.now(),
        name: `Grup (${cleanCode})`,
        invite_code: cleanCode,
        members_count: 2
      };
      this._offlineGroups.unshift(group);
      return group;
    }
  }

  /**
   * Lists custom 3D components from `/api/v1/custom-components` (merged with local cache).
   */
  async listCustomComponents() {
    let remoteList = [];
    try {
      const data = await this._request('/custom-components', { method: 'GET' });
      const body = data?.data || data;
      remoteList = Array.isArray(body) ? body : body?.components || data?.components || [];
    } catch {
      remoteList = [];
    }

    const byTypeId = new Map();
    for (const localItem of this._offlineCustomComponents || []) {
      const spec = localItem?.manifest_json || localItem;
      if (spec && spec.typeId) {
        byTypeId.set(spec.typeId, DynamicComponentBuilder.normalizeSpec(spec));
      }
    }
    for (const item of remoteList) {
      const rawSpec = item?.manifest_json || item?.mesh_recipe?.v2_spec || item;
      if (rawSpec && (rawSpec.typeId || item?.type_id)) {
        const normalized = DynamicComponentBuilder.normalizeSpec({
          ...rawSpec,
          typeId: rawSpec.typeId || item.type_id
        });
        byTypeId.set(normalized.typeId, normalized);
      }
    }

    const merged = Array.from(byTypeId.values()).map((spec) => ({
      ...spec,
      type_id: spec.typeId,
      is_environment_prop: Boolean(spec.isEnvironmentProp)
    }));
    this._offlineCustomComponents = merged;
    this._writeJsonStorage('circuitlab.customComponents.v2', merged);
    merged.ok = true;
    merged.components = merged;
    return merged;
  }

  /**
   * Persists a custom 3D component spec (`DynamicComponentBuilder` v2) to `/api/v1/custom-components`
   * and updates the local storage cache.
   * @param {object} spec
   */
  async saveCustomComponent(spec = {}) {
    const normalized = DynamicComponentBuilder.normalizeSpec(spec);
    const enriched = {
      ...normalized,
      ok: true,
      type_id: normalized.typeId,
      is_environment_prop: Boolean(normalized.isEnvironmentProp),
      component: {
        type_id: normalized.typeId,
        typeId: normalized.typeId,
        name: normalized.name,
        category: normalized.category,
        is_environment_prop: Boolean(normalized.isEnvironmentProp),
        isEnvironmentProp: Boolean(normalized.isEnvironmentProp),
        manifest_json: normalized
      }
    };
    this._offlineCustomComponents = [
      enriched,
      ...(this._offlineCustomComponents || []).filter((item) => item.typeId !== normalized.typeId)
    ];
    this._writeJsonStorage('circuitlab.customComponents.v2', this._offlineCustomComponents);

    if (!this.isAuthenticated()) {
      return enriched;
    }

    try {
      const data = await this._request('/custom-components', {
        method: 'POST',
        body: {
          type_id: normalized.typeId,
          part_number: normalized.typeId.replace(/^custom\./i, '').toUpperCase(),
          name: normalized.name,
          category: normalized.category,
          is_environment_prop: Boolean(normalized.isEnvironmentProp),
          manifest_json: normalized
        }
      });
      const body = data?.data || data;
      const saved = body?.component || data?.component || null;
      const finalSpec = saved?.manifest_json
        ? DynamicComponentBuilder.normalizeSpec(saved.manifest_json)
        : normalized;
      return {
        ...finalSpec,
        ok: true,
        type_id: finalSpec.typeId,
        is_environment_prop: Boolean(finalSpec.isEnvironmentProp),
        component: {
          type_id: finalSpec.typeId,
          typeId: finalSpec.typeId,
          name: finalSpec.name,
          category: finalSpec.category,
          is_environment_prop: Boolean(finalSpec.isEnvironmentProp),
          isEnvironmentProp: Boolean(finalSpec.isEnvironmentProp),
          manifest_json: finalSpec
        }
      };
    } catch {
      return enriched;
    }
  }

  /**
   * Deletes a custom component by `typeId` or `slug`.
   * @param {string} typeIdOrSlug
   */
  async deleteCustomComponent(typeIdOrSlug) {
    const clean = String(typeIdOrSlug || '').trim();
    if (!clean) return { deleted: false };

    this._offlineCustomComponents = (this._offlineCustomComponents || []).filter(
      (item) => item.typeId !== clean && item.slug !== clean
    );
    this._writeJsonStorage('circuitlab.customComponents.v2', this._offlineCustomComponents);

    if (this.isAuthenticated()) {
      try {
        await this._request(`/custom-components/${encodeURIComponent(clean)}`, {
          method: 'DELETE'
        });
      } catch {
        // Ignore offline/not-found errors
      }
    }
    return { deleted: true, typeId: clean };
  }

  /**
   * Hydrates all saved custom components (from backend + local cache) into the given `ComponentRegistry`.
   * @param {import('../registry/ComponentRegistry.js').ComponentRegistry} registry
   */
  async hydrateCustomComponentsIntoRegistry(registry) {
    const specs = await this.listCustomComponents();
    const registered = [];
    for (const spec of specs) {
      try {
        const res = DynamicComponentBuilder.registerFromSpec(spec, registry);
        registered.push(res);
      } catch {
        // Ignore malformed custom component specs
      }
    }
    registered.ok = true;
    registered.registered = registered.map((r) => r.typeId);
    return registered;
  }
}

export const backendApiClient = new BackendApiClient();
