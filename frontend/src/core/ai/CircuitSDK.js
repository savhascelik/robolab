import { hardwareRegistry } from '../registry/ComponentRegistry.js';
import { DynamicComponentBuilder } from '../components/DynamicComponentBuilder.js';
import { getComponentSchema, searchCapabilities } from './capabilityIndex.js';

/**
 * Flownie Hardware `CircuitSDK` (`CircuitSDK.js`).
 *
 * Adapted from Flownie's `WorkflowSDK` (`C:\laragon\www\flownie\flownie-frontend\src\services\gemini\WorkflowSDK.js`)
 * for programmatic 3D hardware circuit synthesis inside `CodeModeExecutor`.
 *
 * All methods return synchronous objects (which also work seamlessly with `await`),
 * so both `await sdk.addComponent(...)` and `circuit.addComponent(...)` work identically!
 */
export class CircuitSDK {
  /**
   * @param {object} [optionsOrExecutor]
   */
  constructor(optionsOrExecutor = {}) {
    const isDirectExecutor =
      optionsOrExecutor &&
      typeof optionsOrExecutor.executeCommands === 'function';

    const options = isDirectExecutor
      ? { executor: optionsOrExecutor }
      : optionsOrExecutor || {};

    this.executor = options.executor || null;
    this.stage = options.stage || this.executor?.stage || null;
    this.registry = options.registry || this.executor?.registry || hardwareRegistry;
    this.runtime = options.runtime || this.executor?.runtime || null;
    this.onCodeChange = options.onCodeChange || this.executor?.onCodeUpdated || null;

    this.executionLog = [];
    this.executedCommands = this.executionLog;
    this.logs = [];
    this.warnings = [];
    this.diagnostics = [];
    this._spawnCounter = 0;
  }

  _suggestClosestTypeIds(queryTypeId = '') {
    const clean = String(queryTypeId || '').trim().toLowerCase();
    const searchRes = searchCapabilities({ query: clean || 'sensor led', category: 'all' }, this.registry);
    const fromSearch = Array.isArray(searchRes?.components)
      ? searchRes.components.map((c) => c.typeId).filter(Boolean)
      : [];
    if (fromSearch.length > 0) {
      return fromSearch.slice(0, 5);
    }
    return [
      'sensor.ultrasonic',
      'motor.servo',
      'passive.resistor',
      'led.single',
      'display.ssd1306_oled'
    ];
  }

  _log(actionOrMessage, detail = null) {
    if (detail === null && typeof actionOrMessage === 'string') {
      this.logs.push(actionOrMessage);
      return;
    }
    const entry = {
      step: this.executionLog.length + 1,
      action: actionOrMessage,
      detail,
      timestamp: Date.now()
    };
    this.executionLog.push(entry);
    this.logs.push(`[${actionOrMessage}] ${JSON.stringify(detail)}`);
  }

  _getHostBoard() {
    if (this.executor?.getHostBoard) {
      return this.executor.getHostBoard();
    }
    return this.stage?.hostBoard || null;
  }

  _getStageComponents() {
    if (this.executor?.getStageComponents) {
      return this.executor.getStageComponents();
    }
    return this.stage?.getIndependentComponents?.() || [];
  }

  _getConnections() {
    if (this.executor?.getConnections) {
      return this.executor.getConnections();
    }
    return this.stage?.wireTool?.getConnections?.() || [];
  }

  _extractPins(comp) {
    if (!comp) return [];
    if (typeof comp.getAllPins === 'function') {
      return comp.getAllPins().map((p) => p.name);
    }
    if (comp.electricalPins instanceof Map) {
      return [...comp.electricalPins.keys()];
    }
    return [];
  }

  _normalizeTypeId(typeId) {
    const clean = String(typeId || '').trim();
    if (this.registry?.has?.(clean)) return clean;
    if (
      (clean === 'motor.servo' || clean === 'actuator.servo_sg90') &&
      this.registry?.has?.('actuator.servo')
    ) {
      return 'actuator.servo';
    }
    if (
      (clean === 'actuator.servo' || clean === 'actuator.servo_sg90' || clean === 'motor.servo_sg90') &&
      this.registry?.has?.('motor.servo')
    ) {
      return 'motor.servo';
    }
    if (clean === 'display.oled_ssd1306' && this.registry?.has?.('display.ssd1306_oled')) {
      return 'display.ssd1306_oled';
    }
    if (clean === 'audio.piezo_buzzer' && this.registry?.has?.('audio.buzzer')) {
      return 'audio.buzzer';
    }
    return clean;
  }

