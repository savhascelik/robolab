import { i18n } from '../../core/i18n/I18nService.js';

/**
 * CreditStoreModal — Authenticated Customer AI Credit Storefront
 *
 * Strictly customer-facing:
 * 1. Requires an authenticated user session (`apiClient.isAuthenticated()`).
 *    Unauthenticated guests are redirected to `onRequireAuth('login')`.
 * 2. Displays real backend-verified AI Credit balances (`available_credits`,
 *    `promotional_credits`, `purchased_credits`) and recent ledger transactions.
 * 3. Initiates embedded modal checkout sessions (`POST /api/v1/credits/checkout`),
 *    mounts the embedded checkout element inside the modal, and verifies payment
 *    completion via backend webhook state (`GET /api/v1/credits/orders/{orderNumber}`).
 *
 * Site administration (`Plans`, `Roles`, `RoleLimits`, `AiModels`, `AiCreditPackages`,
 * `Users`, `WebhookLogs`) lives exclusively in the Laravel Filament Admin Panel (`/admin`).
 */
export class CreditStoreModal {
  /**
   * @param {object} options
   * @param {HTMLElement|null} [options.rootEl]
   * @param {import('../../core/ai/BackendApiClient.js').BackendApiClient} options.apiClient
   * @param {(credits: object) => void} [options.onCreditsUpdated]
   * @param {(tab?: string) => void} [options.onRequireAuth]
   */
  constructor({ rootEl = null, apiClient, onCreditsUpdated = null, onRequireAuth = null } = {}) {
    this.rootEl = rootEl;
    this.apiClient = apiClient;
    this.onCreditsUpdated = onCreditsUpdated;
    this.onRequireAuth = onRequireAuth;

    this.isOpen = false;
    this.activeTab = 'packages';
    this.packages = [];
    this.transactions = [];
    this.pendingOrder = null;
    this.checkoutSession = null;
    this.isVerifyingOrder = false;
    this.statusBanner = null;
    this.containerEl = null;
    this._activeEmbeddedElement = null;
    this._orderPollTimer = null;

    this._onRootClick = this._onRootClick.bind(this);
    this._unsubLocale = i18n.onChange(() => {
      if (this.isOpen) {
        this.render();
      }
    });
  }

  _isEn() {
    return i18n.getLocale() === 'en';
  }

  mount() {
    if (!this.rootEl && typeof document !== 'undefined') {
      this.rootEl = document.getElementById('modal-root') || document.getElementById('credit-store-modal-root');
      if (!this.rootEl) {
        this.rootEl = document.createElement('div');
        this.rootEl.id = 'credit-store-modal-root';
        document.body.appendChild(this.rootEl);
      }
    }
    if (!this.rootEl) return this;

    if (typeof this.rootEl.appendChild === 'function' && typeof document !== 'undefined') {
      this.containerEl = document.createElement('div');
      this.containerEl.className = 'wb-modal-backdrop wb-credit-modal-host is-hidden';
      this.containerEl.dataset.testid = 'credit-store-modal-host';
      this.containerEl.addEventListener('click', this._onRootClick);
      this.rootEl.appendChild(this.containerEl);
    } else {
      this.containerEl = this.rootEl;
      this.rootEl.addEventListener?.('click', this._onRootClick);
    }
    this.render();
    return this;
  }

  async open(tab = 'packages') {
    if (!this.apiClient?.isAuthenticated?.()) {
      this.isOpen = false;
      this.render();
      this.onRequireAuth?.('login');
      return false;
    }

    this.activeTab = tab || 'packages';
    this.isOpen = true;
    this.statusBanner = null;
    await this.refreshData();
    this.render();
    return true;
  }

  close() {
    this._stopBackgroundOrderPolling();
    this._destroyEmbeddedElement();
    this.isOpen = false;
    this.render();
  }

