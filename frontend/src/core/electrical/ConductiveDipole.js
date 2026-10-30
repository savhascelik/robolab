/**
 * Universal Internal Conductive Path (`ConductiveDipole`) between two pins of a component.
 *
 * Models how electricity flows THROUGH a component from `pinA` to `pinB`:
 * - Wires / Breadboard strips: `resistance: 0.01`, `unidirectional: false`
 * - Resistors: `resistance: 220` (or custom Ohms), `unidirectional: false`
 * - Switches / Buttons: `closed: true/false`, `resistance: 0.05` when closed
 * - Diodes / LEDs: `unidirectional: true`, `forwardVoltage: 2.0`, `resistance: 5`, `maxCurrent: 0.03`
 * - Motors / Coils / Actuators: `resistance: 20`, `minVoltage: 2.5`, `maxCurrent: 0.5`
 * - Custom AI Components: any combination of the above declarative physical parameters!
 */
export class ConductiveDipole {
  /**
   * @param {object} config
   * @param {string} config.id Unique path identifier within the component
   * @param {string} config.pinA First terminal pin name (Anode / Terminal 1 / VCC)
   * @param {string} config.pinB Second terminal pin name (Cathode / Terminal 2 / GND)
   * @param {number} [config.resistance] Internal resistance in Ohms
   * @param {number} [config.forwardVoltage] Forward voltage drop (Vf) in Volts
   * @param {boolean} [config.unidirectional] If true, current only conducts from `pinA` -> `pinB`
   * @param {number} [config.maxCurrent] Maximum safe current in Amperes before burnout
   * @param {number} [config.minVoltage] Minimum voltage across dipole for active work
   * @param {boolean} [config.closed] Whether the conductive path is currently closed (true) or open (false)
   */
  constructor(config = {}) {
    this.id = config.id || `${config.pinA}_${config.pinB}`;
    this.pinA = config.pinA;
    this.pinB = config.pinB;
    this.resistance = Math.max(0.001, Number(config.resistance ?? 10));
    this.forwardVoltage = Math.max(0, Number(config.forwardVoltage ?? 0));
    this.unidirectional = Boolean(config.unidirectional);
    this.maxCurrent = Number(config.maxCurrent ?? 1.0);
    this.minVoltage = Number(config.minVoltage ?? 0);
    this.closed = config.closed !== undefined ? Boolean(config.closed) : true;
  }

  /**
   * Evaluates whether current can flow from `fromPin` to `toPin`.
   * @param {string} fromPin
   * @param {string} toPin
   * @returns {{ canConduct: boolean, reverseBiased: boolean }}
   */
  evaluateDirection(fromPin, toPin) {
    if (!this.closed) {
      return { canConduct: false, reverseBiased: false };
    }
    if (fromPin === this.pinA && toPin === this.pinB) {
      return { canConduct: true, reverseBiased: false };
    }
    if (fromPin === this.pinB && toPin === this.pinA) {
      if (this.unidirectional) {
        return { canConduct: false, reverseBiased: true };
      }
      return { canConduct: true, reverseBiased: false };
    }
    return { canConduct: false, reverseBiased: false };
  }
}
