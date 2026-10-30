import { i18n } from '../../core/i18n/I18nService.js';
import { ScenarioSerializer } from '../../core/scenario/ScenarioSerializer.js';
import { scenarioRegistry, createMultiBoardBridgePreset } from '../../core/scenario/ScenarioRegistry.js';

/**
 * Isolated UI Controller for the 3D Freeform Wiring & Multi-Board Sandbox (`SandboxController`).
 *
 * Strictly adheres to Single Responsibility Principle:
 * - Bridges Guided Lessons <-> Freeform Sandbox via `ScenarioSerializer`.
 * - Allows spawning multiple boards (e.g. Arduino Uno + ESP32) and components from `ComponentRegistry`.
 * - Connects/disconnects jumper wires via `InteractiveWireTool` and displays live `CircuitFlowSolver`
 *   closed-loop current (mA) and localized electrical fault diagnostics (`@i18n:elec.fault.*`).
 */
export class SandboxController {
  /**
   * @param {object} deps
   * @param {HTMLElement} deps.stageEl
   * @param {import('../../stage/BoardStage.js').BoardStage} deps.stage
   * @param {() => import('../../core/lessons/BaseLesson.js').BaseLesson} deps.getCurrentLesson
   * @param {(msg: string) => void} [deps.onLog]
   * @param {() => void} [deps.onOpenCatalog]
   */
  constructor({ stageEl, stage, getCurrentLesson, onLog, onOpenCatalog }) {
    this.stageEl = stageEl;
    this.stage = stage;
    this.getCurrentLesson = getCurrentLesson;
    this.onLog = onLog || (() => {});
    this.onOpenCatalog = onOpenCatalog;
    this.isOpen = false;
    this.spawnCounter = 1;

    this.mountUI();
    i18n.onChange(() => this.render());
    this.stage?.onStageComponentsChange?.(() => {
      if (this.isOpen) this.render();
    });
  }

  mountUI() {
    if (!this.stageEl) return;

    this.rootEl = document.createElement('div');
    this.rootEl.id = 'sandbox-bar';
    this.rootEl.style.cssText = [
      'position:absolute',
      'top:14px',
      'left:14px',
      'z-index:28',
      'display:flex',
      'flex-direction:column',
      'gap:8px',
      'max-width:520px',
      'font-family:var(--font-sans, system-ui, sans-serif)'
    ].join(';');

    this.stageEl.appendChild(this.rootEl);
    this.render();
  }

  /**
   * Opens the current guided lesson inside the Freeform Sandbox.
   */
  openCurrentLessonInSandbox() {
    const lesson = this.getCurrentLesson ? this.getCurrentLesson() : null;
    if (!lesson) return;
    const scenario = ScenarioSerializer.lessonToScenario(lesson);
    this.isOpen = true;
    this.stage.loadScenario(scenario);
    this.render();
    this.logFlowSummary();
  }

  /**
   * Loads the Multi-Board Arduino Uno + ESP32 Bridge scenario preset into the 3D stage.
   */
  openMultiBoardPreset() {
    const preset = createMultiBoardBridgePreset();
    scenarioRegistry.register(preset);
    this.isOpen = true;
    this.stage.loadScenario(preset);
    this.render();
    this.logFlowSummary();
  }

  /**
   * Spawns a new component or secondary board from `ComponentRegistry` into the freeform stage.
   * @param {string} typeId
   */
  spawnComponent(typeId) {
    if (!typeId || !this.stage.registry.has(typeId)) return null;
    const inst = this.stage.spawnIndependentComponent(typeId, { autoSelect: true });
    this.render();
    return inst;
  }

  /**
   * Exports the active stage into a `CircuitScenarioSchema v2` JSON object and registers it.
   */
  exportActiveScenario() {
    const allInst = [...this.stage.registry.instancesById.values()];
    const boards = allInst.filter((c) => c.category === 'boards' && c.typeId !== 'board.breadboard');
    const components = allInst.filter((c) => !(c.category === 'boards' && c.typeId !== 'board.breadboard'));
    const scenario = ScenarioSerializer.serializeStage({
      boards,
      components,
      connections: this.stage.wireTool.getConnections()
    });
    scenarioRegistry.register(scenario);
    this.onLog(`[JSON v2] Exported scenario "${scenario.id}" (${scenario.boards.length} boards, ${scenario.components.length} components, ${scenario.connections.length} wires)`);
    return scenario;
  }

  logFlowSummary() {
    const flow = this.stage.lastFlowResult;
    if (!flow) return;
    if (flow.faults.length > 0) {
      for (const f of flow.faults) {
        this.onLog(`⚠️ ${f.message}`);
      }
    } else if (flow.loops.length > 0) {
      const topLoop = flow.loops[0];
      this.onLog(
        `⚡ ${i18n.t('elec.status.closed_loop', {
          currentMa: topLoop.currentMa,
          voltage: topLoop.sourceVoltage
        })}`
      );
    } else {
      this.onLog(`ℹ️ ${i18n.t('elec.status.open_loop')}`);
    }
  }