  _startBackgroundOrderPolling(orderNumber) {
    this._stopBackgroundOrderPolling();
    if (!orderNumber || typeof setInterval !== 'function') return;
    this._orderPollTimer = setInterval(async () => {
      if (!this.isOpen || !this.pendingOrder || this.isVerifyingOrder) {
        return;
      }
      try {
        if (typeof this.apiClient?.checkCreditOrderStatus === 'function') {
          const res = await this.apiClient.checkCreditOrderStatus(orderNumber);
          if (res?.completed) {
            this._stopBackgroundOrderPolling();
            this._destroyEmbeddedElement();
            this.pendingOrder = null;
            this.checkoutSession = null;
            await this.refreshData();
            const isEn = this._isEn();
            const available = Number(this.apiClient.getCredits()?.available_credits ?? 0).toFixed(1);
            this.statusBanner = {
              type: 'success',
              text: isEn
                ? `Payment confirmed for ${orderNumber}! Your updated balance is ⚡ ${available} credits.`
                : `${orderNumber} ödemesi doğrulandı! Güncel bakiyeniz: ⚡ ${available} kredi.`
            };
            this.render();
          }
        }
      } catch {
        // Ignore background poll network errors
      }
    }, 3500);
  }

  _stopBackgroundOrderPolling() {
    if (this._orderPollTimer) {
      clearInterval(this._orderPollTimer);
      this._orderPollTimer = null;
    }
  }

  async refreshData() {
    if (!this.apiClient || !this.apiClient.isAuthenticated()) return;
    try {
      const [balRes, pkgs] = await Promise.all([
        this.apiClient.getCreditBalance(),
        this.apiClient.getCreditPackages()
      ]);
      if (balRes?.transactions) {
        this.transactions = balRes.transactions;
      }
      if (Array.isArray(pkgs) && pkgs.length > 0) {
        this.packages = pkgs;
      }
      if (this.onCreditsUpdated) {
        this.onCreditsUpdated(this.apiClient.getCredits());
      }
    } catch {
      // Keep existing state on transient error
    }
  }

  async handleSelectPackage(packageSlug) {
    if (!this.apiClient?.isAuthenticated?.()) {
      this.close();
      this.onRequireAuth?.('login');
      return null;
    }

    const isEn = this._isEn();
    this._destroyEmbeddedElement();
    this.statusBanner = {
      type: 'info',
      text: isEn ? 'Preparing secure embedded checkout session...' : 'Güvenli ödeme oturumu hazırlanıyor...'
    };
    this.render();

    try {
      const res = await this.apiClient.createCreditCheckout(packageSlug);
      if (res?.ok && res.order) {
        this.pendingOrder = res.order;
        this.checkoutSession = res.checkout_session || null;
        this.statusBanner = {
          type: 'success',
          text: isEn
            ? `Checkout session ready (${res.order.order_number}). Complete your payment below — credits are added automatically via webhook verification.`
            : `Ödeme oturumu oluşturuldu (${res.order.order_number}). Ödemenizi aşağıdaki pencereden tamamlayın; krediniz arka plan doğrulamasıyla otomatik tanımlanır.`
        };
      }
    } catch (err) {
      if (err?.status === 401) {
        this.close();
        this.onRequireAuth?.('login');
        return null;
      }
      this.statusBanner = {
        type: 'error',
        text: err?.message || (isEn ? 'Could not start checkout session.' : 'Ödeme oturumu başlatılamadı.')
      };
    }

    this.render();
    if (this.pendingOrder && this.checkoutSession) {
      this._startBackgroundOrderPolling(this.pendingOrder.order_number);
      await this._mountEmbeddedCheckoutElement();
    }
    return this.pendingOrder;
  }

