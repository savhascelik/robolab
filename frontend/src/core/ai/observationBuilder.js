import { inspectCircuitState } from './capabilityIndex.js';

/**
 * Maximum observation payload size in bytes (`48 KB`), matching `flownie-frontend`'s
 * byte-budgeted `observationBuilder.ts` so multi-round agent context never overflows.
 */
export const MAX_OBSERVATION_BYTES = 48_000;

/**
 * Captures a lightweight numerical & structural snapshot of the 3D workbench stage
 * before or after an agent round executes tools.
 *
 * @param {object} executor
 */
export function snapshotStage(executor) {
  const state = inspectCircuitState(executor);
  const codeText = String(executor?.runtime?.sourceCode || '');
  const codeLineCount = codeText.trim() ? codeText.trim().split('\n').length : 0;

  return {
    boardId: state.hostBoard?.typeId || 'board.arduino_uno',
    componentCount: Number(state.componentCount || 0),
    wireCount: Number(state.wireCount || 0),
    closedLoopCount: Number(state.electrical?.closedLoopCount || 0),
    totalCurrentMa: Number(state.electrical?.totalCurrentMa || 0),
    faultCount: Number(state.electrical?.faultCount || 0),
    unconnectedPowerPins: Array.isArray(state.unconnectedPowerPins)
      ? state.unconnectedPowerPins
      : [],
    faults: Array.isArray(state.electrical?.faults) ? state.electrical.faults : [],
    codeLineCount
  };
}

/**
 * Clamps a UTF-8 string to a maximum byte budget.
 * @param {string} text
 * @param {number} maxBytes
 */
export function clampToByteBudget(text, maxBytes = MAX_OBSERVATION_BYTES) {
  const str = String(text || '');
  const encoder = new TextEncoder();
  const encoded = encoder.encode(str);
  if (encoded.byteLength <= maxBytes) {
    return str;
  }
  const suffix = '\n... [observation truncated to 48KB budget]';
  const suffixBytes = encoder.encode(suffix).byteLength;
  const sliceBytes = Math.max(0, maxBytes - suffixBytes);
  const decoder = new TextDecoder('utf-8', { fatal: false });
  return decoder.decode(encoded.subarray(0, sliceBytes)) + suffix;
}

/**
 * Builds a structured, byte-budgeted technical observation string for the next LLM round,
 * combining tool outcomes, 3D stage delta, electrical continuity warnings, SessionMemory
 * (`## SESSION KNOWLEDGE`), and round budget awareness.
 *
 * Also supports direct `buildCircuitObservation(executor)` calls (returning a summary object
 * with `hostBoard`, `componentCount`, `connectionCount`, and `.text`) for backward compatibility.
 *
 * @param {object} paramsOrExecutor
 */
export function buildCircuitObservation(paramsOrExecutor = {}) {
  const isDirectExecutor =
    paramsOrExecutor &&
    (typeof paramsOrExecutor.executeCommands === 'function' ||
      typeof paramsOrExecutor.getStageComponents === 'function' ||
      typeof paramsOrExecutor.solveFlow === 'function');

  if (isDirectExecutor) {
    const executor = paramsOrExecutor;
    const state = inspectCircuitState(executor);
    const code = executor?.runtime?.sourceCode || '';
    const snap = snapshotStage(executor);
    const text = formatRoundObservation({
      round: 1,
      maxRounds: 10,
      beforeSnapshot: snap,
      afterSnapshot: snap,
      executor
    });
    return {
      ok: true,
      hostBoard:
        typeof state.hostBoard === 'string'
          ? state.hostBoard
          : state.hostBoard?.typeId || 'board.arduino_uno',
      componentCount: state.componentCount,
      connectionCount: state.connectionCount ?? state.wireCount ?? 0,
      closedLoopCount: state.closedLoopCount ?? state.electrical?.closedLoopCount ?? 0,
      totalCurrentMa: state.totalCurrentMa ?? state.electrical?.totalCurrentMa ?? 0,
      faultCount: state.faultCount ?? state.electrical?.faultCount ?? 0,
      unconnectedPowerPins: state.unconnectedPowerPins || [],
      hasFirmware: Boolean(code && code.trim().length > 0),
      simulationRunning: Boolean(executor?.runtime?.isRunning),
      text
    };
  }

  return formatRoundObservation(paramsOrExecutor);
}

