import { hardwareRegistry } from '../registry/ComponentRegistry.js';
import { DynamicComponentBuilder } from '../components/DynamicComponentBuilder.js';
import { ScenarioSerializer } from '../scenario/ScenarioSerializer.js';
import { SmartPinMatcher } from '../electrical/SmartPinMatcher.js';
import { circuitFlowSolver } from '../electrical/CircuitFlowSolver.js';
import { backendApiClient } from './BackendApiClient.js';
import { runHardwareAgentLoop, resumeHardwareAgentLoop, DEFAULT_MAX_ROUNDS } from './agentLoop.js';
import { CodeModeExecutor } from './CodeModeExecutor.js';

/**
 * Atomic 3D Stage AI Command Executor & Transaction Undo Manager (`StageAiCommandExecutor`).
 *
 * - Executes structured `stageCommands[]` emitted by `/api/v1/ai/circuit-command` or local intent planner:
 *   `setHostBoard`, `registerCustomComponent`, `spawnComponent`, `connectPins`, `smartConnect`,
 *   `updateCode`, `startSimulation`, `stopSimulation`.
 * - Automatically captures a full `ScenarioSerializer` snapshot BEFORE mutating the 3D scene
 *   so `undoLastTransaction()` restores the exact pre-command board, component, wire, and code state in 1 click.
 */
export class StageAiCommandExecutor {
  /**
   * @param {object} options
   * @param {import('../registry/ComponentRegistry.js').ComponentRegistry} [options.registry]
   * @param {object} [options.stage] Optional `BoardStage` instance
   * @param {import('../../sim/LiveCodeRuntime.js').LiveCodeRuntime} [options.runtime]
   * @param {import('./BackendApiClient.js').BackendApiClient} [options.apiClient]
   * @param {(code: string) => void} [options.onCodeUpdated]
   * @param {(canUndo: boolean) => void} [options.onUndoStateChange]
   * @param {(flowResult: object) => void} [options.onFlowSolved]
   */
  constructor({
    registry = hardwareRegistry,
    stage = null,
    runtime = null,
    apiClient = backendApiClient,
    onCodeUpdated = null,
    onUndoStateChange = null,
    onFlowSolved = null,
    onAgentProgress = null
  } = {}) {
    this.registry = registry;
    this.stage = stage;
    this.runtime = runtime;
    this.apiClient = apiClient;
    this.onCodeUpdated = onCodeUpdated;
    this.onUndoStateChange = onUndoStateChange;
    this.onFlowSolved = onFlowSolved;
    this.onAgentProgress = onAgentProgress;

    // Headless state containers used when `this.stage` is not a full WebGL `BoardStage`
    this._headlessHostBoard = null;
    this._headlessComponents = new Map();
    this._headlessConnections = [];

    /** @type {Array<{ scenario: object, code: string }>} */
    this.undoStack = [];

    /** @type {object|null} */
    this.pendingAgentState = null;
  }

  /**
   * Returns the active primary host board instance.
   */
  getHostBoard() {
    if (this.stage?.hostBoard) {
      return this.stage.hostBoard;
    }
    if (!this._headlessHostBoard) {
      this._headlessHostBoard = this.registry.create('board.arduino_uno', { id: 'main.host_board' });
    }
    return this._headlessHostBoard;
  }

  /**
   * Returns all non-wire peripheral components on the stage.
   */
  getStageComponents() {
    if (this.stage) {
      return [...this.registry.instancesById.values()].filter(
        (c) => c.typeId !== 'passive.wire' && c.id !== this.stage.hostBoard?.id
      );
    }
    return [...this._headlessComponents.values()];
  }

  /**
   * Returns all active wire connections (`{ id, from, to, color }`).
   */
  getConnections() {
    if (this.stage?.wireTool) {
      return this.stage.wireTool.getConnections();
    }
    return [...this._headlessConnections];
  }