  /**
   * Sets or switches the primary 3D microcontroller/SBC host board.
   * @param {string} typeId
   */
  setBoard(typeId = 'board.arduino_uno') {
    const cleanType = this._normalizeTypeId(typeId || 'board.arduino_uno');
    if (this.executor) {
      this.executor.executeCommands(
        [{ action: 'setHostBoard', typeId: cleanType }],
        { recordUndo: false }
      );
    } else if (this.stage?.ensureHostBoard) {
      this.stage.ensureHostBoard(cleanType);
    }

    const host = this._getHostBoard();
    const result = {
      id: host?.id || 'main.host_board',
      typeId: host?.typeId || cleanType,
      pins: this._extractPins(host)
    };
    this._log('setBoard', result);
    return result;
  }

  /**
   * Clears all non-host peripheral components and wires from the 3D stage.
   */
  clearAddedComponents() {
    const comps = [...this._getStageComponents()];
    let clearedCount = 0;

    if (this.stage) {
      for (const comp of comps) {
        this.stage.removeComponent?.(comp.id);
        clearedCount += 1;
      }
      if (typeof this.stage.wireTool?.removeWire === 'function') {
        const wireIds = (this.stage.wireTool.getConnections?.() || []).map((w) => w.id);
        for (const wId of wireIds) {
          this.stage.wireTool.removeWire(wId);
        }
      }
      this.stage.wireTool?.setConnections?.([]);
    } else if (this.executor) {
      for (const comp of this.executor._headlessComponents.values()) {
        this.registry.removeInstance(comp.id, true);
        clearedCount += 1;
      }
      this.executor._headlessComponents.clear();
      this.executor._headlessConnections = [];
    }

    const res = { clearedCount };
    this._log('clearAddedComponents', res);
    return res;
  }

  /**
   * Registers a custom 3D hardware component or 0-Pin stage prop into `ComponentRegistry`
   * using `DynamicComponentBuilder` v2 (`parts[]`, `attach`, `materialPreset`, `partRole`, `pins`, `pinGenerator`, `evaluateScript`).
   * @param {object} spec
   */
  registerCustomComponent(spec = {}) {
    const registered = DynamicComponentBuilder.registerFromSpec(spec, this.registry);
    const summary = {
      typeId: registered.typeId,
      name: registered.spec.name,
      category: registered.spec.category,
      isEnvironmentProp: Boolean(registered.spec.isEnvironmentProp),
      pins: (registered.spec.pins || []).map((p) => p.name)
    };
    this._log('registerCustomComponent', summary);
    return summary;
  }

  /**
   * Registers a custom 3D component spec and optionally spawns it on the stage in one call.
   * @param {object} spec
   * @param {object} [options]
   */
  createCustomComponent(spec = {}, options = null) {
    const reg = this.registerCustomComponent(spec);
    if (options && typeof options === 'object') {
      return this.addComponent(reg.typeId, options);
    }
    return reg;
  }

