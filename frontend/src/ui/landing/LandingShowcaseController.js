import { i18n } from '../../core/i18n/I18nService.js';
import { themeService } from '../../core/theme/ThemeService.js';
import {
  SumoRobotShowcaseScene,
  SUMO_SUB_ASSEMBLIES
} from '../../stage/showcase/SumoRobotShowcaseScene.js';
import {
  JetsonVisionRobotShowcaseScene,
  JETSON_SUB_ASSEMBLIES
} from '../../stage/showcase/JetsonVisionRobotShowcaseScene.js';

/**
 * LandingShowcaseController — High-Craft Industrial 3D Robotics & Edge AI Showcase Landing Page.
 *
 * Stages two completely independent, interactive 3D WebGL robot scenes before entering the
 * full-bleed 3D Spatial Hardware Workbench:
 *
 * 1. **Scene 01 (`SumoRobotShowcaseScene`)**:
 *    Autonomous Mini-Sumo Robot that approaches from a distance (`z = -115` -> `z = 0`,
 *    rotating N20 wheels, braking pitch inertia, ultrasonic pulse rings) and separates into
 *    an 8-layer 3D CAD Exploded View (`explodeProgress: 0 -> 1`).
 *
 * 2. **Scene 02 (`JetsonVisionRobotShowcaseScene`)**:
 *    Dedicated 3D scene for an NVIDIA Jetson Nano Edge AI Camera Rover featuring a
 *    128-core Maxwell heatsink module, 40-pin 3.3V J41 header, MIPI CSI-2 ribbon cable,
 *    2-Axis Pan/Tilt Servo Gimbal Mast, Sony IMX219 8MP 160° camera lens, and a live 3D
 *    Optical FOV Vision Frustum Cone tracking a 3D target beacon.
 */
export const SUMO_KEY_HIGHLIGHTS = Object.freeze([
  {
    key: 'radar',
    partId: 'sensor_armor_head',
    code: '01',
    explodeTarget: 0.46
  },
  {
    key: 'drive',
    partId: 'power_driver_stage',
    code: '02',
    explodeTarget: 0.52
  },
  {
    key: 'brain',
    partId: 'mcu_controller',
    code: '03',
    explodeTarget: 0.48
  }
]);

export const JETSON_KEY_HIGHLIGHTS = Object.freeze([
  {
    key: 'ai',
    partId: 'jetson_nano_sbc',
    code: '01',
    explodeTarget: 0.48
  },
  {
    key: 'optics',
    partId: 'camera_gimbal_mast',
    code: '02',
    explodeTarget: 0.46
  },
  {
    key: 'mobility',
    partId: 'mecanum_wheels_left',
    code: '03',
    explodeTarget: 0.50
  }
]);

export class LandingShowcaseController {
  /**
   * @param {object} [opts]
   * @param {HTMLElement|null} [opts.rootEl]
   * @param {boolean} [opts.initialVisible=true]
   * @param {(payload?: { source?: string, project?: object }) => void} [opts.onEnterWorkbench]
   * @param {(project: object, sceneId: 'sumo'|'jetson') => any} [opts.onOpenRobotInWorkbench]
   */
  constructor(opts = {}) {
    this.rootEl =
      opts.rootEl !== undefined
        ? opts.rootEl
        : typeof document !== 'undefined'
        ? document.getElementById('landing-showcase-root')
        : null;

    this.isVisible = opts.initialVisible !== undefined ? Boolean(opts.initialVisible) : true;
    this.onEnterWorkbench = opts.onEnterWorkbench || null;
    this.onOpenRobotInWorkbench = opts.onOpenRobotInWorkbench || null;
    this.onOpenAuthModal = opts.onOpenAuthModal || null;
    this.onOpenDashboard = opts.onOpenDashboard || null;
    this.onLogout = opts.onLogout || null;
    this.sessionUser = opts.sessionUser || null;

    this.selectedSumoPartId = SUMO_KEY_HIGHLIGHTS[0].partId;
    this.selectedJetsonPartId = JETSON_KEY_HIGHLIGHTS[0].partId;
    this._sumoPinnedExplode = false;
    this._jetsonPinnedExplode = false;

    this._sumoCanvasEl = null;
    this._jetsonCanvasEl = null;

    // Instantiate both independent 3D robot scenes immediately (works in headless tests & browser)
    this.sumoScene = new SumoRobotShowcaseScene({
      canvas: null,
      autoPlay: true
    });

    this.jetsonScene = new JetsonVisionRobotShowcaseScene({
      canvas: null,
      autoTrack: true
    });

    this._unsubLocale = i18n.onChange(() => {
      if (this.rootEl) this.render();
    });
    this._unsubTheme = themeService.onChange(() => {
      if (this.rootEl) this._syncThemeControls();
    });
  }

