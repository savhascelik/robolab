import { HardwareComponent } from '../HardwareComponent.js';

/**
 * Abstract Base Class for all Light-Emitting components (Single LED, RGB LED, SMD Indicator).
 * Manages normalized brightness (0..1), 8-bit PWM input (0..255), emissive material intensity,
 * and Layer-1 additive glow sprite opacity.
 */
export class BaseLightEmitter extends HardwareComponent {
  static typeId = 'abstract.light';
  static category = 'leds';
  static displayName = 'Abstract Light Emitter';

  constructor(options = {}) {
    if (new.target === BaseLightEmitter) {
      throw new Error('BaseLightEmitter is an abstract base class and cannot be instantiated directly.');
    }
    super(options);
  }

  getDefaultState() {
    return {
      brightness: 0,
      color: '#e6392e'
    };
  }

  /**
   * Sets normalized brightness between 0.0 and 1.0.
   * @param {number} level
   */
  setBrightness(level) {
    const clamped = Math.max(0, Math.min(1, Number(level) || 0));
    return this.setState({ brightness: clamped });
  }

  /**
   * Sets brightness from an 8-bit Arduino PWM value (0..255).
   * @param {number} pwm
   */
  setPwm(pwm) {
    const clamped = Math.max(0, Math.min(255, Number(pwm) || 0));
    return this.setBrightness(clamped / 255);
  }

  turnOn() {
    return this.setBrightness(1);
  }

  turnOff() {
    return this.setBrightness(0);
  }

  /**
   * Configures the inherited semiconductor PN-junction dipole (Anode -> Cathode).
   * Zero hardcoded solver rules: any subclass of BaseLightEmitter automatically behaves as a diode
   * with forward voltage drop (~2.0V) and overcurrent burnout protection (>30mA).
   */
  setupElectricalModel(options = {}) {
    const anode = this.electricalPins.get('ANODE');
    if (anode) {
      anode.direction = 'IN';
      anode.role = 'ANODE';
      anode.protocol = 'PWM';
    }
    const cathode = this.electricalPins.get('CATHODE');
    if (cathode) {
      cathode.direction = 'IN';
      cathode.role = 'CATHODE';
      cathode.protocol = 'DC';
    }
    if (this.pins.ANODE && this.pins.CATHODE && this.internalDipoles.length === 0) {
      this.defineDipole({
        id: `${this.id}.pn_junction`,
        pinA: 'ANODE',
        pinB: 'CATHODE',
        resistance: options.internalResistance ?? 15,
        forwardVoltage: options.forwardVoltage ?? 2.0,
        unidirectional: true,
        maxCurrent: options.maxCurrent ?? 0.03,
        minVoltage: options.forwardVoltage ?? 1.8,
        closed: true
      });
    }
  }

  /**
   * Polymorphic electrical flow handler: illuminates proportional to closed-loop current,
   * or extinguishes immediately if open-loop, reverse-biased, or burned out.
   */
  onElectricalFlow(report) {
    if (this.state.burnedOut || !report.closedLoop || report.reverseBiased || report.current <= 0) {
      this.turnOff();
      return;
    }
    const nominalCurrent = 0.015; // 15mA nominal full brightness
    const normalized = Math.min(1, report.current / nominalCurrent);
    this.setBrightness(normalized);
  }

  /**
   * ReactFlow-style Node contract (`evaluate({ pins, state, dt, stageEnv, report })`).
   * Maps closed-loop diode current and PWM duty cycle to normalized optical brightness `[0..1]`.
   */
  evaluate({ state = {}, report = {} } = {}) {
    if (state.burnedOut || !report?.closedLoop || report?.reverseBiased || (report?.current || 0) <= 0) {
      return {
        state: {
          brightness: 0,
          energized: false
        }
      };
    }
    const nominalCurrent = 0.015;
    const brightness = Math.max(0, Math.min(1, Number((report.current / nominalCurrent).toFixed(3))));
    return {
      state: {
        brightness,
        energized: brightness > 0
      }
    };
  }

  onStateChange(newState) {
    const b = Math.max(0, Math.min(1, newState.brightness || 0));
    if (this.refs.lensMat) {
      this.refs.lensMat.emissiveIntensity = 0.08 + b * 1.8;
    }
    if (this.refs.glow?.material) {
      this.refs.glow.material.opacity = b * 0.88;
    }
  }
}