  /**
   * Spawns a 3D hardware component onto the workbench stage.
   * @param {string} typeId
   * @param {object} [options]
   */
  addComponent(typeId, options = {}) {
    const cleanType = this._normalizeTypeId(typeId);
    this._spawnCounter += 1;

    const defaultPositions = [
      [34, 0, -14],
      [24, 0, 20],
      [36, 0, 20],
      [34, 0, 4],
      [34, 0, -26],
      [22, 0, -14]
    ];
    const fallbackPos = defaultPositions[(this._spawnCounter - 1) % defaultPositions.length];
    const rawPos =
      Array.isArray(options.position) && options.position.length === 3
        ? options.position
        : null;
    // Convert meter-scale coordinates (e.g. [0.09, 0, -0.04]) to workbench grid units beside the host board
    const position = rawPos
      ? Math.abs(rawPos[0]) < 1.5 && Math.abs(rawPos[2]) < 1.5 && (rawPos[0] !== 0 || rawPos[2] !== 0)
        ? fallbackPos
        : rawPos
      : fallbackPos;
    const compId =
      options.id ||
      `sdk_${cleanType.replace(/[^a-z0-9]/gi, '_')}_${this._spawnCounter}`;

    const mergedOptions = {
      ...options,
      ohms: options.ohms ?? options.resistanceOhms ?? 220
    };

    if (this.executor) {
      this.executor.executeCommands(
        [
          {
            action: 'spawnComponent',
            typeId: cleanType,
            id: compId,
            position,
            rotation: options.rotation || 0,
            options: mergedOptions
          }
        ],
        { recordUndo: false }
      );
    } else if (this.stage?.spawnIndependentComponent) {
      this.stage.spawnIndependentComponent(cleanType, {
        ...mergedOptions,
        id: compId,
        position,
        autoSelect: false
      });
    }

    const spawned =
      this.registry.getInstance(compId) ||
      this._getStageComponents().find((c) => c.id === compId);

    const isKnownType =
      Boolean(spawned) ||
      (this.registry && typeof this.registry.has === 'function' ? this.registry.has(cleanType) : true);

    let diagnostic = null;
    if (!isKnownType) {
      const suggestedTypes = this._suggestClosestTypeIds(cleanType);
      const recoveryHint = `Unknown component typeId "${cleanType}". Available catalog matches: [${suggestedTypes.join(', ')}]. Call searchCapabilities({ query: "${cleanType}" }) first.`;
      diagnostic = {
        category: 'unknown_component',
        requestedTypeId: cleanType,
        suggestedTypes,
        recoveryHint
      };
      this.diagnostics.push(diagnostic);
      this.warnings.push(recoveryHint);
      if (options.strict === true) {
        const err = new Error(recoveryHint);
        err.category = 'unknown_component';
        err.suggestedTypes = suggestedTypes;
        err.recoveryHint = recoveryHint;
        throw err;
      }
    }

    const summary = {
      id: spawned?.id || compId,
      typeId: spawned?.typeId || cleanType,
      name: spawned?.name || cleanType,
      position,
      pins: this._extractPins(spawned),
      ...(diagnostic
        ? {
            ok: false,
            warning: diagnostic.recoveryHint,
            recoveryHint: diagnostic.recoveryHint,
            suggestedTypes: diagnostic.suggestedTypes
          }
        : {})
    };
    this._log('addComponent', summary);
    return summary;
  }

  /**
   * Removes a peripheral component by ID.
   * @param {string} componentId
   */
  removeComponent(componentId) {
    const cleanId =
      typeof componentId === 'object' && componentId !== null
        ? componentId.id
        : String(componentId || '').trim();
    let removed = false;
    if (this.stage?.removeComponent) {
      removed = Boolean(this.stage.removeComponent(cleanId));
    } else if (this.executor?._headlessComponents?.has(cleanId)) {
      this.registry.removeInstance(cleanId, true);
      this.executor._headlessComponents.delete(cleanId);
      this.executor._headlessConnections = this.executor._headlessConnections.filter(
        (w) => !String(w.from).startsWith(`${cleanId}.`) && !String(w.to).startsWith(`${cleanId}.`)
      );
      removed = true;
    }
    const res = { removed, componentId: cleanId };
    this._log('removeComponent', res);
    return res;
  }

  _resolveComponent(componentIdOrObject) {
    if (!componentIdOrObject) return null;
    const id =
      typeof componentIdOrObject === 'object'
        ? componentIdOrObject.id
        : String(componentIdOrObject).trim();

    const host = this._getHostBoard();
    if (
      id === 'host' ||
      id === 'board' ||
      (host && (id === host.id || id === host.typeId))
    ) {
      return host;
    }

    return (
      this.registry.getInstance(id) ||
      this._getStageComponents().find((c) => c.id === id || c.typeId === id) ||
      null
    );
  }

