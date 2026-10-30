import { BaseBoard } from './BaseBoard.js';

/**
 * Abstract Base Class for all Programmable Host Controller Boards:
 * - Microcontrollers (MCU): Arduino Uno R3, ESP32 DevKit V1, STM32, Pi Pico
 * - Single-Board Computers (SBC / Edge AI): NVIDIA Jetson Nano, Raspberry Pi
 *
 * Provides:
 * 1. Electrical & compute capability descriptors (logicVoltage: 3.3V vs 5.0V, ADC bit depth, buses)
 * 2. Universal Logical Pin Role & Alias resolution (`definePinRole`, `resolvePinName`, `getPinWorldPosition`)
 *    so the exact same peripheral components (LEDs, Buttons, Motors, Sensors) can be wired to
 *    Arduino Uno, ESP32, or Jetson Nano seamlessly.
 * 3. Shared onboard status LED control (`setOnboardLed`) and 3D subsystem callout projection.
 */
export class BaseHostBoard extends BaseBoard {
  static typeId = 'abstract.host_board';
  static category = 'boards';
  static hostFamily = 'mcu'; // 'mcu' | 'sbc'
  static displayName = 'Abstract Host Controller Board';
  static flashProtocolId = 'generic.serial';
  static usbFilters = [];

  constructor(options = {}) {
    if (new.target === BaseHostBoard) {
      throw new Error('BaseHostBoard is an abstract base class and cannot be instantiated directly.');
    }

    super(options);
    this.isHostBoard = true;

    /**
     * Maps universal logical roles or cross-board aliases (e.g. '@LED_BUILTIN', '@PWM_1', 'PIN13', 'GPIO2')
     * to this board's physical pin key in `this.pins`.
     * @type {Record<string, string>}
     */
    this.pinRoles = this.pinRoles || {};
    this.boardCallouts = this.boardCallouts || [];
    this.capabilities = {
      architecture: 'Generic',
      logicVoltage: 5.0,
      adcBits: 10,
      pwmBits: 8,
      clockMHz: 16,
      wireless: [],
      interfaces: ['GPIO', 'PWM', 'ADC', 'UART', 'I2C', 'SPI'],
      ...this.getBoardCapabilities()
    };

    // Allow subclasses to register pin roles during or after buildMesh()
    this.registerDefaultPinRoles();
    this.configureHostElectricalPins();

    /** @type {string} Optional per-board C++/Python firmware code for Multi-MCU ReactFlow execution */
    this.firmwareCode = String(options.firmwareCode || options.code || '');
    /** @type {Array<{ text: string, fromBoardId: string|null, protocol: string, timestamp: number }>} */
    this.rxBuffer = [];
    /** @type {Array<{ text: string, pin: string, protocol: string, timestamp: number }>} */
    this.txHistory = [];
    /** @type {Record<string, { voltage: number, high: boolean, logicLevel: number, protocol: string }>} */
    this.sensedPins = {};
  }

  /**
   * Returns the nominal GPIO logic voltage of this host board (e.g. 5.0V for Uno, 3.3V for ESP32 / Jetson Nano).
   * @returns {number}
   */
  get logicVoltage() {
    return this.capabilities?.logicVoltage ?? 5.0;
  }