  mount() {
    if (this.rootEl) {
      this.rootEl.hidden = !this.isVisible;
      this.render();
    }
    return this;
  }

  show() {
    this.isVisible = true;
    if (this.rootEl) {
      this.rootEl.hidden = false;
      this.sumoScene?.resize?.();
      this.jetsonScene?.resize?.();
    }
    return this;
  }

  hide() {
    this.isVisible = false;
    if (this.rootEl) {
      this.rootEl.hidden = true;
    }
    return this;
  }

  toggle() {
    return this.isVisible ? this.hide() : this.show();
  }

  setSessionUser(user) {
    this.sessionUser = user || null;
    if (this.rootEl) {
      this._renderTopbarAuthCluster();
    }
    return this;
  }

  _buildTopbarAuthHtml() {
    const isAuthed = Boolean(this.sessionUser && this.sessionUser.email);
    if (isAuthed) {
      const userInitial = String(this.sessionUser.name || this.sessionUser.email || 'U')
        .trim()
        .charAt(0)
        .toUpperCase();
      return `
        <button
          type="button"
          id="landing-dashboard-btn"
          data-testid="landing-dashboard-btn"
          class="landing-pill-btn landing-pill-btn--workspace"
        >
          <span>⊞ ${i18n.t('landing.nav.dashboardBtn')}</span>
        </button>
        <button
          type="button"
          id="landing-account-btn"
          data-testid="landing-account-badge"
          class="landing-pill-btn landing-account-pill"
          title="${this.sessionUser.email}"
        >
          <span class="landing-account-avatar">${userInitial}</span>
          <span class="landing-account-text">
            <strong>${this.sessionUser.name || this.sessionUser.email}</strong>
            <small>${this.sessionUser.email}</small>
          </span>
        </button>
        <button
          type="button"
          id="landing-logout-btn"
          data-testid="landing-logout-btn"
          class="landing-pill-btn landing-logout-pill"
        >
          <span>⎋ ${i18n.t('landing.nav.logoutBtn')}</span>
        </button>
      `;
    }
    return `
      <button
        type="button"
        id="landing-login-btn"
        data-testid="landing-login-btn"
        class="landing-pill-btn landing-auth-pill"
      >
        <span>${i18n.t('landing.nav.loginBtn')}</span>
      </button>
      <button
        type="button"
        id="landing-register-btn"
        data-testid="landing-register-btn"
        class="landing-pill-btn landing-auth-pill landing-auth-pill--register"
      >
        <span>${i18n.t('landing.nav.registerBtn')}</span>
      </button>
    `;
  }

  _renderTopbarAuthCluster() {
    if (!this.rootEl || typeof this.rootEl.querySelector !== 'function') return;
    const slot = this.rootEl.querySelector('#landing-auth-cluster');
    if (!slot) return;
    slot.innerHTML = this._buildTopbarAuthHtml();
    this._bindAuthClusterEvents();
  }

  _bindAuthClusterEvents() {
    if (!this.rootEl || typeof this.rootEl.querySelector !== 'function') return;
    this.rootEl.querySelector('#landing-login-btn')?.addEventListener('click', () => {
      this.onOpenAuthModal?.('login');
    });
    this.rootEl.querySelector('#landing-register-btn')?.addEventListener('click', () => {
      this.onOpenAuthModal?.('register');
    });
    this.rootEl.querySelector('#landing-account-btn')?.addEventListener('click', () => {
      this.onOpenAuthModal?.('login');
    });
    this.rootEl.querySelector('#landing-dashboard-btn')?.addEventListener('click', () => {
      this.onOpenDashboard?.();
    });
    this.rootEl.querySelector('#landing-logout-btn')?.addEventListener('click', () => {
      this.onLogout?.();
    });
  }

