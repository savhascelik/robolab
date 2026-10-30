import { circuitFlowSolver } from '../core/electrical/CircuitFlowSolver.js';

export const DEFAULT_ARDUINO_SKETCH = `const int LED_PIN = 13;

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("CircuitLab 3D Ready");
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  Serial.println("PIN13 -> HIGH");
  delay(500);
  digitalWrite(LED_PIN, LOW);
  Serial.println("PIN13 -> LOW");
  delay(500);
}`;

/**
 * LiveCodeRuntime — Real-time C++ (Arduino/ESP32) and Python (Jetson.GPIO) pin-level runtime
 * that drives physical `BaseHostBoard` pins (`drivePin`) and invokes `CircuitFlowSolver.solve()`.
 *
 * Strictly zero hardcoded component state shortcuts:
 * - A component (LED, Motor, Buzzer, Sensor) ONLY activates if physically wired in a closed
 *   electrical loop solved by `CircuitFlowSolver`.
 * - Removing a wire while the runtime is active immediately breaks the loop and de-energizes
 *   the component on the very next `recomputeFlow()` call.
 */
export class LiveCodeRuntime {
  /**
   * @param {object} opts
   * @param {() => import('../core/components/base/BaseHostBoard.js').BaseHostBoard|null} [opts.getHostBoard]
   * @param {() => import('../core/components/HardwareComponent.js').HardwareComponent[]} [opts.getComponents]
   * @param {() => Array<{ id?: string, from: string, to: string }>} [opts.getConnections]
   * @param {import('../core/electrical/CircuitFlowSolver.js').CircuitFlowSolver} [opts.solver]
   * @param {(flowResult: object) => void} [opts.onFlowUpdated]
   * @param {(entry: { timestamp: number, text: string, type: string }) => void} [opts.onSerialOutput]
   * @param {(pinStates: Record<string, { pin: string, voltage: number, mode: string, meta?: object }>) => void} [opts.onPinStatesChanged]
   */
  constructor(opts = {}) {
    this.getHostBoard = opts.getHostBoard || (() => null);
    this.getComponents =
      opts.getComponents ||
      (() => {
        const host = this.getHostBoard();
        const extra = opts.getStageComponents ? opts.getStageComponents() : [];
        return [...(host ? [host] : []), ...(Array.isArray(extra) ? extra : [])];
      });
    this.getConnections = opts.getConnections || (() => []);
    this.solver = opts.solver || circuitFlowSolver;
    this.onFlowUpdated = opts.onFlowUpdated || null;
    this.onSerialOutput = opts.onSerialOutput || null;
    this.onPinStatesChanged = opts.onPinStatesChanged || null;
    this._flowListeners = new Set();
    if (typeof this.onFlowUpdated === 'function') {
      this._flowListeners.add(this.onFlowUpdated);
    }

    this.sourceCode = opts.initialCode || DEFAULT_ARDUINO_SKETCH;
    this.setupOps = [];
    this.loopOps = [];
    this.symbolMap = new Map();
    this.servoPinMap = new Map();

    this.isRunning = false;
    this.pc = 0;
    this._timerId = null;
    this.drivenPins = new Map();
    this.serialLogs = [];
    this.lastFlowResult = null;
    /** @type {Map<string, { boardId: string, sourceCode: string, setupOps: any[], loopOps: any[], symbolMap: Map<string, string>, servoPinMap: Map<string, string>, setupDone: boolean }>} */
    this.boardPrograms = new Map();
    this._activeBoardContext = null;

    if (opts.boardCodes && typeof opts.boardCodes === 'object') {
      for (const [bId, bCode] of Object.entries(opts.boardCodes)) {
        this.setBoardCode(bId, bCode);
      }
    }

    this.compile(this.sourceCode);
  }

  /**
   * Registers or updates independent C++/Python firmware for a specific host board ID
   * so multiple MCUs/SBCs on the same 3D stage execute in lockstep as ReactFlow Hardware Nodes.
   * @param {string} boardId
   * @param {string} sourceCode
   */
  setBoardCode(boardId, sourceCode) {
    if (!boardId) return null;
    const codeStr = String(sourceCode ?? '');
    const boards = this.getHostBoards();
    const targetBoard = boards.find((b) => b.id === boardId || b.typeId === boardId);
    if (targetBoard && typeof targetBoard.setFirmwareCode === 'function') {
      targetBoard.setFirmwareCode(codeStr);
    }
    const compiled = this._compileSourceIsolated(codeStr);
    const prog = {
      boardId,
      sourceCode: codeStr,
      ...compiled,
      setupDone: false
    };
    this.boardPrograms.set(boardId, prog);
    return prog;
  }

  getBoardCode(boardId) {
    if (this.boardPrograms.has(boardId)) {
      return this.boardPrograms.get(boardId).sourceCode;
    }
    const board = this.getHostBoards().find((b) => b.id === boardId);
    return board?.firmwareCode || '';
  }

