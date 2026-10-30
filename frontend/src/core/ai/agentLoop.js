import {
  searchCapabilities,
  getComponentSchema,
  getFunctionSchema,
  searchCanvasComponents,
  describeCanvasComponent,
  inspectCircuitState,
  CORE_TOOLS,
  FLOWNIE_HARDWARE_META_TOOLS
} from './capabilityIndex.js';
import { executeCode } from './CodeModeExecutor.js';
import { CircuitSDK } from './CircuitSDK.js';
import {
  buildCircuitObservation as buildObservationFromBuilder,
  formatRoundObservation,
  snapshotStage,
  MAX_OBSERVATION_BYTES
} from './observationBuilder.js';
import { i18n } from '../i18n/I18nService.js';

export const DEFAULT_MAX_ROUNDS = 10;
export { MAX_OBSERVATION_BYTES, snapshotStage, formatRoundObservation };

/**
 * Resolves a localized (TR/EN) user-facing error message and normalized error code
 * from any backend or network error thrown during an agent round.
 *
 * @param {any} err
 */
export function resolveLocalizedAgentError(err) {
  const code = String(
    err?.code ||
      err?.payload?.error ||
      err?.data?.error ||
      (err?.status === 402
        ? 'insufficient_credits'
        : err?.status === 401
        ? 'unauthenticated'
        : err?.status === 403
        ? 'max_agent_rounds_exceeded'
        : 'api_error')
  ).trim();

  const payloadLocale = String(err?.payload?.locale || '').toLowerCase();
  const currentLocale = typeof i18n?.getLocale === 'function' ? i18n.getLocale() : 'tr';
  const payloadMessage = String(err?.payload?.message || err?.data?.message || '').trim();

  switch (code) {
    case 'ai_model_not_configured':
      return {
        errorCode: code,
        message:
          payloadLocale === currentLocale && payloadMessage
            ? payloadMessage
            : i18n.t('workbench.aiChat.errors.modelNotConfigured')
      };
    case 'ai_api_key_missing':
      return {
        errorCode: code,
        message:
          payloadLocale === currentLocale && payloadMessage
            ? payloadMessage
            : i18n.t('workbench.aiChat.errors.apiKeyMissing')
      };
    case 'ai_provider_error':
      return {
        errorCode: code,
        message:
          payloadLocale === currentLocale && payloadMessage
            ? payloadMessage
            : i18n.t('workbench.aiChat.errors.providerError')
      };
    case 'insufficient_credits':
      return {
        errorCode: code,
        message:
          payloadLocale === currentLocale && payloadMessage
            ? payloadMessage
            : i18n.t('workbench.aiChat.errors.insufficientCredits')
      };
    case 'max_agent_rounds_exceeded':
      return {
        errorCode: code,
        message:
          payloadLocale === currentLocale && payloadMessage
            ? payloadMessage
            : i18n.t('workbench.aiChat.errors.maxRoundsExceeded')
      };
    case 'unauthenticated':
      return {
        errorCode: code,
        message:
          payloadLocale === currentLocale && payloadMessage
            ? payloadMessage
            : i18n.t('workbench.aiChat.errors.unauthenticated')
      };
    default:
      return {
        errorCode: code,
        message: payloadMessage || err?.message || i18n.t('workbench.aiChat.errors.requestFailed')
      };
  }
}

export const READ_ONLY_CORE_TOOLS = Object.freeze([
  'searchCapabilities',
  'getComponentSchema',
  'getFunctionSchema',
  'inspectCircuitState',
  'searchCanvasComponents',
  'describeCanvasComponent',
  'askUser'
]);

/**
 * CapabilityGate (`partitionCalls`) — Flownie progressive tool permission & mode gate.
 * Unwraps `callCapability({ name, args })` so inner mutating tools cannot bypass `inspect` mode
 * or `ai.code_mode` permissions.
 */
export function partitionCalls(toolCalls = [], { mode = 'edit', permissions = [] } = {}) {
  const allowed = [];
  const blocked = [];
  const readOnly = [];
  const mutating = [];
  const hasPerms = Array.isArray(permissions) && permissions.length > 0;
  const canCodeMode =
    !hasPerms ||
    permissions.includes('ai.code_mode') ||
    permissions.includes('ai.generate_circuit');

  for (const call of Array.isArray(toolCalls) ? toolCalls : []) {
    const outerName = String(call?.name || '').trim();
    const args =
      call?.args && typeof call.args === 'object'
        ? call.args
        : call?.arguments && typeof call.arguments === 'object'
        ? call.arguments
        : {};
    const targetName =
      outerName === 'callCapability'
        ? String(args.name || args.capability || '').trim()
        : outerName;

    if (!CORE_TOOLS.includes(outerName) || (outerName === 'callCapability' && (!targetName || !CORE_TOOLS.includes(targetName)))) {
      blocked.push({ call, targetName: targetName || outerName, reason: 'unknown_tool' });
      continue;
    }
    const isReadOnly = READ_ONLY_CORE_TOOLS.includes(targetName);
    if (mode === 'inspect' && !isReadOnly) {
      blocked.push({ call, targetName, reason: 'read_only_mode' });
      continue;
    }
    if (targetName === 'executeCode' && !canCodeMode) {
      blocked.push({ call, targetName, reason: 'missing_permission_ai_code_mode' });
      continue;
    }
    allowed.push(call);
    if (isReadOnly) {
      readOnly.push(call);
    } else {
      mutating.push(call);
    }
  }

  return { allowed, blocked, readOnly, mutating, rejected: blocked };
}

/**
 * ObservationBuilder (`buildCircuitObservation`) — Supports both:
 * 1. Direct executor call `buildCircuitObservation(executor)` returning `{ ok, hostBoard, componentCount, connectionCount, text, ... }`
 * 2. Round options call `buildCircuitObservation({ round, maxRounds, ... })` returning the 48KB byte-budgeted markdown string.
 */
export function buildCircuitObservation(paramsOrExecutor) {
  return buildObservationFromBuilder(paramsOrExecutor);
}

/**
 * Rolling session memory for multi-turn hardware synthesis (`flownie-frontend` `SessionMemory` pattern).
 * Tracks `@component:<typeId>`, `@fn:<functionName>`, `@search:<query>`, and `@canvas:<id>` entries
 * so the LLM never wastes rounds re-querying already-discovered schemas.
 */
export class HardwareSessionMemory {
  constructor(maxTurns = 10) {
    this.maxTurns = maxTurns;
    this.turns = [];
    this.discoveredSchemas = new Map();
    this.discoveredFunctions = new Map();
    this.knowledgeEntries = new Map();
  }

  recordTurn(entry) {
    this.turns.push({
      ts: Date.now(),
      ...entry
    });
    if (this.turns.length > this.maxTurns) {
      this.turns.splice(0, this.turns.length - this.maxTurns);
    }
  }

  rememberSchema(typeId, schema = { loaded: true }) {
    if (!typeId) return;
    const normalized = schema || { loaded: true, typeId };
    this.discoveredSchemas.set(typeId, normalized);
    this.knowledgeEntries.set(`@component:${typeId}`, {
      typeId,
      name: normalized.name || typeId,
      pinNames: Array.isArray(normalized.pinNames)
        ? normalized.pinNames
        : Array.isArray(normalized.pins)
        ? normalized.pins.map((p) => p.name || p)
        : []
    });
  }

  recordSchema(typeId, schema = { loaded: true }) {
    this.rememberSchema(typeId, schema);
  }

  hasLoadedSchema(typeId) {
    return this.discoveredSchemas.has(typeId);
  }

