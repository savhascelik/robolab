import { i18n } from '../../core/i18n/I18nService.js';
import { DEFAULT_MAX_ROUNDS } from '../../core/ai/agentLoop.js';

/**
 * Progressive opacity scale for the last 4 messages in Dock Mode (`datalens` activity stream pattern).
 * Index 0 = oldest visible, Index 3 = newest message.
 */
export const DOCK_MESSAGE_OPACITIES = Object.freeze([0.35, 0.55, 0.8, 1.0]);

/**
 * Fallback 1x1 dark carbon PNG data URL used when running in headless Node tests without a WebGL canvas.
 */
const HEADLESS_STAGE_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * `AiAgentChatPanel` — `datalens`-inspired Dual-Mode (`dock` + `sidebar`) Hardware Agent Chat UI.
 *
 * Strictly follows CircuitLab 3D's Industrial Carbon Dark & Technical Drafting Light design system:
 * - Zero CSS gradients or off-palette decorative colors
 * - Authentic oscilloscope & hardware signal tokens (`--signal-active`, `--signal-3v3`, `--signal-5v`)
 * - Supports:
 *   1. `dock` mode (`.ai-dock-stream` above bottom command dock with 4-message opacity fade)
 *   2. `sidebar` mode (`.ai-sidebar` 380px right docked technical chat panel)
 *   3. `AgentProgress` collapsible step cards with `ms` timing and `[⚡ cached]` badges
 *   4. `MiniTable` electrical continuity verification summary (`Bileşen`, `Kablo`, `Kapalı Çevrim`, `Toplam Akım mA`, `Durum`)
 *   5. `AnswerModeBanner` for `askUser` option chips & dynamic round budget extension (`+5 Tur` / `+10 Tur`, `10 -> 15`)
 *   6. 1-Click Stage Screenshot attachment (`Paperclip` -> `canvas.toDataURL('image/png')`) & 1-Click Undo (`UndoLastTransaction`)
 */
export class AiAgentChatPanel {
  /**
   * @param {object} opts
   * @param {HTMLElement|null} [opts.rootEl]
   * @param {HTMLCanvasElement|null} [opts.canvasEl]
   * @param {import('../../core/ai/StageAiCommandExecutor.js').StageAiCommandExecutor|null} [opts.aiExecutor]
   * @param {'dock'|'sidebar'} [opts.initialLayoutMode='dock']
   * @param {(promptText: string, options?: object) => Promise<any>} [opts.onSubmitPrompt]
   * @param {(decision: object) => Promise<any>} [opts.onResumeAgent]
   * @param {() => void} [opts.onUndoLastCommand]
   * @param {(mode: 'dock'|'sidebar') => void} [opts.onLayoutModeChange]
   */
  constructor(opts = {}) {
    this.rootEl =
      opts.rootEl ||
      (typeof document !== 'undefined' ? document.getElementById('ai-chat-root') : null);
    this.canvasEl =
      opts.canvasEl ||
      (typeof document !== 'undefined' ? document.getElementById('board-canvas') : null);
    this.aiExecutor = opts.aiExecutor || null;
    this.layoutMode = opts.initialLayoutMode === 'sidebar' ? 'sidebar' : 'dock';

    this.onSubmitPrompt = opts.onSubmitPrompt || null;
    this.onResumeAgent = opts.onResumeAgent || null;
    this.onUndoLastCommand = opts.onUndoLastCommand || null;
    this.onLayoutModeChange = opts.onLayoutModeChange || null;

    this.messages = [];
    this.liveSteps = [];
    this.expandedStepIds = new Set();
    this.currentRound = 0;
    this.maxRounds = DEFAULT_MAX_ROUNDS;
    this.roundExtensionGranted = false;
    this.isBusy = false;
    this.canUndo = false;
    this.pendingState = null;
    this.attachedScreenshotDataUrl = null;
    this.draftInput = '';
    this._abortController = null;

    this._unsubLocale = i18n.onChange(() => this.render());
  }

  mount() {
    this.render();
    return this;
  }

  /**
   * Switches between `'dock'` (floating stream above bottom bar) and `'sidebar'` (380px right panel).
   * @param {'dock'|'sidebar'} mode
   */
  setLayoutMode(mode) {
    const next = mode === 'sidebar' ? 'sidebar' : 'dock';
    if (this.layoutMode === next) return;
    this.layoutMode = next;
    this.render();
    this.onLayoutModeChange?.(this.layoutMode);
  }

  toggleLayoutMode() {
    this.setLayoutMode(this.layoutMode === 'dock' ? 'sidebar' : 'dock');
    return this.layoutMode;
  }