/**
 * Formats a multi-section, byte-clamped (`48 KB`) round observation string.
 * @param {object} params
 */
export function formatRoundObservation({
  round = 1,
  maxRounds = 10,
  remainingRounds = Math.max(0, maxRounds - round),
  beforeSnapshot = null,
  afterSnapshot = null,
  previousSnap = null,
  currentSnap = null,
  executor = null,
  toolResults = [],
  results = [],
  rejectedCalls = [],
  sessionMemory = null,
  roundExtensionGranted = false
} = {}) {
  const pre = beforeSnapshot || previousSnap || (executor ? snapshotStage(executor) : null);
  const post = afterSnapshot || currentSnap || (executor ? snapshotStage(executor) : pre);
  const normalizedResults = Array.isArray(toolResults) && toolResults.length > 0 ? toolResults : results;

  const sections = [];

  // 1. Round Budget Header & Extension Notice
  const budgetLines = [
    `[ROUND BUDGET: round ${round} of ${maxRounds} (${remainingRounds} remaining)]`
  ];
  if (roundExtensionGranted) {
    budgetLines.push(
      `✓ User granted extra rounds! Total budget for this run is now ${maxRounds} rounds (${remainingRounds} remaining). Continue from the current 3D stage state.`
    );
  } else if (remainingRounds <= 2) {
    budgetLines.push(
      `⚠️ Remaining rounds: ${remainingRounds}/${maxRounds}. If you need more rounds to complete 3D component placement, wiring, or firmware verification, call askUser with reason="extend_rounds" and requested_extra_rounds=5.`
    );
  }
  sections.push(budgetLines.join('\n'));

  // 2. Rejected Calls (`FunctionFilter` capability gate)
  if (Array.isArray(rejectedCalls) && rejectedCalls.length > 0) {
    const rejectedLines = ['## REJECTED TOOL CALLS'];
    for (const rej of rejectedCalls) {
      const target = rej.target_name || rej.name || 'unknown';
      rejectedLines.push(`⛔ Tool not permitted (${target}): ${rej.reason || 'blocked by policy'}`);
    }
    sections.push(rejectedLines.join('\n'));
  }

  // 3. Tool Execution Outcomes
  if (Array.isArray(normalizedResults) && normalizedResults.length > 0) {
    const outcomeLines = ['## TOOL OUTCOMES'];
    for (const tr of normalizedResults) {
      const name = tr.name || tr.call?.name || 'tool';
      const cachedTag = tr.cached ? ' [⚡ cached]' : '';
      const res = tr.result || {};

      if (res.ok === false || res.found === false || res.connected === false || res.error) {
        const errMsg = res.error || res.message || 'Execution failed';
        const hint = res.recoveryHint ? ` | Hint: ${res.recoveryHint}` : '';
        outcomeLines.push(`✗ ${name}${cachedTag}: ${errMsg}${hint}`);
      } else if (name === 'getComponentSchema') {
        const pins = Array.isArray(res.pinNames) ? res.pinNames.join(', ') : '';
        outcomeLines.push(`✓ ${name}${cachedTag}: ${res.typeId || ''} pins=[${pins}]`);
      } else if (name === 'searchCapabilities') {
        const comps = Array.isArray(res.components)
          ? res.components.map((c) => c.typeId).join(', ')
          : '';
        outcomeLines.push(`✓ ${name}${cachedTag}: matched=[${comps}]`);
      } else if (name === 'executeCode') {
        const stepsCount = Array.isArray(res.executedCommands) ? res.executedCommands.length : 0;
        const loops = Number(res.electricalState?.closedLoopCount ?? 0);
        const currentMa = Number(res.electricalState?.totalCurrentMa ?? 0).toFixed(1);
        outcomeLines.push(
          `✓ ${name}: ${stepsCount} SDK commands executed (${loops} closed loops, ${currentMa} mA)`
        );
      } else {
        outcomeLines.push(`✓ ${name}${cachedTag}: completed`);
      }
    }
    sections.push(outcomeLines.join('\n'));
  }

  // 4. 3D Stage Delta (`📊 Stage Delta`)
  if (pre && post) {
    const preComp = Number(pre.componentCount ?? 0);
    const postComp = Number(post.componentCount ?? 0);
    const preWire = Number(pre.wireCount ?? pre.connectionCount ?? 0);
    const postWire = Number(post.wireCount ?? post.connectionCount ?? 0);
    const dComp = postComp - preComp;
    const dWire = postWire - preWire;
    const closedLoops = Number(post.closedLoopCount ?? 0);
    const currentMa = Number(post.totalCurrentMa ?? 0).toFixed(1);
    const codeLines = Number(post.codeLineCount ?? 0);
    const boardId = post.boardId || post.hostBoard || 'board.arduino_uno';
    const fmtDelta = (n) => (n >= 0 ? `+${n}` : `${n}`);
    sections.push(
      [
        '## STAGE DELTA',
        `📊 Stage Delta: ${fmtDelta(dComp)} bileşen (toplam: ${postComp}), ${fmtDelta(dWire)} kablo (toplam: ${postWire}), ${closedLoops} kapalı çevrim, ${currentMa} mA, ${codeLines} satır firmware (${boardId})`
      ].join('\n')
    );
  }

  // 5. Electrical Warnings & Unconnected Power Pins
  if (post) {
    const warningLines = [];
    if (Array.isArray(post.unconnectedPowerPins) && post.unconnectedPowerPins.length > 0) {
      warningLines.push(
        `⚡ Açıkta Kalan Besleme Pinleri (VCC/GND): ${post.unconnectedPowerPins.join(', ')}`
      );
    }
    if (Array.isArray(post.faults) && post.faults.length > 0) {
      for (const fault of post.faults) {
        warningLines.push(
          `🚨 Elektriksel Hata (${fault.code || fault.severity || 'fault'}): ${fault.message || JSON.stringify(fault)}`
        );
      }
    }
    if (warningLines.length > 0) {
      sections.push(['## ELECTRICAL WARNINGS', ...warningLines].join('\n'));
    }
  }

  // 6. Session Knowledge (`## SESSION KNOWLEDGE`)
  if (sessionMemory && typeof sessionMemory.toObservationSection === 'function') {
    const knowledgeSection = sessionMemory.toObservationSection();
    if (knowledgeSection) {
      sections.push(knowledgeSection);
    }
  } else if (sessionMemory && typeof sessionMemory.entries === 'function') {
    const entries = sessionMemory.entries();
    if (entries.length > 0) {
      const kLines = ['## SESSION KNOWLEDGE (already retrieved — do NOT ask again)'];
      for (const [key, val] of entries) {
        if (key.startsWith('@component:') && val?.typeId) {
          const pins = Array.isArray(val.pinNames) ? val.pinNames.join(', ') : '';
          kLines.push(`- ${key} -> name="${val.name || val.typeId}", pins=[${pins}]`);
        } else if (key.startsWith('@fn:') && val?.functionName) {
          kLines.push(`- ${key} -> ${val.summary || val.functionName}`);
        } else if (key.startsWith('@search:')) {
          const ids = Array.isArray(val?.components)
            ? val.components.map((c) => c.typeId).join(', ')
            : '';
          kLines.push(`- ${key} -> components=[${ids}]`);
        }
      }
      sections.push(kLines.join('\n'));
    }
  }

  const combined = sections.filter(Boolean).join('\n\n');
  return clampToByteBudget(combined, MAX_OBSERVATION_BYTES);
}