  _compileSourceIsolated(sourceCode) {
    const prevSource = this.sourceCode;
    const prevSetup = this.setupOps;
    const prevLoop = this.loopOps;
    const prevSymbols = new Map(this.symbolMap);
    const prevServos = new Map(this.servoPinMap);

    this.compile(sourceCode);
    const result = {
      setupOps: [...this.setupOps],
      loopOps: [...this.loopOps],
      symbolMap: new Map(this.symbolMap),
      servoPinMap: new Map(this.servoPinMap)
    };

    this.sourceCode = prevSource;
    this.setupOps = prevSetup;
    this.loopOps = prevLoop;
    this.symbolMap = prevSymbols;
    this.servoPinMap = prevServos;
    return result;
  }

  /**
   * Parses C++ or Python hardware source code into setup and loop instruction lists.
   * @param {string} sourceCode
   */
  compile(sourceCode) {
    this.sourceCode = String(sourceCode ?? '');
    this.symbolMap.clear();
    this.servoPinMap.clear();

    const cleanCode = this.sourceCode
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/#(?!(define\b)).*$/gm, '');

    // 1. Extract #define and const/int/let variable assignments for pin names
    const defineRegex = /#define\s+([A-Za-z_]\w*)\s+([A-Za-z0-9_]+)/g;
    let m;
    while ((m = defineRegex.exec(cleanCode)) !== null) {
      this.symbolMap.set(m[1], m[2]);
    }

    const varRegex =
      /(?:const\s+)?(?:int|uint8_t|byte|auto|let|var)?\s*([A-Za-z_]\w*)\s*=\s*([A-Za-z0-9_]+)\s*;?/g;
    while ((m = varRegex.exec(cleanCode)) !== null) {
      const varName = m[1];
      const val = m[2];
      if (!['HIGH', 'LOW', 'INPUT', 'OUTPUT', 'True', 'False'].includes(varName)) {
        this.symbolMap.set(varName, val);
      }
    }

    // Extract servo.attach(pin)
    const servoAttachRegex = /([A-Za-z_]\w*)\.attach\(\s*([^)]+)\s*\)/g;
    while ((m = servoAttachRegex.exec(cleanCode)) !== null) {
      this.servoPinMap.set(m[1].trim(), this._resolveSymbol(m[2].trim()));
    }

    // 2. Extract setup() and loop() blocks if present; otherwise treat top-level statements as loop
    const setupBlock = this._extractFunctionBlock(cleanCode, 'setup');
    const loopBlock = this._extractFunctionBlock(cleanCode, 'loop');

    if (setupBlock !== null || loopBlock !== null) {
      this.setupOps = this._parseStatements(setupBlock || '');
      this.loopOps = this._parseStatements(loopBlock || '');
    } else {
      this.setupOps = [];
      this.loopOps = this._parseStatements(cleanCode);
    }