  setCanUndo(canUndo) {
    this.canUndo = Boolean(canUndo);
    this.render();
  }

  setBusy(busy) {
    this.isBusy = Boolean(busy);
    this.render();
  }

  /**
   * Updates the live round counter (`Tur X/Y`) and optional extension state.
   */
  setRoundStatus({ round, maxRounds, roundExtensionGranted } = {}) {
    if (typeof round === 'number' && round >= 0) {
      this.currentRound = round;
    }
    if (typeof maxRounds === 'number' && maxRounds > 0) {
      this.maxRounds = maxRounds;
    }
    if (typeof roundExtensionGranted === 'boolean') {
      this.roundExtensionGranted = roundExtensionGranted;
    }
    this.render();
  }

  /**
   * Captures a PNG snapshot of the active 3D WebGL canvas (`#board-canvas`) and attaches it to the next prompt.
   */
  captureStageScreenshot() {
    let dataUrl = HEADLESS_STAGE_PNG_DATA_URL;
    try {
      const canvas =
        this.canvasEl ||
        (typeof document !== 'undefined' ? document.getElementById('board-canvas') : null);
      if (canvas && typeof canvas.toDataURL === 'function') {
        const captured = canvas.toDataURL('image/png');
        if (typeof captured === 'string' && captured.startsWith('data:image/')) {
          dataUrl = captured;
        }
      }
    } catch {
      dataUrl = HEADLESS_STAGE_PNG_DATA_URL;
    }
    this.attachedScreenshotDataUrl = dataUrl;
    this.render();
    return dataUrl;
  }

  removeStageScreenshot() {
    this.attachedScreenshotDataUrl = null;
    this.render();
  }

  /**
   * Clears chat message history, live steps, and any paused state.
   */
  clearHistory() {
    this.messages = [];
    this.liveSteps = [];
    this.expandedStepIds.clear();
    this.pendingState = null;
    this.currentRound = 0;
    this.maxRounds = DEFAULT_MAX_ROUNDS;
    this.roundExtensionGranted = false;
    this.render();
  }