  rememberFunction(functionName, schema = {}) {
    if (!functionName) return;
    this.discoveredFunctions.set(functionName, schema);
    this.knowledgeEntries.set(`@fn:${functionName}`, {
      functionName,
      summary: schema.summary || schema.description || functionName
    });
  }

  recordFunctionSchema(functionName, schema = {}) {
    this.rememberFunction(functionName, schema);
  }

  hasLoadedFunctionSchema(functionName) {
    return this.discoveredFunctions.has(functionName);
  }

  rememberSearch(query, result = {}) {
    const key = String(query || '').trim().toLowerCase();
    if (!key) return;
    const components = Array.isArray(result)
      ? result
      : Array.isArray(result.components)
      ? result.components
      : [];
    this.knowledgeEntries.set(`@search:${key}`, {
      query: key,
      components
    });
  }

  recordSearch(query, result = {}) {
    this.rememberSearch(query, result);
  }

  hasSearched(query) {
    const key = String(query || '').trim().toLowerCase();
    return this.knowledgeEntries.has(`@search:${key}`);
  }

  rememberCanvasState(key, data) {
    if (!key) return;
    this.knowledgeEntries.set(`@canvas:${key}`, data);
  }

  recordCanvasState(key, data) {
    this.rememberCanvasState(key, data);
  }

  /**
   * Invalidates cached `@canvas:*` entries whenever a mutating tool (`executeCode`, `addComponent`, etc.)
   * alters the 3D workbench stage.
   */
  invalidateCanvasCache() {
    for (const key of [...this.knowledgeEntries.keys()]) {
      if (key.startsWith('@canvas:')) {
        this.knowledgeEntries.delete(key);
      }
    }
  }

  entries() {
    return [...this.knowledgeEntries.entries()];
  }

  toKnowledgeArray() {
    if (this.knowledgeEntries.size === 0) {
      return [];
    }
    const items = [];
    for (const [key, val] of this.knowledgeEntries.entries()) {
      if (key.startsWith('@component:')) {
        const pins = Array.isArray(val?.pinNames) && val.pinNames.length > 0
          ? val.pinNames.join(', ')
          : 'loaded';
        items.push(`${key} -> name="${val?.name || val?.typeId}", pins=[${pins}]`);
      } else if (key.startsWith('@fn:')) {
        items.push(`${key} -> ${val?.summary || val?.functionName}`);
      } else if (key.startsWith('@search:')) {
        const ids = Array.isArray(val?.components)
          ? val.components.map((c) => c.typeId || c).join(', ')
          : '';
        items.push(`${key} -> matched=[${ids}]`);
      } else if (key.startsWith('@canvas:')) {
        items.push(`${key} -> ${JSON.stringify(val)}`);
      }
    }
    return items;
  }

  toObservationSection() {
    const items = this.toKnowledgeArray();
    if (items.length === 0) {
      return '';
    }
    return [
      '## SESSION KNOWLEDGE (already retrieved — do NOT ask again)',
      ...items.map((item) => `- ${item}`)
    ].join('\n');
  }

  getHistorySummary() {
    return this.turns.map((t) => ({
      prompt: t.prompt,
      summary: t.summary,
      componentsAdded: t.componentsAdded || 0,
      closedLoopCount: t.closedLoopCount || 0
    }));
  }

  clear() {
    this.turns = [];
    this.discoveredSchemas.clear();
    this.discoveredFunctions.clear();
    this.knowledgeEntries.clear();
  }
}

export { HardwareSessionMemory as SessionMemory };
export const hardwareSessionMemory = new HardwareSessionMemory(10);

/**
 * Dispatches one of the Flownie Hardware `CORE_TOOLS` against the workbench executor.
 */
export async function dispatchHardwareToolCall(toolCall, executor, memory = hardwareSessionMemory) {
  const startedAt = Date.now();
  const name = String(toolCall?.name || '').trim();
  const args =
    toolCall?.args && typeof toolCall.args === 'object'
      ? toolCall.args
      : toolCall?.arguments && typeof toolCall.arguments === 'object'
      ? toolCall.arguments
      : {};
  const sessionMem = memory || hardwareSessionMemory;

  switch (name) {
    case 'searchCapabilities': {
      const res = searchCapabilities(args, executor?.registry);
      sessionMem?.rememberSearch?.(args.query || '', res);
      return { tool: name, ok: true, durationMs: Date.now() - startedAt, output: res };
    }
    case 'getComponentSchema': {
      const requestedId = String(args.typeId || args.componentId || '').trim();
      if (requestedId && sessionMem?.discoveredSchemas?.has(requestedId)) {
        const cached = sessionMem.discoveredSchemas.get(requestedId);
        return {
          tool: name,
          ok: true,
          cachedFromSessionMemory: true,
          durationMs: Date.now() - startedAt,
          output: { found: true, cached: true, ...cached, component: cached }
        };
      }
      const res = getComponentSchema(args, executor?.registry);
      if (res.found && res.component?.typeId) {
        sessionMem?.rememberSchema?.(res.component.typeId, res.component);
        if (requestedId) {
          sessionMem?.rememberSchema?.(requestedId, res.component);
        }
      } else if (res.found && res.typeId) {
        sessionMem?.rememberSchema?.(res.typeId, res);
        if (requestedId) {
          sessionMem?.rememberSchema?.(requestedId, res);
        }
      }
      return { tool: name, ok: res.found, durationMs: Date.now() - startedAt, output: res };
    }
    case 'getFunctionSchema': {
      const fnName = String(args.functionName || args.name || '').trim();
      if (fnName && sessionMem?.discoveredFunctions?.has(fnName)) {
        const cachedFn = sessionMem.discoveredFunctions.get(fnName);
        return {
          tool: name,
          ok: true,
          cachedFromSessionMemory: true,
          durationMs: Date.now() - startedAt,
          output: { found: true, cached: true, ...cachedFn }
        };
      }
      const res = getFunctionSchema({
        functionName: fnName
      });
      if (res.found && fnName) {
        sessionMem?.rememberFunction?.(fnName, res);
      }
      return { tool: name, ok: res.found, durationMs: Date.now() - startedAt, output: res };
    }
    case 'inspectCircuitState': {
      const res = inspectCircuitState(executor);
      sessionMem?.rememberCanvasState?.('circuitState', {
        hostBoard: res.hostBoard,
        componentCount: res.componentCount,
        connectionCount: res.connectionCount
      });
      return { tool: name, ok: true, durationMs: Date.now() - startedAt, output: res };
    }
    case 'searchCanvasComponents': {
      const res = searchCanvasComponents(args, executor);
      return { tool: name, ok: true, durationMs: Date.now() - startedAt, output: res };
    }
    case 'describeCanvasComponent': {
      const res = describeCanvasComponent(args, executor);
      if (res.found && res.component?.id) {
        sessionMem?.rememberCanvasState?.(`comp:${res.component.id}`, res.component);
      }
      return { tool: name, ok: res.found, durationMs: Date.now() - startedAt, output: res };
    }
    case 'callCapability': {
      const innerName = String(args.name || args.capability || '').trim();
      const innerArgs = args.args && typeof args.args === 'object' ? args.args : {};
      if (!innerName || innerName === 'callCapability') {
        return {
          tool: name,
          ok: false,
          durationMs: Date.now() - startedAt,
          output: { error: 'Invalid capability name' }
        };
      }
      return dispatchHardwareToolCall({ name: innerName, args: innerArgs }, executor, sessionMem);
    }
    case 'executeCode': {
      sessionMem?.invalidateCanvasCache?.();
      const res = await executeCode(args, executor);
      return { tool: name, ok: res.success, durationMs: Date.now() - startedAt, output: res };
    }
    case 'addComponent': {
      sessionMem?.invalidateCanvasCache?.();
      const sdk = new CircuitSDK(executor);
      const comp = sdk.addComponent(args.typeId || args.componentId, args.options || args);
      return { tool: name, ok: Boolean(comp?.id), durationMs: Date.now() - startedAt, output: comp };
    }
    case 'connectPins': {
      sessionMem?.invalidateCanvasCache?.();
      const sdk = new CircuitSDK(executor);
      const wire = args.from && args.to
        ? sdk.connectPins(args.from, args.to, args)
        : sdk.connectWire(args.fromComponentId || 'host', args.fromPin, args.toComponentId, args.toPin, args);
      return {
        tool: name,
        ok: Boolean(wire?.connected),
        durationMs: Date.now() - startedAt,
        output: wire
      };
    }
    case 'createCircuitBatch': {
      sessionMem?.invalidateCanvasCache?.();
      const sdk = new CircuitSDK(executor);
      if (args.boardType) sdk.setBoard(args.boardType);
      const added = [];
      for (const c of Array.isArray(args.components) ? args.components : []) {
        added.push(sdk.addComponent(c.typeId, c));
      }
      const wires = [];
      for (const w of Array.isArray(args.connections) ? args.connections : []) {
        wires.push(
          w.from && w.to
            ? sdk.connectPins(w.from, w.to, w)
            : sdk.connectWire(w.fromComponentId || 'host', w.fromPin, w.toComponentId, w.toPin, w)
        );
      }
      return {
        tool: name,
        ok: true,
        durationMs: Date.now() - startedAt,
        output: { components: added, connections: wires }
      };
    }
    case 'writeArduinoCode': {
      const sdk = new CircuitSDK(executor);
      const res = sdk.setCode(args.code || '');
      return { tool: name, ok: res.updated, durationMs: Date.now() - startedAt, output: res };
    }
    case 'compileAndRunSimulation': {
      const sdk = new CircuitSDK(executor);
      if (args.code) sdk.setCode(args.code);
      const res = sdk.startSimulation();
      return { tool: name, ok: res.running, durationMs: Date.now() - startedAt, output: res };
    }
    case 'askUser': {
      return {
        tool: name,
        ok: true,
        durationMs: Date.now() - startedAt,
        output: {
          question: String(args.question || ''),
          options: Array.isArray(args.options) ? args.options : [],
          reason: String(args.reason || 'clarification'),
          requested_extra_rounds: Number(args.requested_extra_rounds || 0)
        }
      };
    }
    default:
      return {
        tool: name,
        ok: false,
        durationMs: Date.now() - startedAt,
        output: { error: `Unknown Flownie tool '${name}'` }
      };
  }
}