  async verifyPendingOrder({ orderNumber = null, pollAttempts = 5, intervalMs = 1200 } = {}) {
    const targetOrderNumber = orderNumber || this.pendingOrder?.order_number;
    if (!targetOrderNumber || !this.apiClient?.isAuthenticated?.()) {
      return { ok: false, completed: false };
    }

    const isEn = this._isEn();
    this.isVerifyingOrder = true;
    this.statusBanner = {
      type: 'info',
      text: isEn
        ? `Verifying payment status for order ${targetOrderNumber} with backend...`
        : `${targetOrderNumber} siparişi için arka plan ödeme doğrulaması kontrol ediliyor...`
    };
    this.render();

    let lastRes = { ok: false, completed: false };
    const attempts = Math.max(1, Number(pollAttempts) || 1);

    for (let i = 0; i < attempts; i++) {
      if (typeof this.apiClient.checkCreditOrderStatus === 'function') {
        lastRes = await this.apiClient.checkCreditOrderStatus(targetOrderNumber);
      }
      if (lastRes?.completed) {
        this._stopBackgroundOrderPolling();
        this._destroyEmbeddedElement();
        this.pendingOrder = null;
        this.checkoutSession = null;
        this.isVerifyingOrder = false;
        await this.refreshData();
        const available = Number(this.apiClient.getCredits()?.available_credits ?? 0).toFixed(1);
        this.statusBanner = {
          type: 'success',
          text: isEn
            ? `Payment confirmed for ${targetOrderNumber}! Your updated balance is ⚡ ${available} credits.`
            : `${targetOrderNumber} ödemesi doğrulandı! Güncel bakiyeniz: ⚡ ${available} kredi.`
        };
        this.render();
        return lastRes;
      }
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
    }

    this.isVerifyingOrder = false;
    this.statusBanner = {
      type: 'info',
      text: isEn
        ? `Order ${targetOrderNumber} is still awaiting webhook confirmation. Once payment finishes, click "Verify Payment" or wait a few seconds.`
        : `${targetOrderNumber} siparişi henüz ödeme onayı bekliyor. Ödemeyi tamamladıktan sonra "Ödemeyi Doğrula" butonuna tıklayabilirsiniz.`
    };
    this.render();
    if (this.pendingOrder && this.checkoutSession) {
      await this._mountEmbeddedCheckoutElement();
    }
    return lastRes;
  }

  _destroyEmbeddedElement() {
    if (this._activeEmbeddedElement) {
      try {
        this._activeEmbeddedElement.unmount?.();
        this._activeEmbeddedElement.destroy?.();
      } catch {
        // Ignore cleanup errors
      }
      this._activeEmbeddedElement = null;
    }
  }