  /**
   * Advances both independent 3D robot scenes when the landing showcase is visible.
   * @param {number} dt
   */
  tick(dt = 0.016) {
    if (!this.isVisible) return;
    const sumState = this.sumoScene.tick(dt);
    const jetState = this.jetsonScene.tick(dt);

    if (this.rootEl) {
      this._updateLiveTelemetryDom(sumState, jetState);
    }
  }

  /**
   * Loads the Autonomous Mini-Sumo Robot circuit (`board.arduino_uno` + HC-SR04 + L298N + N20 Motors + TCRT5000)
   * directly into the 3D Spatial Hardware Workbench and hides the landing overlay.
   */
  openSumoInWorkbench() {
    const project = this.sumoScene.getWorkbenchProject();
    let result = null;
    if (typeof this.onOpenRobotInWorkbench === 'function') {
      result = this.onOpenRobotInWorkbench(project, 'sumo');
    }
    this.hide();
    if (typeof this.onEnterWorkbench === 'function') {
      this.onEnterWorkbench({ source: 'sumo', project, result });
    }
    return { sceneId: 'sumo', project, result };
  }

  /**
   * Loads the NVIDIA Jetson Nano Vision Camera Robot circuit (`board.jetson_nano` + IMX219 CSI-2 + Pan/Tilt Servos + ToF)
   * directly into the 3D Spatial Hardware Workbench and hides the landing overlay.
   */
  openJetsonInWorkbench() {
    const project = this.jetsonScene.getWorkbenchProject();
    let result = null;
    if (typeof this.onOpenRobotInWorkbench === 'function') {
      result = this.onOpenRobotInWorkbench(project, 'jetson');
    }
    this.hide();
    if (typeof this.onEnterWorkbench === 'function') {
      this.onEnterWorkbench({ source: 'jetson', project, result });
    }
    return { sceneId: 'jetson', project, result };
  }

  /**
   * Enters the 3D Spatial Hardware Workbench directly without overriding the active circuit.
   */
  enterWorkbench() {
    this.hide();
    if (typeof this.onEnterWorkbench === 'function') {
      this.onEnterWorkbench({ source: 'hero', project: null });
    }
    return { entered: true, isVisible: this.isVisible };
  }

  _resolvePartCopy(part) {
    const locale = i18n.getLocale();
    return {
      title: part.name?.[locale] || part.name?.tr || part.id,
      spec: typeof part.spec === 'object' ? part.spec[locale] || part.spec.tr : part.spec
    };
  }

  _formatSumoPhase(phase) {
    if (phase === 'approaching') return i18n.t('landing.sumoScene.statusApproaching');
    if (phase === 'exploded' || phase === 'exploding') {
      return i18n.t('landing.sumoScene.statusExploded');
    }
    return i18n.t('landing.sumoScene.statusAssembled');
  }