  render() {
    if (!this.rootEl) return;
    const isTr = i18n.getLocale() === 'tr';
    const flow = this.stage.lastFlowResult;
    const endpoints = this.stage.pinSnapIndex.getAllEndpoints();
    const catalog = this.stage.registry.getCatalog().filter((c) => c.typeId !== 'passive.wire');

    let statusBadgeHtml = '';
    if (this.isOpen && flow) {
      if (flow.faults.length > 0) {
        statusBadgeHtml = `<div style="background:#fee2e2;color:#991b1b;border:1px solid #f87171;padding:5px 9px;border-radius:8px;font-size:11.5px;font-weight:600;">
          ⚠️ ${flow.faults[0].message}
        </div>`;
      } else if (flow.loops.length > 0) {
        const l = flow.loops[0];
        statusBadgeHtml = `<div style="background:#dcfce7;color:#166534;border:1px solid #4ade80;padding:5px 9px;border-radius:8px;font-size:11.5px;font-weight:600;">
          ⚡ ${i18n.t('elec.status.closed_loop', { currentMa: l.currentMa, voltage: l.sourceVoltage })}
        </div>`;
      } else {
        statusBadgeHtml = `<div style="background:#fef3c7;color:#92400e;border:1px solid #fbbf24;padding:5px 9px;border-radius:8px;font-size:11.5px;font-weight:600;">
          🔸 ${i18n.t('elec.status.open_loop')}
        </div>`;
      }
    }

    const endpointOptions = endpoints
      .slice(0, 60)
      .map((ep) => `<option value="${ep.endpointId}">${ep.endpointId}</option>`)
      .join('');

    const catalogOptions = catalog
      .map((item) => `<option value="${item.typeId}">${item.displayName}</option>`)
      .join('');

    this.rootEl.innerHTML = `
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
        <button type="button" data-action="open-catalog"
          style="background:#7c3aed;color:#fff;border:none;border-radius:999px;padding:6px 12px;font-size:11.5px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(124,58,237,0.28);">
          🧩 ${i18n.t('ui.catalog.openButton')}
        </button>
        <button type="button" data-action="open-lesson-sandbox"
          style="background:#151a2c;color:#fff;border:none;border-radius:999px;padding:6px 12px;font-size:11.5px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.14);">
          🔧 ${i18n.t('sandbox.toolbar.convertToSandbox')}
        </button>
        <button type="button" data-action="open-multiboard"
          style="background:#0f766e;color:#fff;border:none;border-radius:999px;padding:6px 12px;font-size:11.5px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.14);">
          🔗 ${isTr ? 'Uno + ESP32 Köprüsü' : 'Uno + ESP32 Bridge'}
        </button>
        ${
          this.isOpen
            ? `<button type="button" data-action="export-json"
                style="background:#fff;color:#151a2c;border:1px solid #d5c7af;border-radius:999px;padding:5px 11px;font-size:11.5px;font-weight:600;cursor:pointer;">
                💾 ${i18n.t('sandbox.toolbar.exportScenario')}
              </button>`
            : ''
        }
      </div>
      ${
        this.isOpen
          ? `<div style="background:rgba(255,252,245,0.95);border:1px solid #d8cab2;border-radius:12px;padding:9px 11px;display:flex;flex-direction:column;gap:7px;box-shadow:0 6px 18px rgba(21,26,44,0.10);">
              ${statusBadgeHtml}
              <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;">
                <select data-select="from-pin" style="font-size:11px;padding:3px 6px;border-radius:6px;border:1px solid #cbbba0;max-width:150px;">
                  ${endpointOptions}
                </select>
                <span style="font-size:11px;font-weight:700;">→</span>
                <select data-select="to-pin" style="font-size:11px;padding:3px 6px;border-radius:6px;border:1px solid #cbbba0;max-width:150px;">
                  ${endpointOptions}
                </select>
                <button type="button" data-action="connect-pins"
                  style="background:#2563eb;color:#fff;border:none;border-radius:6px;padding:4px 9px;font-size:11px;font-weight:600;cursor:pointer;">
                  + ${i18n.t('sandbox.toolbar.wireTool')}
                </button>
              </div>
              <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;">
                <select data-select="spawn-type" style="font-size:11px;padding:3px 6px;border-radius:6px;border:1px solid #cbbba0;">
                  ${catalogOptions}
                </select>
                <button type="button" data-action="spawn-comp"
                  style="background:#059669;color:#fff;border:none;border-radius:6px;padding:4px 9px;font-size:11px;font-weight:600;cursor:pointer;">
                  ${i18n.t('sandbox.toolbar.addComponent')}
                </button>
              </div>
            </div>`
          : ''
      }
    `;

    this.rootEl.querySelector('[data-action="open-catalog"]')?.addEventListener('click', () => {
      this.onOpenCatalog?.();
    });

    this.rootEl.querySelector('[data-action="open-lesson-sandbox"]')?.addEventListener('click', () => {
      this.openCurrentLessonInSandbox();
    });

    this.rootEl.querySelector('[data-action="open-multiboard"]')?.addEventListener('click', () => {
      this.openMultiBoardPreset();
    });

    this.rootEl.querySelector('[data-action="export-json"]')?.addEventListener('click', () => {
      this.exportActiveScenario();
    });

    this.rootEl.querySelector('[data-action="connect-pins"]')?.addEventListener('click', () => {
      const fromEl = this.rootEl.querySelector('[data-select="from-pin"]');
      const toEl = this.rootEl.querySelector('[data-select="to-pin"]');
      if (fromEl?.value && toEl?.value) {
        this.stage.wireTool.connectEndpoints(fromEl.value, toEl.value);
        this.render();
        this.logFlowSummary();
      }
    });

    this.rootEl.querySelector('[data-action="spawn-comp"]')?.addEventListener('click', () => {
      const sel = this.rootEl.querySelector('[data-select="spawn-type"]');
      if (sel?.value) {
        this.spawnComponent(sel.value);
      }
    });
  }
}
