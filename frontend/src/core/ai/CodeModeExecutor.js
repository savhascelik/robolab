import { CircuitSDK } from './CircuitSDK.js';
import { inspectCircuitState } from './capabilityIndex.js';

const FORBIDDEN_CODE_PATTERNS = [
  /\bwindow\b/,
  /\bdocument\b/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bindexedDB\b/,
  /\beval\s*\(/
];

/**
 * Strips JavaScript comments and string literals so security regexes (`FORBIDDEN_CODE_PATTERNS`)
 * only inspect executable identifiers and never false-positive on words like "window" or "document"
 * inside comments or C++ `setCode(...)` strings.
 *
 * @param {string} code
 */
export function stripCommentsAndStrings(code = '') {
  let out = '';
  let quote = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < code.length; i += 1) {
    const ch = code[i];
    const next = code[i + 1] || '';

    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false;
        out += '\n';
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i += 1;
      }
      continue;
    }

    if (quote) {
      if (ch === '\\') {
        i += 1;
        continue;
      }
      if (ch === quote) {
        quote = null;
        out += '""';
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i += 1;
      continue;
    }

    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i += 1;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
      continue;
    }

    out += ch;
  }

  return out;
}

/**
 * Repairs unescaped raw newlines inside single-quoted (`'...'`) or double-quoted (`"..."`)
 * JavaScript string literals (which frequently occur when an LLM passes multiline C++ code
 * inside `circuit.setCode('...\n...')` in a JSON tool call).
 *
 * @param {string} code
 */
