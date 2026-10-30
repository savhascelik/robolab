import { highlightCppLine } from '../SyntaxHighlighter.js';
import { i18n } from '../../core/i18n/I18nService.js';

/**
 * Manages the bottom-right Sketch Code viewer, Serial Console card, and WebSerial USB Flash action.
 */
export class CodeConsoleController {
  constructor({
    codeCardEl,
    codeBlockEl,
    consoleLinesEl,
    consoleStatusEl,
    btnRunEl,
    btnRunIconEl,
    btnUsbFlashEl,
    btnStopEl,
    btnCopyEl,
    btnExpandEl,
    onToggleRun,
    onFlashUsb
  }) {
    this.codeCardEl = codeCardEl;
    this.codeBlockEl = codeBlockEl;
    this.consoleLinesEl = consoleLinesEl;
    this.consoleStatusEl = consoleStatusEl;
    this.btnRunIconEl = btnRunIconEl;
    this.btnUsbFlashEl = btnUsbFlashEl;
    this.currentLesson = null;

    btnRunEl?.addEventListener('click', () => onToggleRun?.());
    btnUsbFlashEl?.addEventListener('click', () => onFlashUsb?.());
    btnStopEl?.addEventListener('click', () => onToggleRun?.(false));
    btnExpandEl?.addEventListener('click', () => {
      this.codeCardEl?.classList.toggle('is-expanded');
    });

    btnCopyEl?.addEventListener('click', async (e) => {
      if (!this.currentLesson) return;
      const btn = e.currentTarget;
      await navigator.clipboard?.writeText(this.currentLesson.code.join('\n'));
      btn.style.borderColor = 'var(--teal)';
      setTimeout(() => {
        btn.style.borderColor = '';
      }, 900);
    });

    this._unsubscribeI18n = i18n.onChange(() => {
      this.updateLocalizedLabels();
    });
    this.updateLocalizedLabels();
  }

  updateLocalizedLabels() {
    const titleEl = this.codeCardEl?.querySelector('header h2');
    if (titleEl) titleEl.textContent = i18n.t('ui.code.title');

    const consoleTitleEl = this.codeCardEl?.querySelector('.console-title');
    if (consoleTitleEl) consoleTitleEl.textContent = i18n.t('ui.code.serialMonitor');

    if (this.btnUsbFlashEl) {
      this.btnUsbFlashEl.title = i18n.t('ui.code.btnUsbTitle');
      const labelSpan = this.btnUsbFlashEl.querySelector('.usb-btn-label');
      if (labelSpan) labelSpan.textContent = i18n.t('ui.code.btnUsbLabel');
    }

    if (this.codeCardEl?.dataset.state !== 'running' && this.consoleStatusEl) {
      this.consoleStatusEl.textContent = i18n.t('ui.code.statusStopped');
    }
  }

  setLesson(lesson) {
    this.currentLesson = lesson;
    if (!this.codeBlockEl || !lesson) return;
    this.codeBlockEl.innerHTML = lesson.code
      .map(
        (line, idx) => `
        <div class="code-line">
          <span class="line-num">${idx + 1}</span>
          <span>${highlightCppLine(line)}</span>
        </div>`
      )
      .join('');
  }

  highlightLine(lineIdx) {
    this.codeBlockEl?.querySelectorAll('.code-line').forEach((el, idx) => {
      el.classList.toggle('is-executing', idx === lineIdx);
    });
  }

  appendLog(msg) {
    if (!this.consoleLinesEl) return;
    const row = document.createElement('div');
    row.textContent = `> ${msg}`;
    this.consoleLinesEl.appendChild(row);
    while (this.consoleLinesEl.children.length > 18) {
      this.consoleLinesEl.removeChild(this.consoleLinesEl.firstChild);
    }
    this.consoleLinesEl.scrollTop = this.consoleLinesEl.scrollHeight;
  }

  setStatus(status) {
    if (this.consoleStatusEl) this.consoleStatusEl.textContent = status;
  }

  setRunningUI(running) {
    if (!this.codeCardEl || !this.btnRunIconEl) return;
    if (running) {
      this.codeCardEl.dataset.state = 'running';
      this.btnRunIconEl.innerHTML = `<rect x="6.5" y="6.5" width="11" height="11" rx="1.5" class="fill" />`;
      if (this.consoleLinesEl) this.consoleLinesEl.innerHTML = '';
    } else {
      this.codeCardEl.dataset.state = 'idle';
      this.btnRunIconEl.innerHTML = `<path d="M7.5 4.8v14.4L19 12z" class="fill" />`;
    }
  }
}
