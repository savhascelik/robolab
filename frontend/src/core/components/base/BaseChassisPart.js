import { HardwareComponent } from '../HardwareComponent.js';

/**
 * Abstract Base Class for Precision Structural / CNC / Armor / Harness Robot Sub-Assemblies.
 * Subclasses inherit mounting anchor metadata, material finish descriptors,
 * and chassis ground-shield continuity dipoles.
 */
export class BaseChassisPart extends HardwareComponent {
  static typeId = 'abstract.chassis_part';
  static category = 'robotics';
  static displayName = 'Abstract Chassis Part';

  constructor(options = {}) {
    if (new.target === BaseChassisPart) {
      throw new Error('BaseChassisPart is an abstract base class and cannot be instantiated directly.');
    }
    super(options);
  }

  getDefaultState() {
    return {
      materialGrade: 'CNC-6061-T6 / 3K-CF',
      structuralIntegrity: 100
    };
  }

  setupElectricalModel(options = {}) {
    const names = Array.from(this.electricalPins.keys());
    for (const [name, pin] of this.electricalPins.entries()) {
      pin.direction = 'BIDIR';
      pin.role = name.includes('GND') ? 'GND_SHIELD' : 'BUS_PASS';
      pin.protocol = 'DC';
    }
    if (names.length >= 2 && this.internalDipoles.length === 0) {
      this.defineDipole({
        id: `${this.id}.chassis_bond`,
        pinA: names[0],
        pinB: names[1],
        resistance: options.bondResistance ?? 0.05,
        forwardVoltage: 0,
        unidirectional: false,
        maxCurrent: 20.0,
        minVoltage: 0,
        closed: true
      });
    }
  }
}
