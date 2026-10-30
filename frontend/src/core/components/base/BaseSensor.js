import { HardwareComponent } from '../HardwareComponent.js';

/**
 * Abstract Base Class for Analog & Digital Sensors (Potentiometer, Ultrasonic HC-SR04, etc.).
 * Provides range clamping, normalized readout (0..1), and 10-bit Arduino ADC conversion (0..1023).
 */
export class BaseSensor extends HardwareComponent {
  static typeId = 'abstract.sensor';
  static category = 'sensors';
  static displayName = 'Abstract Sensor';

  constructor(options = {}) {
    if (new.target === BaseSensor) {
      throw new Error('BaseSensor is an abstract base class and cannot be instantiated directly.');
    }
    super(options);
  }

  getDefaultState() {
    return {
      minValue: 0,
      maxValue: 1023,
      value: 512,
      unit: 'raw'
    };
  }

  /**
   * Updates the sensor physical measurement, clamped to [minValue, maxValue].
   * @param {number} rawValue
   */
  setValue(rawValue) {
    const min = this.state.minValue ?? 0;
    const max = this.state.maxValue ?? 1023;
    const clamped = Math.max(min, Math.min(max, Number(rawValue) || 0));
    return this.setState({ value: clamped });
  }

  /**
   * Returns normalized sensor reading in [0, 1].
   */
  getNormalizedValue() {
    const min = this.state.minValue ?? 0;
    const max = this.state.maxValue ?? 1023;
    const span = max - min;
    if (span <= 0) return 0;
    return (this.state.value - min) / span;
  }

  /**
   * Simulates Arduino `analogRead()` 10-bit ADC output (0..1023).
   */
  readAnalog10Bit() {
    return Math.round(this.getNormalizedValue() * 1023);
  }

  /**
   * Configures the inherited sensor power rail dipole (VCC -> GND) and output signal pin metadata.
   */
  setupElectricalModel(options = {}) {
    const vcc = this.electricalPins.get('VCC');
    if (vcc) {
      vcc.direction = 'IN';
      vcc.role = 'VCC_IN';
      vcc.protocol = 'DC';
    }
    const gnd = this.electricalPins.get('GND');
    if (gnd) {
      gnd.direction = 'IN';
      gnd.role = 'GND_IN';
      gnd.protocol = 'DC';
    }
    if (this.pins.VCC && this.pins.GND && this.internalDipoles.length === 0) {
      this.defineDipole({
        id: `${this.id}.sensor_rail`,
        pinA: 'VCC',
        pinB: 'GND',
        resistance: options.trackResistance ?? 10000,
        forwardVoltage: 0,
        unidirectional: false,
        maxCurrent: options.maxCurrent ?? 0.05,
        minVoltage: options.minVoltage ?? 2.5,
        closed: true
      });
    }
    const wiper = this.electricalPins.get('WIPER');
    if (wiper) {
      wiper.direction = 'OUT';
      wiper.role = 'ADC';
      wiper.protocol = 'ADC';
    }
    const trig = this.electricalPins.get('TRIG');
    if (trig) {
      trig.direction = 'IN';
      trig.role = 'GPIO';
      trig.protocol = 'GPIO';
    }
    const echo = this.electricalPins.get('ECHO');
    if (echo) {
      echo.direction = 'OUT';
      echo.role = 'GPIO';
      echo.protocol = 'GPIO';
    }
  }

  onElectricalFlow(report) {
    this.state.powered = Boolean(report.closedLoop && report.current > 0 && !this.state.burnedOut);
    const wiper = this.electricalPins.get('WIPER');
    if (wiper && this.state.powered) {
      wiper.driveVoltage(this.getNormalizedValue() * (report.voltage || 5.0));
    }
  }

  /**
   * ReactFlow-style Node contract (`evaluate({ pins, state, dt, stageEnv, report })`).
   * Drives analog/digital output pins (`WIPER`, `OUT`, `SIGNAL`) proportional to `state.value`.
   */
  evaluate({ pins = {}, state = {}, report = {} } = {}) {
    const powered = Boolean(report?.closedLoop || pins.VCC?.high || state.powered !== false);
    const norm = this.getNormalizedValue();
    const vRef = pins.VCC?.voltage > 0 ? pins.VCC.voltage : 5.0;
    const outVoltage = powered ? Number((norm * vRef).toFixed(2)) : 0;
    const adc10Bit = Math.round(norm * 1023);
    const adc12Bit = Math.round(norm * 4095);

    const outputs = {};
    if (this.pins.WIPER) {
      outputs.WIPER = {
        voltage: outVoltage,
        high: outVoltage >= 2.0,
        protocol: 'ADC',
        adc10Bit,
        adc12Bit
      };
    }
    if (this.pins.OUT) {
      outputs.OUT = {
        voltage: outVoltage,
        high: outVoltage >= 2.0,
        protocol: 'ADC',
        adc10Bit
      };
    }
    if (this.pins.SIGNAL) {
      outputs.SIGNAL = {
        voltage: outVoltage,
        high: outVoltage >= 2.0,
        protocol: 'ADC',
        adc10Bit
      };
    }

    return {
      state: {
        powered
      },
      outputs
    };
  }
}