/**
 * Local deterministic Flownie multi-round planner used when backend is offline or in headless test mode.
 * Supports:
 * - Round 1: Search Mode (`searchCapabilities` + `getComponentSchema`), or `askUser(clarification)` when prompt is ambiguous
 * - Low round budget (`remainingRounds <= 1` when prompt requests extra rounds / complex multi-stage setup): `askUser(extend_rounds)`
 * - Synthesis Round: Code Mode (`executeCode` -> `CircuitSDK`)
 */
export function buildLocalFlowniePlanTurn({
  prompt = '',
  round = 1,
  maxRounds = DEFAULT_MAX_ROUNDS,
  remainingRounds = Math.max(0, maxRounds - round),
  userAnswer = null,
  roundExtensionGranted = false
} = {}) {
  const text = String(prompt || '').toLowerCase();
  const answerLower = String(userAnswer || '').toLowerCase();
  const wantsJetson = /jetson|kamera|camera|csi|vision|rover|mecanum/.test(text) || /jetson/.test(answerLower);
  const wantsEsp32 = /esp32/.test(text) || /esp32/.test(answerLower);
  const wantsSumo = /sumo|l298n|çizgi|line|dozer|otonom/.test(text);
  const wantsUltrasonic = /ultrason|hc-sr04|mesafe|engel|sonar|park/.test(text);
  const wantsServo = /servo|sg90|kol|kapı|bariyer|açı/.test(text);
  const wantsOled = /oled|ssd1306|ekran|display/.test(text);
  const wantsBuzzer = /buzzer|ses|alarm|piezo/.test(text);
  const wantsClarification = /belirsiz|hangi kart|soru sor|clarify|ask_user/.test(text);
  const wantsExtraRounds = /ek tur|extend_rounds|turu artır|tur yetmez/.test(text);

  if (round === 1 && wantsClarification && !userAnswer) {
    return {
      status: 'awaiting_user',
      round,
      max_rounds: maxRounds,
      remaining_rounds: remainingRounds,
      thought: 'Devre sentezi öncesinde kullanıcıdan hedef geliştirme kartı ve voltaj tercihi netleştiriliyor.',
      tool_calls: [
        {
          name: 'askUser',
          args: {
            reason: 'clarification',
            question: 'Bu devre için hangi geliştirme kartını ve besleme voltajını tercih edersiniz?',
            options: [
              'Arduino Uno R3 (5V)',
              'ESP32 DevKit V1 (3.3V)',
              'NVIDIA Jetson Nano (3.3V)'
            ]
          }
        }
      ]
    };
  }

  if (round === 1 && !userAnswer && !roundExtensionGranted) {
    const toolCalls = [];
    if (wantsJetson) {
      toolCalls.push(
        { name: 'searchCapabilities', args: { query: 'jetson imx219 tof oled', category: 'all' } },
        { name: 'getComponentSchema', args: { componentId: 'board.jetson_nano' } },
        { name: 'getComponentSchema', args: { componentId: 'sensor.vl53l1x_tof' } },
        { name: 'getComponentSchema', args: { componentId: 'led.single' } }
      );
    } else if (wantsSumo) {
      toolCalls.push(
        { name: 'searchCapabilities', args: { query: 'l298n ultrasonic tcrt5000 motor', category: 'all' } },
        { name: 'getComponentSchema', args: { componentId: 'driver.l298n' } },
        { name: 'getComponentSchema', args: { componentId: 'sensor.ultrasonic' } },
        { name: 'getComponentSchema', args: { componentId: 'led.single' } }
      );
    } else if (wantsUltrasonic) {
      toolCalls.push(
        { name: 'searchCapabilities', args: { query: 'ultrasonic distance servo led resistor', category: 'all' } },
        { name: 'getComponentSchema', args: { componentId: 'sensor.ultrasonic' } },
        ...(wantsServo ? [{ name: 'getComponentSchema', args: { componentId: 'motor.servo' } }] : []),
        { name: 'getComponentSchema', args: { componentId: 'led.single' } },
        { name: 'getComponentSchema', args: { componentId: 'passive.resistor' } }
      );
    } else if (wantsServo) {
      toolCalls.push(
        { name: 'searchCapabilities', args: { query: 'servo motor potentiometer led', category: 'all' } },
        { name: 'getComponentSchema', args: { componentId: 'motor.servo' } },
        { name: 'getComponentSchema', args: { componentId: 'led.single' } },
        { name: 'getComponentSchema', args: { componentId: 'passive.resistor' } }
      );
    } else {
      toolCalls.push(
        { name: 'searchCapabilities', args: { query: prompt || 'led resistor sensor', category: 'all' } },
        { name: 'getComponentSchema', args: { componentId: 'led.single' } },
        { name: 'getComponentSchema', args: { componentId: 'passive.resistor' } }
      );
    }

    return {
      status: 'tool_calls',
      round: 1,
      max_rounds: maxRounds,
      remaining_rounds: remainingRounds,
      thought: 'Flownie Search Mode ile gerekli donanım bileşenlerinin pin şemaları ve voltaj kuralları keşfediliyor.',
      tool_calls: toolCalls
    };
  }

  // If the prompt explicitly tests/requests extra rounds or remaining rounds are critically low before synthesis
  if ((wantsExtraRounds || (remainingRounds <= 1 && maxRounds >= 4 && round >= maxRounds - 1)) && !roundExtensionGranted && !userAnswer) {
    return {
      status: 'awaiting_user',
      round,
      max_rounds: maxRounds,
      remaining_rounds: remainingRounds,
      thought: `Kalan tur bütçesi (${remainingRounds}/${maxRounds}) çoklu bileşen kablolaması ve kapalı çevrim doğrulaması için sınırda. Kullanıcıdan ek tur onayı isteniyor.`,
      tool_calls: [
        {
          name: 'askUser',
          args: {
            reason: 'extend_rounds',
            requested_extra_rounds: 5,
            question: `Sahne kurulumu ve elektriksel doğrulama için kalan tur sayısı (${remainingRounds}/${maxRounds}) yetmeyebilir. Bu koşu için +5 ek tur izni veriyor musunuz?`,
            options: [
              '+5 Tur İzni Ver ve Devam Et',
              '+10 Tur İzni Ver',
              'Mevcut Haliyle Tamamla'
            ]
          }
        }
      ]
    };
  }

  // Round 2+: Code Mode (`executeCode`)
  const targetBoard = wantsJetson
    ? 'board.jetson_nano'
    : wantsEsp32
    ? 'board.esp32_devkit'
    : 'board.arduino_uno';
  let code = '';
  let explanation = '';

  if (wantsUltrasonic) {
    explanation = wantsServo
      ? 'HC-SR04 ultrasonik mesafe sensörü (TRIG->D9, ECHO->D10), SG90 Servo bariyer aktüatörü (PWM->D6) ve D13 uyarı LED + 220Ω direnç kapalı çevrim olarak kuruldu.'
      : 'HC-SR04 ultrasonik mesafe sensörü (VCC->5V, GND->GND, TRIG->D9, ECHO->D10) ve D13 uyarı LED + 220Ω akım sınırlama direnci kapalı çevrim olarak kuruldu.';
    code = [
      `circuit.setBoard("${targetBoard}");`,
      'circuit.clearAddedComponents();',
      'const hc = circuit.addComponent("sensor.ultrasonic", { id: "hc_sr04", position: [-28, 0, 18] });',
      'const r1 = circuit.addComponent("passive.resistor", { id: "r_220", resistanceOhms: 220, position: [-14, 0, 24] });',
      'const led1 = circuit.addComponent("led.single", { id: "led_warn", color: "#ef4444", position: [-4, 0, 24] });',
      'circuit.connectWire("host", "5V", hc, "VCC", "#ef4444");',
      'circuit.connectWire("host", "GND", hc, "GND", "#475569");',
      'circuit.connectWire("host", "PIN9", hc, "TRIG", "#38bdf8");',
      'circuit.connectWire("host", "PIN10", hc, "ECHO", "#a855f7");',
      'circuit.connectWire("host", "PIN13", r1, "LEAD_A", "#f59e0b");',
      'circuit.connectWire(r1, "LEAD_B", led1, "ANODE", "#ef4444");',
      'circuit.connectWire(led1, "CATHODE", "host", "GND", "#475569");',
      ...(wantsServo
        ? [
            'const srv = circuit.addComponent("motor.servo", { id: "servo_barrier", position: [-28, 0, 6] });',
            'circuit.connectWire("host", "5V", srv, "VCC", "#ef4444");',
            'circuit.connectWire("host", "GND", srv, "GND", "#475569");',
            'circuit.connectWire("host", "PIN6", srv, "PWM", "#f59e0b");'
          ]
        : []),
      ...(wantsBuzzer
        ? [
            'const buz = circuit.addComponent("audio.piezo_buzzer", { id: "buz_alarm", position: [-28, 0, -6] });',
            'circuit.connectWire("host", "PIN8", buz, "POS", "#eab308");',
            'circuit.connectWire(buz, "NEG", "host", "GND", "#475569");'
          ]
        : []),
      'circuit.setCode(`void setup() {\n  Serial.begin(115200);\n  pinMode(6, OUTPUT);\n  pinMode(9, OUTPUT);\n  pinMode(10, INPUT);\n  pinMode(13, OUTPUT);\n  digitalWrite(6, HIGH);\n  digitalWrite(9, HIGH);\n  digitalWrite(13, HIGH);\n  Serial.println("HC-SR04 Ultrasonik Mesafe + SG90 Bariyer Devresi Hazir");\n}\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(250);\n  digitalWrite(13, LOW);\n  delay(250);\n}`);',
      'return circuit.startSimulation();'
    ].join('\n');
  } else if (wantsServo) {
    explanation =
      'SG90 Servo motor (VCC->5V, GND->GND, PWM->PIN9) ve durum gösterge LED + 220Ω direnç devresi kuruldu.';
    code = [
      `circuit.setBoard("${targetBoard}");`,
      'circuit.clearAddedComponents();',
      'const srv = circuit.addComponent("motor.servo", { id: "servo_1", position: [-28, 0, 18] });',
      'const r1 = circuit.addComponent("passive.resistor", { id: "r_220", resistanceOhms: 220, position: [-14, 0, 24] });',
      'const led1 = circuit.addComponent("led.single", { id: "led_act", color: "#22c55e", position: [-4, 0, 24] });',
      'circuit.connectWire("host", "5V", srv, "VCC", "#ef4444");',
      'circuit.connectWire("host", "GND", srv, "GND", "#475569");',
      'circuit.connectWire("host", "PIN9", srv, "PWM", "#f59e0b");',
      'circuit.connectWire("host", "PIN13", r1, "LEAD_A", "#22c55e");',
      'circuit.connectWire(r1, "LEAD_B", led1, "ANODE", "#22c55e");',
      'circuit.connectWire(led1, "CATHODE", "host", "GND", "#475569");',
      'circuit.setCode(`void setup() {\n  Serial.begin(115200);\n  pinMode(9, OUTPUT);\n  pinMode(13, OUTPUT);\n  digitalWrite(9, HIGH);\n  digitalWrite(13, HIGH);\n  Serial.println("SG90 Servo + Durum LED Devresi Aktif");\n}\nvoid loop() {\n  digitalWrite(9, HIGH);\n  digitalWrite(13, HIGH);\n  delay(400);\n}`);',
      'return circuit.startSimulation();'
    ].join('\n');
  } else if (wantsSumo) {
    explanation =
      'Otonom Sumo Robot devresi: L298N Çift H-Köprü sürücü, HC-SR04 ultrasonik sensör, TCRT5000 çizgi sensörü ve durum LED devresi kuruldu.';
    code = [
      `circuit.setBoard("${targetBoard}");`,
      'circuit.clearAddedComponents();',
      'const drv = circuit.addComponent("driver.l298n", { id: "l298n_1", position: [-28, 0, 6] });',
      'const hc = circuit.addComponent("sensor.ultrasonic", { id: "hc_front", position: [-28, 0, 20] });',
      'const r1 = circuit.addComponent("passive.resistor", { id: "r_220", resistanceOhms: 220, position: [-14, 0, 24] });',
      'const led1 = circuit.addComponent("led.single", { id: "led_sumo", color: "#22c55e", position: [-4, 0, 24] });',
      'circuit.connectWire("host", "5V", hc, "VCC", "#ef4444");',
      'circuit.connectWire("host", "GND", hc, "GND", "#475569");',
      'circuit.connectWire("host", "PIN9", hc, "TRIG", "#38bdf8");',
      'circuit.connectWire("host", "PIN10", hc, "ECHO", "#a855f7");',
      'circuit.connectWire("host", "PIN5", drv, "ENA", "#f59e0b");',
      'circuit.connectWire("host", "GND", drv, "GND", "#475569");',
      'circuit.connectWire("host", "PIN13", r1, "LEAD_A", "#22c55e");',
      'circuit.connectWire(r1, "LEAD_B", led1, "ANODE", "#22c55e");',
      'circuit.connectWire(led1, "CATHODE", "host", "GND", "#475569");',
      'circuit.setCode(`void setup() {\n  Serial.begin(115200);\n  pinMode(5, OUTPUT);\n  pinMode(9, OUTPUT);\n  pinMode(10, INPUT);\n  pinMode(13, OUTPUT);\n  digitalWrite(5, HIGH);\n  digitalWrite(9, HIGH);\n  digitalWrite(13, HIGH);\n  Serial.println("Otonom Sumo Robotu: L298N + HC-SR04 Aktif");\n}\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(300);\n}`);',
      'return circuit.startSimulation();'
    ].join('\n');
  } else {
    explanation =
      `${targetBoard} üzerinde PIN9 dijital çıkış pini, 220Ω akım sınırlama direnci ve LED ile kapalı çevrim devre kuruldu ve simülasyon başlatıldı.`;
    code = [
      `circuit.setBoard("${targetBoard}");`,
      'circuit.clearAddedComponents();',
      'const r1 = circuit.addComponent("passive.resistor", { id: "r_220", resistanceOhms: 220, position: [-16, 0, 24] });',
      'const led1 = circuit.addComponent("led.single", { id: "led_main", color: "#22c55e", position: [-4, 0, 24] });',
      ...(wantsOled
        ? [
            'const oled = circuit.addComponent("display.ssd1306_oled", { id: "oled_1", position: [-28, 0, 14] });',
            'circuit.connectWire("host", "5V", oled, "VCC", "#ef4444");',
            'circuit.connectWire("host", "GND", oled, "GND", "#475569");'
          ]
        : []),
      'circuit.connectWire("host", "PIN9", r1, "LEAD_A", "#f59e0b");',
      'circuit.connectWire(r1, "LEAD_B", led1, "ANODE", "#22c55e");',
      'circuit.connectWire(led1, "CATHODE", "host", "GND", "#475569");',
      'circuit.setCode(`void setup() {\n  Serial.begin(115200);\n  pinMode(9, OUTPUT);\n  digitalWrite(9, HIGH);\n  Serial.println("Kapali Cevrim D9 LED + 220 Ohm Devresi Aktif");\n}\nvoid loop() {\n  digitalWrite(9, HIGH);\n  delay(400);\n  digitalWrite(9, LOW);\n  delay(400);\n}`);',
      'return circuit.startSimulation();'
    ].join('\n');
  }

  return {
    status: 'tool_calls',
    round,
    max_rounds: maxRounds,
    remaining_rounds: remainingRounds,
    thought: 'Keşfedilen pin şemalarına göre CircuitSDK (Code Mode) ile 3B bileşenler yerleştiriliyor, kablolar bağlanıyor ve gömülü kod yükleniyor.',
    tool_calls: [
      {
        name: 'executeCode',
        args: {
          code,
          explanation
        }
      }
    ]
  };
}

