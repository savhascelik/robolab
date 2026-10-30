/**
 * Universal Electrical Pin Model (`ElectricalPin`).
 *
 * Represents the physical and electrical capabilities of a single terminal/pin on any
 * `HardwareComponent` (MCU GPIO, Power Rail, LED Anode/Cathode, Sensor Pin, or AI Custom Component).
 * Contains zero hardcoded component-type assumptions.
 */
export class ElectricalPin {
  /**
   * @param {object} config
   * @param {string} config.componentId
   * @param {string} config.pinName
   * @param {number[]} [config.localCoords] [x, y, z]
   * @param {'power'|'ground'|'output'|'input'|'bidirectional'|'passive'} [config.direction]
   * @param {number|null} [config.drivenVoltage] Voltage driven onto the net when active source (e.g. 5.0, 3.3, 0.0)
   * @param {number} [config.maxVoltage] Maximum safe voltage before overvoltage damage
   * @param {number} [config.maxCurrent] Maximum safe current in Amperes
   * @param {number} [config.impedance] Output source resistance or input impedance in Ohms
   * @param {string} [config.protocol] 'DC' | 'GPIO' | 'PWM' | 'ADC' | 'UART' | 'I2C' | 'SPI'
   * @param {string} [config.i18nKey] Optional translation key for pin description
   */
  constructor(config = {}) {
    this.componentId = config.componentId || 'unknown';
    this.pinName = config.pinName || 'PIN';
    this.localCoords = Array.isArray(config.localCoords) ? [...config.localCoords] : [0, 0, 0];
    this.direction = config.direction || 'passive';
    this.role = config.role || 'SIGNAL';
    this.drivenVoltage = config.drivenVoltage ?? config.voltage ?? null;
    this.sensedVoltage = this.drivenVoltage !== null ? Number(this.drivenVoltage) : 0;
    this.nominalVoltage = config.nominalVoltage ?? 5.0;
    this.maxVoltage = config.maxVoltage ?? 12.0;
    this.maxCurrent = config.maxCurrent ?? 1.0;
    this.impedance =
      config.impedance ??
      config.internalResistance ??
      (this.direction === 'input' || this.direction === 'IN' ? 10_000_000 : 0.05);
    this.protocol = config.protocol || 'DC';
    this.i18nKey = config.i18nKey || null;
    this.signal = config.signal || null;
    this.pwmDuty = config.pwmDuty ?? (this.drivenVoltage >= 2.0 ? 1.0 : 0.0);
  }

  get name() {
    return this.pinName;
  }

  get localPosition() {
    return {
      x: Number(this.localCoords?.[0] || 0),
      y: Number(this.localCoords?.[1] || 0),
      z: Number(this.localCoords?.[2] || 0)
    };
  }

  get voltage() {
    if (this.drivenVoltage !== null && (this.isVoltageSource() || this.isGroundSink())) {
      return this.drivenVoltage;
    }
    return this.sensedVoltage !== null && this.sensedVoltage !== undefined
      ? this.sensedVoltage
      : (this.drivenVoltage ?? 0);
  }

  set voltage(val) {
    const num = val === null || val === undefined ? null : Number(val);
    this.sensedVoltage = num !== null && Number.isFinite(num) ? num : 0;
    this.drivenVoltage = num !== null && Number.isFinite(num) ? num : null;
  }

  /**
   * Instantaneous digital logic level (`1` for HIGH >= 2.0V, `0` for LOW).
   * @returns {0|1}
   */
  get logicLevel() {
    return (Number(this.voltage) || 0) >= 2.0 ? 1 : 0;
  }

  /**
   * Whether the pin is currently at a logic HIGH potential (>= 2.0V).
   * @returns {boolean}
   */
  get high() {
    return this.logicLevel === 1;
  }

  get internalResistance() {
    return this.impedance;
  }

  set internalResistance(val) {
    this.impedance = val;
  }

  /**
   * Drives a specific voltage (and optional signal payload) onto this pin.
   * @param {number} voltage
   * @param {object|null} [signalMeta]
   */
  driveVoltage(voltage, signalMeta = null) {
    const v = Number(voltage);
    const safeV = Number.isFinite(v) ? v : 0;
    this.drivenVoltage = safeV;
    this.sensedVoltage = safeV;
    this.pwmDuty = signalMeta?.pwmDuty ?? (safeV >= 2.0 ? 1.0 : 0.0);
    if (this.direction !== 'power' && this.direction !== 'POWER' && this.direction !== 'ground' && this.direction !== 'GND') {
      this.direction = 'output';
    }
    if (signalMeta) {
      this.signal = { ...signalMeta };
      if (signalMeta.protocol) {
        this.protocol = signalMeta.protocol;
      }
    }
    return this;
  }

  /**
   * Places this pin in a high-impedance (floating / input) state.
   */
  setHighImpedance() {
    this.direction = 'input';
    this.drivenVoltage = null;
    this.sensedVoltage = 0;
    this.pwmDuty = 0;
    this.signal = null;
    return this;
  }

  /**
   * Canonical endpoint identifier (`<componentId>.<pinName>`).
   * @returns {string}
   */
  get endpointId() {
    return `${this.componentId}.${this.pinName}`;
  }

  /**
   * Whether this pin actively drives a positive or high potential onto its connected net.
   * @returns {boolean}
   */
  isVoltageSource() {
    const dir = String(this.direction).toLowerCase();
    return (
      (dir === 'power' || dir === 'output' || dir === 'out') &&
      typeof this.drivenVoltage === 'number' &&
      this.drivenVoltage > 0
    );
  }

  /**
   * Whether this pin acts as a ground / 0V return sink.
   * @returns {boolean}
   */
  isGroundSink() {
    const dir = String(this.direction).toLowerCase();
    return (
      dir === 'ground' ||
      dir === 'gnd' ||
      ((dir === 'output' || dir === 'out') && typeof this.drivenVoltage === 'number' && this.drivenVoltage === 0)
    );
  }
}