  /**
   * Captures a full `ScenarioSerializer` + firmware code snapshot before an AI command transaction.
   */
  captureStageSnapshot() {
    const hostBoard = this.getHostBoard();
    const components = this.getStageComponents();
    const connections = this.getConnections();
    const code = this.runtime?.sourceCode || '';

    const scenario = ScenarioSerializer.serializeStage({
      boards: hostBoard ? [hostBoard] : [],
      components,
      connections,
      customComponents: DynamicComponentBuilder.getRegisteredSpecs(),
      code
    });

    let clonedScenario = scenario;
    try {
      clonedScenario = structuredClone(scenario);
    } catch {
      clonedScenario = JSON.parse(JSON.stringify(scenario));
    }

    return {
      scenario: clonedScenario,
      code: String(code)
    };
  }

  /**
   * Restores a previously captured snapshot back onto the 3D stage or headless state.
   * @param {{ scenario: object, code: string }} snapshot
   */
  restoreStageSnapshot(snapshot) {
    if (!snapshot || !snapshot.scenario) return false;
    const { scenario, code } = snapshot;

    // Register any custom components included in snapshot
    for (const customSpec of scenario.customComponents || []) {
      DynamicComponentBuilder.registerFromSpec(customSpec, this.registry);
    }

    if (this.stage) {
      const targetBoardSpec = scenario.boards?.[0];
      if (targetBoardSpec?.typeId) {
        this.stage.ensureHostBoard(targetBoardSpec.typeId);
      }

      // Remove existing non-main components
      for (const comp of this.getStageComponents()) {
        this.stage.removeComponent(comp.id);
      }
      this.stage.wireTool?.setConnections([]);

      // Re-spawn snapshot components
      for (const cSpec of scenario.components || []) {
        if (cSpec.customSpec && !this.registry.has(cSpec.typeId)) {
          DynamicComponentBuilder.registerFromSpec(cSpec.customSpec, this.registry);
        }
        this.stage.spawnIndependentComponent(cSpec.typeId, {
          id: cSpec.id,
          position: cSpec.position,
          rotation: cSpec.rotation,
          initialState: cSpec.state,
          ohms: cSpec.state?.ohms,
          autoSelect: false
        });
      }

      this.stage.wireTool?.setConnections(scenario.connections || []);
    } else {
      // Headless restoration
      const targetBoardSpec = scenario.boards?.[0];
      const currentHost = this.getHostBoard();
      if (targetBoardSpec && (!currentHost || currentHost.typeId !== targetBoardSpec.typeId)) {
        if (currentHost) {
          this.registry.removeInstance(currentHost.id, true);
        }
        this._headlessHostBoard = this.registry.create(targetBoardSpec.typeId, {
          id: targetBoardSpec.id || 'main.host_board',
          position: targetBoardSpec.position || [-34, 0, 0]
        });
      }

      for (const comp of this._headlessComponents.values()) {
        this.registry.removeInstance(comp.id, true);
      }
      this._headlessComponents.clear();

      for (const cSpec of scenario.components || []) {
        if (cSpec.customSpec && !this.registry.has(cSpec.typeId)) {
          DynamicComponentBuilder.registerFromSpec(cSpec.customSpec, this.registry);
        }
        const inst = this.registry.create(cSpec.typeId, {
          id: cSpec.id,
          position: cSpec.position || [12, 5.2, 0],
          rotation: cSpec.rotation,
          initialState: cSpec.state,
          ohms: cSpec.state?.ohms
        });
        this._headlessComponents.set(inst.id, inst);
      }

      this._headlessConnections = (scenario.connections || []).map((c) => ({ ...c }));
    }

    if (typeof code === 'string') {
      if (this.runtime) {
        this.runtime.stop({ resetPins: true });
        this.runtime.sourceCode = code;
      }
      this.onCodeUpdated?.(code);
    }

    const flowResult = this.solveFlow();
    this.onUndoStateChange?.(this.canUndo());
    return flowResult;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  /**
   * Reverts the most recent AI command transaction in 1 click.
   */
  undoLastTransaction() {
    if (this.undoStack.length === 0) return null;
    const snapshot = this.undoStack.pop();
    const flowResult = this.restoreStageSnapshot(snapshot);
    this.onUndoStateChange?.(this.canUndo());
    return {
      restored: true,
      remainingUndoCount: this.undoStack.length,
      flowResult
    };
  }

  /**
   * Executes a natural-language prompt by planning `stageCommands[]` via `BackendApiClient`
   * and applying them atomically onto the 3D stage.
   * @param {string} prompt
   */
  async executeNaturalLanguagePrompt(prompt) {
    const hostBoard = this.getHostBoard();
    const plan = await this.apiClient.planCircuitCommand({
      prompt,
      activeBoardTypeId: hostBoard?.typeId || 'board.arduino_uno',
      hostBoardId: hostBoard?.id || 'main.host_board'
    });

    const execResult = this.executeCommands(plan.stageCommands || [], { recordUndo: true });
    return {
      ...plan,
      ...execResult
    };
  }

  async executePrompt(prompt, options = {}) {
    if (!this.apiClient?.isAuthenticated?.()) {
      this.onAgentProgress?.({ phase: 'unauthenticated' });
      return {
        ok: false,
        status: 401,
        error: 'unauthenticated',
        message: 'AI devre sentezini kullanmak için giriş yapmalısınız.'
      };
    }

    if (typeof this.apiClient?.getCredits === 'function') {
      const credits = this.apiClient.getCredits();
      const available = Number(credits?.available_credits ?? credits?.total_credits ?? 0);
      if (available <= 0) {
        this.onAgentProgress?.({ phase: 'insufficient_credits', requiredCredits: 1.5 });
        return {
          ok: false,
          status: 402,
          error: 'insufficient_credits',
          requiredCredits: 1.5
        };
      }
    }

    if (options.useFlownieAgent !== false) {
      const beforeCredits = Number(this.apiClient?.getCredits?.()?.available_credits ?? 0);
      const res = await this.runFlownieAgentPrompt(prompt, options);
      const afterCredits = Number(this.apiClient?.getCredits?.()?.available_credits ?? 0);
      if (
        afterCredits >= beforeCredits &&
        !this.apiClient?.fetchImpl &&
        typeof this.apiClient?.setCredits === 'function'
      ) {
        const current = this.apiClient.getCredits() || {};
        const nextPromo = Math.max(0, Number((Number(current.promotional_credits ?? 0) - 6).toFixed(4)));
        const nextPurch = Number(current.purchased_credits ?? 0);
        this.apiClient.setCredits({
          promotional_credits: nextPromo,
          purchased_credits: nextPurch,
          available_credits: nextPromo + nextPurch
        });
      }
      return res;
    }
    return this.executeNaturalLanguagePrompt(prompt);
  }

  /**
   * Executes a `CircuitSDK` JavaScript snippet directly via `CodeModeExecutor`.
   */
  async executeCodeModeScript(code, description = '') {
    const runner = new CodeModeExecutor(this);
    return runner.execute({ code, description });
  }

  /**
   * Executes a multi-round Flownie Hardware Agent prompt:
   * - Round 1: Search Mode (`searchCapabilities` + `getComponentSchema`)
   * - Round 2: Code Mode (`executeCode` -> `CircuitSDK`)
   * - Round 3: Kirchhoff/Ohm Electrical Continuity Verification
   *
   * @param {string} prompt
   * @param {object} [options]
   */
  async runFlownieAgentPrompt(prompt, options = {}) {
    const progressCb = options.onStepUpdate || this.onAgentStepUpdate || this.onAgentProgress || null;
    const statusCb = options.onStatusUpdate || this.onAgentStatusUpdate || null;
    const askUserCb = options.onAskUser || this.onAgentAskUser || null;
    const result = await runHardwareAgentLoop({
      prompt,
      executor: this,
      apiClient: options.apiClient || this.apiClient,
      onStepUpdate: progressCb,
      onStatusUpdate: statusCb,
      onAskUser: askUserCb,
      maxRounds: options.maxRounds || DEFAULT_MAX_ROUNDS,
      signal: options.signal || null,
      userAnswer: options.userAnswer || null,
      sessionMemory: options.sessionMemory || null
    });
    this.lastAgentResult = result;
    this.pendingAgentState = result?.pending || null;
    if (result?.status === 'awaiting_user') {
      this.onAgentProgress?.({ phase: 'awaiting_user', result, pending: result.pending });
    } else if (result?.ok === false || result?.status === 'error') {
      this.onAgentProgress?.({ phase: 'error', result });
    } else {
      this.onAgentProgress?.({ phase: 'completed', result });
    }
    return result;
  }

  /**
   * Resumes a paused `runHardwareAgentLoop` run (either after `askUser` clarification
   * or after user approves extra rounds via `extend_rounds`).
   *
   * @param {object} userDecision
   * @param {object} [pendingOverride]
   */
  async resumeFlownieAgentPrompt(userDecision = {}, pendingOverride = null) {
    const pending = pendingOverride || this.pendingAgentState;
    if (!pending) {
      throw new Error('No paused agent run available to resume.');
    }
    const result = await resumeHardwareAgentLoop(pending, userDecision);
    this.lastAgentResult = result;
    this.pendingAgentState = result?.pending || null;
    if (result?.status === 'awaiting_user') {
      this.onAgentProgress?.({ phase: 'awaiting_user', result, pending: result.pending });
    } else if (result?.ok === false || result?.status === 'error') {
      this.onAgentProgress?.({ phase: 'error', result });
    } else {
      this.onAgentProgress?.({ phase: 'completed', result });
    }
    return result;
  }

  /**
   * Executes an array of structured `stageCommands[]` as a single atomic transaction.
   * @param {Array<object>} stageCommands
   * @param {object} [options]
   * @param {boolean} [options.recordUndo=true]
   */
  executeCommands(stageCommands = [], { recordUndo = true } = {}) {
    if (!Array.isArray(stageCommands) || stageCommands.length === 0) {
      return { executedCount: 0, snapshotRecorded: false, flowResult: this.solveFlow() };
    }

    if (recordUndo) {
      this.undoStack.push(this.captureStageSnapshot());
      this.onUndoStateChange?.(this.canUndo());
    }

    let executedCount = 0;

    for (const cmd of stageCommands) {
      if (!cmd || typeof cmd !== 'object') continue;
      const action = String(cmd.action || cmd.type || '').trim();

      switch (action) {
        case 'setHostBoard': {
          const typeId = cmd.typeId || 'board.arduino_uno';
          if (this.stage) {
            this.stage.ensureHostBoard(typeId);
          } else {
            const prevId = this._headlessHostBoard?.id || 'main.host_board';
            if (this._headlessHostBoard) {
              this.registry.removeInstance(this._headlessHostBoard.id, true);
            }
            this._headlessHostBoard = this.registry.create(typeId, { id: prevId });
          }
          executedCount++;
          break;
        }

        case 'registerCustomComponent': {
          if (cmd.spec && typeof cmd.spec === 'object') {
            DynamicComponentBuilder.registerFromSpec(cmd.spec, this.registry);
            executedCount++;
          }
          break;
        }

        case 'spawnComponent': {
          const typeId = cmd.typeId;
          if (cmd.customSpec && !this.registry.has(typeId)) {
            DynamicComponentBuilder.registerFromSpec(cmd.customSpec, this.registry);
          }
          if (typeId && this.registry.has(typeId)) {
            if (this.stage) {
              this.stage.spawnIndependentComponent(typeId, {
                ...(cmd.options || {}),
                id: cmd.id,
                position: cmd.position,
                rotation: cmd.rotation,
                autoSelect: false
              });
            } else {
              const id = cmd.id || `stage.${typeId.replace(/\./g, '_')}_${this._headlessComponents.size + 1}`;
              const inst = this.registry.create(typeId, {
                ...(cmd.options || {}),
                id,
                position: cmd.position || [12, 5.2, 0],
                rotation: cmd.rotation
              });
              this._headlessComponents.set(inst.id, inst);
            }
            executedCount++;
          }
          break;
        }

        case 'connectPins': {
          if (cmd.from && cmd.to) {
            const hostId = this.getHostBoard()?.id || 'main.host_board';
            const fromEndpoint = cmd.from.startsWith('host.')
              ? `${hostId}.${cmd.from.slice(5)}`
              : cmd.from;
            const toEndpoint = cmd.to.startsWith('host.')
              ? `${hostId}.${cmd.to.slice(5)}`
              : cmd.to;

            if (this.stage?.wireTool) {
              if (typeof this.stage.wireTool.connectEndpoints === 'function') {
                this.stage.wireTool.connectEndpoints(
                  fromEndpoint,
                  toEndpoint,
                  cmd.color || '#10b981'
                );
              } else {
                const existing = this.stage.wireTool.getConnections();
                existing.push({
                  id: cmd.id || `ai_wire_${existing.length + 1}`,
                  from: fromEndpoint,
                  to: toEndpoint,
                  color: cmd.color || '#10b981'
                });
                this.stage.wireTool.setConnections(existing);
              }
            } else {
              this._headlessConnections.push({
                id: cmd.id || `ai_wire_${this._headlessConnections.length + 1}`,
                from: fromEndpoint,
                to: toEndpoint,
                color: cmd.color || '#10b981'
              });
            }
            executedCount++;
          }
          break;
        }

        case 'smartConnect': {
          const sourceComp =
            this.registry.getInstance(cmd.sourceComponentId) || this.getHostBoard();
          const targetComp = this.registry.getInstance(cmd.targetComponentId);
          if (sourceComp && targetComp) {
            const sourcePin = cmd.sourcePin
              ? sourceComp.electricalPins.get(sourceComp.resolvePinName(cmd.sourcePin))
              : [...sourceComp.electricalPins.values()][0];
            if (sourcePin) {
              const match = SmartPinMatcher.findBestTargetPinForSourcePin(
                sourcePin,
                targetComp,
                this.getConnections()
              );
              if (match?.targetPin) {
                const conn = {
                  id: `smart_${Date.now()}_${executedCount}`,
                  from: sourcePin.endpointId,
                  to: match.targetPin.endpointId,
                  color: '#10b981'
                };
                if (this.stage?.wireTool) {
                  const existing = this.stage.wireTool.getConnections();
                  existing.push(conn);
                  this.stage.wireTool.setConnections(existing);
                } else {
                  this._headlessConnections.push(conn);
                }
                executedCount++;
              }
            }
          }
          break;
        }

        case 'updateCode': {
          if (typeof cmd.code === 'string') {
            if (this.runtime) {
              this.runtime.sourceCode = cmd.code;
            }
            this.onCodeUpdated?.(cmd.code);
            executedCount++;
          }
          break;
        }

        case 'startSimulation': {
          if (this.runtime) {
            const targetCode = cmd.code || this.runtime.sourceCode;
            this.runtime.runImmediate({
              sourceCode: targetCode
            });
            this.runtime.start(targetCode);
            this.onCodeUpdated?.(targetCode);
            executedCount++;
          }
          break;
        }

        case 'stopSimulation': {
          if (this.runtime) {
            this.runtime.stop({ resetPins: true });
            executedCount++;
          }
          break;
        }
      }
    }

    const flowResult = this.solveFlow();
    return {
      executedCount,
      snapshotRecorded: Boolean(recordUndo),
      canUndo: this.canUndo(),
      flowResult
    };
  }

  solveFlow() {
    if (this.stage) {
      const res = this.stage.solveFreeformFlow();
      this.onFlowSolved?.(res);
      return res;
    }

    const host = this.getHostBoard();
    const components = [
      ...(host ? [host] : []),
      ...this.getStageComponents()
    ];
    const res = circuitFlowSolver.solve({
      components,
      connections: this.getConnections()
    });
    this.onFlowSolved?.(res);
    return res;
  }
}
