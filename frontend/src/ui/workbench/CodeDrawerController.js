import { i18n } from '../../core/i18n/I18nService.js';
import { DEFAULT_ARDUINO_SKETCH } from '../../sim/LiveCodeRuntime.js';

/**
 * CodeDrawerController — Slide-over right hardware code & serial monitor drawer.
 * Closed by default (`isOpen === false`) to preserve an uncluttered 3D canvas.
 */
export class CodeDrawerController {
  /**
   * @param {object} opts
   * @param {HTMLElement|null} [opts.rootEl]
   * @param {import('../../sim/LiveCodeRuntime.js').LiveCodeRuntime} [opts.runtime]
   * @param {(isOpen: boolean) => void} [opts.onToggle]
   * @param {(code: string) => void} [opts.onRunCode]
   */
  constructor(opts = {}) {
    this.rootEl =
      opts.rootEl ||
      (typeof document !== 'undefined' ? document.getElementById('drawer-root') : null);
    this.runtime = opts.runtime || null;
    this.onToggle = opts.onToggle || null;
    this.onRunCode = opts.onRunCode || null;
    this.onCodeChange = opts.onCodeChange || null;

    this.isOpen = false;
    this.activeTab = 'editor'; // 'editor' | 'serial'
    this.code = this.runtime?.sourceCode || DEFAULT_ARDUINO_SKETCH;
    this.pinStates = {};
    this.serialEntries = [];

    if (this.rootEl) {
      this.rootEl.hidden = true;
    }

    this._unsubLocale = i18n.onChange(() => {
      if (this.isOpen) this.render();
    });
  }

  mount() {
    this.render();
    return this;
  }

  getSourceCode() {
    return this.getCode();
  }

  setSourceCode(nextCode, opts) {
    return this.setCode(nextCode, opts);
  }

  open() {
    this.isOpen = true;
    if (this.rootEl) {
      this.rootEl.hidden = false;
    }
    this.render();
    if (this.onToggle) this.onToggle(true);
    return this.isOpen;
  }

  close() {
    this.isOpen = false;
    if (this.rootEl) {
      this.rootEl.hidden = true;
    }
    if (this.onToggle) this.onToggle(false);
    return this.isOpen;
  }

  toggle() {
    return this.isOpen ? this.close() : this.open();
  }

  setCode(nextCode, { compileAndRun = false } = {}) {
    this.code = String(nextCode ?? '');
    if (this.runtime) {
      this.runtime.compile(this.code);
      if (compileAndRun) {
        this.runtime.start(this.code);
      }
    }
    if (this.isOpen) {
      this.render();
    }
  }

  getCode() {
    return this.code;
  }

  updatePinStates(pinStates = {}) {
    this.pinStates = pinStates || {};
    if (this.isOpen) {
      this.render();
    }
  }

  appendSerialEntry(entry) {
    if (!entry) return;
    this.serialEntries.push(entry);
    if (this.serialEntries.length > 80) {
      this.serialEntries.shift();
    }
    if (this.isOpen && this.activeTab === 'serial') {
      this.render();
    }
  }

  render() {
    if (!this.rootEl) return;
    this.rootEl.hidden = !this.isOpen;
    if (!this.isOpen) return;

    const pinKeys = Object.keys(this.pinStates);
    const pinChipsHtml =
      pinKeys.length > 0
        ? pinKeys
            .map((key) => {
              const info = this.pinStates[key];
              const vStr = Number(info?.voltage || 0).toFixed(1);
              return `<span class="pin-chip" data-high="${info?.high ? 'true' : 'false'}">${info.pin}: ${vStr}V (${info.mode})</span>`;
            })
            .join('')
        : `<span class="pin-chip">0.0V (IDLE)</span>`;

    const serialHtml =
      this.serialEntries.length > 0
        ? this.serialEntries.map((e) => `<div>&gt; ${e.text}</div>`).join('')
        : `<div>${i18n.t('workbench.codeDrawer.serialEmpty')}</div>`;

    const lineCount = this.code.split(/\r?\n/).length;

    this.rootEl.innerHTML = `
      <div class="code-drawer">
        <header class="drawer-header">
          <div>
            <h2>${i18n.t('workbench.codeDrawer.title')}</h2>
            <p class="drawer-subtitle">${i18n.t('workbench.codeDrawer.subtitle')}</p>
          </div>
          <button type="button" id="btn-close-code-drawer" class="btn-secondary">
            ${i18n.t('workbench.codeDrawer.closeBtn')}
          </button>
        </header>

        <div class="drawer-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            data-tab="editor"
            class="drawer-tab ${this.activeTab === 'editor' ? 'is-active' : ''}"
          >
            ${i18n.t('workbench.codeDrawer.tabEditor')}
          </button>
          <button
            type="button"
            role="tab"
            data-tab="serial"
            class="drawer-tab ${this.activeTab === 'serial' ? 'is-active' : ''}"
          >
            ${i18n.t('workbench.codeDrawer.tabSerial')}
          </button>
          <span style="margin-left:auto;font-size:11px;color:var(--text-muted);">
            ${i18n.t('workbench.codeDrawer.lineCount', { lines: lineCount })}
          </span>
        </div>

        <div class="drawer-body">
          <div class="pin-state-strip" id="pin-state-strip" aria-label="${i18n.t('workbench.codeDrawer.activePinsHeading')}">
            ${pinChipsHtml}
          </div>

          ${
            this.activeTab === 'editor'
              ? `<textarea
                  id="code-editor-textarea"
                  class="code-editor-textarea"
                  spellcheck="false"
                >${this.code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>`
              : `<div id="serial-log-box" class="serial-log-box">${serialHtml}</div>`
          }
        </div>

        <footer class="drawer-footer">
          <button type="button" id="btn-reset-code" class="btn-secondary">
            ${i18n.t('workbench.codeDrawer.resetBtn')}
          </button>
          <button type="button" id="btn-apply-code" class="btn-primary">
            ${i18n.t('workbench.codeDrawer.applyBtn')}
          </button>
        </footer>
      </div>
    `;

    const closeBtn = this.rootEl.querySelector('#btn-close-code-drawer');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    for (const tabBtn of this.rootEl.querySelectorAll('.drawer-tab')) {
      tabBtn.addEventListener('click', () => {
        this.activeTab = tabBtn.getAttribute('data-tab') || 'editor';
        this.render();
      });
    }

    const textarea = this.rootEl.querySelector('#code-editor-textarea');
    if (textarea) {
      textarea.addEventListener('input', (e) => {
        this.code = e.target.value;
        this.onCodeChange?.(this.code);
      });
    }

    const resetBtn = this.rootEl.querySelector('#btn-reset-code');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.setCode(DEFAULT_ARDUINO_SKETCH, { compileAndRun: false });
        this.onCodeChange?.(this.code);
      });
    }

    const applyBtn = this.rootEl.querySelector('#btn-apply-code');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        if (this.runtime) {
          this.runtime.start(this.code);
        }
        if (this.onRunCode) {
          this.onRunCode(this.code);
        }
        this.onCodeChange?.(this.code);
      });
    }
  }

  destroy() {
    if (this._unsubLocale) this._unsubLocale();
  }
}
