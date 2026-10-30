import { i18n } from '../../core/i18n/I18nService.js';
import { backendApiClient } from '../../core/ai/BackendApiClient.js';

/**
 * Compact Hardware Diagnostic & Electrical Fault HUD Card (`#diagnostic-hud-root`).
 *
 * - Hidden by default (`isVisible === false`) so the 3D workbench stays uncluttered.
 * - Automatically surfaces above the bottom dock when `CircuitFlowSolver` reports an
 *   overvoltage, overcurrent, or short-circuit fault, or when the user requests diagnostics.
 */
export class DiagnosticHudCard {
  /**
   * @param {object} options
   * @param {HTMLElement|null} [options.rootEl]
   * @param {import('../../core/ai/BackendApiClient.js').BackendApiClient} [options.apiClient]
   */
  constructor({ rootEl = null, apiClient = backendApiClient } = {}) {
    this.rootEl =
      rootEl ||
      (typeof document !== 'undefined' ? document.getElementById('diagnostic-hud-root') : null);
    this.apiClient = apiClient;

    this.isVisible = false;
    this.severity = 'info'; // 'critical' | 'warning' | 'info'
    this.title = '';
    this.message = '';
    this.faults = [];
    this.loops = [];
    this.activeBoardTypeId = 'board.arduino_uno';

    this._unsubLocale = i18n.onChange(() => this.render());
    this.render();
  }

  mount() {
    this.render();
    return this;
  }

  inspectFlowResult(flowResult = {}, activeBoardTypeId = 'board.arduino_uno') {
    return this.updateFromFlowResult(flowResult, activeBoardTypeId);
  }

  /**
   * Updates the diagnostic HUD card from a `CircuitFlowSolver` result.
   * Automatically shows the card if `flowResult.faults.length > 0`.
   * @param {object} flowResult
   * @param {string} [activeBoardTypeId]
   */
  updateFromFlowResult(flowResult = {}, activeBoardTypeId = 'board.arduino_uno') {
    this.faults = Array.isArray(flowResult?.faults) ? flowResult.faults : [];
    this.loops = Array.isArray(flowResult?.loops) ? flowResult.loops : [];
    this.activeBoardTypeId = activeBoardTypeId;

    if (this.faults.length > 0) {
      const f = this.faults[0];
      this.severity = f.severity || 'critical';
      this.title = i18n.t('workbench.diagnostic.title');
      this.message = f.message || f.code || 'Electrical limit exceeded.';
      this.isVisible = true;
    } else if (this.isVisible && this.severity === 'critical') {
      // Fault cleared
      this.isVisible = false;
    }

    this.render();
    return this.isVisible;
  }

  /**
   * Displays an explicit diagnostic or command summary message in the HUD card.
   */
  showReport({ severity = 'info', title = '', diagnosis = '' } = {}) {
    this.severity = severity;
    this.title = title || i18n.t('workbench.diagnostic.title');
    this.message = diagnosis;
    this.isVisible = Boolean(diagnosis);
    this.render();
    return this.isVisible;
  }

  /**
   * Requests a detailed physics diagnosis from `/api/v1/ai/diagnostics` (or offline analyzer)
   * and updates the card.
   */
  async explainCurrentState() {
    const diag = await this.apiClient.requestDiagnostics({
      faults: this.faults,
      loops: this.loops,
      activeBoardTypeId: this.activeBoardTypeId
    });
    return this.showReport(diag);
  }

  dismiss() {
    this.isVisible = false;
    this.render();
    return this.isVisible;
  }

  render() {
    if (!this.rootEl) return;

    if (!this.isVisible) {
      this.rootEl.hidden = true;
      this.rootEl.setAttribute('aria-hidden', 'true');
      return;
    }

    this.rootEl.hidden = false;
    this.rootEl.setAttribute('aria-hidden', 'false');

    this.rootEl.innerHTML = `
      <aside class="wb-diagnostic-card is-${this.severity}" role="status" aria-live="polite">
        <div class="wb-diagnostic-header">
          <span class="wb-diagnostic-dot"></span>
          <strong class="wb-diagnostic-title">${this.title || i18n.t('workbench.diagnostic.title')}</strong>
          <div class="wb-diagnostic-actions">
            ${
              this.faults.length > 0
                ? `<button type="button" class="wb-btn wb-btn-sm" data-action="explain-fault">${i18n.t('workbench.diagnostic.fix_btn')}</button>`
                : ''
            }
            <button type="button" class="wb-icon-btn" data-action="dismiss-diagnostic" aria-label="${i18n.t('workbench.diagnostic.dismiss')}">
              <svg class="wb-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
        <p class="wb-diagnostic-body">${this.message}</p>
      </aside>
    `;

    this.rootEl
      .querySelector('[data-action="explain-fault"]')
      ?.addEventListener('click', () => this.explainCurrentState());
    this.rootEl
      .querySelector('[data-action="dismiss-diagnostic"]')
      ?.addEventListener('click', () => this.dismiss());
  }

  destroy() {
    this._unsubLocale?.();
  }
}