export function repairMultilineQuotedStrings(code = '') {
  let out = '';
  let quote = null;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < code.length; i += 1) {
    const ch = code[i];
    const next = code[i + 1] || '';

    if (inLineComment) {
      out += ch;
      if (ch === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      out += ch;
      if (ch === '*' && next === '/') {
        out += '/';
        i += 1;
        inBlockComment = false;
      }
      continue;
    }

    if (quote) {
      if (ch === '\\') {
        out += ch;
        if (i + 1 < code.length) {
          out += code[i + 1];
          i += 1;
        }
        continue;
      }
      if ((quote === "'" || quote === '"') && (ch === '\n' || ch === '\r')) {
        if (ch === '\r' && next === '\n') {
          i += 1;
        }
        out += '\\n';
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      out += ch;
      continue;
    }

    if (ch === '/' && next === '/') {
      out += '//';
      i += 1;
      inLineComment = true;
      continue;
    }

    if (ch === '/' && next === '*') {
      out += '/*';
      i += 1;
      inBlockComment = true;
      continue;
    }

    if (ch === "'" || ch === '"' || ch === '`') {
      quote = ch;
    }

    out += ch;
  }

  return out;
}

/**
 * Categorizes a hardware or JS runtime error thrown inside `CodeModeExecutor` (`flownie-frontend`
 * `codeExecutor.ts` pattern) and generates a concrete self-healing `recoveryHint` for the LLM.
 *
 * @param {Error|object|string} error
 * @param {CircuitSDK|null} [sdk]
 */
export function categorizeHardwareError(error, sdk = null) {
  const message = String(error?.message || error || '').trim();
  const diags = Array.isArray(sdk?.diagnostics) ? sdk.diagnostics : [];
  const lastDiag = diags.at(-1) || null;

  if (error?.category === 'unknown_component' || lastDiag?.category === 'unknown_component' || /unknown component|could not resolve component/i.test(message)) {
    const suggestedTypes =
      error?.suggestedTypes ||
      lastDiag?.suggestedTypes ||
      sdk?._suggestClosestTypeIds?.(message) ||
      ['sensor.ultrasonic', 'motor.servo', 'passive.resistor', 'led.single'];
    return {
      category: 'unknown_component',
      message,
      suggestedTypes,
      recoveryHint:
        error?.recoveryHint ||
        lastDiag?.recoveryHint ||
        `Unknown component typeId. Closest catalog matches: [${suggestedTypes.join(', ')}]. Call searchCapabilities({ query }) before spawning.`
    };
  }

  if (error?.category === 'unknown_pin' || lastDiag?.category === 'unknown_pin' || /unknown pin/i.test(message)) {
    const availablePins = error?.availablePins || lastDiag?.availablePins || [];
    return {
      category: 'unknown_pin',
      message,
      availablePins,
      recoveryHint:
        error?.recoveryHint ||
        lastDiag?.recoveryHint ||
        `Invalid pin name. Available pins: [${availablePins.join(', ')}]. Call getComponentSchema(typeId) to verify pin names.`
    };
  }

  if (/forbidden global access/i.test(message)) {
    return {
      category: 'security',
      message,
      recoveryHint:
        'Do not access browser globals (window, document, fetch, eval). Use only the injected `circuit` / `sdk` (`CircuitSDK`) instance.'
    };
  }

  if (error instanceof SyntaxError || /syntaxerror|unexpected token|unexpected identifier/i.test(message)) {
    return {
      category: 'syntax',
      message,
      recoveryHint:
        'JavaScript syntax error in Code Mode script. Ensure valid ES2022 syntax without TypeScript type annotations or markdown fences.'
    };
  }

  return {
    category: 'runtime',
    message,
    recoveryHint:
      lastDiag?.recoveryHint ||
      'Verify component IDs and pin names via getComponentSchema(typeId) and getFunctionSchema(functionName) before calling executeCode.'
  };
}

/**
 * CodeModeExecutor — Flownie Code Mode Sandbox Executor for 3D Hardware Workbench.
 *
 * Executes AI-generated JavaScript programs against the `sdk` / `circuit` (`CircuitSDK`) API,
 * records atomic undo snapshots before mutation, captures `console.log` telemetry,
 * and verifies post-execution closed-loop electrical continuity.
 */
export class CodeModeExecutor {
  /**
   * @param {import('./StageAiCommandExecutor.js').StageAiCommandExecutor|object} executorOrOptions
   */
  constructor(executorOrOptions = {}) {
    if (
      executorOrOptions &&
      typeof executorOrOptions.executeCommands === 'function'
    ) {
      this.executor = executorOrOptions;
      this.options = { executor: executorOrOptions };
      this.customSdk = null;
    } else {
      this.options = executorOrOptions || {};
      this.customSdk = this.options.sdk || null;
      this.executor =
        this.options.executor ||
        this.customSdk?.executor ||
        null;
    }
  }

  /**
   * Validates that the code string only targets `sdk.*` / `circuit.*` and standard JS primitives.
   */
  validateCode(code) {
    const raw = String(code || '').trim();
    if (!raw) {
      return { valid: false, error: 'Empty Code Mode script', reason: 'Code Mode betiği boş olamaz.' };
    }
    const executableOnly = stripCommentsAndStrings(raw);
    for (const pattern of FORBIDDEN_CODE_PATTERNS) {
      if (pattern.test(executableOnly)) {
        return { valid: false, error: `Forbidden global access in Code Mode: ${pattern.source}` };
      }
    }
    return { valid: true };
  }

  /**
   * Executes a `sdk.*` / `circuit.*` JavaScript snippet against the 3D Hardware Workbench.
   *
   * @param {{ code: string, description?: string, explanation?: string }} payload
   * @returns {Promise<object>}
   */
  async execute({ code, description = '', explanation = '' } = {}) {
    const label = String(explanation || description || '').trim();
    const strippedFences = String(code || '')
      .replace(/^```(?:javascript|js|ts|typescript)?\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const cleanCode = repairMultilineQuotedStrings(strippedFences);

    const validation = this.validateCode(cleanCode);
    if (!validation.valid) {
      const categorized = categorizeHardwareError(validation.error || validation.reason);
      return {
        ok: false,
        success: false,
        explanation: label,
        error: validation.error || validation.reason,
        errorCategory: categorized.category,
        recoveryHint: categorized.recoveryHint,
        diagnostics: [categorized],
        warnings: [categorized.recoveryHint],
        logs: [],
        executedCommands: [],
        executedCommandsCount: 0,
        stepsExecuted: 0,
        electricalState: null
      };
    }

    // Push atomic undo snapshot before modifying the 3D stage
    if (typeof this.executor?.captureStageSnapshot === 'function') {
      try {
        this.executor.undoStack.push(this.executor.captureStageSnapshot());
        this.executor.onUndoStateChange?.(this.executor.canUndo());
      } catch {
        // Non-fatal if snapshot serialization encounters transient 3D state
      }
    }

    const sdk = this.customSdk || new CircuitSDK(this.executor || this.options);
    const consoleProxy = {
      log: (...args) =>
        sdk._log(
          args
            .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
            .join(' ')
        ),
      info: (...args) =>
        sdk._log(
          args
            .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
            .join(' ')
        ),
      warn: (...args) => sdk._log(`[WARN] ${args.map((a) => String(a)).join(' ')}`),
      error: (...args) => sdk._log(`[ERROR] ${args.map((a) => String(a)).join(' ')}`)
    };

    try {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const runner = new AsyncFunction(
        'sdk',
        'circuit',
        'console',
        `"use strict";\n${cleanCode}`
      );
      const returnValue = await runner(sdk, sdk, consoleProxy);

      // Ensure electrical solver is updated after all mutations
      const electricalState = sdk.inspectElectricalState();
      const stageInspection = this.executor ? inspectCircuitState(this.executor) : null;
      const unconnectedPowerPins = Array.isArray(stageInspection?.unconnectedPowerPins)
        ? stageInspection.unconnectedPowerPins
        : [];

      const warnings = [...(sdk.warnings || [])];
      if (unconnectedPowerPins.length > 0) {
        warnings.push(
          `Unconnected power pins (VCC/GND): ${unconnectedPowerPins.join(', ')}`
        );
      }

      return {
        ok: true,
        success: true,
        explanation:
          label ||
          `Code Mode tamamlandı (${sdk.executedCommands.length} donanım komutu, ${electricalState.closedLoopCount} kapalı çevrim).`,
        returnValue: returnValue ?? null,
        logs: sdk.logs,
        executionLog: sdk.executionLog,
        executedCommands: sdk.executedCommands,
        executedCommandsCount: sdk.executedCommands.length,
        stepsExecuted: sdk.executedCommands.length,
        diagnostics: sdk.diagnostics || [],
        warnings,
        recoveryHint: sdk.diagnostics?.[0]?.recoveryHint || null,
        unconnectedPowerPins,
        electricalState,
        verification: electricalState
      };
    } catch (err) {
      const electricalState = sdk.inspectElectricalState();
      const categorized = categorizeHardwareError(err, sdk);
      return {
        ok: false,
        success: false,
        explanation: label,
        error: err?.message || String(err),
        errorCategory: categorized.category,
        recoveryHint: categorized.recoveryHint,
        suggestedTypes: categorized.suggestedTypes || null,
        availablePins: categorized.availablePins || null,
        diagnostics: [...(sdk.diagnostics || []), categorized],
        warnings: [...(sdk.warnings || []), categorized.recoveryHint],
        logs: sdk.logs,
        executionLog: sdk.executionLog,
        executedCommands: sdk.executedCommands,
        executedCommandsCount: sdk.executedCommands.length,
        stepsExecuted: sdk.executedCommands.length,
        electricalState
      };
    }
  }
}

/**
 * Convenience helper matching Flownie `capabilityHandlers.executeCode` signature.
 */
export async function executeCode(
  { code, description = '', explanation = '' } = {},
  executor
) {
  const runner = new CodeModeExecutor(executor);
  return runner.execute({ code, description, explanation });
}