  /**
   * Stops the currently running agent loop via AbortController.
   */
  stopActiveRun() {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }
    this.isBusy = false;
    this.render();
  }

  /**
   * Handles incoming step updates from `runHardwareAgentLoop` (`onStepUpdate`).
   */
  handleStepUpdate(step, allSteps = []) {
    if (Array.isArray(allSteps) && allSteps.length > 0) {
      this.liveSteps = [...allSteps];
    } else if (step && typeof step === 'object') {
      this.liveSteps.push(step);
    }

    if (typeof step?.round === 'number') {
      this.currentRound = step.round;
    }
    if (typeof step?.maxRounds === 'number') {
      this.maxRounds = step.maxRounds;
    }
    if (step?.maxRounds > DEFAULT_MAX_ROUNDS) {
      this.roundExtensionGranted = true;
    }
    this.render();
  }

  /**
   * Submits a user prompt to the hardware agent loop, recording the user message
   * and rendering the assistant response, tool steps, electrical `MiniTable`, or `AnswerModeBanner`.
   *
   * @param {string} promptText
   */
  async submitPrompt(promptText) {
    const clean = String(promptText ?? this.draftInput ?? '').trim();
    if (!clean || this.isBusy) return null;

    // If awaiting user answer in normal clarification mode, route text input as answer
    if (this.pendingState && this.pendingState.reason !== 'extend_rounds') {
      this.draftInput = '';
      return this.submitUserAnswer(clean);
    }

    const screenshot = this.attachedScreenshotDataUrl;
    this.attachedScreenshotDataUrl = null;
    this.draftInput = '';

    this.messages.push({
      id: `msg_user_${Date.now()}_${this.messages.length + 1}`,
      role: 'user',
      content: clean,
      screenshotDataUrl: screenshot,
      timestamp: Date.now()
    });

    this.liveSteps = [];
    this.currentRound = 1;
    this.maxRounds = DEFAULT_MAX_ROUNDS;
    this.roundExtensionGranted = false;
    this.pendingState = null;
    this.isBusy = true;
    this._abortController = typeof AbortController !== 'undefined' ? new AbortController() : null;
    this.render();

    try {
      let result = null;
      if (this.onSubmitPrompt) {
        result = await this.onSubmitPrompt(clean, {
          screenshotDataUrl: screenshot,
          signal: this._abortController?.signal || null,
          onStepUpdate: (step, steps) => this.handleStepUpdate(step, steps)
        });
      } else if (this.aiExecutor) {
        result = await this.aiExecutor.runFlownieAgentPrompt(clean, {
          signal: this._abortController?.signal || null,
          onStepUpdate: (step, steps) => this.handleStepUpdate(step, steps)
        });
      }

      this._ingestAgentResult(result);
      return result;
    } finally {
      this.isBusy = false;
      this._abortController = null;
      this.render();
    }
  }

  /**
   * Handles user clicking an option chip or submitting a text answer for `askUser`.
   * @param {string} answerText
   */
  async submitUserAnswer(answerText) {
    const cleanAnswer = String(answerText || '').trim();
    if (!cleanAnswer || !this.pendingState) return null;

    this.messages.push({
      id: `msg_user_ans_${Date.now()}_${this.messages.length + 1}`,
      role: 'user',
      content: cleanAnswer,
      isAnswer: true,
      timestamp: Date.now()
    });

    const pending = this.pendingState;
    this.pendingState = null;
    this.isBusy = true;
    this.render();

    try {
      let result = null;
      const decision = {
        approved: true,
        answer: cleanAnswer
      };
      if (this.onResumeAgent) {
        result = await this.onResumeAgent(decision, pending);
      } else if (this.aiExecutor) {
        result = await this.aiExecutor.resumeFlownieAgentPrompt(decision, pending);
      }
      this._ingestAgentResult(result);
      return result;
    } finally {
      this.isBusy = false;
      this.render();
    }
  }

  /**
   * Handles user clicking `+5 Tur İzni Ver ve Devam Et`, `+10 Tur İzni Ver`, or `Mevcut Haliyle Tamamla`
   * inside `AnswerModeBanner` when `reason === 'extend_rounds'`.
   *
   * @param {number} extraRounds
   */
  async handleExtendRounds(extraRounds = 5) {
    if (!this.pendingState) return null;

    const pending = this.pendingState;
    const numExtra = Number(extraRounds || 0);
    const approved = numExtra > 0;
    const labelText = approved
      ? `+${numExtra} Tur İzni Verildi`
      : i18n.t('workbench.aiChat.finishWithCurrent');

    if (approved) {
      this.maxRounds = Math.min(30, Number(pending.maxRounds || this.maxRounds || DEFAULT_MAX_ROUNDS) + numExtra);
      this.roundExtensionGranted = true;
    }

    this.messages.push({
      id: `msg_user_ext_${Date.now()}_${this.messages.length + 1}`,
      role: 'user',
      content: labelText,
      isRoundExtension: approved,
      extraRounds: numExtra,
      timestamp: Date.now()
    });

    this.pendingState = null;
    this.isBusy = true;
    this.render();

    try {
      let result = null;
      const decision = {
        approved,
        extraRounds: numExtra,
        extendRounds: numExtra,
        answer: labelText
      };
      if (this.onResumeAgent) {
        result = await this.onResumeAgent(decision, pending);
      } else if (this.aiExecutor) {
        result = await this.aiExecutor.resumeFlownieAgentPrompt(decision, pending);
      }
      this._ingestAgentResult(result);
      return result;
    } finally {
      this.isBusy = false;
      this.render();
    }
  }

  _ingestAgentResult(result) {
    if (!result || typeof result !== 'object') return;

    if (typeof result.round === 'number') {
      this.currentRound = result.round;
    } else if (Array.isArray(result.steps) && result.steps.length > 0) {
      const maxStepRound = Math.max(...result.steps.map((s) => Number(s.round || 1)));
      this.currentRound = maxStepRound;
    }

    if (typeof result.maxRounds === 'number') {
      this.maxRounds = result.maxRounds;
      if (result.maxRounds > DEFAULT_MAX_ROUNDS) {
        this.roundExtensionGranted = true;
      }
    }

    if (this.aiExecutor && typeof this.aiExecutor.canUndo === 'function') {
      this.canUndo = this.aiExecutor.canUndo();
    }

    if (result.status === 'awaiting_user' || result.status === 'max_rounds' || result.pending) {
      this.pendingState = result.pending || {
        reason: result.reason || 'clarification',
        question: result.question || '',
        options: Array.isArray(result.options) ? result.options : [],
        round: result.round || this.currentRound || 1,
        maxRounds: result.maxRounds || this.maxRounds || DEFAULT_MAX_ROUNDS,
        requestedExtraRounds: result.requestedExtraRounds || 5
      };

      this.messages.push({
        id: `msg_agent_wait_${Date.now()}_${this.messages.length + 1}`,
        role: 'assistant',
        status: 'awaiting_user',
        content: this.pendingState.question || i18n.t('workbench.aiChat.clarificationHeader'),
        steps: Array.isArray(result.steps) ? [...result.steps] : [...this.liveSteps],
        toolTrace: Array.isArray(result.toolTrace) ? [...result.toolTrace] : [],
        round: this.currentRound,
        maxRounds: this.maxRounds,
        timestamp: Date.now()
      });
      this.liveSteps = [];
      return;
    }

    this.pendingState = null;
    const summary =
      result.summaryText ||
      result.summary ||
      result.message ||
      (result.ok === false
        ? i18n.t('workbench.aiChat.errorFallback')
        : '3B devre sentezi tamamlandı.');

    if (typeof result.round === 'number' && result.round > 0) {
      this.currentRound = result.round;
    }

    this.messages.push({
      id: `msg_agent_${Date.now()}_${this.messages.length + 1}`,
      role: 'assistant',
      status: result.ok === false ? 'error' : 'completed',
      errorCode: result.errorCode || null,
      content: summary,
      steps: Array.isArray(result.steps) ? [...result.steps] : [...this.liveSteps],
      toolTrace: Array.isArray(result.toolTrace) ? [...result.toolTrace] : [],
      electricalState: result.ok === false ? null : result.electricalState || null,
      round: this.currentRound || 1,
      maxRounds: this.maxRounds,
      roundExtensionGranted: this.roundExtensionGranted,
      canUndo: this.canUndo,
      timestamp: Date.now()
    });
    this.liveSteps = [];
  }

  _renderRoundBadge() {
    const displayRound = Math.max(1, this.currentRound || 1);
    const key = this.roundExtensionGranted
      ? 'workbench.aiChat.roundBadgeExtended'
      : 'workbench.aiChat.roundBadge';
    const label = i18n.t(key, {
      round: displayRound,
      maxRounds: this.maxRounds
    });
    return `
      <span
        class="ai-round-badge ${this.roundExtensionGranted ? 'is-extended' : ''}"
        data-testid="ai-round-badge"
        data-round="${displayRound}"
        data-max-rounds="${this.maxRounds}"
      >
        ${escapeHtml(label)}
      </span>
    `;
  }

  _renderAgentProgress(steps = [], toolTrace = [], msgId = 'live') {
    const items =
      Array.isArray(toolTrace) && toolTrace.length > 0
        ? toolTrace.map((t, idx) => ({
            id: `${msgId}_trace_${idx}`,
            name: t.tool || t.name || 'tool',
            round: t.round || 1,
            ok: t.ok !== false,
            durationMs: Number(t.durationMs || 0),
            cached: Boolean(t.cachedFromSessionMemory || t.cached),
            args: t.args || {},
            output: t.output || {}
          }))
        : (Array.isArray(steps) ? steps : []).map((s, idx) => ({
            id: `${msgId}_step_${idx}`,
            name: s.phase || 'step',
            label: s.label || s.phase || 'step',
            round: s.round || 1,
            ok: s.status !== 'blocked' && s.status !== 'error',
            status: s.status || 'completed',
            durationMs: Number(s.durationMs || 0),
            cached: false,
            args: {},
            output: { label: s.label }
          }));

    if (items.length === 0) return '';

    const roundCounts = new Map();
    for (const item of items) {
      roundCounts.set(item.round, (roundCounts.get(item.round) || 0) + 1);
    }
    const roundSeen = new Map();

    const formatStepTarget = (item) => {
      const a = item.args || {};
      const target =
        a.componentId ||
        a.typeId ||
        a.functionName ||
        a.name ||
        a.query ||
        a.explanation ||
        a.description ||
        '';
      const cleanTarget = String(target || '').trim();
      if (!cleanTarget) return item.name;
      const shortTarget = cleanTarget.length > 28 ? `${cleanTarget.slice(0, 25)}...` : cleanTarget;
      return `${item.name}("${shortTarget}")`;
    };

    const rowsHtml = items
      .map((item) => {
        const isExpanded = this.expandedStepIds.has(item.id);
        const statusClass =
          item.status === 'awaiting_user'
            ? 'is-waiting'
            : item.ok
            ? 'is-ok'
            : 'is-error';
        const statusSymbol =
          item.status === 'awaiting_user' ? '⟳' : item.ok ? '✓' : '✗';
        const cachedBadge = item.cached
          ? `<span class="ai-step-cached-badge" data-testid="ai-step-cached">[⚡ cached]</span>`
          : '';
        const durationBadge = `<span class="ai-step-duration">${item.durationMs}ms</span>`;
        const totalInRound = roundCounts.get(item.round) || 1;
        const idxInRound = (roundSeen.get(item.round) || 0) + 1;
        roundSeen.set(item.round, idxInRound);
        const roundTag =
          totalInRound > 1 ? `Tur ${item.round}.${idxInRound}` : `Tur ${item.round}`;
        const titleText = item.label || `${formatStepTarget(item)} (${roundTag})`;

        const detailPayload =
          !item.ok || item.output?.error
            ? {
                ok: false,
                error: item.output?.error || 'Execution failed',
                recoveryHint: item.output?.recoveryHint || null,
                output: item.output,
                args: item.args
              }
            : {
                args: item.args,
                output: item.output
              };

        return `
          <div class="ai-step-item ${statusClass}" data-step-id="${escapeHtml(item.id)}">
            <button
              type="button"
              class="ai-step-toggle"
              data-action="toggle-step"
              data-step-id="${escapeHtml(item.id)}"
              aria-expanded="${isExpanded ? 'true' : 'false'}"
            >
              <span class="ai-step-status-icon">${statusSymbol}</span>
              <span class="ai-step-name">${escapeHtml(titleText)}</span>
              ${cachedBadge}
              ${durationBadge}
            </button>
            ${
              isExpanded
                ? `<div class="ai-step-details">
                    <pre>${escapeHtml(JSON.stringify(detailPayload, null, 2).slice(0, 4000))}</pre>
                  </div>`
                : ''
            }
          </div>
        `;
      })
      .join('');

    return `
      <div class="ai-agent-progress" data-testid="ai-agent-progress">
        <div class="ai-agent-progress-header">
          <span>${escapeHtml(i18n.t('workbench.aiChat.stepsHeader', { count: items.length }))}</span>
        </div>
        <div class="ai-agent-progress-list">
          ${rowsHtml}
        </div>
      </div>
    `;
  }

  _renderElectricalMiniTable(electricalState) {
    if (!electricalState || typeof electricalState !== 'object') return '';
    const compCount = Number(electricalState.componentCount ?? 0);
    const wireCount = Number(electricalState.connectionCount ?? 0);
    const closedLoops = Number(electricalState.closedLoopCount ?? 0);
    const currentMa = Number(electricalState.totalCurrentMa ?? 0).toFixed(1);
    const hasFault = Boolean(electricalState.hasShortCircuit || Number(electricalState.faultCount) > 0);

    const statusLabel = hasFault
      ? i18n.t('workbench.aiChat.statusFault')
      : closedLoops > 0
      ? i18n.t('workbench.aiChat.statusVerified')
      : i18n.t('workbench.aiChat.statusOpenLoop');

    const statusClass = hasFault
      ? 'is-fault'
      : closedLoops > 0
      ? 'is-verified'
      : 'is-open';

    return `
      <div class="ai-electrical-minitable-wrap" data-testid="ai-electrical-minitable">
        <table class="ai-electrical-minitable">
          <thead>
            <tr>
              <th>${escapeHtml(i18n.t('workbench.aiChat.tableComponents'))}</th>
              <th>${escapeHtml(i18n.t('workbench.aiChat.tableWires'))}</th>
              <th>${escapeHtml(i18n.t('workbench.aiChat.tableClosedLoops'))}</th>
              <th>${escapeHtml(i18n.t('workbench.aiChat.tableCurrentMa'))}</th>
              <th>${escapeHtml(i18n.t('workbench.aiChat.tableStatus'))}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${compCount}</td>
              <td>${wireCount}</td>
              <td>${closedLoops}</td>
              <td>${currentMa} mA</td>
              <td><span class="ai-minitable-status ${statusClass}">${escapeHtml(statusLabel)}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  _renderAnswerModeBanner() {
    if (!this.pendingState) return '';
    const isExtendRounds = this.pendingState.reason === 'extend_rounds';
    const headerText = isExtendRounds
      ? i18n.t('workbench.aiChat.extendRoundsHeader')
      : i18n.t('workbench.aiChat.clarificationHeader');
    const questionText =
      this.pendingState.question ||
      (isExtendRounds
        ? 'Karmaşık 3B sahne kurulumunu tamamlamak için ek tur bütçesi gerekiyor.'
        : 'Devam etmek için seçiminizi belirtin.');

    const options = Array.isArray(this.pendingState.options) ? this.pendingState.options : [];

    const actionsHtml = isExtendRounds
      ? `
        <div class="ai-answer-actions" data-testid="ai-extend-rounds-actions">
          <button
            type="button"
            class="ai-answer-chip is-primary"
            data-testid="ai-extend-rounds-5"
            data-action="extend-rounds"
            data-extra-rounds="5"
          >
            ${escapeHtml(i18n.t('workbench.aiChat.grant5Rounds'))}
          </button>
          <button
            type="button"
            class="ai-answer-chip"
            data-testid="ai-extend-rounds-10"
            data-action="extend-rounds"
            data-extra-rounds="10"
          >
            ${escapeHtml(i18n.t('workbench.aiChat.grant10Rounds'))}
          </button>
          <button
            type="button"
            class="ai-answer-chip is-muted"
            data-testid="ai-finish-current"
            data-action="extend-rounds"
            data-extra-rounds="0"
          >
            ${escapeHtml(i18n.t('workbench.aiChat.finishWithCurrent'))}
          </button>
        </div>
      `
      : options.length > 0
      ? `
        <div class="ai-answer-actions" data-testid="ai-clarification-options">
          ${options
            .map(
              (opt) => `
                <button
                  type="button"
                  class="ai-answer-chip"
                  data-testid="ai-answer-option"
                  data-action="answer-option"
                  data-option-value="${escapeHtml(opt)}"
                >
                  ${escapeHtml(opt)}
                </button>
              `
            )
            .join('')}
        </div>
      `
      : '';

    return `
      <div
        class="ai-answer-mode-banner"
        data-testid="ai-answer-mode-banner"
        data-reason="${escapeHtml(this.pendingState.reason || 'clarification')}"
      >
        <div class="ai-answer-banner-head">
          <span class="ai-answer-dot"></span>
          <strong>${escapeHtml(headerText)}</strong>
          ${this._renderRoundBadge()}
        </div>
        <p class="ai-answer-question">${escapeHtml(questionText)}</p>
        ${actionsHtml}
      </div>
    `;
  }

  _renderScreenshotPreview() {
    if (!this.attachedScreenshotDataUrl) return '';
    return `
      <div class="ai-screenshot-preview" data-testid="ai-screenshot-preview">
        <img src="${escapeHtml(this.attachedScreenshotDataUrl)}" alt="3D Stage Snapshot" class="ai-screenshot-thumb" />
        <span class="ai-screenshot-label">${escapeHtml(i18n.t('workbench.aiChat.stageShotAttached'))}</span>
        <button
          type="button"
          class="ai-screenshot-remove"
          data-testid="ai-remove-screenshot-btn"
          data-action="remove-screenshot"
          title="${escapeHtml(i18n.t('workbench.aiChat.removeStageShot'))}"
        >
          ✕
        </button>
      </div>
    `;
  }

  _renderDockMode() {
    const visibleMessages = this.messages.slice(-4);
    const hasActivity =
      visibleMessages.length > 0 ||
      this.liveSteps.length > 0 ||
      Boolean(this.pendingState) ||
      Boolean(this.attachedScreenshotDataUrl) ||
      this.isBusy;

    const streamItemsHtml = visibleMessages
      .map((msg, idx, arr) => {
        const opacityIdx = Math.max(0, DOCK_MESSAGE_OPACITIES.length - (arr.length - idx));
        const opacity = DOCK_MESSAGE_OPACITIES[opacityIdx] ?? 1.0;
        return `
          <div
            class="ai-dock-msg is-${escapeHtml(msg.role)} ${msg.status === 'error' ? 'is-error' : ''}"
            data-testid="ai-dock-msg"
            data-status="${escapeHtml(msg.status || 'completed')}"
            data-fade-opacity="${opacity}"
            style="opacity: ${opacity};"
          >
            <span class="ai-dock-msg-role">${msg.role === 'user' ? 'SEN' : 'AJAN'}</span>
            <span class="ai-dock-msg-text">${escapeHtml(msg.content)}</span>
          </div>
        `;
      })
      .join('');

    const latestAssistant = [...this.messages].reverse().find((m) => m.role === 'assistant');

    return `
      <div
        class="ai-dock-stream ${hasActivity ? 'is-visible' : 'is-compact'}"
        data-testid="ai-dock-stream"
        data-layout-mode="dock"
      >
        <div class="ai-dock-header">
          <div class="ai-dock-header-left">
            ${this._renderRoundBadge()}
            ${
              this.isBusy
                ? `<button
                    type="button"
                    class="ai-dock-action-btn is-danger"
                    data-testid="ai-stop-btn"
                    data-action="stop-agent"
                  >
                    ■ ${escapeHtml(i18n.t('workbench.aiChat.stopAgent'))}
                  </button>`
                : ''
            }
            ${
              this.canUndo
                ? `<button
                    type="button"
                    class="ai-dock-action-btn"
                    data-testid="ai-undo-btn"
                    data-action="undo-ai"
                  >
                    ↶ ${escapeHtml(i18n.t('workbench.aiChat.undoLast'))}
                  </button>`
                : ''
            }
          </div>
          <div class="ai-dock-header-right">
            <button
              type="button"
              class="ai-dock-action-btn"
              data-testid="ai-attach-screenshot-btn"
              data-action="attach-screenshot"
              title="${escapeHtml(i18n.t('workbench.aiChat.attachStageShot'))}"
            >
              📎 ${escapeHtml(i18n.t('workbench.aiChat.attachStageShot'))}
            </button>
            <button
              type="button"
              class="ai-dock-action-btn"
              data-testid="ai-toggle-layout-btn"
              data-action="toggle-layout"
              title="${escapeHtml(i18n.t('workbench.aiChat.pinToSidebar'))}"
            >
              ⇥ ${escapeHtml(i18n.t('workbench.aiChat.pinToSidebar'))}
            </button>
          </div>
        </div>

        ${this._renderScreenshotPreview()}

        ${
          visibleMessages.length > 0
            ? `<div class="ai-dock-messages">${streamItemsHtml}</div>`
            : ''
        }

        ${
          this.liveSteps.length > 0
            ? this._renderAgentProgress(this.liveSteps, [], 'dock_live')
            : latestAssistant
            ? this._renderAgentProgress(latestAssistant.steps, latestAssistant.toolTrace, latestAssistant.id)
            : ''
        }

        ${latestAssistant?.electricalState ? this._renderElectricalMiniTable(latestAssistant.electricalState) : ''}

        ${this._renderAnswerModeBanner()}
      </div>
    `;
  }

  _renderSidebarMode() {
    const messagesHtml =
      this.messages.length === 0
        ? `<div class="ai-sidebar-empty" data-testid="ai-sidebar-empty">
            <p>${escapeHtml(i18n.t('workbench.aiChat.emptyHint'))}</p>
          </div>`
        : this.messages
            .map((msg) => {
              if (msg.role === 'user') {
                return `
                  <article class="ai-msg-card is-user" data-testid="ai-sidebar-msg">
                    <header class="ai-msg-head">
                      <span class="ai-msg-author">SEN</span>
                    </header>
                    ${
                      msg.screenshotDataUrl
                        ? `<div class="ai-msg-shot">
                            <img src="${escapeHtml(msg.screenshotDataUrl)}" alt="3D Stage Snapshot" />
                          </div>`
                        : ''
                    }
                    <div class="ai-msg-body">${escapeHtml(msg.content)}</div>
                  </article>
                `;
              }

              return `
                <article
                  class="ai-msg-card is-assistant ${msg.status === 'error' ? 'is-error' : ''}"
                  data-testid="ai-sidebar-msg"
                  data-status="${escapeHtml(msg.status || 'completed')}"
                >
                  <header class="ai-msg-head">
                    <span class="ai-msg-author">DONANIM AJANI</span>
                    <span class="ai-msg-round-meta">Tur ${Number(msg.round || 1)}/${Number(msg.maxRounds || DEFAULT_MAX_ROUNDS)}</span>
                  </header>
                  ${this._renderAgentProgress(msg.steps, msg.toolTrace, msg.id)}
                  <div class="ai-msg-body">${escapeHtml(msg.content)}</div>
                  ${this._renderElectricalMiniTable(msg.electricalState)}
                  ${
                    this.canUndo
                      ? `<footer class="ai-msg-footer">
                          <button
                            type="button"
                            class="ai-msg-undo-btn"
                            data-testid="ai-undo-btn"
                            data-action="undo-ai"
                          >
                            ↶ ${escapeHtml(i18n.t('workbench.aiChat.undoLast'))}
                          </button>
                        </footer>`
                      : ''
                  }
                </article>
              `;
            })
            .join('');

    const inputPlaceholder = this.pendingState
      ? i18n.t('workbench.aiChat.answerPlaceholder')
      : i18n.t('workbench.aiChat.inputPlaceholder');

    const submitLabel = this.pendingState
      ? i18n.t('workbench.aiChat.answerBtn')
      : i18n.t('workbench.aiChat.sendBtn');

    return `
      <aside
        class="ai-sidebar"
        data-testid="ai-sidebar-panel"
        data-layout-mode="sidebar"
        aria-label="${escapeHtml(i18n.t('workbench.aiChat.title'))}"
      >
        <header class="ai-sidebar-header">
          <div class="ai-sidebar-title-group">
            <h3>${escapeHtml(i18n.t('workbench.aiChat.title'))}</h3>
            <span>${escapeHtml(i18n.t('workbench.aiChat.subtitle'))}</span>
          </div>
          <div class="ai-sidebar-controls">
            ${this._renderRoundBadge()}
            <button
              type="button"
              class="ai-icon-btn"
              data-testid="ai-clear-history-btn"
              data-action="clear-history"
              title="${escapeHtml(i18n.t('workbench.aiChat.clearHistory'))}"
            >
              🗑
            </button>
            <button
              type="button"
              class="ai-icon-btn"
              data-testid="ai-toggle-layout-btn"
              data-action="toggle-layout"
              title="${escapeHtml(i18n.t('workbench.aiChat.minimizeToDock'))}"
            >
              ↙
            </button>
          </div>
        </header>

        <div class="ai-sidebar-messages" data-testid="ai-sidebar-messages">
          ${messagesHtml}
          ${
            this.liveSteps.length > 0
              ? this._renderAgentProgress(this.liveSteps, [], 'sidebar_live')
              : ''
          }
        </div>

        ${this._renderAnswerModeBanner()}
        ${this._renderScreenshotPreview()}

        <form class="ai-sidebar-composer" data-testid="ai-sidebar-form">
          <button
            type="button"
            class="ai-icon-btn"
            data-testid="ai-attach-screenshot-btn"
            data-action="attach-screenshot"
            title="${escapeHtml(i18n.t('workbench.aiChat.attachStageShot'))}"
          >
            📎
          </button>
          <input
            type="text"
            class="ai-sidebar-input"
            data-testid="ai-chat-input"
            autocomplete="off"
            value="${escapeHtml(this.draftInput)}"
            placeholder="${escapeHtml(inputPlaceholder)}"
            ${this.isBusy ? 'disabled' : ''}
          />
          ${
            this.isBusy
              ? `<button
                  type="button"
                  class="ai-sidebar-submit is-stop"
                  data-testid="ai-stop-btn"
                  data-action="stop-agent"
                >
                  ${escapeHtml(i18n.t('workbench.aiChat.stopAgent'))}
                </button>`
              : `<button
                  type="submit"
                  class="ai-sidebar-submit"
                  data-testid="ai-chat-submit"
                >
                  ${escapeHtml(submitLabel)}
                </button>`
          }
        </form>
      </aside>
    `;
  }

  render() {
    if (!this.rootEl) return;

    this.rootEl.innerHTML =
      this.layoutMode === 'sidebar' ? this._renderSidebarMode() : this._renderDockMode();

    this._bindEvents();
  }

  _bindEvents() {
    if (!this.rootEl || typeof this.rootEl.querySelectorAll !== 'function') return;

    const actionButtons = this.rootEl.querySelectorAll('[data-action]') || [];
    for (const btn of actionButtons) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.getAttribute('data-action');
        if (action === 'toggle-layout') {
          this.toggleLayoutMode();
        } else if (action === 'clear-history') {
          this.clearHistory();
        } else if (action === 'stop-agent') {
          this.stopActiveRun();
        } else if (action === 'undo-ai') {
          if (this.onUndoLastCommand) {
            this.onUndoLastCommand();
          } else if (this.aiExecutor) {
            this.aiExecutor.undoLastTransaction();
            this.setCanUndo(this.aiExecutor.canUndo());
          }
        } else if (action === 'attach-screenshot') {
          this.captureStageScreenshot();
        } else if (action === 'remove-screenshot') {
          this.removeStageScreenshot();
        } else if (action === 'extend-rounds') {
          const extra = Number(btn.getAttribute('data-extra-rounds') || 0);
          this.handleExtendRounds(extra);
        } else if (action === 'answer-option') {
          const val = btn.getAttribute('data-option-value') || '';
          this.submitUserAnswer(val);
        } else if (action === 'toggle-step') {
          const stepId = btn.getAttribute('data-step-id');
          if (stepId) {
            if (this.expandedStepIds.has(stepId)) {
              this.expandedStepIds.delete(stepId);
            } else {
              this.expandedStepIds.add(stepId);
            }
            this.render();
          }
        }
      });
    }

    const inputEl = this.rootEl.querySelector('[data-testid="ai-chat-input"]');
    if (inputEl) {
      inputEl.addEventListener('input', (e) => {
        this.draftInput = e.target.value;
      });
    }

    const formEl = this.rootEl.querySelector('[data-testid="ai-sidebar-form"]');
    if (formEl) {
      formEl.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = String(inputEl?.value ?? this.draftInput ?? '').trim();
        if (!text) return;
        this.submitPrompt(text);
      });
    }
  }

  destroy() {
    if (this._unsubLocale) this._unsubLocale();
    this.stopActiveRun();
  }
}
