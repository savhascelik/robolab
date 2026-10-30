import { HardwareComponent } from '../HardwareComponent.js';

/**
 * Abstract Base Class for Dual/Quad H-Bridge Motor Driver Modules (e.g. L298N, TB6612FNG, DRV8833).
 * Subclasses inherit dual-channel PWM/direction decoding (ENA, IN1..IN4, ENB),
 * motor output terminal voltage synthesis (OUT1..OUT4), and conductive bridge dipoles.
 */
export class BaseMotorDriver extends HardwareComponent {
  static typeId = 'abstract.motor_driver';
  static category = 'drivers';
  static displayName = 'Abstract Motor Driver';

  constructor(options = {}) {
    if (new.target === BaseMotorDriver) {
      throw new Error('BaseMotorDriver is an abstract base class and cannot be instantiated directly.');
    }
    super(options);
  }

  getDefaultState() {
    return {
      powered: true,
      supplyVoltage: 12.0,
      logicVoltage: 5.0,
      enaPwm: 200,
      enbPwm: 200,
      channelADirection: 'FORWARD',
      channelBDirection: 'FORWARD',
      heatsinkTempC: 34.5
    };
  }

  /**
   * Updates PWM duty cycles (0..255) for Channel A (ENA) and Channel B (ENB).
   * @param {number} enaPwm
   * @param {number} enbPwm
   */
  setChannelPwm(enaPwm, enbPwm = enaPwm) {
    const clampA = Math.max(0, Math.min(255, Math.round(Number(enaPwm) || 0)));
    const clampB = Math.max(0, Math.min(255, Math.round(Number(enbPwm) || 0)));
    this.setState({ enaPwm: clampA, enbPwm: clampB });
    this.syncOutputTerminals();
    return this.state;
  }

  /**
   * Computes output voltage across Channel A or B motor terminals.
   * @param {'A'|'B'} channel
   * @returns {number}
   */
  getChannelOutputVoltage(channel = 'A') {
    const pwm = channel === 'B' ? this.state.enbPwm : this.state.enaPwm;
    const vDrop = 1.4; // L298N Darlington saturation drop
    const vEff = Math.max(0, (this.state.supplyVoltage || 12) - vDrop);
    return Number(((pwm / 255) * vEff).toFixed(2));
  }

  /**
   * Synchronizes H-Bridge motor terminal voltages (`OUT1..OUT4`) so connected
   * DC / N20 / Mecanum motors form true closed conductive loops in `CircuitFlowSolver`.
   */
  syncOutputTerminals() {
    if (!this.electricalPins) return;
    const powered = this.state.powered !== false && !this.state.burnedOut;
    const vOutA = powered ? this.getChannelOutputVoltage('A') : 0;
    const vOutB = powered ? this.getChannelOutputVoltage('B') : 0;

    const out1 = this.electricalPins.get('OUT1');
    const out2 = this.electricalPins.get('OUT2');
    const out3 = this.electricalPins.get('OUT3');
    const out4 = this.electricalPins.get('OUT4');

    if (out1) {
      out1.direction = 'output';
      out1.role = 'MOTOR_OUT';
      if (vOutA > 0) {
        out1.driveVoltage(vOutA, { protocol: 'PWM', dutyCycle: Number((this.state.enaPwm / 255).toFixed(3)) });
      } else {
        out1.drivenVoltage = null;
      }
    }
    if (out2) {
      out2.direction = 'output';
      out2.role = 'MOTOR_OUT';
      out2.driveVoltage(0);
    }
    if (out3) {
      out3.direction = 'output';
      out3.role = 'MOTOR_OUT';
      if (vOutB > 0) {
        out3.driveVoltage(vOutB, { protocol: 'PWM', dutyCycle: Number((this.state.enbPwm / 255).toFixed(3)) });
      } else {
        out3.drivenVoltage = null;
      }
    }
    if (out4) {
      out4.direction = 'output';
      out4.role = 'MOTOR_OUT';
      out4.driveVoltage(0);
    }
  }