  _resolvePinName(comp, requestedPinName) {
    if (!comp) return String(requestedPinName || '').trim();
    const raw = String(requestedPinName || '').trim();
    if (typeof comp.resolvePinName === 'function') {
      const resolved = comp.resolvePinName(raw);
      if (resolved && comp.electricalPins?.has(resolved)) {
        return resolved;
      }
    }
    const pins = this._extractPins(comp);
    const upper = raw.toUpperCase();
    const exact = pins.find((p) => p.toUpperCase() === upper);
    if (exact) return exact;

    const aliasMap = {
      D2: 'PIN2',
      D3: 'PIN3',
      D4: 'PIN4',
      D5: 'PIN5',
      D6: 'PIN6',
      D7: 'PIN7',
      D8: 'PIN8',
      D9: 'PIN9',
      D10: 'PIN10',
      D11: 'PIN11',
      D12: 'PIN12',
      D13: 'PIN13',
      VCC: '5V',
      '5V': 'VCC',
      GND1: 'GND',
      GND2: 'GND',
      GND_1: 'GND',
      GND_2: 'GND',
      GND_3: 'GND',
      SIG: 'SIGNAL',
      PWM: 'SIGNAL',
      A: 'LEAD_A',
      B: 'LEAD_B',
      P1: 'LEAD_A',
      P2: 'LEAD_B',
      TERM_A: 'TERMINAL_A',
      TERM_B: 'TERMINAL_B',
      PIN_A: 'TERMINAL_A',
      PIN_B: 'TERMINAL_B',
      '1': 'TERMINAL_A',
      '2': 'TERMINAL_B',
      '+': 'ANODE',
      '-': 'CATHODE',
      POS: 'ANODE',
      NEG: 'CATHODE'
    };
    const mapped = aliasMap[upper];
    if (mapped) {
      const match = pins.find((p) => p.toUpperCase() === mapped);
      if (match) return match;
    }
    if ((upper === 'LEAD_A' || upper === 'A') && pins.includes('TERMINAL_A')) {
      return 'TERMINAL_A';
    }
    if ((upper === 'LEAD_B' || upper === 'B') && pins.includes('TERMINAL_B')) {
      return 'TERMINAL_B';
    }

    if (raw && pins.length > 0) {
      const recoveryHint = `Unknown pin "${raw}" on component ${comp.id} (${comp.typeId || 'hardware'}). Available pins: [${pins.join(', ')}]. Call getComponentSchema("${comp.typeId || comp.id}") to inspect valid pins.`;
      this.diagnostics.push({
        category: 'unknown_pin',
        componentId: comp.id,
        typeId: comp.typeId || null,
        requestedPin: raw,
        availablePins: pins,
        recoveryHint
      });
      this.warnings.push(recoveryHint);
    }

    return pins[0] || raw;
  }

  /**
   * Connects two component pins with a 3D jumper wire.
   * Supports both 4-arg `(fromComponentId, fromPin, toComponentId, toPin, colorOrOptions)`
   * and 2-arg endpoint notation `("compA.PIN1", "compB.PIN2", colorOrOptions)`.
   */
  connectWire(fromComponentId, fromPin, toComponentId, toPin, colorOrOptions = {}) {
    if (
      typeof fromComponentId === 'string' &&
      typeof fromPin === 'string' &&
      fromComponentId.includes('.') &&
      fromPin.includes('.') &&
      (toPin === undefined || typeof toComponentId === 'object' || String(toComponentId || '').startsWith('#'))
    ) {
      const splitEndpoint = (ep) => {
        const clean = String(ep || '').trim();
        const host = this._getHostBoard();
        if (host && clean.startsWith(`${host.id}.`)) {
          return [host.id, clean.slice(host.id.length + 1)];
        }
        const lastDot = clean.lastIndexOf('.');
        return [clean.slice(0, lastDot), clean.slice(lastDot + 1)];
      };
      const [parsedFromComp, parsedFromPin] = splitEndpoint(fromComponentId);
      const [parsedToComp, parsedToPin] = splitEndpoint(fromPin);
      colorOrOptions = toComponentId || {};
      fromComponentId = parsedFromComp;
      fromPin = parsedFromPin;
      toComponentId = parsedToComp;
      toPin = parsedToPin;
    }

    const fromComp = this._resolveComponent(fromComponentId);
    const toComp = this._resolveComponent(toComponentId);

    if (!fromComp || !toComp) {
      const missingId = !fromComp ? String(fromComponentId) : String(toComponentId);
      const suggestedTypes = this._suggestClosestTypeIds(missingId);
      const recoveryHint = `Could not resolve component "${missingId}" for wire connection (${fromComponentId} -> ${toComponentId}). Spawn the component first or check its id. Suggested catalog types: [${suggestedTypes.join(', ')}].`;
      this.diagnostics.push({
        category: 'unknown_component',
        requestedTypeId: missingId,
        suggestedTypes,
        recoveryHint
      });
      this.warnings.push(recoveryHint);
      const fail = {
        connected: false,
        error: `Could not resolve components (${fromComponentId} -> ${toComponentId})`,
        recoveryHint,
        suggestedTypes
      };
      this._log('connectWire', fail);
      return fail;
    }

    const diagCountBefore = this.diagnostics.length;
    const resolvedFromPin = this._resolvePinName(fromComp, fromPin);
    const resolvedToPin = this._resolvePinName(toComp, toPin);
    const newPinDiags = this.diagnostics.slice(diagCountBefore);

    const fromEndpoint = `${fromComp.id}.${resolvedFromPin}`;
    const toEndpoint = `${toComp.id}.${resolvedToPin}`;
    const options =
      typeof colorOrOptions === 'string'
        ? { color: colorOrOptions }
        : colorOrOptions || {};

    if (options.strict === true && newPinDiags.length > 0) {
      const firstDiag = newPinDiags[0];
      const err = new Error(firstDiag.recoveryHint);
      err.category = 'unknown_pin';
      err.availablePins = firstDiag.availablePins;
      err.recoveryHint = firstDiag.recoveryHint;
      throw err;
    }

    const wireId = options.id || `sdk_wire_${Date.now()}_${this.executionLog.length + 1}`;
    const color = options.color || '#10b981';

    if (this.executor) {
      this.executor.executeCommands(
        [
          {
            action: 'connectPins',
            id: wireId,
            from: fromEndpoint,
            to: toEndpoint,
            color
          }
        ],
        { recordUndo: false }
      );
    } else if (this.stage?.wireTool) {
      const existing = this.stage.wireTool.getConnections();
      existing.push({ id: wireId, from: fromEndpoint, to: toEndpoint, color });
      this.stage.wireTool.setConnections(existing);
    }

    const summary = {
      connected: true,
      wireId,
      from: fromEndpoint,
      to: toEndpoint,
      ...(newPinDiags.length > 0
        ? {
            warning: newPinDiags.map((d) => d.recoveryHint).join(' | '),
            recoveryHint: newPinDiags.map((d) => d.recoveryHint).join(' | '),
            availablePins: newPinDiags[0].availablePins
          }
        : {})
    };
    this._log('connectWire', summary);
    return summary;
  }

