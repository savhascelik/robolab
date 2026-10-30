import { HardwareComponent } from '../HardwareComponent.js';

/**
 * Abstract Base Class for I2C/SPI Graphical & Telemetry Display Modules (e.g. SSD1306 128x64 OLED).
 * Subclasses inherit I2C pin definitions (`GND`, `VCC`, `SCL`, `SDA`), screen brightness/contrast state,
 * and conductive logic rail dipoles.
 */
export class BaseDisplayModule extends HardwareComponent {
  static typeId = 'abstract.display_module';
  static category = 'displays';
  static displayName = 'Abstract Display Module';

  constructor(options = {}) {
    if (new.target === BaseDisplayModule) {
      throw new Error('BaseDisplayModule is an abstract base class and cannot be instantiated directly.');
    }
    super(options);
  }

  getDefaultState() {
    return {
      powered: true,
      brightness: 1.0,
      i2cAddress: '0x3C',
      resolution: '128x64',
      headlineText: 'TENSORRT FP16',
      sublineText: '60.0 FPS | 7.4V'
    };
  }

  /**
   * Updates the telemetry lines shown on the display module.
   * @param {string} headlineText
   * @param {string} [sublineText]
   */
  setTelemetryText(headlineText, sublineText = this.state.sublineText) {
    return this.setState({ headlineText, sublineText });
  }

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
    const scl = this.electricalPins.get('SCL');
    if (scl) {
      scl.direction = 'IN';
      scl.role = 'I2C_SCL';
      scl.protocol = 'I2C';
    }
    const sda = this.electricalPins.get('SDA');
    if (sda) {
      sda.direction = 'BIDIR';
      sda.role = 'I2C_SDA';
      sda.protocol = 'I2C';
    }
    if (this.pins.VCC && this.pins.GND && this.internalDipoles.length === 0) {
      this.defineDipole({
        id: `${this.id}.oled_panel`,
        pinA: 'VCC',
        pinB: 'GND',
        resistance: options.panelResistance ?? 220,
        forwardVoltage: 0,
        unidirectional: false,
        maxCurrent: 0.08,
        minVoltage: 2.8,
        closed: true
      });
    }
  }

  /**
   * First-class ReactFlow-Node evaluation contract.
   * Synchronizes display power and telemetry state with I2C/power pins.
   *
   * @param {{
   *   pins: Record<string, { voltage: number, current: number, digital: number, analog: number, protocol: string }>,
   *   state: Record<string, any>,
   *   dt: number,
   *   stageEnv: Record<string, any>,
   *   report: object|null
   * }} context
   */
  evaluate({ state, report }) {
    const powered = report ? Boolean(report.closedLoop && report.current > 0 && !state.burnedOut) : Boolean(state.powered);
    return {
      state: {
        powered
      }
    };
  }

  onElectricalFlow(report) {
    this.state.powered = Boolean(report.closedLoop && report.current > 0 && !this.state.burnedOut);
  }
}