  render() {
    if (!this.rootEl) return;
    this.rootEl.hidden = !this.isVisible;

    const currentLocale = i18n.getLocale();
    const currentTheme = themeService.getTheme();
    const themeLabel =
      currentTheme === 'dark'
        ? i18n.t('workbench.topPill.themeDark')
        : i18n.t('workbench.topPill.themeLight');

    const sumoHighlightsHtml = SUMO_KEY_HIGHLIGHTS.map((item) => {
      const baseKey = `landing.sumoScene.highlights.${item.key}`;
      return `
        <div
          class="landing-feature-card"
          tabindex="0"
          role="button"
          data-sumo-part="${item.partId}"
          data-explode-target="${item.explodeTarget}"
        >
          <div class="landing-feature-card__header">
            <span class="landing-feature-card__index">${item.code}</span>
            <div class="landing-feature-card__title-wrap">
              <span class="landing-feature-card__tag">${i18n.t(`${baseKey}.tag`)}</span>
              <h3 class="landing-feature-card__title">${i18n.t(`${baseKey}.title`)}</h3>
            </div>
            <span class="landing-feature-card__metric">${i18n.t(`${baseKey}.metric`)}</span>
          </div>
          <div class="landing-feature-card__reveal">
            <p class="landing-feature-card__desc">${i18n.t(`${baseKey}.desc`)}</p>
          </div>
        </div>
      `;
    }).join('');

    const jetsonHighlightsHtml = JETSON_KEY_HIGHLIGHTS.map((item) => {
      const baseKey = `landing.jetsonScene.highlights.${item.key}`;
      return `
        <div
          class="landing-feature-card landing-feature-card--cyan"
          tabindex="0"
          role="button"
          data-jetson-part="${item.partId}"
          data-explode-target="${item.explodeTarget}"
        >
          <div class="landing-feature-card__header">
            <span class="landing-feature-card__index">${item.code}</span>
            <div class="landing-feature-card__title-wrap">
              <span class="landing-feature-card__tag">${i18n.t(`${baseKey}.tag`)}</span>
              <h3 class="landing-feature-card__title">${i18n.t(`${baseKey}.title`)}</h3>
            </div>
            <span class="landing-feature-card__metric">${i18n.t(`${baseKey}.metric`)}</span>
          </div>
          <div class="landing-feature-card__reveal">
            <p class="landing-feature-card__desc">${i18n.t(`${baseKey}.desc`)}</p>
          </div>
        </div>
      `;
    }).join('');

    this.rootEl.innerHTML = `
      <div class="landing-showcase-shell">
        <!-- Sticky Top Industrial Navigation Bar -->
        <header class="landing-topbar">
          <div class="landing-topbar__left">
            <a href="/" id="landing-brand-link" class="landing-brand">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="6" y="6" width="12" height="12" rx="2" />
                <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
              </svg>
              <strong>CircuitLab 3D</strong>
            </a>
            <span class="landing-badge-mono">${i18n.t('landing.nav.badge')}</span>
          </div>

          <nav class="landing-topbar__center" aria-label="3D Robot Scenes">
            <a href="#showcase-scene-sumo" class="landing-nav-link" data-scroll-target="showcase-scene-sumo">
              <span class="landing-nav-link__num">01</span>
              <span>${i18n.t('landing.hero.secondaryCtaSumo')}</span>
            </a>
            <a href="#showcase-scene-jetson" class="landing-nav-link" data-scroll-target="showcase-scene-jetson">
              <span class="landing-nav-link__num">02</span>
              <span>${i18n.t('landing.hero.secondaryCtaJetson')}</span>
            </a>
          </nav>

          <div class="landing-topbar__right">
            <button
              type="button"
              id="landing-locale-btn"
              class="landing-pill-btn"
              title="${i18n.t('workbench.topPill.langToggleTitle')}"
            >
              <span>${currentLocale.toUpperCase()}</span>
            </button>
            <button
              type="button"
              id="landing-theme-btn"
              class="landing-pill-btn"
              title="${i18n.t('workbench.topPill.themeToggleTitle')}"
            >
              <span id="landing-theme-label">${themeLabel}</span>
            </button>
            <div id="landing-auth-cluster" class="landing-auth-cluster">
              ${this._buildTopbarAuthHtml()}
            </div>
            <a
              href="/workbench"
              id="landing-enter-workbench-btn"
              class="landing-cta-btn landing-cta-btn--primary"
            >
              <span>${i18n.t('landing.nav.enterWorkbench')}</span>
            </a>
          </div>
        </header>

        <!-- Persuasive Marketing Hero Section -->
        <section class="landing-hero">
          <div class="landing-hero__eyebrow">${i18n.t('landing.hero.eyebrow')}</div>
          <h1 class="landing-hero__title">${i18n.t('landing.hero.title')}</h1>
          <p class="landing-hero__subtitle">${i18n.t('landing.hero.subtitle')}</p>
          <div class="landing-hero__actions">
            <a
              href="/workbench"
              id="hero-enter-workbench-btn"
              class="landing-cta-btn landing-cta-btn--primary landing-cta-btn--lg"
            >
              <span>${i18n.t('landing.hero.primaryCta')}</span>
            </a>
            <a
              href="#showcase-scene-sumo"
              class="landing-cta-btn landing-cta-btn--ghost"
              data-scroll-target="showcase-scene-sumo"
            >
              <span>01 · ${i18n.t('landing.hero.secondaryCtaSumo')}</span>
            </a>
            <a
              href="#showcase-scene-jetson"
              class="landing-cta-btn landing-cta-btn--ghost"
              data-scroll-target="showcase-scene-jetson"
            >
              <span>02 · ${i18n.t('landing.hero.secondaryCtaJetson')}</span>
            </a>
          </div>

          <!-- 3-Pillar Value Proposition Strip -->
          <div class="landing-value-strip">
            <div class="landing-value-pillar">
              <span class="landing-value-pillar__dot landing-value-pillar__dot--emerald"></span>
              <div>
                <strong>${i18n.t('landing.valueStrip.v1Title')}</strong>
                <p>${i18n.t('landing.valueStrip.v1Desc')}</p>
              </div>
            </div>
            <div class="landing-value-pillar">
              <span class="landing-value-pillar__dot landing-value-pillar__dot--cyan"></span>
              <div>
                <strong>${i18n.t('landing.valueStrip.v2Title')}</strong>
                <p>${i18n.t('landing.valueStrip.v2Desc')}</p>
              </div>
            </div>
            <div class="landing-value-pillar">
              <span class="landing-value-pillar__dot landing-value-pillar__dot--amber"></span>
              <div>
                <strong>${i18n.t('landing.valueStrip.v3Title')}</strong>
                <p>${i18n.t('landing.valueStrip.v3Desc')}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Dual Floating 3D Robot Showcases (Transparent Background, Hover-Driven Features) -->
        <div class="landing-scenes-stack">
          <!-- =====================================================================
               SCENE 01: AUTONOMOUS MINI-SUMO ROBOT (Floating 3D + 3 Hover Features)
               ===================================================================== -->
          <section
            id="showcase-scene-sumo"
            class="landing-scene-card"
            aria-label="${i18n.t('landing.sumoScene.title')}"
          >
            <div class="landing-scene-card__stage">
              <div class="landing-stage-glow landing-stage-glow--amber" aria-hidden="true"></div>
              <div class="landing-canvas-mount" id="sumo-canvas-mount"></div>

              <!-- Subtle Floating Status & Quick Action Bar -->
              <div class="landing-stage-hud landing-stage-hud--bottom">
                <span class="landing-hud-tag landing-hud-tag--emerald" id="sumo-phase-badge">
                  ${this._formatSumoPhase(this.sumoScene.phase)}
                </span>
                <button type="button" class="landing-stage-btn" id="sumo-replay-btn">
                  ${i18n.t('landing.sumoScene.btnReplayApproach')}
                </button>
                <button
                  type="button"
                  class="landing-stage-btn ${this._sumoPinnedExplode ? 'is-accent' : ''}"
                  id="sumo-explode-btn"
                >
                  ${i18n.t('landing.sumoScene.btnExplodeToggle')}
                </button>
              </div>
            </div>

            <div class="landing-scene-card__panel">
              <div class="landing-panel-header">
                <span class="landing-scene-tag landing-scene-tag--amber">
                  ${i18n.t('landing.sumoScene.sceneTag')}
                </span>
                <h2 class="landing-scene-title">${i18n.t('landing.sumoScene.title')}</h2>
                <p class="landing-scene-desc">${i18n.t('landing.sumoScene.subtitle')}</p>
              </div>

              <div class="landing-features-section" id="sumo-features-list">
                <div class="landing-features-hint">
                  <span class="landing-features-hint__pulse"></span>
                  <span>${i18n.t('landing.sumoScene.highlightsHint')}</span>
                </div>
                <div class="landing-feature-list">
                  ${sumoHighlightsHtml}
                </div>
              </div>

              <div class="landing-panel-footer">
                <a
                  href="/workbench?preset=sumo"
                  id="sumo-open-workbench-btn"
                  class="landing-cta-btn landing-cta-btn--primary landing-cta-btn--full"
                >
                  <span>${i18n.t('landing.sumoScene.openInWorkbenchBtn')}</span>
                </a>
              </div>
            </div>
          </section>

          <!-- =====================================================================
               SCENE 02: NVIDIA JETSON NANO EDGE AI CAMERA ROBOT (Floating 3D Stage)
               ===================================================================== -->
          <section
            id="showcase-scene-jetson"
            class="landing-scene-card landing-scene-card--reverse"
            aria-label="${i18n.t('landing.jetsonScene.title')}"
          >
            <div class="landing-scene-card__stage">
              <div class="landing-stage-glow landing-stage-glow--cyan" aria-hidden="true"></div>
              <div class="landing-canvas-mount" id="jetson-canvas-mount"></div>

              <!-- Subtle Floating Status & Quick Action Bar -->
              <div class="landing-stage-hud landing-stage-hud--bottom">
                <span class="landing-hud-tag landing-hud-tag--cyan">
                  ${i18n.t('landing.jetsonScene.telemetryStream')}
                </span>
                <button
                  type="button"
                  class="landing-stage-btn ${this.jetsonScene.visionFrustumVisible ? 'is-accent' : ''}"
                  id="jetson-fov-btn"
                >
                  ${i18n.t('landing.jetsonScene.fovToggleBtn')}
                </button>
                <button
                  type="button"
                  class="landing-stage-btn ${this._jetsonPinnedExplode ? 'is-accent' : ''}"
                  id="jetson-explode-toggle-btn"
                >
                  ${i18n.t('landing.jetsonScene.explodeToggleBtn')}
                </button>
              </div>
            </div>

            <div class="landing-scene-card__panel">
              <div class="landing-panel-header">
                <span class="landing-scene-tag landing-scene-tag--emerald">
                  ${i18n.t('landing.jetsonScene.sceneTag')}
                </span>
                <h2 class="landing-scene-title">${i18n.t('landing.jetsonScene.title')}</h2>
                <p class="landing-scene-desc">${i18n.t('landing.jetsonScene.subtitle')}</p>
              </div>

              <div class="landing-features-section" id="jetson-features-list">
                <div class="landing-features-hint">
                  <span class="landing-features-hint__pulse landing-features-hint__pulse--cyan"></span>
                  <span>${i18n.t('landing.jetsonScene.highlightsHint')}</span>
                </div>
                <div class="landing-feature-list">
                  ${jetsonHighlightsHtml}
                </div>
              </div>

              <div class="landing-panel-footer">
                <a
                  href="/workbench?preset=jetson"
                  id="jetson-open-workbench-btn"
                  class="landing-cta-btn landing-cta-btn--primary landing-cta-btn--full"
                >
                  <span>${i18n.t('landing.jetsonScene.openInWorkbenchBtn')}</span>
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    `;

    this._mountOrAttachCanvases();
    this._bindEvents();
  }