  /**
   * Automatically configures inherited `ElectricalPin` specifications (power rails, common ground plane,
   * CMOS output impedance, and max safe GPIO logic voltage) for any MCU/SBC host board.
   */
  configureHostElectricalPins() {
    const logicV = this.capabilities?.logicVoltage ?? 5.0;
    const gndPins = [];
    const pwmPinSet = new Set([
      'PIN3',
      'PIN5',
      'PIN6',
      'PIN9',
      'PIN10',
      'PIN11',
      'GPIO2',
      'GPIO4',
      'GPIO5',
      'GPIO18',
      'GPIO19',
      'GPIO21',
      'GPIO22',
      'GPIO23'
    ]);
    const adcPinSet = new Set(['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'GPIO32', 'GPIO33', 'GPIO34', 'GPIO35', 'VN', 'VP']);

    for (const [pinName, elecPin] of this.electricalPins.entries()) {
      if (pinName.startsWith('GND')) {
        elecPin.direction = 'GND';
        elecPin.role = 'GND';
        elecPin.protocol = 'DC';
        elecPin.voltage = 0;
        elecPin.maxVoltage = 0.5;
        elecPin.internalResistance = 0.05;
        gndPins.push(pinName);
      } else if (pinName === '5V' || pinName === 'VIN') {
        elecPin.direction = 'POWER';
        elecPin.role = 'POWER';
        elecPin.protocol = 'DC';
        elecPin.voltage = 5.0;
        elecPin.maxVoltage = 5.5;
        elecPin.internalResistance = 0.2;
      } else if (pinName === '3V3') {
        elecPin.direction = 'POWER';
        elecPin.role = 'POWER';
        elecPin.protocol = 'DC';
        elecPin.voltage = 3.3;
        elecPin.maxVoltage = 3.6;
        elecPin.internalResistance = 0.2;
      } else if (adcPinSet.has(pinName) || pinName.startsWith('A')) {
        elecPin.direction = 'IO';
        elecPin.role = 'ADC';
        elecPin.protocol = 'ADC';
        elecPin.voltage = null;
        elecPin.maxVoltage = Number((logicV + 0.3).toFixed(2));
        elecPin.internalResistance = 25;
      } else if (pinName === 'RX0' || pinName === 'TX0') {
        elecPin.direction = pinName === 'TX0' ? 'OUT' : 'IN';
        elecPin.role = 'UART';
        elecPin.protocol = 'UART';
        elecPin.voltage = null;
        elecPin.maxVoltage = Number((logicV + 0.3).toFixed(2));
        elecPin.internalResistance = 25;
      } else {
        elecPin.direction = 'IO';
        elecPin.role = 'GPIO';
        elecPin.protocol = pwmPinSet.has(pinName) ? 'PWM' : 'GPIO';
        elecPin.voltage = null;
        elecPin.maxVoltage = Number((logicV + 0.3).toFixed(2));
        elecPin.internalResistance = 25; // ~25Ω MCU GPIO pin driver impedance
      }
    }

    // Bridge all onboard GND pins together on the PCB ground plane
    if (gndPins.length > 1) {
      const primaryGnd = gndPins[0];
      for (let i = 1; i < gndPins.length; i++) {
        this.defineInternalBridge(primaryGnd, gndPins[i]);
      }
    }
  }

  /**
   * Drives a GPIO/PWM pin to a target voltage (or HIGH/LOW boolean) for circuit flow simulation.
   * @param {string} pinOrRole
   * @param {number|boolean|null} voltageOrHigh
   * @param {object} [signalMeta]
   */
  drivePin(pinOrRole, voltageOrHigh, signalMeta = {}) {
    const resolved = this.resolvePinName(pinOrRole);
    const elecPin = this.electricalPins.get(resolved);
    if (!elecPin) return null;

    const logicV = this.capabilities?.logicVoltage ?? 5.0;
    if (voltageOrHigh === null || voltageOrHigh === undefined) {
      elecPin.setHighImpedance();
      return elecPin;
    }

    const v =
      typeof voltageOrHigh === 'boolean'
        ? voltageOrHigh
          ? logicV
          : 0
        : Number(voltageOrHigh);

    elecPin.driveVoltage(v, signalMeta);
    return elecPin;
  }

  /**
   * Configures a GPIO pin's direction ('IN', 'OUT', 'IO', 'HIGH_Z').
   * @param {string} pinOrRole
   * @param {'IN'|'OUT'|'IO'|'HIGH_Z'} direction
   */
  setPinDirection(pinOrRole, direction = 'IN') {
    const resolved = this.resolvePinName(pinOrRole);
    const elecPin = this.electricalPins.get(resolved);
    if (!elecPin) return null;
    elecPin.direction = direction;
    if (direction === 'IN' || direction === 'HIGH_Z') {
      elecPin.voltage = null;
    }
    return elecPin;
  }

  /**
   * Subclasses override to declare their electrical & compute specifications.
   */
  getBoardCapabilities() {
    return {};
  }

  /**
   * Subclasses override to map universal pin roles (and cross-board pin aliases)
   * to their own physical header pins.
   */
  registerDefaultPinRoles() {}

  /**
   * Maps a logical role or alias to a physical pin defined via `definePin()`.
   * @param {string} roleOrAlias
   * @param {string} physicalPinName
   */
  definePinRole(roleOrAlias, physicalPinName) {
    if (!this.pinRoles) this.pinRoles = {};
    this.pinRoles[roleOrAlias] = physicalPinName;
    return this;
  }

  /**
   * Resolves a pin name, cross-board alias, or logical role (e.g. '@PWM_1', 'PIN13', 'GPIO2')
   * into an existing physical pin key on this board.
   * @param {string} pinOrRole
   * @returns {string}
   */
  resolvePinName(pinOrRole) {
    if (!pinOrRole) return 'GND';
    const raw = String(pinOrRole).trim();
    if (this.pins && this.pins[raw]) {
      return raw;
    }
    if (this.pinRoles && this.pinRoles[raw]) {
      return this.pinRoles[raw];
    }
    const upper = raw.toUpperCase();
    if (this.pins && this.pins[upper]) {
      return upper;
    }
    if (this.pinRoles && this.pinRoles[upper]) {
      return this.pinRoles[upper];
    }
    if (/^GND[_]?\d*$/.test(upper)) {
      const compact = upper.replace('_', '');
      if (this.pins?.[compact]) return compact;
      if (this.pins?.GND2) return 'GND2';
      if (this.pins?.GND) return 'GND';
    }
    const digMatch = /^(?:D|PIN|GPIO)(\d+)$/.exec(upper);
    if (digMatch) {
      const num = digMatch[1];
      if (this.pins?.[`PIN${num}`]) return `PIN${num}`;
      if (this.pins?.[`GPIO${num}`]) return `GPIO${num}`;
      if (this.pins?.[`D${num}`]) return `D${num}`;
    }
    return raw;
  }

  /**
   * Overrides HardwareComponent.getPinWorldPosition to transparently resolve logical pin roles
   * and cross-board pin aliases before computing 3D world coordinates.
   * @param {string} pinOrRole
   * @returns {number[]}
   */
  getPinWorldPosition(pinOrRole) {
    const resolved = this.resolvePinName(pinOrRole);
    return super.getPinWorldPosition(resolved);
  }

  /**
   * Returns the maximum integer value of the onboard ADC (e.g. 1023 for 10-bit Uno, 4095 for 12-bit ESP32, 0 if no native ADC).
   * @returns {number}
   */
  getMaxAdcValue() {
    const bits = this.capabilities?.adcBits ?? 0;
    return bits > 0 ? (1 << bits) - 1 : 0;
  }

  /**
   * Checks whether an external component signal voltage is safe for this host board's GPIO logic level
   * without a bidirectional logic level shifter (e.g. 3.3V ESP32 & Jetson Nano vs 5.0V Arduino Uno).
   * @param {number} signalVoltage
   * @returns {boolean}
   */
  isVoltageCompatible(signalVoltage) {
    const maxSafe = (this.capabilities?.logicVoltage || 3.3) + 0.3;
    return Number(signalVoltage) <= maxSafe;
  }

  /**
   * Returns the flash protocol ID used by WebSerialTransport / FlashProtocolRegistry for this board.
   * @returns {string}
   */
  getFlashProtocolId() {
    return this.constructor.flashProtocolId || 'generic.serial';
  }

  /**
   * Returns WebSerial USB Vendor/Product ID filters (`navigator.serial.requestPort({ filters })`).
   * @returns {Array<{ usbVendorId: number, usbProductId?: number }>}
   */
  getUsbFilters() {
    return [...(this.constructor.usbFilters || [])];
  }

  /**
   * Controls an onboard status/activity SMD LED ('on', 'l', 'tx', 'rx', 'wifi').
   */
  setOnboardLed(ledId, on, intensity = 1.6) {
    const led = this.refs.leds?.[ledId];
    if (!led) return;
    led.lensMat.emissiveIntensity = on ? intensity : 0.08;
    if (led.glow?.material) {
      led.glow.material.opacity = on ? 0.82 : 0;
    }
    this.state.leds = {
      ...(this.state.leds || {}),
      [ledId]: Boolean(on)
    };
  }

  /**
   * Returns world-space 3D callout descriptors for all onboard subsystems.
   */
  getSubsystemCallouts() {
    return (this.boardCallouts || []).map((c) => ({
      ...c,
      worldAnchor: () => c.anchor.clone().add(this.group.position)
    }));
  }

  /**
   * Assigns per-board firmware source code (`void setup() / void loop()` or Python script)
   * so this board executes as an independent ReactFlow MCU Node in Multi-MCU scenes.
   * @param {string} sourceCode
   */
  setFirmwareCode(sourceCode) {
    this.firmwareCode = String(sourceCode ?? '');
    this.setState({ hasFirmware: this.firmwareCode.trim().length > 0 });
    return this;
  }

  loadFirmware(sourceCode) {
    return this.setFirmwareCode(sourceCode);
  }

  /**
   * Reads the instantaneous voltage (in Volts) sensed or driven on a board pin.
   * @param {string} pinOrRole
   * @returns {number}
   */
  readPinVoltage(pinOrRole) {
    const ePin = this.getPin(pinOrRole);
    if (!ePin) return 0;
    return Number(ePin.sensedVoltage ?? ePin.voltage ?? ePin.drivenVoltage ?? 0);
  }

  /**
   * Reads the digital logic level (`1` = HIGH, `0` = LOW) sensed on a board pin.
   * @param {string} pinOrRole
   * @returns {number}
   */
  digitalReadPin(pinOrRole) {
    return this.readPinVoltage(pinOrRole) >= 2.0 ? 1 : 0;
  }

  /**
   * Reads the quantized ADC integer value (`0..1023` on 10-bit Uno, `0..4095` on 12-bit ESP32) on an analog pin.
   * @param {string} pinOrRole
   * @returns {number}
   */
  analogReadPin(pinOrRole) {
    const v = this.readPinVoltage(pinOrRole);
    const maxAdc = this.getMaxAdcValue() || 1023;
    const logicV = this.logicVoltage || 5.0;
    return Math.max(0, Math.min(maxAdc, Math.round((v / logicV) * maxAdc)));
  }

  /**
   * Transmits a UART / I2C serial frame out of this board's `TX0` (or `SDA`) pin onto any wired receiving MCU's `RX0` pin.
   * @param {string} text
   * @param {{ pin?: string, protocol?: string, baud?: number }} [opts={}]
   */
  transmitSerial(text, { pin = 'TX0', protocol = 'UART', baud = 9600 } = {}) {
    const resolvedTx = this.resolvePinName(pin);
    const txPinName = this.pins?.[resolvedTx]
      ? resolvedTx
      : this.pins?.TX0
        ? 'TX0'
        : this.pins?.PIN1
          ? 'PIN1'
          : this.pins?.GPIO1
            ? 'GPIO1'
            : resolvedTx;
    const msg = String(text ?? '');
    const frameMeta = {
      protocol,
      baud,
      uartFrame: msg,
      text: msg,
      sourceBoardId: this.id,
      seq: (this.txHistory.length || 0) + 1
    };
    this.drivePin(txPinName, this.logicVoltage, frameMeta);
    this.txHistory.push({
      text: msg,
      pin: txPinName,
      protocol,
      timestamp: Date.now()
    });
    if (this.txHistory.length > 50) {
      this.txHistory.shift();
    }
    this.setOnboardLed('tx', true);
    return frameMeta;
  }

  hasSerialData() {
    return this.rxBuffer.length > 0 || Boolean(this.state?.lastRxMessage);
  }

  readSerialMessage() {
    if (this.rxBuffer.length > 0) {
      const item = this.rxBuffer.shift();
      this.setState({ serialAvailable: this.rxBuffer.length });
      return item.text;
    }
    return this.state?.lastRxMessage || '';
  }

  /**
   * ReactFlow-style Node contract (`evaluate({ pins, state, dt, stageEnv, report })`) for Host MCU/SBC Boards.
   * Captures incoming pin-to-pin GPIO voltages and cross-board UART/I2C serial frames (`TX0 -> RX0`, `SDA -> SDA`).
   */
  evaluate({ pins = {}, state = {}, dt = 0.016, stageEnv = null, report = {} } = {}) {
    const sensedSnapshot = {};
    for (const [k, desc] of Object.entries(pins)) {
      if (desc && typeof desc === 'object') {
        sensedSnapshot[k] = {
          voltage: Number(desc.voltage || 0),
          high: Boolean(desc.high),
          logicLevel: Number(desc.logicLevel || 0),
          protocol: desc.protocol || 'GPIO'
        };
      }
    }
    this.sensedPins = sensedSnapshot;

    let lastRxMessage = state.lastRxMessage || null;
    let lastSenderBoardId = state.lastSenderBoardId || null;
    const signals = Array.isArray(report?.signals) ? report.signals : [];

    for (const sig of signals) {
      if (sig.sourceComponentId && sig.sourceComponentId === this.id) continue;
      const frameText =
        sig.uartFrame ??
        sig.text ??
        sig.payload?.uartFrame ??
        sig.payload?.text ??
        null;
      if (typeof frameText === 'string' && frameText.length > 0) {
        lastRxMessage = frameText;
        lastSenderBoardId = sig.sourceComponentId || sig.payload?.sourceBoardId || null;
        const alreadyQueued =
          this.rxBuffer.length > 0 &&
          this.rxBuffer[this.rxBuffer.length - 1].text === frameText &&
          this.rxBuffer[this.rxBuffer.length - 1].fromBoardId === lastSenderBoardId;
        if (!alreadyQueued) {
          this.rxBuffer.push({
            text: frameText,
            fromBoardId: lastSenderBoardId,
            protocol: sig.protocol || 'UART',
            timestamp: Date.now()
          });
          if (this.rxBuffer.length > 50) {
            this.rxBuffer.shift();
          }
        }
        this.setOnboardLed('rx', true);
      }
    }

    const customResult =
      typeof this._customEvaluator === 'function'
        ? this._customEvaluator.call(this, { pins, state, dt, stageEnv, report })
        : null;

    return {
      state: {
        lastRxMessage,
        lastSenderBoardId,
        serialAvailable: this.rxBuffer.length || (lastRxMessage ? lastRxMessage.length : 0),
        ...(customResult?.state || {})
      },
      outputs: {
        ...(customResult?.outputs || {})
      }
    };
  }
}