/**
 * Multi-Round Flownie Hardware Agent Loop (`runHardwareAgentLoop`).
 *
 * Orchestrates up to `maxRounds` (default 10) rounds:
 *  - Discovery (`searchCapabilities`, `getComponentSchema`, `getFunctionSchema`)
 *  - Clarification or Dynamic Round Budget Extension (`askUser` -> pauses with `status: 'awaiting_user'`)
 *  - Code Mode Synthesis (`executeCode` -> `CircuitSDK`)
 *  - Kirchhoff/Ohm Electrical Continuity Verification (`inspectElectricalState` & `formatRoundObservation`)
 *
 * Enforces `BudgetGuard` (`maxRounds`, user-approved round extensions up to 30, & HTTP 402 `insufficient_credits`).
 */
export async function runHardwareAgentLoop({
  prompt,
  executor,
  apiClient = null,
  onStepUpdate = null,
  maxRounds = DEFAULT_MAX_ROUNDS,
  userApprovedMaxRounds = null,
  roundExtensionGranted = false,
  userAnswer = null,
  startRound = 1,
  existingState = null,
  sessionMemory = null,
  signal = null,
  customTurnRunner = null
} = {}) {
  const cleanPrompt = String(prompt || existingState?.prompt || '').trim();
  if (!cleanPrompt) {
    return {
      ok: false,
      errorCode: 'empty_prompt',
      message: 'Lütfen bir devre veya robot komutu girin.'
    };
  }

  const memory = sessionMemory || existingState?.memory || hardwareSessionMemory;
  const roleMaxRounds = Number(apiClient?.user?.limits?.max_agent_rounds || DEFAULT_MAX_ROUNDS);
  const requestedMaxRounds = Number(userApprovedMaxRounds || maxRounds || DEFAULT_MAX_ROUNDS);
  const effectiveMaxRounds =
    roundExtensionGranted || (userApprovedMaxRounds && userApprovedMaxRounds > roleMaxRounds)
      ? Math.min(30, requestedMaxRounds)
      : roleMaxRounds > 0
      ? Math.min(requestedMaxRounds, roleMaxRounds)
      : requestedMaxRounds;

  const steps = Array.isArray(existingState?.steps) ? [...existingState.steps] : [];
  const toolTrace = Array.isArray(existingState?.toolTrace) ? [...existingState.toolTrace] : [];
  const observations = Array.isArray(existingState?.observations) ? [...existingState.observations] : [];
  let latestObservationText = String(existingState?.latestObservationText || '');
  let codeExecution = existingState?.codeExecution || null;
  let latestCreditBalance = existingState?.latestCreditBalance || null;
  let totalCreditsCharged = Number(existingState?.totalCreditsCharged || 0);
  let activeUserAnswer = userAnswer || existingState?.userAnswer || null;
  let lastCompletedRound = Math.max(1, Number(startRound || 1));
  let lastFinalResponse = null;

  const emitStep = (step) => {
    steps.push(step);
    if (typeof onStepUpdate === 'function') {
      try {
        onStepUpdate(step, [...steps]);
      } catch (_err) {
        // Ignore UI callback errors
      }
    }
  };

  for (let round = Math.max(1, Number(startRound || 1)); round <= effectiveMaxRounds; round += 1) {
    lastCompletedRound = round;
    if (signal?.aborted) {
      emitStep({
        round,
        maxRounds: effectiveMaxRounds,
        remainingRounds: Math.max(0, effectiveMaxRounds - round),
        phase: 'aborted',
        status: 'aborted',
        label: 'Kullanıcı tarafından durduruldu'
      });
      return {
        ok: false,
        status: 'aborted',
        stopReason: 'aborted',
        prompt: cleanPrompt,
        round,
        maxRounds: effectiveMaxRounds,
        remainingRounds: Math.max(0, effectiveMaxRounds - round),
        steps,
        toolTrace,
        observations,
        latestObservationText
      };
    }

    const roundStartedAt = Date.now();
    const remainingRounds = Math.max(0, effectiveMaxRounds - round);
    const beforeSnapshot = snapshotStage(executor);

    emitStep({
      round,
      maxRounds: effectiveMaxRounds,
      remainingRounds,
      phase: round === 1 && !roundExtensionGranted ? 'search_mode' : 'code_mode',
      status: 'running',
      label:
        round === 1 && !roundExtensionGranted
          ? `Tur ${round}/${effectiveMaxRounds} — Search Mode: Donanım & Pin Şeması Keşfi`
          : `Tur ${round}/${effectiveMaxRounds} — Code Mode: 3B Devre, Kablolama & Kod Sentezi`
    });

    let turnResponse = null;

    if (typeof customTurnRunner === 'function') {
      turnResponse = await customTurnRunner({
        prompt: cleanPrompt,
        round,
        maxRounds: effectiveMaxRounds,
        remainingRounds,
        observationText: latestObservationText,
        sessionKnowledge: memory.toObservationSection(),
        userAnswer: activeUserAnswer,
        roundExtensionGranted
      });
    } else if (
      apiClient &&
      typeof apiClient.runAgentTurn === 'function' &&
      (apiClient.isAuthenticated?.() || apiClient.token)
    ) {
      try {
        const canvasSnapshot = inspectCircuitState(executor);
        const rawTurn = await apiClient.runAgentTurn({
          prompt: cleanPrompt,
          round,
          maxRounds: effectiveMaxRounds,
          userApprovedMaxRounds: roundExtensionGranted ? effectiveMaxRounds : userApprovedMaxRounds,
          roundExtensionGranted,
          observationText: latestObservationText,
          sessionKnowledge: memory.toKnowledgeArray(),
          userAnswer: activeUserAnswer,
          boardType:
            executor?.getHostBoard?.()?.typeId ||
            executor?.stage?.hostBoard?.typeId ||
            'board.arduino_uno',
          circuitState: canvasSnapshot,
          toolResults: toolTrace.map((t) => ({ name: t.tool, ok: t.ok, output: t.output })),
          tools: FLOWNIE_HARDWARE_META_TOOLS
        });

        turnResponse =
          rawTurn?.turn && typeof rawTurn.turn === 'object'
            ? { ...rawTurn, ...rawTurn.turn }
            : rawTurn;

        if (turnResponse?.credit_balance) {
          latestCreditBalance = turnResponse.credit_balance;
          apiClient.setCredits?.(turnResponse.credit_balance);
        } else if (typeof turnResponse?.meta?.remaining_credits === 'number') {
          const rem = Number(turnResponse.meta.remaining_credits);
          latestCreditBalance = {
            ...(apiClient.getCredits?.() || {}),
            available_credits: rem,
            total_credits: rem
          };
          apiClient.setCredits?.(latestCreditBalance);
        }
        if (typeof turnResponse?.charged_credits === 'number') {
          totalCreditsCharged += turnResponse.charged_credits;
        } else if (typeof turnResponse?.meta?.credits_charged === 'number') {
          totalCreditsCharged += turnResponse.meta.credits_charged;
        } else if (typeof turnResponse?.credits_charged === 'number') {
          totalCreditsCharged += turnResponse.credits_charged;
        }

        if (
          turnResponse?.offlineFallback ||
          (!Array.isArray(turnResponse?.tool_calls) &&
            !Array.isArray(turnResponse?.toolCalls) &&
            !Array.isArray(turnResponse?.function_calls))
        ) {
          const localTurn = buildLocalFlowniePlanTurn({
            prompt: cleanPrompt,
            round,
            maxRounds: effectiveMaxRounds,
            remainingRounds,
            userAnswer: activeUserAnswer,
            roundExtensionGranted
          });
          turnResponse = {
            ...turnResponse,
            ...localTurn
          };
        }
      } catch (err) {
        const { errorCode, message } = resolveLocalizedAgentError(err);
        const isBudgetGuard = errorCode === 'insufficient_credits' || err?.status === 402;

        emitStep({
          round,
          maxRounds: effectiveMaxRounds,
          remainingRounds,
          phase: isBudgetGuard ? 'budget_guard' : 'error',
          status: isBudgetGuard ? 'blocked' : 'error',
          label: message
        });

        return {
          ok: false,
          status: 'error',
          statusCode: err?.status || 500,
          error: errorCode,
          errorCode,
          message,
          summary: message,
          summaryText: message,
          creditBalance:
            err?.payload?.credit_balance ||
            err?.data?.credit_balance ||
            apiClient.creditBalance ||
            null,
          steps,
          toolTrace
        };
      }
    } else {
      turnResponse = buildLocalFlowniePlanTurn({
        prompt: cleanPrompt,
        round,
        maxRounds: effectiveMaxRounds,
        remainingRounds,
        userAnswer: activeUserAnswer,
        roundExtensionGranted
      });
    }

    // Keep activeUserAnswer across subsequent stateless HTTP turns so the LLM never loses the user's clarification answer
    if (turnResponse?.final_response && typeof turnResponse.final_response === 'object') {
      lastFinalResponse = turnResponse.final_response;
    }

    const rawToolCalls =
      turnResponse?.tool_calls || turnResponse?.toolCalls || turnResponse?.function_calls || [];
    const { allowed: toolCalls, readOnly, mutating, rejected: rejectedCalls } = partitionCalls(rawToolCalls, {
      mode: 'edit',
      permissions: apiClient?.user?.permissions || []
    });

    if (toolCalls.length === 0 || turnResponse?.status === 'completed') {
      break;
    }

    // Check if the LLM emitted an `askUser` tool call (for clarification or round budget extension)
    const askUserCall = toolCalls.find((tc) => tc.name === 'askUser');
    if (askUserCall) {
      const askReasonCheck = String(
        askUserCall.args?.reason || askUserCall.arguments?.reason || 'clarification'
      );
      const incomingQuestion = String(
        askUserCall.args?.question || askUserCall.arguments?.question || ''
      )
        .trim()
        .toLowerCase();

      // Check if this exact clarification question was already answered in this session's toolTrace
      const matchingAnsweredAsk = toolTrace.find((entry) => {
        if (entry?.tool !== 'askUser') return false;
        const prevAnswer = entry?.output?.user_answer;
        if (!prevAnswer) return false;
        const prevQ = String(entry?.args?.question || entry?.output?.question || '')
          .trim()
          .toLowerCase();
        return Boolean(incomingQuestion && prevQ && prevQ === incomingQuestion);
      });

      // Only auto-resolve if the LLM repeats the exact same already-answered question
      // (or emits an empty question while activeUserAnswer exists).
      // If the LLM asks a genuinely different follow-up question, let it proceed and surface to the user!
      if (
        askReasonCheck === 'clarification' &&
        (matchingAnsweredAsk || (!incomingQuestion && activeUserAnswer))
      ) {
        const resolvedAnswer = matchingAnsweredAsk?.output?.user_answer || activeUserAnswer;
        const nonAskCalls = toolCalls.filter((tc) => tc.name !== 'askUser');
        if (nonAskCalls.length === 0) {
          toolTrace.push({
            round,
            tool: 'askUser',
            args: askUserCall.args || askUserCall.arguments || {},
            ok: true,
            durationMs: 0,
            output: {
              answered: true,
              user_answer: resolvedAnswer,
              note: 'User already answered this exact clarification question; proceed immediately to executeCode.'
            }
          });
          continue;
        }
        toolCalls.splice(toolCalls.indexOf(askUserCall), 1);
      }
    }

    const activeAskUserCall = toolCalls.find((tc) => tc.name === 'askUser');
    if (activeAskUserCall) {
      const askResult = await dispatchHardwareToolCall(activeAskUserCall, executor, memory);
      const askOutput = askResult.output || {};
      const askReason = String(askOutput.reason || activeAskUserCall.args?.reason || 'clarification');
      const requestedExtraRounds = Number(
        askOutput.requested_extra_rounds || activeAskUserCall.args?.requested_extra_rounds || (askReason === 'extend_rounds' ? 5 : 0)
      );

      toolTrace.push({
        round,
        tool: 'askUser',
        args: activeAskUserCall.args || activeAskUserCall.arguments || {},
        ok: true,
        durationMs: askResult.durationMs || 0,
        output: askOutput
      });

      const pendingState = {
        prompt: cleanPrompt,
        round,
        maxRounds: effectiveMaxRounds,
        remainingRounds,
        reason: askReason,
        requestedExtraRounds,
        question: askOutput.question,
        options: askOutput.options,
        executor,
        apiClient,
        onStepUpdate,
        memory,
        steps,
        toolTrace,
        observations,
        latestObservationText,
        codeExecution,
        latestCreditBalance,
        totalCreditsCharged,
        customTurnRunner
      };

      emitStep({
        round,
        maxRounds: effectiveMaxRounds,
        remainingRounds,
        phase: 'awaiting_user',
        status: 'awaiting_user',
        durationMs: Date.now() - roundStartedAt,
        reason: askReason,
        requestedExtraRounds,
        question: askOutput.question,
        options: askOutput.options,
        label:
          askReason === 'extend_rounds'
            ? `Tur ${round}/${effectiveMaxRounds} — Ek Tur Onayı Bekleniyor (+${requestedExtraRounds} Tur)`
            : `Tur ${round}/${effectiveMaxRounds} — Kullanıcı Yanıtı Bekleniyor`
      });

      return {
        ok: true,
        status: 'awaiting_user',
        stopReason: 'awaiting_user',
        prompt: cleanPrompt,
        round,
        maxRounds: effectiveMaxRounds,
        remainingRounds,
        question: askOutput.question,
        options: askOutput.options,
        reason: askReason,
        requestedExtraRounds,
        pending: pendingState,
        steps,
        toolTrace,
        observations,
        latestObservationText,
        creditBalance: latestCreditBalance,
        creditsCharged: Math.round(totalCreditsCharged * 100) / 100
      };
    }

    const roundToolOutcomes = [];

    // 1. Run read-only tools in parallel
    if (readOnly.length > 0) {
      const roResults = await Promise.all(
        readOnly.map(async (tc) => {
          const result = await dispatchHardwareToolCall(tc, executor, memory);
          return { tc, result };
        })
      );
      for (const { tc, result } of roResults) {
        toolTrace.push({
          round,
          tool: tc.name,
          args: tc.args || tc.arguments,
          ok: result.ok,
          durationMs: result.durationMs || 0,
          cachedFromSessionMemory: Boolean(result.cachedFromSessionMemory),
          output: result.output
        });
        roundToolOutcomes.push({
          name: tc.name,
          cached: Boolean(result.cachedFromSessionMemory),
          result: result.output
        });
      }
    }

    // 2. Run mutating tools sequentially
    for (const tc of mutating) {
      const result = await dispatchHardwareToolCall(tc, executor, memory);
      toolTrace.push({
        round,
        tool: tc.name,
        args: tc.args || tc.arguments,
        ok: result.ok,
        durationMs: result.durationMs || 0,
        cachedFromSessionMemory: Boolean(result.cachedFromSessionMemory),
        output: result.output
      });
      roundToolOutcomes.push({
        name: tc.name,
        cached: Boolean(result.cachedFromSessionMemory),
        result: result.output
      });

      if (tc.name === 'executeCode') {
        codeExecution = result.output;
      }
    }

    const afterSnapshot = snapshotStage(executor);
    latestObservationText = formatRoundObservation({
      round,
      maxRounds: effectiveMaxRounds,
      remainingRounds,
      beforeSnapshot,
      afterSnapshot,
      executor,
      toolResults: roundToolOutcomes,
      rejectedCalls: [
        ...(Array.isArray(turnResponse?.rejected_calls) ? turnResponse.rejected_calls : []),
        ...rejectedCalls
      ],
      sessionMemory: memory,
      roundExtensionGranted
    });

    observations.push({
      round,
      maxRounds: effectiveMaxRounds,
      remainingRounds,
      observationText: latestObservationText,
      ...buildCircuitObservation(executor)
    });

    // If `executeCode` ran cleanly in this round, verify electrical continuity and finish
    if (codeExecution && codeExecution.ok !== false) {
      break;
    }

    // If we hit `effectiveMaxRounds` without finishing `executeCode`, attach a `pending` state so the user can grant extra rounds
    if (round === effectiveMaxRounds && !codeExecution) {
      const maxRoundsPending = {
        prompt: cleanPrompt,
        round,
        maxRounds: effectiveMaxRounds,
        remainingRounds: 0,
        reason: 'extend_rounds',
        requestedExtraRounds: 5,
        question: `Maksimum tur sınırına (${effectiveMaxRounds} tur) ulaşıldı. Sahne kurulumunu tamamlamak için +5 ek tur izni vermek ister misiniz?`,
        options: [
          '+5 Tur İzni Ver ve Devam Et',
          '+10 Tur İzni Ver',
          'Mevcut Haliyle Tamamla'
        ],
        executor,
        apiClient,
        onStepUpdate,
        memory,
        steps,
        toolTrace,
        observations,
        latestObservationText,
        codeExecution,
        latestCreditBalance,
        totalCreditsCharged,
        customTurnRunner
      };

      emitStep({
        round,
        maxRounds: effectiveMaxRounds,
        remainingRounds: 0,
        phase: 'max_rounds',
        status: 'awaiting_user',
        durationMs: Date.now() - roundStartedAt,
        reason: 'extend_rounds',
        requestedExtraRounds: 5,
        question: maxRoundsPending.question,
        options: maxRoundsPending.options,
        label: `Tur ${round}/${effectiveMaxRounds} — Tur Sınırına Ulaşıldı (Ek Tur İzni Bekleniyor)`
      });

      return {
        ok: true,
        status: 'max_rounds',
        stopReason: 'max_rounds',
        prompt: cleanPrompt,
        round,
        maxRounds: effectiveMaxRounds,
        remainingRounds: 0,
        question: maxRoundsPending.question,
        options: maxRoundsPending.options,
        reason: 'extend_rounds',
        requestedExtraRounds: 5,
        pending: maxRoundsPending,
        steps,
        toolTrace,
        observations,
        latestObservationText,
        creditBalance: latestCreditBalance,
        creditsCharged: Math.round(totalCreditsCharged * 100) / 100
      };
    }
  }

  // Final Electrical Verification Step
  const finalFlow = executor?.solveFlow?.() || {};
  const loops = Array.isArray(finalFlow.loops) ? finalFlow.loops : [];
  const faults = Array.isArray(finalFlow.faults) ? finalFlow.faults : [];
  const totalCurrentMa =
    Math.round(
      loops.reduce((sum, l) => sum + (Number(l.currentAmps ?? l.currentA) || 0), 0) * 1000 * 10
    ) / 10;

  const electricalState = {
    closedLoopCount: Number(finalFlow.closedLoopCount ?? loops.length ?? 0),
    totalCurrentMa: Number(
      finalFlow.totalCurrentMa !== undefined ? finalFlow.totalCurrentMa : totalCurrentMa
    ),
    hasShortCircuit: Boolean(
      finalFlow.hasShortCircuit ||
        faults.some((f) => f.type === 'SHORT_CIRCUIT' || f.code === 'elec.fault.short_circuit')
    ),
    faultCount: faults.length,
    componentCount: (
      executor?.getStageComponents?.() ||
      executor?.stage?.getIndependentComponents?.() ||
      []
    ).length,
    connectionCount: (
      executor?.getConnections?.() ||
      executor?.stage?.wireTool?.getConnections?.() ||
      []
    ).length
  };

  const isExecutionFailed = Boolean(
    codeExecution && codeExecution.success === false && electricalState.componentCount === 0
  );

  emitStep({
    round: lastCompletedRound,
    maxRounds: effectiveMaxRounds,
    phase: 'verification',
    status: isExecutionFailed ? 'error' : 'completed',
    label: isExecutionFailed
      ? `Code Mode Hatası: ${codeExecution.error || 'Betik çalıştırılamadı'}`
      : `Doğrulandı: ${electricalState.componentCount} bileşen, ${electricalState.connectionCount} kablo, ${electricalState.closedLoopCount} kapalı çevrim (${electricalState.totalCurrentMa} mA)`
  });

  const finalSummaryFromLlm = String(
    lastFinalResponse?.summary || lastFinalResponse?.headline || ''
  ).trim();

  const summaryText = isExecutionFailed
    ? `Code Mode çalıştırma hatası: ${codeExecution.error || 'Bilinmeyen hata'}.${
        codeExecution.recoveryHint ? ` Çözüm önerisi: ${codeExecution.recoveryHint}` : ''
      }${finalSummaryFromLlm ? `\n\n${finalSummaryFromLlm}` : ''}`
    : finalSummaryFromLlm
    ? `${finalSummaryFromLlm} (${electricalState.componentCount} bileşen, ${electricalState.connectionCount} kablo, ${electricalState.closedLoopCount} kapalı çevrim)`
    : codeExecution?.explanation ||
      `Flownie AI devre sentezini tamamladı (${electricalState.componentCount} bileşen, ${electricalState.connectionCount} kablo).`;

  memory.recordTurn({
    prompt: cleanPrompt,
    summary: summaryText,
    componentsAdded: electricalState.componentCount,
    closedLoopCount: electricalState.closedLoopCount
  });

  return {
    ok: !isExecutionFailed && Boolean(codeExecution ? codeExecution.success : true),
    status: isExecutionFailed ? 'error' : 'completed',
    stopReason: isExecutionFailed ? 'code_execution_failed' : 'completed',
    prompt: cleanPrompt,
    round: lastCompletedRound,
    maxRounds: effectiveMaxRounds,
    steps,
    toolTrace,
    observations,
    latestObservationText,
    codeExecution,
    electricalState,
    summaryText,
    creditBalance: latestCreditBalance,
    creditsCharged: Math.round(totalCreditsCharged * 100) / 100
  };
}