  /**
   * Automatically routes power & signal wires between a peripheral component and the host board.
   */
  smartConnect(componentId, preferredSignalPin = 'PIN9') {
    const comp = this._resolveComponent(componentId);
    const host = this._getHostBoard();
    if (!comp || !host) {
      return { connectedCount: 0, wires: [] };
    }

    const wires = [];
    const pinNames = this._extractPins(comp).map((n) => n.toUpperCase());
    const hostPinNames = this._extractPins(host).map((n) => n.toUpperCase());
    const hostVcc = hostPinNames.includes('5V') ? '5V' : '3V3';

    if (pinNames.includes('VCC')) {
      wires.push(this.connectWire('host', hostVcc, comp.id, 'VCC', { color: '#ef4444' }));
    }
    if (pinNames.includes('GND')) {
      wires.push(this.connectWire('host', 'GND', comp.id, 'GND', { color: '#1e2430' }));
    }
    if (pinNames.includes('SIGNAL') || pinNames.includes('PWM')) {
      wires.push(this.connectWire('host', preferredSignalPin, comp.id, 'SIGNAL', { color: '#f59e0b' }));
    } else if (pinNames.includes('IN')) {
      wires.push(this.connectWire('host', preferredSignalPin, comp.id, 'IN', { color: '#f59e0b' }));
    } else if (pinNames.includes('OUT')) {
      wires.push(this.connectWire('host', preferredSignalPin, comp.id, 'OUT', { color: '#38bdf8' }));
    } else if (pinNames.includes('TRIG') && pinNames.includes('ECHO')) {
      wires.push(this.connectWire('host', preferredSignalPin, comp.id, 'TRIG', { color: '#38bdf8' }));
      wires.push(this.connectWire('host', 'PIN10', comp.id, 'ECHO', { color: '#a855f7' }));
    } else if (pinNames.includes('ANODE') && pinNames.includes('CATHODE')) {
      wires.push(this.connectWire('host', preferredSignalPin, comp.id, 'ANODE', { color: '#22c55e' }));
      wires.push(this.connectWire('host', 'GND', comp.id, 'CATHODE', { color: '#1e2430' }));
    }

    const res = {
      connectedCount: wires.filter((w) => w.connected).length,
      wires
    };
    this._log('smartConnect', res);
    return res;
  }