  async _ensureEmbeddedSdkLoaded() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return null;
    if (typeof window.WhopElements === 'function') {
      return window.WhopElements;
    }
    const existingScript = document.querySelector('script[data-whop-elements]');
    if (!existingScript && document.head) {
      const script = document.createElement('script');
      script.src = 'https://cdn.whop.com/elements/amber/elements.js';
      script.async = true;
      script.defer = true;
      script.setAttribute('data-whop-elements', '1');
      document.head.appendChild(script);
    }
    for (let i = 0; i < 20; i++) {
      if (typeof window.WhopElements === 'function') {
        return window.WhopElements;
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    return typeof window.WhopElements === 'function' ? window.WhopElements : null;
  }

  async _mountEmbeddedCheckoutElement() {
    if (typeof document === 'undefined' || !this.isOpen || !this.pendingOrder || !this.checkoutSession) {
      return false;
    }
    const mountNode = (this.containerEl || this.rootEl)?.querySelector?.('#credit-embedded-checkout-mount');
    if (!mountNode) return false;

    const sdkFactory = await this._ensureEmbeddedSdkLoaded();
    if (typeof sdkFactory !== 'function') {
      return false;
    }

    try {
      this._destroyEmbeddedElement();
      mountNode.innerHTML = '';
      const sessionCfg = this.checkoutSession;
      const elements = sdkFactory({
        locale: this._isEn() ? 'en' : 'tr',
        environment: sessionCfg.environment || 'production',
        appearance: {
          theme: {
            appearance: 'light',
            accentColor: 'green'
          }
        }
      });

      const checkoutHandle = elements.checkout.create({
        plan: sessionCfg.plan_id,
        metadata: sessionCfg.metadata || {},
        returnUrl: sessionCfg.return_url,
        onComplete: async (completion) => {
          if (!completion || completion.result === 'payment') {
            await this.verifyPendingOrder({
              orderNumber: this.pendingOrder?.order_number,
              pollAttempts: 8,
              intervalMs: 1500
            });
          }
        }
      });

      const checkoutEl = checkoutHandle.create('checkout', {
        buyerEmail: sessionCfg.buyer_email || this.apiClient?.user?.email || '',
        onError: () => {
          const isEn = this._isEn();
          if (mountNode) {
            mountNode.innerHTML = `
              <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; min-height:240px; padding:24px; text-align:center; color:#475569;">
                <div style="font-size:14px; font-weight:700; color:#0f172a;">
                  ${isEn ? 'Whop Checkout Ready' : 'Whop Ödeme Oturumu Hazır'} (${sessionCfg.plan_id})
                </div>
                <div style="font-size:12.5px; max-width:480px; line-height:1.5;">
                  ${
                    isEn
                      ? 'Complete your purchase via the Whop checkout window below or verify once payment finishes.'
                      : 'Ödemenizi aşağıdaki Whop ödeme penceresinden tamamlayabilir veya ödeme sonrası doğrulayabilirsiniz.'
                  }
                </div>
                <button type="button" data-open-external-checkout="1" style="
                  padding: 10px 18px;
                  border-radius: 10px;
                  background: #10b981;
                  border: 1px solid #059669;
                  color: #ffffff;
                  font-size: 13px;
                  font-weight: 700;
                  cursor: pointer;
                ">${isEn ? 'Continue to Whop Checkout ↗' : 'Whop Ödeme Sayfasına Devam Et ↗'}</button>
              </div>
            `;
          }
        }
      });

      checkoutEl.mount(mountNode);
      this._activeEmbeddedElement = checkoutEl;
      return true;
    } catch {
      return false;
    }
  }

  _onRootClick(event) {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    if (target.classList.contains('credit-modal-backdrop') || target.closest('[data-credit-close]')) {
      this.close();
      return;
    }

    const verifyBtn = target.closest('[data-verify-order]');
    if (verifyBtn) {
      const orderNum = verifyBtn.getAttribute('data-verify-order') || this.pendingOrder?.order_number;
      this.verifyPendingOrder({ orderNumber: orderNum, pollAttempts: 4, intervalMs: 1200 });
      return;
    }

    const externalBtn = target.closest('[data-open-external-checkout]');
    if (externalBtn) {
      const url = this.pendingOrder?.checkout_url;
      if (url && typeof window !== 'undefined' && typeof window.open === 'function') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    const clearPendingBtn = target.closest('[data-clear-pending-order]');
    if (clearPendingBtn) {
      this._stopBackgroundOrderPolling();
      this._destroyEmbeddedElement();
      this.pendingOrder = null;
      this.checkoutSession = null;
      this.statusBanner = null;
      this.render();
      return;
    }

    const buyBtn = target.closest('[data-buy-package]');
    if (buyBtn) {
      const slug = buyBtn.getAttribute('data-buy-package');
      if (slug) this.handleSelectPackage(slug);
    }
  }

  render() {
    const host = this.containerEl || this.rootEl;
    if (!host) return;

    if (!this.isOpen || !this.apiClient?.isAuthenticated?.()) {
      host.innerHTML = '';
      host.hidden = true;
      host.classList?.add?.('is-hidden');
      if (this.rootEl && this.rootEl !== host) {
        const anyVisibleModal = this.rootEl.querySelector?.('.wb-modal-backdrop:not(.is-hidden)');
        if (!anyVisibleModal) {
          this.rootEl.hidden = true;
          this.rootEl.setAttribute?.('hidden', '');
        }
      }
      return;
    }

    host.hidden = false;
    host.classList?.remove?.('is-hidden');
    if (this.rootEl) {
      this.rootEl.hidden = false;
      this.rootEl.removeAttribute?.('hidden');
    }

    const isEn = this._isEn();
    const credits = this.apiClient.getCredits() || {
      available_credits: 0,
      promotional_credits: 0,
      purchased_credits: 0
    };
    const userRole = String(
      this.apiClient.user?.access_profile?.role ||
        this.apiClient.user?.role ||
        this.apiClient.user?.roles?.[0] ||
        'free'
    ).toUpperCase();

    host.innerHTML = `
      <div class="credit-modal-backdrop" id="credit-store-modal" style="
        position: fixed;
        inset: 0;
        z-index: 9800;
        background: rgba(15, 23, 42, 0.56);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      ">
        <div class="credit-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="credit-store-title" style="
          width: min(920px, 96vw);
          max-height: 90vh;
          overflow-y: auto;
          background: #ffffff;
          color: #0f172a;
          border-radius: 20px;
          border: 1px solid rgba(15, 23, 42, 0.1);
          box-shadow: 0 28px 70px rgba(15, 23, 42, 0.25);
          padding: 24px 28px;
          font-family: var(--font-sans, 'Plus Jakarta Sans', system-ui, sans-serif);
        ">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:16px; border-bottom:1px solid #e2e8f0; padding-bottom:16px; margin-bottom:20px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <span style="
                width: 40px;
                height: 40px;
                border-radius: 12px;
                background: linear-gradient(135deg, #10b981, #059669);
                color: #fff;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-weight: 800;
                font-size: 18px;
              ">⚡</span>
              <div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <h2 id="credit-store-title" style="margin:0; font-size:18px; font-weight:700; color:#0f172a;">
                    ${isEn ? 'CircuitLab AI Credit Store' : 'CircuitLab AI Kredi Mağazası'}
                  </h2>
                  <span style="padding:2px 8px; border-radius:999px; font-size:11px; font-weight:800; background:#ecfdf5; color:#047857; border:1px solid #a7f3d0;">
                    ${userRole} PLAN
                  </span>
                </div>
                <p style="margin:2px 0 0; font-size:12.5px; color:#64748b;">
                  ${
                    isEn
                      ? 'Top up AI credits for autonomous 3D circuit assembly, custom part synthesis, and embedded C++ generation.'
                      : 'Flownie Search Mode ve Code Mode ile otonom 3B devre kurulumu & gömülü C++ sentezi için AI kredisi yükleyin.'
                  }
                </p>
              </div>
            </div>

            <button type="button" data-credit-close="1" aria-label="${isEn ? 'Close' : 'Kapat'}" style="
              width: 34px;
              height: 34px;
              border-radius: 10px;
              border: 1px solid #e2e8f0;
              background: #f8fafc;
              color: #475569;
              cursor: pointer;
              font-size: 16px;
              font-weight: 700;
            ">✕</button>
          </div>

          ${
            this.statusBanner
              ? `<div id="credit-store-banner" style="
                  margin-bottom: 18px;
                  padding: 12px 16px;
                  border-radius: 12px;
                  font-size: 13px;
                  font-weight: 600;
                  background: ${
                    this.statusBanner.type === 'error'
                      ? '#fef2f2'
                      : this.statusBanner.type === 'success'
                      ? '#ecfdf5'
                      : '#eff6ff'
                  };
                  color: ${
                    this.statusBanner.type === 'error'
                      ? '#b91c1c'
                      : this.statusBanner.type === 'success'
                      ? '#047857'
                      : '#1d4ed8'
                  };
                  border: 1px solid ${
                    this.statusBanner.type === 'error'
                      ? '#fecaca'
                      : this.statusBanner.type === 'success'
                      ? '#a7f3d0'
                      : '#bfdbfe'
                  };
                ">${this.statusBanner.text}</div>`
              : ''
          }

          ${this._renderPackagesTab(credits, isEn)}
        </div>
      </div>
    `;
  }

  _localizePackageCopy(pkg, isEn = true) {
    if (!isEn) return { description: pkg.description || '', features: pkg.features || [] };
    const slug = String(pkg.slug || '').toLowerCase();
    if (slug.includes('starter')) {
      return {
        description:
          'Starter pack for fast circuit synthesis, pin validation, and embedded C++ firmware generation.',
        features: [
          `${pkg.credits || 500} AI Circuit & Agent Credits`,
          'Flownie Search Mode + CircuitSDK Code Mode',
          'Tavily Live Datasheet Synthesis',
          'Never Expires (Purchased Bucket)'
        ]
      };
    }
    if (slug.includes('maker')) {
      return {
        description:
          'Most popular pack: 2,000 Credits + 300 Bonus Credits for multi-turn robotics and Jetson Nano projects.',
        features: [
          '2,000 Purchased + 300 Bonus AI Credits (2,300 Total)',
          'Multi-Turn Autonomous Circuit Design Agent',
          'NVIDIA Nemotron-3 Super 120B & Qwen3 Support',
          'Priority Electrical Topology Verification'
        ]
      };
    }
    if (slug.includes('robotics') || slug.includes('studio')) {
      return {
        description:
          'High-capacity pack for teams, labs, and developers running intensive autonomous hardware simulations.',
        features: [
          '6,000 Purchased + 1,500 Bonus AI Credits (7,500 Total)',
          'Full Capacity Across All AI Models',
          'Unlimited Custom 3D Sensor & Datasheet Synthesis',
          'Full Collaboration in Open Study Groups'
        ]
      };
    }
    return { description: pkg.description || '', features: pkg.features || [] };
  }

  _renderPackagesTab(credits, isEn = true) {
    const pkgs =
      this.packages.length > 0
        ? this.packages
        : [
            {
              slug: 'starter-500',
              name: 'Starter Maker Pack',
              credits: 500,
              bonus_credits: 0,
              total_credits: 500,
              price_usd: 5.0,
              description: isEn
                ? 'Starter pack for fast circuit synthesis, pin validation, and embedded C++ firmware generation.'
                : 'Hızlı devre sentezi, pin doğrulama ve gömülü C++ kod üretimi için başlangıç paketi.',
              features: isEn
                ? ['500 AI Circuit & Agent Credits', 'Flownie Search Mode + CircuitSDK Code Mode', 'Never Expires (Purchased Bucket)']
                : ['500 AI Devre & Ajan Kredisi', 'Flownie Search Mode + CircuitSDK Code Mode', 'Süresiz Geçerli (Purchased Bucket)']
            },
            {
              slug: 'maker-2000',
              name: 'Maker Pro Credit Pack',
              credits: 2000,
              bonus_credits: 300,
              total_credits: 2300,
              price_usd: 15.0,
              is_popular: true,
              description: isEn
                ? 'Most popular pack: 2,000 Credits + 300 Bonus Credits for multi-turn robotics and Jetson Nano projects.'
                : 'En çok tercih edilen paket: 2.000 Kredi + 300 Hediye Kredi ile çok turlu robotik ve Jetson Nano projeleri.',
              features: isEn
                ? ['2,000 Purchased + 300 Bonus AI Credits', 'Multi-Turn Autonomous Circuit Agent', 'Priority Electrical Topology Verification']
                : ['2.000 Satın Alınan + 300 Bonus AI Kredisi', 'Çok Turlu Otonom Devre Tasarım Ajanı', 'Öncelikli Elektriksel Topoloji Doğrulama']
            },
            {
              slug: 'studio-6000',
              name: 'Robotics Lab Credit Pack',
              credits: 6000,
              bonus_credits: 1500,
              total_credits: 7500,
              price_usd: 39.99,
              description: isEn
                ? 'High-capacity pack for teams, classrooms, and intensive autonomous hardware simulation.'
                : 'Takımlar, laboratuvarlar ve yoğun otonom donanım testi yapan geliştiriciler için yüksek kapasiteli paket.',
              features: isEn
                ? ['6,000 Purchased + 1,500 Bonus AI Credits', 'Full Access Across All AI Models', 'Unlimited Custom 3D Sensor & Datasheet Synthesis']
                : ['6.000 Satın Alınan + 1.500 Bonus AI Kredisi', 'Tüm AI Modellerinde Tam Kapasite', 'Sınırsız Özel 3B Sensör & Datasheet Sentezi']
            }
          ];

    return `
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:14px; margin-bottom:22px;">
        <div style="padding:16px; border-radius:14px; background:linear-gradient(135deg,#ecfdf5,#f0fdf4); border:1px solid #a7f3d0;">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#047857;">
            ${isEn ? 'TOTAL AVAILABLE CREDITS' : 'KULLANILABİLİR TOPLAM KREDİ'}
          </div>
          <div id="credit-modal-available" style="font-size:28px; font-weight:800; color:#064e3b; margin-top:4px; font-family:var(--font-mono, monospace);">
            ⚡ ${Number(credits.available_credits ?? 0).toFixed(1)}
          </div>
          <div style="font-size:11.5px; color:#047857; margin-top:4px;">
            ${isEn ? 'Used by Search Mode, Code Mode & Studio AI' : 'Search Mode, Code Mode & Devre AI tarafından kullanılır'}
          </div>
        </div>

        <div style="padding:16px; border-radius:14px; background:#f8fafc; border:1px solid #e2e8f0;">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#64748b;">
            ${isEn ? 'PROMOTIONAL / ROLE CREDITS' : 'PROMOSYON / ROL KREDİSİ'}
          </div>
          <div style="font-size:24px; font-weight:700; color:#0f172a; margin-top:6px; font-family:var(--font-mono, monospace);">
            ${Number(credits.promotional_credits ?? 0).toFixed(1)}
          </div>
          <div style="font-size:11.5px; color:#64748b; margin-top:4px;">
            ${isEn ? 'Spent first (Role starter allocation)' : 'Öncelikli harcanır (Rol başlangıç tanımlaması)'}
          </div>
        </div>

        <div style="padding:16px; border-radius:14px; background:#f8fafc; border:1px solid #e2e8f0;">
          <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#64748b;">
            ${isEn ? 'PURCHASED CREDITS' : 'SATIN ALINAN KREDİ'}
          </div>
          <div style="font-size:24px; font-weight:700; color:#0f172a; margin-top:6px; font-family:var(--font-mono, monospace);">
            ${Number(credits.purchased_credits ?? 0).toFixed(1)}
          </div>
          <div style="font-size:11.5px; color:#64748b; margin-top:4px;">
            ${isEn ? 'Never expires across all workspaces' : 'Süresizdir, tüm çalışma alanlarında geçerlidir'}
          </div>
        </div>
      </div>

      ${
        this.pendingOrder
          ? `
        <div id="pending-order-bar" style="
          margin-bottom: 20px;
          padding: 18px;
          border-radius: 16px;
          background: #f8fafc;
          border: 1px solid #bae6fd;
          display: flex;
          flex-direction: column;
          gap: 14px;
        ">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap;">
            <div>
              <div style="font-size:14px; font-weight:700; color:#0369a1;">
                ${isEn ? 'Embedded Checkout Session' : 'Gömülü Ödeme Oturumu'} • ${this.pendingOrder.order_number}
              </div>
              <div style="font-size:12px; color:#0284c7; margin-top:2px;">
                +${this.pendingOrder.credits_granted} ${isEn ? 'Credits' : 'Kredi'} • $${Number(
                  this.pendingOrder.amount_usd ?? this.pendingOrder.price_paid_usd ?? 0
                ).toFixed(2)} USD
              </div>
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <button type="button" data-verify-order="${this.pendingOrder.order_number}" id="verify-order-btn" style="
                padding: 8px 14px;
                border-radius: 999px;
                background: #10b981;
                border: 1px solid #059669;
                color: #ffffff;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
              ">${
                this.isVerifyingOrder
                  ? isEn
                    ? 'Verifying...'
                    : 'Doğrulanıyor...'
                  : isEn
                  ? '✓ Verify Payment Status'
                  : '✓ Ödeme Durumunu Doğrula'
              }</button>
              <button type="button" data-open-external-checkout="1" id="open-external-checkout-btn" style="
                padding: 8px 14px;
                border-radius: 999px;
                background: #0284c7;
                border: 1px solid #0284c7;
                color: #ffffff;
                font-size: 12px;
                font-weight: 700;
                cursor: pointer;
              ">${isEn ? 'Open Hosted Checkout ↗' : 'Yeni Sekmede Öde ↗'}</button>
              <button type="button" data-clear-pending-order="1" style="
                padding: 8px 12px;
                border-radius: 999px;
                background: #ffffff;
                border: 1px solid #cbd5e1;
                color: #475569;
                font-size: 12px;
                font-weight: 600;
                cursor: pointer;
              ">${isEn ? 'Change Package' : 'Paketi Değiştir'}</button>
            </div>
          </div>

          <div id="credit-embedded-checkout-mount" data-embedded-checkout-mount="1" style="
            min-height: 360px;
            border-radius: 12px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            padding: 12px;
            overflow: hidden;
          ">
            <div style="display:flex; align-items:center; justify-content:center; min-height:320px; color:#64748b; font-size:13px;">
              ${
                isEn
                  ? 'Loading secure embedded payment form... If it does not appear in your browser, click "Open Hosted Checkout ↗".'
                  : 'Güvenli gömülü ödeme formu yükleniyor... Tarayıcınızda açılmazsa "Yeni Sekmede Öde ↗" butonunu kullanabilirsiniz.'
              }
            </div>
          </div>
        </div>
      `
          : ''
      }

      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:16px; margin-bottom:22px;">
        ${pkgs
          .map((pkg) => {
            const total = Number(pkg.total_credits || Number(pkg.credits || 0) + Number(pkg.bonus_credits || 0));
            const localizedCopy = this._localizePackageCopy(pkg, isEn);
            return `
            <div class="credit-pkg-card" id="credit-pkg-${pkg.slug}" style="
              padding: 20px;
              border-radius: 16px;
              border: ${pkg.is_popular ? '2px solid #10b981' : '1px solid #e2e8f0'};
              background: ${pkg.is_popular ? 'linear-gradient(180deg,#ffffff,#f0fdf4)' : '#ffffff'};
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              position: relative;
            ">
              ${
                pkg.is_popular
                  ? `<span style="
                      position: absolute;
                      top: -11px;
                      right: 16px;
                      background: #10b981;
                      color: #fff;
                      font-size: 10px;
                      font-weight: 800;
                      padding: 3px 10px;
                      border-radius: 999px;
                      letter-spacing: 0.05em;
                    ">${isEn ? 'MOST POPULAR' : 'EN POPÜLER'}</span>`
                  : ''
              }
              <div>
                <h3 style="margin:0; font-size:16px; font-weight:700; color:#0f172a;">${pkg.name}</h3>
                <p style="margin:6px 0 12px; font-size:12px; color:#64748b; line-height:1.45;">
                  ${localizedCopy.description}
                </p>
                <div style="display:flex; align-items:baseline; gap:6px; margin-bottom:12px;">
                  <span style="font-size:28px; font-weight:800; color:#0f172a;">$${Number(pkg.price_usd).toFixed(2)}</span>
                  <span style="font-size:12px; color:#64748b;">/ ${total} ${isEn ? 'Credits' : 'Kredi'}</span>
                </div>
                <div style="font-size:12px; font-weight:700; color:#059669; margin-bottom:10px;">
                  ${
                    pkg.bonus_credits > 0
                      ? isEn
                        ? `+${pkg.bonus_credits} Bonus Credits Included`
                        : `+${pkg.bonus_credits} Bonus Kredi Dahil`
                      : isEn
                      ? `${pkg.credits} Base Credits`
                      : `${pkg.credits} Temel Kredi`
                  }
                </div>
                <ul style="list-style:none; padding:0; margin:0 0 16px; font-size:12px; color:#475569; display:flex; flex-direction:column; gap:6px;">
                  ${(localizedCopy.features || []).map((f) => `<li>✓ ${f}</li>`).join('')}
                </ul>
              </div>

              <button type="button" data-buy-package="${pkg.slug}" id="buy-pkg-btn-${pkg.slug}" style="
                width: 100%;
                padding: 10px 14px;
                border-radius: 10px;
                border: 1px solid ${pkg.is_popular ? '#059669' : '#cbd5e1'};
                background: ${pkg.is_popular ? '#10b981' : '#0f172a'};
                color: #ffffff;
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
              ">${isEn ? `Buy Now ($${Number(pkg.price_usd).toFixed(0)})` : `Satın Al ($${Number(pkg.price_usd).toFixed(0)})`}</button>
            </div>
          `;
          })
          .join('')}
      </div>

      <div style="border-top:1px solid #e2e8f0; padding-top:16px;">
        <h4 style="margin:0 0 10px; font-size:13px; font-weight:700; color:#334155;">
          ${isEn ? 'Recent Credit Ledger Activity' : 'Son Kredi Hareketleri (Muhasebe Kaydı)'}
        </h4>
        ${
          this.transactions.length === 0
            ? `<div style="font-size:12px; color:#64748b;">${
                isEn ? 'No credit transactions recorded yet.' : 'Henüz kredi hareketi bulunmuyor.'
              }</div>`
            : `<div style="display:flex; flex-direction:column; gap:6px; max-height:140px; overflow-y:auto;">
                ${this.transactions
                  .slice(0, 6)
                  .map(
                    (tx) => `
                  <div style="display:flex; justify-content:space-between; font-size:12px; padding:6px 10px; border-radius:8px; background:#f8fafc;">
                    <span style="font-weight:600; color:#334155;">${tx.type}</span>
                    <span style="color:#64748b;">${tx.description || tx.bucket || ''}</span>
                    <span style="font-family:var(--font-mono, monospace); font-weight:700; color:${
                      Number(tx.amount ?? tx.credits_delta ?? 0) >= 0 ? '#059669' : '#dc2626'
                    };">
                      ${Number(tx.amount ?? tx.credits_delta ?? 0) >= 0 ? '+' : ''}${Number(
                      tx.amount ?? tx.credits_delta ?? 0
                    ).toFixed(2)}
                    </span>
                  </div>
                `
                  )
                  .join('')}
              </div>`
        }
      </div>
    `;
  }

  destroy() {
    this._stopBackgroundOrderPolling();
    this._destroyEmbeddedElement();
    if (this._unsubLocale) {
      this._unsubLocale();
      this._unsubLocale = null;
    }
    if (this.rootEl) {
      this.rootEl.removeEventListener?.('click', this._onRootClick);
      this.rootEl.innerHTML = '';
    }
    this.isOpen = false;
  }
}
