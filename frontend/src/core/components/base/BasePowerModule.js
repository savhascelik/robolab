import { HardwareComponent } from '../HardwareComponent.js';

/**
 * Abstract Base Class for High-Current Power Supplies, LiPo Battery Packs & DC-DC Telemetry Regulators.
 * Subclasses inherit nominal voltage, cell count, state-of-charge (SoC), discharge rating,
 * and source/shunt dipole configuration.
 */
export class BasePowerModule extends HardwareComponent {
  static typeId = 'abstract.power_module';
  static category = 'power';
  static displayName = 'Abstract Power Module';

  constructor(options = {}) {
    if (new.target === BasePowerModule) {
      throw new Error('BasePowerModule is an abstract base class and cannot be instantiated directly.');
    }
    super(options);
  }

  getDefaultState() {
    return {
      nominalVoltage: 11.1,
      regulatedVoltage: 5.0,
      cellCount: 3,
      capacityMah: 1300,
      stateOfChargePct: 94,
      currentDrawAmps: 1.45,
      enabled: true
    };
  }

  /**
   * Updates battery State of Charge (0..100%).
   * @param {number} pct
   */
  setStateOfCharge(pct) {
    const clamped = Math.max(0, Math.min(100, Math.round(Number(pct) || 0)));
    return this.setState({ stateOfChargePct: clamped });
  }

  /**
   * Computes instantaneous terminal voltage based on cell count and State of Charge.
   * @returns {number}
   */
  getTerminalVoltage() {
    const cells = this.state.cellCount || 3;
    const soc = (this.state.stateOfChargePct ?? 90) / 100;
    const cellV = 3.5 + soc * 0.7;
    return Number((cells * cellV).toFixed(2));
  }

  setupElectricalModel(options = {}) {
    const vcc = this.electricalPins.get('VCC') || this.electricalPins.get('VOUT_5V');
    if (vcc) {
      vcc.direction = 'OUT';
      vcc.role = 'VCC_SOURCE';
      vcc.protocol = 'DC';
      vcc.driveVoltage(options.outputVoltage ?? this.state.nominalVoltage ?? 11.1);
    }
    const gnd = this.electricalPins.get('GND');
    if (gnd) {
      gnd.direction = 'BIDIR';
      gnd.role = 'GND_REF';
      gnd.protocol = 'DC';
      gnd.driveVoltage(0);
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

    const posPin = this.pins.VCC ? 'VCC' : (this.pins.VOUT_5V ? 'VOUT_5V' : null);
    if (posPin && this.pins.GND && this.internalDipoles.length === 0) {
      this.defineDipole({
        id: `${this.id}.power_shunt`,
        pinA: posPin,
        pinB: 'GND',
        resistance: options.internalResistance ?? 850,
        forwardVoltage: 0,
        unidirectional: false,
        maxCurrent: options.maxCurrent ?? 15.0,
        minVoltage: 0.5,
        closed: true
      });
    }
  }
}