  /**
   * Ensures both `<canvas id="sumo-robot-canvas">` and `<canvas id="jetson-robot-canvas">`
   * are mounted inside their respective stage containers without losing WebGL contexts across re-renders.
   */
  _mountOrAttachCanvases() {
    if (!this.rootEl || typeof document === 'undefined') return;

    const sumoMount = this.rootEl.querySelector('#sumo-canvas-mount');
    if (sumoMount && typeof document.createElement === 'function') {
      if (!this._sumoCanvasEl) {
        this._sumoCanvasEl = document.createElement('canvas');
        this._sumoCanvasEl.id = 'sumo-robot-canvas';
        this._sumoCanvasEl.className = 'landing-webgl-canvas';
        this._sumoCanvasEl.setAttribute('aria-label', 'Scene 01: Autonomous Sumo Robot 3D Stage');
        sumoMount.appendChild(this._sumoCanvasEl);
        this.sumoScene.destroy();
        this.sumoScene = new SumoRobotShowcaseScene({
          canvas: this._sumoCanvasEl,
          autoPlay: true
        });
      } else if (this._sumoCanvasEl.parentElement !== sumoMount) {
        sumoMount.appendChild(this._sumoCanvasEl);
        this.sumoScene.resize();
      }
    }

    const jetsonMount = this.rootEl.querySelector('#jetson-canvas-mount');
    if (jetsonMount && typeof document.createElement === 'function') {
      if (!this._jetsonCanvasEl) {
        this._jetsonCanvasEl = document.createElement('canvas');
        this._jetsonCanvasEl.id = 'jetson-robot-canvas';
        this._jetsonCanvasEl.className = 'landing-webgl-canvas';
        this._jetsonCanvasEl.setAttribute(
          'aria-label',
          'Scene 02: NVIDIA Jetson Nano Camera Robot 3D Stage'
        );
        jetsonMount.appendChild(this._jetsonCanvasEl);
        this.jetsonScene.destroy();
        this.jetsonScene = new JetsonVisionRobotShowcaseScene({
          canvas: this._jetsonCanvasEl,
          autoTrack: true
        });
      } else if (this._jetsonCanvasEl.parentElement !== jetsonMount) {
        jetsonMount.appendChild(this._jetsonCanvasEl);
        this.jetsonScene.resize();
      }
    }
  }

