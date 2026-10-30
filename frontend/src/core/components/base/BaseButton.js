import { HardwareComponent } from '../HardwareComponent.js';

/**
 * Abstract Base Class for all momentary/latching Button & Switch components.
 * Subclasses (e.g. TactilePushButton, ArcadeCapButton) inherit press/release mechanics,
 * plunger stroke kinematics, and INPUT_PULLUP / INPUT_PULLDOWN digital logic levels.
 */
export class BaseButton extends HardwareComponent {
  static typeId = 'abstract.button';
  static category = 'buttons';
  static displayName = 'Abstract Button';

  constructor(options = {}) {
    if (new.target === BaseButton) {
      throw new Error('BaseButton is an abstract base class and cannot be instantiated directly.');
    }
    super(options);
  }

  getDefaultState() {
    return {
      pressed: false,
      wiringMode: 'INPUT_PULLUP', // 'INPUT_PULLUP' -> pressed=LOW(0), 'INPUT_PULLDOWN' -> pressed=HIGH(1)
      plungerRestY: 7.8,
      plungerStroke: 0.9,
      pressCount: 0
    };
  }

  /**
   * Depresses the button plunger.
   */
  press() {
    if (this.state.pressed) return this.state;
    return this.setState({
      pressed: true,
      pressCount: (this.state.pressCount || 0) + 1
    });
  }

  /**
   * Releases the button plunger back to rest height.
   */
  release() {
    if (!this.state.pressed) return this.state;
    return this.setState({ pressed: false });
  }

  /**
   * Toggles button state.
   */
  toggle() {
    return this.state.pressed ? this.release() : this.press();
  }

  /**
   * Returns the digital logic level seen by an Arduino pin (0 = LOW, 1 = HIGH).
   */
  readDigitalLevel() {
    if (this.state.wiringMode === 'INPUT_PULLDOWN') {
      return this.state.pressed ? 1 : 0;
    }
    // Default INPUT_PULLUP: LOW (0) when pressed, HIGH (1) when released
    return this.state.pressed ? 0 : 1;
  }

  /**
   * Configures the inherited mechanical switch contact dipole between TERMINAL_A and TERMINAL_B.
   * Open (`closed: false`) when released; closes (`closed: true`) with ~0.05Ω when pressed.
   */
  setupElectricalModel(options = {}) {
    const termA = this.electricalPins.get('TERMINAL_A');
    if (termA) {
      termA.direction = 'passive';
      termA.role = 'SWITCH_A';
      termA.protocol = 'GPIO';
    }
    const termB = this.electricalPins.get('TERMINAL_B');
    if (termB) {
      termB.direction = 'passive';
      termB.role = 'SWITCH_B';
      termB.protocol = 'DC';
    }
    if (this.pins.TERMINAL_A && this.pins.TERMINAL_B && this.internalDipoles.length === 0) {
      this.defineDipole({
        id: `${this.id}.contact`,
        pinA: 'TERMINAL_A',
        pinB: 'TERMINAL_B',
        resistance: options.contactResistance ?? 0.05,
        forwardVoltage: 0,
        unidirectional: false,
        maxCurrent: options.maxCurrent ?? 0.25,
        closed: Boolean(this.state?.pressed)
      });
    }
  }

  onStateChange(newState) {
    const plunger = this.refs.plunger;
    if (plunger) {
      const restY = newState.plungerRestY ?? 7.8;
      const stroke = newState.plungerStroke ?? 0.9;
      plunger.position.y = newState.pressed ? restY - stroke : restY;
    }
    for (const dipole of this.internalDipoles) {
      dipole.closed = Boolean(newState.pressed);
    }
  }

  /**
   * ReactFlow-style Node contract (`evaluate({ pins, state, dt, stageEnv, report })`).
   * Synchronizes internal switch dipole closure with `state.pressed` and bridges terminal voltage
   * across `TERMINAL_A <-> TERMINAL_B` when depressed.
   */
  evaluate({ pins = {}, state = {} } = {}) {
    const isPressed = Boolean(state.pressed);
    for (const dipole of this.internalDipoles) {
      dipole.closed = isPressed;
    }

    const vA = Number(pins.TERMINAL_A?.voltage || 0);
    const vB = Number(pins.TERMINAL_B?.voltage || 0);
    const bridgedVoltage = isPressed ? Math.max(vA, vB) : 0;

    return {
      state: {
        pressed: isPressed,
        bridgedVoltage,
        digitalLevel: this.readDigitalLevel()
      }
    };
  }
}