/**
 * Resumes a paused `runHardwareAgentLoop` (`status === 'awaiting_user'` or `status === 'max_rounds'`)
 * after the user answers a clarification question or grants extra rounds (`+5 Tur`, `+10 Tur`).
 *
 * When extra rounds are approved:
 * - Increases `pending.maxRounds` for the active run (`10 -> 15` or `+extraRounds`, up to 30)
 * - Snapshots the latest 3D stage state and injects a round-extension notice into `latestObservationText`
 * - Continues the loop from the next round and sends `user_approved_max_rounds` & `round_extension_granted: true` to the backend
 *
 * @param {object} pending
 * @param {string|object} [userDecision]
 */
export async function resumeHardwareAgentLoop(pending, userDecision = {}) {
  if (!pending || typeof pending !== 'object') {
    return {
      ok: false,
      errorCode: 'invalid_pending_state',
      message: 'Devam ettirilecek aktif bir ajan oturumu bulunamadı.'
    };
  }

  const answerText =
    typeof userDecision === 'string'
      ? userDecision.trim()
      : String(userDecision?.answer || userDecision?.option || '').trim();

  const declined =
    userDecision?.approved === false ||
    /mevcut haliyle tamamla|hayır|iptal|durdur/i.test(answerText);

  if (declined && pending.reason === 'extend_rounds') {
    const snap = snapshotStage(pending.executor);
    return {
      ok: true,
      status: 'completed',
      stopReason: 'user_completed_early',
      prompt: pending.prompt,
      maxRounds: pending.maxRounds,
      steps: pending.steps || [],
      toolTrace: pending.toolTrace || [],
      observations: pending.observations || [],
      electricalState: {
        closedLoopCount: snap.closedLoopCount,
        totalCurrentMa: snap.totalCurrentMa,
        faultCount: snap.faultCount,
        componentCount: snap.componentCount,
        connectionCount: snap.wireCount
      },
      summaryText: `Kullanıcı ek tur yerine mevcut sahne durumuyla tamamlamayı seçti (${snap.componentCount} bileşen, ${snap.wireCount} kablo).`
    };
  }

  let extraRounds = 0;
  if (typeof userDecision === 'object' && Number(userDecision?.extendRounds || userDecision?.extraRounds) > 0) {
    extraRounds = Number(userDecision.extendRounds || userDecision.extraRounds);
  } else {
    const matchPlus = answerText.match(/\+\s*(\d+)\s*tur/i);
    if (matchPlus) {
      extraRounds = Number(matchPlus[1]);
    } else if (pending.reason === 'extend_rounds' && userDecision?.approved !== false) {
      extraRounds = Number(pending.requestedExtraRounds || 5);
    }
  }

  const currentMaxRounds = Number(pending.maxRounds || DEFAULT_MAX_ROUNDS);
  const nextMaxRounds =
    extraRounds > 0 ? Math.min(30, currentMaxRounds + extraRounds) : currentMaxRounds;
  const roundExtensionGranted = extraRounds > 0;
  const nextRound = Number(pending.round || 1) + 1;

  // Build updated stage observation with the newly granted round budget
  const currentStageSnapshot = snapshotStage(pending.executor);
  const updatedObservationText = formatRoundObservation({
    round: pending.round || 1,
    maxRounds: nextMaxRounds,
    remainingRounds: Math.max(0, nextMaxRounds - nextRound + 1),
    beforeSnapshot: currentStageSnapshot,
    afterSnapshot: currentStageSnapshot,
    executor: pending.executor,
    sessionMemory: pending.memory || hardwareSessionMemory,
    roundExtensionGranted
  });

  const resolvedUserAnswer =
    answerText || (roundExtensionGranted ? `+${extraRounds} Tur İzni Verildi` : 'Onaylandı');

  const updatedToolTrace = Array.isArray(pending.toolTrace)
    ? pending.toolTrace.map((entry, idx, arr) => {
        if (entry?.tool === 'askUser' && idx === arr.length - 1) {
          return {
            ...entry,
            output: {
              ...(entry.output || {}),
              answered: true,
              user_answer: resolvedUserAnswer
            }
          };
        }
        return entry;
      })
    : [];

  return runHardwareAgentLoop({
    prompt: pending.prompt,
    executor: pending.executor,
    apiClient: pending.apiClient,
    onStepUpdate: pending.onStepUpdate,
    maxRounds: nextMaxRounds,
    userApprovedMaxRounds: nextMaxRounds,
    roundExtensionGranted,
    userAnswer: resolvedUserAnswer,
    startRound: nextRound,
    existingState: {
      ...pending,
      toolTrace: updatedToolTrace,
      userAnswer: resolvedUserAnswer,
      maxRounds: nextMaxRounds,
      latestObservationText: updatedObservationText
    },
    sessionMemory: pending.memory || hardwareSessionMemory,
    customTurnRunner: pending.customTurnRunner || null
  });
}
