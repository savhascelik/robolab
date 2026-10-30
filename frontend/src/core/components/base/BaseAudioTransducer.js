import { HardwareComponent } from '../HardwareComponent.js';

/**
 * Abstract Base Class for Acoustic / Audio Transducers (Piezo Buzzer, Speaker).
 */
export class BaseAudioTransducer extends HardwareComponent {
  static typeId = 'abstract.audio';
  static category = 'audio';
  static displayName = 'Abstract Audio Transducer';

  constructor(options = {}) {
    if (new.target === BaseAudioTransducer) {
      throw new Error('BaseAudioTransducer is an abstract base class and cannot be instantiated directly.');
    }
    super(options);
  }

  getDefaultState() {
    return {
      frequencyHz: 0,
      playing: false
    };
  }

  setTone(frequencyHz) {
    const hz = Math.max(0, Number(frequencyHz) || 0);
    return this.setState({
      frequencyHz: hz,
      playing: hz > 0
    });
  }

  noTone() {
    return this.setState({
      frequencyHz: 0,
      playing: false
    });
  }

  /**
   * Configures the inherited acoustic transducer dipole between POSITIVE and NEGATIVE.
   */
  setupElectricalModel(options = {}) {
    const pos = this.electricalPins.get('POSITIVE');
    if (pos) {
      pos.direction = 'IN';
      pos.role = 'ANODE';
      pos.protocol = 'PWM';
    }
    const neg = this.electricalPins.get('NEGATIVE');
    if (neg) {
      neg.direction = 'IN';
      neg.role = 'CATHODE';
      neg.protocol = 'DC';
    }
    if (this.pins.POSITIVE && this.pins.NEGATIVE && this.internalDipoles.length === 0) {
      this.defineDipole({
        id: `${this.id}.transducer`,
        pinA: 'POSITIVE',
        pinB: 'NEGATIVE',
        resistance: options.impedanceOhms ?? 160,
        forwardVoltage: 0,
        unidirectional: true,
        maxCurrent: options.maxCurrent ?? 0.06,
        minVoltage: options.minVoltage ?? 1.5,
        closed: true
      });
    }
  }

  onElectricalFlow(report) {
    if (this.state.burnedOut || !report.closedLoop || report.reverseBiased || report.current <= 0) {
      this.noTone();
      return;
    }
    const toneSig = (report.signals || []).find((s) => typeof s.frequencyHz === 'number' && s.frequencyHz > 0);
    this.setTone(toneSig ? toneSig.frequencyHz : this.state.frequencyHz || 440);
  }

  /**
   * ReactFlow-style Node contract (`evaluate({ pins, state, dt, stageEnv, report })`).
   */
  evaluate({ state = {}, report = {} } = {}) {
    if (state.burnedOut || !report?.closedLoop || report?.reverseBiased || (report?.current || 0) <= 0) {
      return {
        state: {
          frequencyHz: 0,
          playing: false
        }
      };
    }
    const toneSig = (report?.signals || []).find((s) => typeof s.frequencyHz === 'number' && s.frequencyHz > 0);
    const hz = toneSig ? toneSig.frequencyHz : state.frequencyHz || 440;
    return {
      state: {
        frequencyHz: hz,
        playing: hz > 0
      }
    };
  }
}