  /**
   * Sets the embedded C++ / Arduino / ESP32 / Jetson code in the studio editor.
   * @param {string} code
   */
  setCode(code = '') {
    const cleanCode = String(code || '').trim();
    if (this.executor) {
      this.executor.executeCommands(
        [{ action: 'updateCode', code: cleanCode }],
        { recordUndo: false }
      );
    } else {
      if (this.runtime) {
        this.runtime.sourceCode = cleanCode;
      }
      this.onCodeChange?.(cleanCode);
    }

    const res = {
      updated: true,
      lineCount: cleanCode.split('\n').length
    };
    this._log('setCode', res);
    return res;
  }

  /**
   * Starts the closed-loop electrical + firmware simulation.
   */
  startSimulation() {
    if (this.executor) {
      this.executor.executeCommands(
        [{ action: 'startSimulation' }],
        { recordUndo: false }
      );
    } else if (this.runtime?.runImmediate) {
      this.runtime.runImmediate({ sourceCode: this.runtime.sourceCode });
    }

    const state = this.inspectElectricalState();
    const res = {
      running: true,
      ...state
    };
    this._log('startSimulation', res);
    return res;
  }

  /**
   * Inspects component pin schema from inside Code Mode.
   */
  getComponentSchema(typeId) {
    return getComponentSchema({ typeId }, this.registry);
  }

  /**
   * Searches hardware capabilities from inside Code Mode.
   */
  searchCapabilities(query, category = 'all') {
    return searchCapabilities({ query, category }, this.registry);
  }

  /**
   * Runs the Kirchhoff/Ohm solver and returns the current electrical state.
   */
  inspectElectricalState() {
    const flow = this.executor
      ? this.executor.solveFlow()
      : this.stage?.solveFreeformFlow?.() || {
          closedLoopCount: 0,
          totalCurrentMa: 0,
          faults: []
        };

    const componentCount = this._getStageComponents().length;
    const wireCount = this._getConnections().length;

    const res = {
      componentCount,
      wireCount,
      closedLoopCount: Number(flow?.closedLoopCount ?? flow?.loops?.length ?? 0),
      totalCurrentMa: Number(flow?.totalCurrentMa ?? 0),
      faultCount: Array.isArray(flow?.faults) ? flow.faults.length : 0,
      faults: Array.isArray(flow?.faults) ? flow.faults : []
    };
    this._log('inspectElectricalState', res);
    return res;
  }

  // ---------------------------------------------------------------------------
  // Flownie Code Mode Compatibility Aliases
  // ---------------------------------------------------------------------------

  setHostBoard(typeId = 'board.arduino_uno') {
    return this.setBoard(typeId);
  }

  spawnComponent(typeId, options = {}) {
    const mergedOptions = {
      ...(options || {}),
      ...((options && options.config) || {})
    };
    return this.addComponent(typeId, mergedOptions);
  }

  connectPins(fromEndpoint, toEndpoint, options = {}) {
    const splitEndpoint = (ep) => {
      const raw = String(ep || '').trim();
      const lastDot = raw.lastIndexOf('.');
      if (lastDot <= 0) return { compId: 'host', pin: raw };
      return {
        compId: raw.slice(0, lastDot),
        pin: raw.slice(lastDot + 1)
      };
    };
    const fromParts = splitEndpoint(fromEndpoint);
    const toParts = splitEndpoint(toEndpoint);
    return this.connectWire(fromParts.compId, fromParts.pin, toParts.compId, toParts.pin, options);
  }

  writeFirmware(code = '') {
    const res = this.setCode(code);
    this.startSimulation();
    return res;
  }

  writeArduinoCode(code = '') {
    return this.writeFirmware(code);
  }

  compileAndRunSimulation(code = '') {
    if (code && String(code).trim()) {
      this.setCode(code);
    }
    return this.startSimulation();
  }

  stopSimulation() {
    if (this.executor) {
      this.executor.executeCommands(
        [{ action: 'stopSimulation' }],
        { recordUndo: false }
      );
    } else if (this.runtime?.stop) {
      this.runtime.stop({ resetPins: true });
    }
    return { running: false };
  }

  clearStage() {
    return this.clearAddedComponents();
  }

  connect(fromComponentId, fromPin, toComponentId, toPin, colorOrOptions = {}) {
    return this.connectWire(fromComponentId, fromPin, toComponentId, toPin, colorOrOptions);
  }

  addWire(fromComponentId, fromPin, toComponentId, toPin, colorOrOptions = {}) {
    return this.connectWire(fromComponentId, fromPin, toComponentId, toPin, colorOrOptions);
  }

  verifyCircuit() {
    return this.inspectElectricalState();
  }
}
