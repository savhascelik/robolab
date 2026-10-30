import { HardwareComponent } from '../HardwareComponent.js';

/**
 * Abstract Base Class for Passive Electronic Components & Conductors (Resistors, Capacitors, Jumper Wires).
 */
export class BasePassiveComponent extends HardwareComponent {
  static typeId = 'abstract.passive';
  static category = 'passives';
  static displayName = 'Abstract Passive Component';

  constructor(options = {}) {
    if (new.target === BasePassiveComponent) {
      throw new Error('BasePassiveComponent is an abstract base class and cannot be instantiated directly.');
    }
    super(options);
  }

  getDefaultState() {
    return {
      ohms: 220
    };
  }

  /**
   * Configures the inherited bidirectional resistive dipole between LEAD_A and LEAD_B.
   */
  setupElectricalModel(options = {}) {
    const leadA = this.electricalPins.get('LEAD_A');
    if (leadA) {
      leadA.direction = 'passive';
      leadA.role = 'PASSIVE';
    }
    const leadB = this.electricalPins.get('LEAD_B');
    if (leadB) {
      leadB.direction = 'passive';
      leadB.role = 'PASSIVE';
    }
    if (this.pins.LEAD_A && this.pins.LEAD_B && this.internalDipoles.length === 0) {
      const ohms = Number(options.ohms ?? this.state?.ohms ?? 220);
      if (this.state && options.ohms !== undefined) {
        this.state.ohms = ohms;
      }
      this.defineDipole({
        id: `${this.id}.resistor`,
        pinA: 'LEAD_A',
        pinB: 'LEAD_B',
        resistance: ohms,
        forwardVoltage: 0,
        unidirectional: false,
        maxCurrent: options.maxCurrent ?? 0.5,
        closed: true
      });
    }
  }

  /**
   * ReactFlow-style Node contract (`evaluate({ pins, state, dt, stageEnv, report })`).
   * Synchronizes dipole resistance with `state.ohms` and computes real-time voltage drop and power dissipation.
   */
  evaluate({ state = {}, report = {} } = {}) {
    const ohms = Math.max(0.01, Number(state.ohms ?? 220));
    for (const dipole of this.internalDipoles) {
      if (dipole.pinA === 'LEAD_A' && dipole.pinB === 'LEAD_B') {
        dipole.resistance = ohms;
      }
    }
    const currentAmps = Number(report?.current || 0);
    const powerMw = Number((currentAmps * currentAmps * ohms * 1000).toFixed(2));
    return {
      state: {
        ohms,
        powerMw
      }
    };
  }
}