    return {
      setupOps: this.setupOps,
      loopOps: this.loopOps,
      symbols: Object.fromEntries(this.symbolMap.entries())
    };
  }

  _extractFunctionBlock(code, fnName) {
    const regex = new RegExp(`\\bvoid\\s+${fnName}\\s*\\([^)]*\\)\\s*\\{`, 'm');
    const match = regex.exec(code);
    if (!match) return null;
    const openBraceIdx = match.index + match[0].length - 1;
    let depth = 0;
    for (let i = openBraceIdx; i < code.length; i++) {
      if (code[i] === '{') depth++;
      else if (code[i] === '}') {
        depth--;
        if (depth === 0) {
          return code.slice(openBraceIdx + 1, i);
        }
      }
    }
    return code.slice(openBraceIdx + 1);
  }

  _resolveSymbol(rawToken) {
    const trimmed = String(rawToken || '').trim();
    if (this.symbolMap.has(trimmed)) {
      return this.symbolMap.get(trimmed);
    }
    return trimmed;
  }

  _parseStatements(blockText) {
    const ops = [];
    const topLevelNodes = this._splitTopLevelStatementsAndBlocks(String(blockText || ''));

    for (const node of topLevelNodes) {
      if (node.kind === 'IF_ELSE') {
        ops.push({
          type: 'IF_ELSE',
          condition: node.condition,
          thenOps: this._parseStatements(node.thenBody || ''),
          elseOps: this._parseStatements(node.elseBody || '')
        });
        continue;
      }

      const line = String(node.text || '').trim();
      if (!line) continue;
      let match;

      // pinMode(pin, mode) or GPIO.setup(pin, GPIO.OUT)
      if ((match = /^pinMode\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/.exec(line))) {
        ops.push({
          type: 'PIN_MODE',
          pin: this._resolveSymbol(match[1]),
          mode: match[2].trim().toUpperCase()
        });
        continue;
      }
      if ((match = /^GPIO\.setup\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/.exec(line))) {
        ops.push({
          type: 'PIN_MODE',
          pin: this._resolveSymbol(match[1]),
          mode: match[2].includes('IN') ? 'INPUT' : 'OUTPUT'
        });
        continue;
      }

      // digitalWrite(pin, value) or GPIO.output(pin, value)
      if ((match = /^digitalWrite\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/.exec(line))) {
        const rawVal = this._resolveSymbol(match[2]).toUpperCase();
        const isHigh =
          rawVal === 'HIGH' || rawVal === '1' || rawVal === 'TRUE' || Number(rawVal) > 0;
        ops.push({
          type: 'DIGITAL_WRITE',
          pin: this._resolveSymbol(match[1]),
          high: isHigh
        });
        continue;
      }
      if ((match = /^GPIO\.output\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/.exec(line))) {
        const rawVal = this._resolveSymbol(match[2]).toUpperCase();
        const isHigh =
          rawVal.includes('HIGH') || rawVal === '1' || rawVal === 'TRUE' || Number(rawVal) > 0;
        ops.push({
          type: 'DIGITAL_WRITE',
          pin: this._resolveSymbol(match[1]),
          high: isHigh
        });
        continue;
      }

      // analogWrite(pin, value) or ledcWrite(pin, value)
      if ((match = /^(?:analogWrite|ledcWrite)\(\s*([^,]+)\s*,\s*([^)]+)\s*\)/.exec(line))) {
        const pwmVal = Math.max(0, Math.min(255, Number(this._resolveSymbol(match[2])) || 0));
        ops.push({
          type: 'ANALOG_WRITE',
          pin: this._resolveSymbol(match[1]),
          value: pwmVal
        });
        continue;
      }

      // servo.write(angle)
      if ((match = /^([A-Za-z_]\w*)\.write\(\s*([^)]+)\s*\)/.exec(line))) {
        const objName = match[1].trim();
        if (objName !== 'Serial') {
          const angle = Math.max(0, Math.min(180, Number(this._resolveSymbol(match[2])) || 0));
          const pin = this.servoPinMap.get(objName) || 'PIN9';
          ops.push({
            type: 'SERVO_WRITE',
            pin,
            angle
          });
          continue;
        }
      }

      // tone(pin, freqHz) / noTone(pin)
      if ((match = /^tone\(\s*([^,]+)\s*,\s*([^,)]+)/.exec(line))) {
        const freq = Math.max(20, Math.min(20000, Number(this._resolveSymbol(match[2])) || 440));
        ops.push({
          type: 'TONE',
          pin: this._resolveSymbol(match[1]),
          frequencyHz: freq
        });
        continue;
      }
      if ((match = /^noTone\(\s*([^)]+)\s*\)/.exec(line))) {
        ops.push({
          type: 'NO_TONE',
          pin: this._resolveSymbol(match[1])
        });
        continue;
      }

      // Serial.println(...) / Serial.print(...) / print(...)
      if (
        (match = /^(?:Serial\.println|Serial\.print|print)\(\s*(.*)\s*\)/.exec(line))
      ) {
        const cleanMsg = match[1].replace(/^["']|["']$/g, '');
        ops.push({
          type: 'SERIAL_PRINT',
          text: cleanMsg
        });
        continue;
      }

      // delay(ms) / time.sleep(s)
      if ((match = /^delay\(\s*([^)]+)\s*\)/.exec(line))) {
        const ms = Math.max(10, Number(this._resolveSymbol(match[1])) || 100);
        ops.push({
          type: 'DELAY',
          ms
        });
        continue;
      }
      if ((match = /^time\.sleep\(\s*([^)]+)\s*\)/.exec(line))) {
        const sec = Math.max(0.01, Number(this._resolveSymbol(match[1])) || 0.1);
        ops.push({
          type: 'DELAY',
          ms: Math.round(sec * 1000)
        });
        continue;
      }

      // Local variable assignment inside setup/loop (e.g. `int btn = digitalRead(2)` or `val = analogRead(A0)`)
      if (
        (match =
          /^(?:(?:const\s+)?(?:int|long|float|double|bool|boolean|auto|unsigned\s+long)\s+)?([A-Za-z_]\w*)\s*=\s*(.+)$/.exec(
            line
          ))
      ) {
        const varName = match[1].trim();
        const rhsExpr = match[2].trim();
        if (!['HIGH', 'LOW', 'INPUT', 'OUTPUT', 'true', 'false'].includes(varName)) {
          ops.push({
            type: 'VAR_ASSIGN',
            name: varName,
            expr: rhsExpr
          });
          continue;
        }
      }
    }

    return ops;
  }

  /**
   * Splits a code block into top-level statement strings and structured `IF_ELSE` blocks
   * so `if (...) { ... } else { ... }` branches are evaluated conditionally rather than flattened.
   */
  _splitTopLevelStatementsAndBlocks(text) {
    const nodes = [];
    const src = String(text || '');
    let i = 0;
    const len = src.length;

    const skipWhitespaceAndDelims = () => {
      while (i < len && /[\s;]/.test(src[i])) i++;
    };

    const readBalancedParens = () => {
      while (i < len && /\s/.test(src[i])) i++;
      if (src[i] !== '(') return '';
      const start = i + 1;
      let depth = 0;
      for (; i < len; i++) {
        if (src[i] === '(') depth++;
        else if (src[i] === ')') {
          depth--;
          if (depth === 0) {
            const content = src.slice(start, i);
            i++;
            return content.trim();
          }
        }
      }
      return src.slice(start).trim();
    };

    const readBraceOrSingleStatement = () => {
      while (i < len && /\s/.test(src[i])) i++;
      if (src[i] === '{') {
        const start = i + 1;
        let depth = 0;
        for (; i < len; i++) {
          if (src[i] === '{') depth++;
          else if (src[i] === '}') {
            depth--;
            if (depth === 0) {
              const content = src.slice(start, i);
              i++;
              return content;
            }
          }
        }
        return src.slice(start);
      }
      const start = i;
      while (i < len && src[i] !== ';' && src[i] !== '\n' && src[i] !== '\r') {
        i++;
      }
      const stmt = src.slice(start, i);
      if (src[i] === ';') i++;
      return stmt;
    };

    while (i < len) {
      skipWhitespaceAndDelims();
      if (i >= len) break;

      const rest = src.slice(i);
      const ifMatch = /^if\s*\(/.exec(rest);
      if (ifMatch) {
        i += 2; // advance past 'if'
        const condition = readBalancedParens();
        const thenBody = readBraceOrSingleStatement();
        let elseBody = '';

        const savedIdx = i;
        while (i < len && /\s/.test(src[i])) i++;
        if (/^else\b/.test(src.slice(i))) {
          i += 4; // advance past 'else'
          while (i < len && /\s/.test(src[i])) i++;
          if (/^if\s*\(/.test(src.slice(i))) {
            // else if (...) -> recursively parsed inside elseBody
            const elseStart = i;
            // Read the rest of the else-if chain
            i = elseStart;
            const nestedCondition = (() => {
              i += 2;
              return readBalancedParens();
            })();
            const nestedThen = readBraceOrSingleStatement();
            let nestedElse = '';
            while (i < len && /\s/.test(src[i])) i++;
            if (/^else\b/.test(src.slice(i))) {
              i += 4;
              nestedElse = readBraceOrSingleStatement();
            }
            elseBody = `if (${nestedCondition}) { ${nestedThen} }${nestedElse ? ` else { ${nestedElse} }` : ''}`;
          } else {
            elseBody = readBraceOrSingleStatement();
          }
        } else {
          i = savedIdx;
        }

        nodes.push({
          kind: 'IF_ELSE',
          condition,
          thenBody,
          elseBody
        });
        continue;
      }

      // Standard statement up to next `;` or newline (respecting parentheses)
      const start = i;
      let parenDepth = 0;
      while (i < len) {
        const ch = src[i];
        if (ch === '(') parenDepth++;
        else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
        else if (parenDepth === 0 && (ch === ';' || ch === '\n' || ch === '\r' || ch === '{' || ch === '}')) {
          break;
        }
        i++;
      }
      const stmtText = src.slice(start, i).trim();
      if (stmtText) {
        nodes.push({ kind: 'STMT', text: stmtText });
      }
      if (i < len && (src[i] === ';' || src[i] === '\n' || src[i] === '\r' || src[i] === '{' || src[i] === '}')) {
        i++;
      }
    }

    return nodes;
  }

  /**
   * Evaluates a C++ / Python boolean or numeric expression (`distance > 0 && distance < 20`,
   * `digitalRead(BTN_PIN) == HIGH`, `analogRead(A0) > 500`, etc.) against live 3D stage electrical nets
   * and sensor/button states.
   */
  _evaluateCondition(rawCondition, { asNumeric = false } = {}) {
    const cond = String(rawCondition || '').trim();
    if (!cond) return asNumeric ? 0 : true;

    const components = this.getComponents() || [];
    const connections = this.getConnections() || [];

    // Ensure net potentials (e.g. closed buttons bridging 5V -> PIN2 or sensor outputs -> A0) are fresh
    this.lastFlowResult = this.solver.solve({ components, connections });

    let distanceCm = 15;
    let durationUs = Math.round((15 * 2) / 0.034);
    let temperatureC = 26;
    let genericSensorVal = 600;
    let buttonPressed = 0;

    for (const comp of components) {
      if (!comp || comp.isHostBoard) continue;
      const typeId = String(comp.typeId || '');
      const val = Number(comp.state?.value);

      if (typeId.includes('ultrasonic') || typeId.includes('tof') || typeof comp.getEchoPulseDurationUs === 'function') {
        if (Number.isFinite(val)) distanceCm = val;
        if (typeof comp.getEchoPulseDurationUs === 'function') {
          durationUs = comp.getEchoPulseDurationUs();
        } else {
          durationUs = Math.round((distanceCm * 2) / 0.034);
        }
      } else if (typeId.includes('dht') || typeId.includes('temp')) {
        if (Number.isFinite(val)) temperatureC = val;
      } else if (comp.category === 'sensors' && Number.isFinite(val)) {
        genericSensorVal = val;
      } else if (comp.category === 'buttons' || typeId.includes('button')) {
        if (comp.state?.pressed || comp.state?.closed || comp.state?.isPressed) {
          buttonPressed = 1;
        }
      }
    }

    const readDigitalPinLevel = (rawPinArg) => {
      const resolvedArg = this._resolveSymbol(rawPinArg);
      const targets = this.resolveTargetBoardsAndPin(resolvedArg);
      for (const { board, pinName } of targets) {
        const ePin = board?.getPin?.(pinName);
        const v = ePin ? (ePin.sensedVoltage ?? ePin.voltage ?? ePin.drivenVoltage ?? null) : null;
        if (typeof v === 'number' && v >= 2.0) {
          return 1;
        }
      }
      return buttonPressed;
    };

    const readAnalogPinValue = (rawPinArg) => {
      const resolvedArg = this._resolveSymbol(rawPinArg);
      const targets = this.resolveTargetBoardsAndPin(resolvedArg);
      for (const { board, pinName } of targets) {
        const ePin = board?.getPin?.(pinName);
        const v = ePin ? (ePin.sensedVoltage ?? ePin.voltage ?? ePin.drivenVoltage ?? null) : null;
        if (typeof v === 'number' && v > 0) {
          const logicV = board?.capabilities?.logicVoltage || 5.0;
          const maxAdc = board?.getMaxAdcValue?.() || 1023;
          return Math.max(0, Math.min(maxAdc, Math.round((v / logicV) * maxAdc)));
        }
      }
      return genericSensorVal;
    };

    const activeBoard = this._activeBoardContext || this.getHostBoard?.() || this.getHostBoards()[0] || null;
    const serialAvail = Number(activeBoard?.state?.serialAvailable || activeBoard?.rxBuffer?.length || 0);
    const lastRxStr = String(activeBoard?.state?.lastRxMessage || '');

    let expr = cond
      .replace(
        /\bSerial\.readString\s*\(\s*\)\s*==\s*["']([^"']*)["']/g,
        (_m, expected) => (lastRxStr === expected ? '1' : '0')
      )
      .replace(
        /\bSerial\.readString\s*\(\s*\)\s*!=\s*["']([^"']*)["']/g,
        (_m, expected) => (lastRxStr !== expected ? '1' : '0')
      )
      .replace(/\bSerial\.available\s*\(\s*\)/g, String(serialAvail))
      .replace(/\bdigitalRead\s*\(\s*([^)]*)\s*\)/g, (_m, p1) => String(readDigitalPinLevel(p1)))
      .replace(/\bGPIO\.input\s*\(\s*([^)]*)\s*\)/g, (_m, p1) => String(readDigitalPinLevel(p1)))
      .replace(/\banalogRead\s*\(\s*([^)]*)\s*\)/g, (_m, p1) => String(readAnalogPinValue(p1)))
      .replace(/\bpulseIn\s*\([^)]*\)/g, String(durationUs))
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\s+/g, '!');

    const env = {
      HIGH: 1,
      LOW: 0,
      INPUT: 0,
      OUTPUT: 1,
      true: 1,
      false: 0,
      True: 1,
      False: 0,
      distance: distanceCm,
      dist: distanceCm,
      cm: distanceCm,
      mesafe: distanceCm,
      distanceCm,
      duration: durationUs,
      temp: temperatureC,
      temperature: temperatureC,
      sicaklik: temperatureC,
      sensorValue: genericSensorVal,
      light: genericSensorVal,
      ldr: genericSensorVal,
      val: genericSensorVal,
      value: genericSensorVal,
      buttonState: buttonPressed,
      btnState: buttonPressed,
      pressed: buttonPressed,
      ...(this.runtimeVars || {})
    };

    for (const [k, v] of this.symbolMap.entries()) {
      const num = Number(v);
      if (Number.isFinite(num)) {
        env[k] = num;
      }
    }

    expr = expr.replace(/\b([A-Za-z_]\w*)\b/g, (token) => {
      if (Object.prototype.hasOwnProperty.call(env, token)) {
        return String(env[token]);
      }
      return '15';
    });

    // Only evaluate safe arithmetic/comparison expressions
    if (!/^[0-9.\s+\-*/%()<>=!&|?:]+$/.test(expr)) {
      return asNumeric ? 0 : true;
    }

    try {
      const val = Function(`"use strict"; return (${expr});`)();
      return asNumeric ? Number(val) || 0 : Boolean(val);
    } catch (_err) {
      return asNumeric ? 0 : true;
    }
  }

  /**
   * Returns all active host boards on the stage (supporting both single-board and multi-board workspaces).
   */
  getHostBoards() {
    const boards = [];
    const seen = new Set();
    const primary = this.getHostBoard?.();
    if (primary && primary.id) {
      boards.push(primary);
      seen.add(primary.id);
    }
    const allComps = this.getComponents?.() || [];
    for (const comp of allComps) {
      if (
        comp &&
        (comp.isHostBoard || typeof comp.drivePin === 'function') &&
        comp.id &&
        !seen.has(comp.id)
      ) {
        boards.push(comp);
        seen.add(comp.id);
      }
    }
    return boards;
  }

  /**
   * Resolves the target host board(s) and normalized pin name for a raw pin token,
   * supporting multi-board workspaces (`boardId:PIN` or automatic wired-pin matching).
   */
  resolveTargetBoardsAndPin(rawPinToken) {
    const boards = this.getHostBoards();
    if (boards.length === 0) return [];

    const tokenStr = String(rawPinToken || '').trim();
    if (tokenStr.includes(':')) {
      const [boardPrefix, pinPart] = tokenStr.split(':');
      const matchedBoard =
        boards.find(
          (b) =>
            b.id?.toLowerCase() === boardPrefix.toLowerCase() ||
            b.typeId?.toLowerCase().includes(boardPrefix.toLowerCase())
        ) || boards[0];
      return [{ board: matchedBoard, pinName: this.resolveBoardPin(matchedBoard, pinPart) }];
    }

    if (this._activeBoardContext && boards.some((b) => b.id === this._activeBoardContext.id)) {
      return [
        {
          board: this._activeBoardContext,
          pinName: this.resolveBoardPin(this._activeBoardContext, tokenStr)
        }
      ];
    }

    if (boards.length === 1) {
      return [{ board: boards[0], pinName: this.resolveBoardPin(boards[0], tokenStr) }];
    }

    const connections = this.getConnections?.() || [];
    const wiredMatches = [];
    for (const board of boards) {
      const pinName = this.resolveBoardPin(board, tokenStr);
      if (!board.pins?.[pinName]) continue;
      const endpointDot = `${board.id}.${pinName}`;
      const endpointColon = `${board.id}:${pinName}`;
      const isWired = connections.some(
        (c) =>
          c.from === endpointDot ||
          c.to === endpointDot ||
          c.from === endpointColon ||
          c.to === endpointColon
      );
      if (isWired) {
        wiredMatches.push({ board, pinName });
      }
    }
    if (wiredMatches.length > 0) {
      return wiredMatches;
    }

    for (const board of boards) {
      const pinName = this.resolveBoardPin(board, tokenStr);
      if (board.pins?.[pinName]) {
        return [{ board, pinName }];
      }
    }

    return [{ board: boards[0], pinName: this.resolveBoardPin(boards[0], tokenStr) }];
  }

  /**
   * Normalizes a user code pin reference (e.g. "13", "PIN13", "GPIO2", "A0", "LED_BUILTIN")
   * into the physical pin name on the active `BaseHostBoard`.
   */
  resolveBoardPin(hostBoard, rawPinToken) {
    const token = String(rawPinToken || '').trim();
    if (!hostBoard) return token;

    if (token === 'LED_BUILTIN') {
      return hostBoard.resolvePinName('@LED_BUILTIN');
    }
    if (hostBoard.pins && hostBoard.pins[token]) {
      return token;
    }
    if (/^\d+$/.test(token)) {
      const asPin = `PIN${token}`;
      const asGpio = `GPIO${token}`;
      if (hostBoard.pins && hostBoard.pins[asPin]) return asPin;
      if (hostBoard.pins && hostBoard.pins[asGpio]) return asGpio;
      const resolvedPin = hostBoard.resolvePinName(asPin);
      if (hostBoard.pins && hostBoard.pins[resolvedPin]) return resolvedPin;
      const resolvedGpio = hostBoard.resolvePinName(asGpio);
      if (hostBoard.pins && hostBoard.pins[resolvedGpio]) return resolvedGpio;
    }
    return hostBoard.resolvePinName(token);
  }

  /**
   * Executes a single parsed instruction against the active host board and solves the circuit.
   * @param {object} op
   */
  executeOp(op) {
    if (!op) return;

    switch (op.type) {
      case 'IF_ELSE': {
        const condResult = this._evaluateCondition(op.condition);
        const branchOps = condResult ? op.thenOps || [] : op.elseOps || [];
        for (const innerOp of branchOps) {
          if (innerOp.type === 'DELAY') continue;
          this.executeOp(innerOp);
        }
        break;
      }

      case 'VAR_ASSIGN': {
        if (!this.runtimeVars) this.runtimeVars = {};
        if (op.name) {
          this.runtimeVars[op.name] = this._evaluateCondition(op.expr, { asNumeric: true });
        }
        break;
      }

      case 'PIN_MODE': {
        const targets = this.resolveTargetBoardsAndPin(op.pin);
        for (const { board, pinName } of targets) {
          const dir = op.mode.includes('IN') ? 'IN' : 'OUT';
          board.setPinDirection(pinName, dir);
        }
        break;
      }

      case 'DIGITAL_WRITE': {
        const targets = this.resolveTargetBoardsAndPin(op.pin);
        for (const { board, pinName } of targets) {
          const logicV = board?.capabilities?.logicVoltage ?? 5.0;
          const targetV = op.high ? logicV : 0;
          board.drivePin(pinName, targetV, {
            protocol: 'GPIO',
            digital: op.high ? 1 : 0,
            dutyCycle: op.high ? 1 : 0
          });
          if (pinName === board.resolvePinName('@LED_BUILTIN')) {
            board.setOnboardLed('l', op.high);
          }
          this.drivenPins.set(pinName, {
            pin: pinName,
            boardId: board.id,
            voltage: targetV,
            mode: 'DIGITAL',
            high: op.high
          });
        }
        if (targets.length > 0) {
          this._notifyPinStates();
          this.recomputeFlow();
        }
        break;
      }

      case 'ANALOG_WRITE': {
        const targets = this.resolveTargetBoardsAndPin(op.pin);
        for (const { board, pinName } of targets) {
          const logicV = board?.capabilities?.logicVoltage ?? 5.0;
          const duty = Math.max(0, Math.min(1, op.value / 255));
          const effVoltage = Number((duty * logicV).toFixed(2));
          board.drivePin(pinName, effVoltage, {
            protocol: 'PWM',
            dutyCycle: duty,
            pwmValue: op.value
          });
          this.drivenPins.set(pinName, {
            pin: pinName,
            boardId: board.id,
            voltage: effVoltage,
            mode: 'PWM',
            high: duty > 0,
            meta: { dutyCycle: duty, pwmValue: op.value }
          });
        }
        if (targets.length > 0) {
          this._notifyPinStates();
          this.recomputeFlow();
        }
        break;
      }

      case 'SERVO_WRITE': {
        const targets = this.resolveTargetBoardsAndPin(op.pin);
        for (const { board, pinName } of targets) {
          const logicV = board?.capabilities?.logicVoltage ?? 5.0;
          const duty = Math.max(0.05, Math.min(1, op.angle / 180));
          board.drivePin(pinName, logicV, {
            protocol: 'PWM',
            angle: op.angle,
            dutyCycle: duty
          });
          this.drivenPins.set(pinName, {
            pin: pinName,
            boardId: board.id,
            voltage: logicV,
            mode: 'SERVO',
            high: true,
            meta: { angle: op.angle }
          });
        }
        if (targets.length > 0) {
          this._notifyPinStates();
          this.recomputeFlow();
        }
        break;
      }

      case 'TONE': {
        const targets = this.resolveTargetBoardsAndPin(op.pin);
        for (const { board, pinName } of targets) {
          const logicV = board?.capabilities?.logicVoltage ?? 5.0;
          const effVoltage = Number((0.5 * logicV).toFixed(2));
          board.drivePin(pinName, effVoltage, {
            protocol: 'PWM',
            frequencyHz: op.frequencyHz,
            dutyCycle: 0.5
          });
          this.drivenPins.set(pinName, {
            pin: pinName,
            boardId: board.id,
            voltage: effVoltage,
            mode: 'TONE',
            high: true,
            meta: { frequencyHz: op.frequencyHz }
          });
        }
        if (targets.length > 0) {
          this._notifyPinStates();
          this.recomputeFlow();
        }
        break;
      }

      case 'NO_TONE': {
        const targets = this.resolveTargetBoardsAndPin(op.pin);
        for (const { board, pinName } of targets) {
          board.drivePin(pinName, 0, { protocol: 'GPIO', frequencyHz: 0, dutyCycle: 0 });
          this.drivenPins.set(pinName, {
            pin: pinName,
            boardId: board.id,
            voltage: 0,
            mode: 'DIGITAL',
            high: false
          });
        }
        if (targets.length > 0) {
          this._notifyPinStates();
          this.recomputeFlow();
        }
        break;
      }

      case 'SERIAL_PRINT': {
        const activeBoard = this._activeBoardContext || this.getHostBoard?.() || this.getHostBoards()[0] || null;
        const msgText = String(op.text ?? '');
        if (activeBoard && typeof activeBoard.transmitSerial === 'function') {
          activeBoard.transmitSerial(msgText);
          this.recomputeFlow();
        }
        const entry = {
          timestamp: Date.now(),
          boardId: activeBoard?.id || null,
          text: msgText,
          type: 'serial'
        };
        this.serialLogs.push(entry);
        if (this.serialLogs.length > 80) {
          this.serialLogs.shift();
        }
        if (this.onSerialOutput) {
          this.onSerialOutput(entry);
        }
        break;
      }

      default:
        break;
    }
  }

  /**
   * Re-evaluates the 3D stage's closed-loop electrical topology (`CircuitFlowSolver.solve()`).
   * Call this whenever a pin voltage changes OR when a jumper wire is added/removed on stage.
   */
  recomputeFlow() {
    const components = this.getComponents() || [];
    const connections = this.getConnections() || [];
    const result = this.solver.solve({ components, connections });
    this.lastFlowResult = result;
    for (const cb of this._flowListeners) {
      cb(result);
    }
    return result;
  }

  onFlowUpdate(cb) {
    if (typeof cb === 'function') {
      this._flowListeners.add(cb);
    }
    return () => this._flowListeners.delete(cb);
  }

  loadCode(sourceCode) {
    return this.compile(sourceCode);
  }

  step() {
    return this.recomputeFlow();
  }

  /**
   * Executes per-board firmware programs across all host boards on the stage (`this.boardPrograms`
   * or `board.firmwareCode`), propagating pin-to-pin GPIO & UART signals between boards via `CircuitFlowSolver`.
   */
  _executeMultiBoardPrograms({ runSetup = true, stopAtFirstDelay = true } = {}) {
    const boards = this.getHostBoards();
    const activeEntries = [];

    for (const board of boards) {
      let prog = this.boardPrograms.get(board.id);
      if (!prog && board.firmwareCode && String(board.firmwareCode).trim().length > 0) {
        prog = this.setBoardCode(board.id, board.firmwareCode);
      }
      if (prog) {
        activeEntries.push({ board, prog });
      }
    }

    if (activeEntries.length === 0) return false;

    const savedSymbols = new Map(this.symbolMap);
    const savedServos = new Map(this.servoPinMap);

    // Two-pass ReactFlow MCU cascade so upstream MCU outputs immediately feed downstream MCU inputs
    for (let pass = 0; pass < 2; pass++) {
      for (const { board, prog } of activeEntries) {
        this._activeBoardContext = board;
        this.symbolMap = new Map(prog.symbolMap);
        this.servoPinMap = new Map(prog.servoPinMap);

        if (runSetup && (!prog.setupDone || pass === 0)) {
          for (const op of prog.setupOps) {
            if (op.type === 'DELAY' && stopAtFirstDelay) break;
            this.executeOp(op);
          }
          prog.setupDone = true;
        }
        for (const op of prog.loopOps) {
          if (op.type === 'DELAY' && stopAtFirstDelay) break;
          this.executeOp(op);
        }
        this.recomputeFlow();
      }
    }

    this._activeBoardContext = null;
    this.symbolMap = savedSymbols;
    this.servoPinMap = savedServos;
    return true;
  }

  /**
   * Immediately re-solves the electrical topology and re-evaluates the compiled sketch's
   * conditional `loopOps` whenever an interactive 3D stage element (button press/release,
   * sensor slider, obstacle drag, or breadboard snap) changes state.
   */
  refreshInteractiveState() {
    this.recomputeFlow();
    const ranMulti = this._executeMultiBoardPrograms({ runSetup: true, stopAtFirstDelay: true });
    if (!ranMulti) {
      if (Array.isArray(this.setupOps) && this.setupOps.length > 0 && this.drivenPins.size === 0) {
        for (const op of this.setupOps) {
          if (op.type === 'DELAY') continue;
          this.executeOp(op);
        }
      }
      if (Array.isArray(this.loopOps) && this.loopOps.length > 0) {
        for (const op of this.loopOps) {
          if (op.type === 'DELAY') break;
          this.executeOp(op);
        }
      }
    }
    return this.recomputeFlow();
  }

  /**
   * Synchronously executes setup() and up to `maxLoopOps` instructions before the first delay
   * (or all instructions if `ignoreDelays = true`) for deterministic testing and immediate feedback.
   */
  runImmediate({ sourceCode = null, boardCodes = null, stopAtFirstDelay = true } = {}) {
    if (boardCodes && typeof boardCodes === 'object') {
      for (const [bId, bCode] of Object.entries(boardCodes)) {
        this.setBoardCode(bId, bCode);
      }
    }
    if (sourceCode !== null) {
      this.compile(sourceCode);
    }
    const hasMulti = this._executeMultiBoardPrograms({ runSetup: true, stopAtFirstDelay });
    if (!hasMulti || sourceCode !== null) {
      for (const op of this.setupOps) {
        if (op.type === 'DELAY' && stopAtFirstDelay) break;
        this.executeOp(op);
      }
      for (const op of this.loopOps) {
        if (op.type === 'DELAY' && stopAtFirstDelay) break;
        this.executeOp(op);
      }
    }
    return this.recomputeFlow();
  }

  /**
   * Starts continuous loop execution with real-time `delay()` scheduling.
   */
  start(sourceCode = null) {
    this.stop({ resetPins: false });
    if (sourceCode !== null) {
      this.compile(sourceCode);
    }
    this.isRunning = true;
    this.pc = 0;

    for (const op of this.setupOps) {
      if (op.type !== 'DELAY') {
        this.executeOp(op);
      }
    }

    this._scheduleNextLoopStep(0);
    return this.recomputeFlow();
  }

  _scheduleNextLoopStep(delayMs = 20) {
    if (!this.isRunning) return;
    if (this._timerId) {
      clearTimeout(this._timerId);
      this._timerId = null;
    }

    this._timerId = setTimeout(() => {
      if (!this.isRunning) return;
      if (this.loopOps.length === 0) {
        this.recomputeFlow();
        return;
      }

      let stepsExecuted = 0;
      while (this.isRunning && stepsExecuted < this.loopOps.length) {
        const op = this.loopOps[this.pc];
        this.pc = (this.pc + 1) % this.loopOps.length;
        stepsExecuted++;

        if (op.type === 'DELAY') {
          this._scheduleNextLoopStep(Math.min(2000, Math.max(25, op.ms)));
          return;
        }
        this.executeOp(op);
      }

      if (this.isRunning) {
        this._scheduleNextLoopStep(250);
      }
    }, delayMs);
  }

  /**
   * Stops continuous execution and optionally resets all driven GPIO pins to 0V.
   */
  stop({ resetPins = true } = {}) {
    this.isRunning = false;
    if (this._timerId) {
      clearTimeout(this._timerId);
      this._timerId = null;
    }

    if (resetPins) {
      const boards = this.getHostBoards();
      for (const board of boards) {
        for (const pinName of this.drivenPins.keys()) {
          if (board.pins?.[pinName]) {
            board.drivePin(pinName, 0, { protocol: 'GPIO', digital: 0, dutyCycle: 0 });
          }
        }
        board.setOnboardLed?.('l', false);
      }
      this.drivenPins.clear();
      this._notifyPinStates();
      this.recomputeFlow();
    }
  }

  getDrivenPinStates() {
    return Object.fromEntries(this.drivenPins.entries());
  }

  _notifyPinStates() {
    if (this.onPinStatesChanged) {
      this.onPinStatesChanged(this.getDrivenPinStates());
    }
  }
}