  _syncThemeControls() {
    if (!this.rootEl || typeof this.rootEl.querySelector !== 'function') return;
    const themeLabelEl = this.rootEl.querySelector('#landing-theme-label');
    if (themeLabelEl) {
      themeLabelEl.textContent =
        themeService.getTheme() === 'dark'
          ? i18n.t('workbench.topPill.themeDark')
          : i18n.t('workbench.topPill.themeLight');
    }
  }

  _updateLiveTelemetryDom(sumState) {
    if (!this.rootEl || typeof this.rootEl.querySelector !== 'function') return;

    const phaseBadge = this.rootEl.querySelector('#sumo-phase-badge');
    if (phaseBadge && sumState) {
      phaseBadge.textContent = this._formatSumoPhase(sumState.phase);
    }
  }

  _shouldInterceptLinkClick(e) {
    if (!e) return true;
    if (typeof e.button === 'number' && e.button !== 0) return false;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (typeof e.preventDefault === 'function') e.preventDefault();
    return true;
  }

  _bindEvents() {
    if (!this.rootEl || typeof this.rootEl.querySelector !== 'function') return;

    const brandLink = this.rootEl.querySelector('#landing-brand-link');
    if (brandLink) {
      brandLink.addEventListener('click', (e) => {
        if (!this._shouldInterceptLinkClick(e)) return;
        this.rootEl.scrollTo?.({ top: 0, behavior: 'smooth' });
      });
    }

    // Navigation & Workbench Handoff
    const enterBtn = this.rootEl.querySelector('#landing-enter-workbench-btn');
    if (enterBtn) {
      enterBtn.addEventListener('click', (e) => {
        if (!this._shouldInterceptLinkClick(e)) return;
        this.enterWorkbench();
      });
    }

    const heroEnterBtn = this.rootEl.querySelector('#hero-enter-workbench-btn');
    if (heroEnterBtn) {
      heroEnterBtn.addEventListener('click', (e) => {
        if (!this._shouldInterceptLinkClick(e)) return;
        this.enterWorkbench();
      });
    }

    const localeBtn = this.rootEl.querySelector('#landing-locale-btn');
    if (localeBtn) {
      localeBtn.addEventListener('click', () => {
        i18n.setLocale(i18n.getLocale() === 'tr' ? 'en' : 'tr');
      });
    }

    const themeBtn = this.rootEl.querySelector('#landing-theme-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        themeService.toggleTheme();
      });
    }

    this._bindAuthClusterEvents();

    if (typeof this.rootEl.querySelectorAll === 'function') {
      this.rootEl.querySelectorAll('[data-scroll-target]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          if (!this._shouldInterceptLinkClick(e)) return;
          const targetId = btn.getAttribute('data-scroll-target');
          const targetEl = targetId ? this.rootEl.querySelector(`#${targetId}`) : null;
          if (targetEl && typeof targetEl.scrollIntoView === 'function') {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    }

    // Scene 01 — Sumo Robot Floating Quick Actions & Hover Highlights
    const sumoReplayBtn = this.rootEl.querySelector('#sumo-replay-btn');
    if (sumoReplayBtn) {
      sumoReplayBtn.addEventListener('click', () => {
        this._sumoPinnedExplode = false;
        const expBtn = this.rootEl.querySelector('#sumo-explode-btn');
        if (expBtn) expBtn.classList.remove('is-accent');
        this.sumoScene.replayApproachAndExplode();
      });
    }

    const sumoExplodeBtn = this.rootEl.querySelector('#sumo-explode-btn');
    if (sumoExplodeBtn) {
      sumoExplodeBtn.addEventListener('click', () => {
        this._sumoPinnedExplode = !this._sumoPinnedExplode;
        sumoExplodeBtn.classList.toggle('is-accent', this._sumoPinnedExplode);
        this.sumoScene.snapToExplodeFactor(this._sumoPinnedExplode ? 0.85 : 0);
      });
    }

    if (typeof this.rootEl.querySelectorAll === 'function') {
      const sumoCards = this.rootEl.querySelectorAll('[data-sumo-part]');
      const activateSumoCard = (card) => {
        const partId = card.getAttribute('data-sumo-part');
        const explodeTarget = Number(card.getAttribute('data-explode-target')) || 0.48;
        if (!partId) return;
        this.selectedSumoPartId = partId;
        sumoCards.forEach((el) => el.classList.toggle('is-hovered', el === card));
        this.sumoScene.setHoveredFeature(partId, this._sumoPinnedExplode ? 0.85 : explodeTarget);
      };

      sumoCards.forEach((card) => {
        card.addEventListener('pointerenter', () => activateSumoCard(card));
        card.addEventListener('mouseenter', () => activateSumoCard(card));
        card.addEventListener('focus', () => activateSumoCard(card));
        card.addEventListener('click', () => activateSumoCard(card));
      });

      const sumoList = this.rootEl.querySelector('#sumo-features-list');
      if (sumoList) {
        sumoList.addEventListener('mouseleave', () => {
          sumoCards.forEach((el) => el.classList.remove('is-hovered'));
          if (!this._sumoPinnedExplode) {
            this.sumoScene.clearHoveredFeature();
          }
        });
      }
    }

    const sumoOpenWbBtn = this.rootEl.querySelector('#sumo-open-workbench-btn');
    if (sumoOpenWbBtn) {
      sumoOpenWbBtn.addEventListener('click', (e) => {
        if (!this._shouldInterceptLinkClick(e)) return;
        this.openSumoInWorkbench();
      });
    }

    // Scene 02 — Jetson Nano Camera Robot Floating Quick Actions & Hover Highlights
    const jetsonFovBtn = this.rootEl.querySelector('#jetson-fov-btn');
    if (jetsonFovBtn) {
      jetsonFovBtn.addEventListener('click', () => {
        const next = !this.jetsonScene.visionFrustumVisible;
        this.jetsonScene.setVisionFrustumVisible(next);
        jetsonFovBtn.classList.toggle('is-accent', next);
      });
    }

    const jetsonExplodeToggleBtn = this.rootEl.querySelector('#jetson-explode-toggle-btn');
    if (jetsonExplodeToggleBtn) {
      jetsonExplodeToggleBtn.addEventListener('click', () => {
        this._jetsonPinnedExplode = !this._jetsonPinnedExplode;
        jetsonExplodeToggleBtn.classList.toggle('is-accent', this._jetsonPinnedExplode);
        this.jetsonScene._targetExplode = this._jetsonPinnedExplode ? 0.85 : 0;
        this.jetsonScene.setExplodeProgress(this._jetsonPinnedExplode ? 0.85 : 0);
      });
    }

    if (typeof this.rootEl.querySelectorAll === 'function') {
      const jetsonCards = this.rootEl.querySelectorAll('[data-jetson-part]');
      const activateJetsonCard = (card) => {
        const partId = card.getAttribute('data-jetson-part');
        const explodeTarget = Number(card.getAttribute('data-explode-target')) || 0.48;
        if (!partId) return;
        this.selectedJetsonPartId = partId;
        jetsonCards.forEach((el) => el.classList.toggle('is-hovered', el === card));
        this.jetsonScene.setHoveredFeature(partId, this._jetsonPinnedExplode ? 0.85 : explodeTarget);
      };

      jetsonCards.forEach((card) => {
        card.addEventListener('pointerenter', () => activateJetsonCard(card));
        card.addEventListener('mouseenter', () => activateJetsonCard(card));
        card.addEventListener('focus', () => activateJetsonCard(card));
        card.addEventListener('click', () => activateJetsonCard(card));
      });

      const jetsonList = this.rootEl.querySelector('#jetson-features-list');
      if (jetsonList) {
        jetsonList.addEventListener('mouseleave', () => {
          jetsonCards.forEach((el) => el.classList.remove('is-hovered'));
          if (!this._jetsonPinnedExplode) {
            this.jetsonScene.clearHoveredFeature();
          }
        });
      }
    }

    const jetsonOpenWbBtn = this.rootEl.querySelector('#jetson-open-workbench-btn');
    if (jetsonOpenWbBtn) {
      jetsonOpenWbBtn.addEventListener('click', (e) => {
        if (!this._shouldInterceptLinkClick(e)) return;
        this.openJetsonInWorkbench();
      });
    }
  }

  destroy() {
    if (this._unsubLocale) this._unsubLocale();
    if (this._unsubTheme) this._unsubTheme();
    this.sumoScene?.destroy?.();
    this.jetsonScene?.destroy?.();
  }
}