  setupElectricalModel(options = {}) {
    for (const [name, pin] of this.electricalPins.entries()) {
      if (name === '12V' || name === 'VCC' || name === 'VM') {
        pin.direction = 'IN';
        pin.role = 'VCC_IN';
        pin.protocol = 'DC';
        pin.maxVoltage = 35.0;
      } else if (name === 'GND') {
        pin.direction = 'IN';
        pin.role = 'GND_IN';
        pin.protocol = 'DC';
      } else if (name === '5V') {
        pin.direction = 'output';
        pin.role = 'POWER';
        pin.protocol = 'DC';
        pin.driveVoltage(5.0);
      } else if (name === 'ENA' || name === 'ENB') {
        pin.direction = 'IN';
        pin.role = 'PWM';
        pin.protocol = 'PWM';
      } else if (name.startsWith('IN')) {
        pin.direction = 'IN';
        pin.role = 'GPIO';
        pin.protocol = 'GPIO';
      } else if (name.startsWith('OUT')) {
        pin.direction = 'output';
        pin.role = 'MOTOR_OUT';
        pin.protocol = 'DC';
      }
    }

    const pwrPin = this.pins['12V'] ? '12V' : (this.pins.VCC ? 'VCC' : null);
    if (pwrPin && this.pins.GND && this.internalDipoles.length === 0) {
      this.defineDipole({
        id: `${this.id}.driver_quiescent`,
        pinA: pwrPin,
        pinB: 'GND',
        resistance: options.quiescentResistance ?? 240,
        forwardVoltage: 0,
        unidirectional: false,
        maxCurrent: options.maxCurrent ?? 2.5,
        minVoltage: 4.5,
        closed: true
      });
    }

    this.syncOutputTerminals();
  }

  /**
   * First-class ReactFlow-Node evaluation contract.
   * Reads ENA/ENB/IN1..IN4 inputs and drives OUT1..OUT4 motor bridge voltages.
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
    const isPowered = !state.burnedOut && (report?.closedLoop ? report.current > 0 : state.powered !== false);
    this.state.powered = isPowered;
    this.syncOutputTerminals();
    const vOutA = isPowered ? this.getChannelOutputVoltage('A') : 0;
    const vOutB = isPowered ? this.getChannelOutputVoltage('B') : 0;
    const dutyA = Number(((state.enaPwm || 0) / 255).toFixed(3));
    const dutyB = Number(((state.enbPwm || 0) / 255).toFixed(3));
    const outPins = {};
    if (this.pins?.OUT1) outPins.OUT1 = vOutA > 0 ? { voltage: vOutA, analog: dutyA, pwmDuty: dutyA, protocol: 'PWM' } : null;
    if (this.pins?.OUT2) outPins.OUT2 = { voltage: 0, pwmDuty: 0 };
    if (this.pins?.OUT3) outPins.OUT3 = vOutB > 0 ? { voltage: vOutB, analog: dutyB, pwmDuty: dutyB, protocol: 'PWM' } : null;
    if (this.pins?.OUT4) outPins.OUT4 = { voltage: 0, pwmDuty: 0 };
    return {
      pins: outPins,
      state: {
        powered: isPowered
      }
    };
  }

  onElectricalFlow(report) {
    this.state.powered = !this.state.burnedOut && (report?.closedLoop ? report.current > 0 : this.state.powered !== false);
    if (typeof report.voltageDrop === 'number' && report.voltageDrop > 4.0) {
      this.state.supplyVoltage = report.voltageDrop;
    }
    const enaSig = (report.signals || []).find((s) => s.pinName === 'ENA');
    const enbSig = (report.signals || []).find((s) => s.pinName === 'ENB');
    if (enaSig) {
      if (typeof enaSig.pwm === 'number') {
        this.state.enaPwm = enaSig.pwm;
      } else if (typeof enaSig.dutyCycle === 'number') {
        this.state.enaPwm = Math.round(enaSig.dutyCycle * 255);
      } else if (typeof enaSig.voltage === 'number' && enaSig.voltage > 0) {
        this.state.enaPwm = Math.max(0, Math.min(255, Math.round((enaSig.voltage / 5.0) * 255)));
      }
    }
    if (enbSig) {
      if (typeof enbSig.pwm === 'number') {
        this.state.enbPwm = enbSig.pwm;
      } else if (typeof enbSig.dutyCycle === 'number') {
        this.state.enbPwm = Math.round(enbSig.dutyCycle * 255);
      } else if (typeof enbSig.voltage === 'number' && enbSig.voltage > 0) {
        this.state.enbPwm = Math.max(0, Math.min(255, Math.round((enbSig.voltage / 5.0) * 255)));
      }
    }
    this.syncOutputTerminals();
  }
}
