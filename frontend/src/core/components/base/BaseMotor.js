import { HardwareComponent } from '../HardwareComponent.js';

/**
 * Abstract Base Class for all electromechanical Rotary/Linear Actuators & Motors.
 * Subclasses (e.g. DCMotorComponent, ServoMotorComponent) inherit PWM duty-cycle clamping,
 * angular/RPM kinematics, frame-rate independent update(dt), and emergencyStop().
 */
export class BaseMotor extends HardwareComponent {
  static typeId = 'abstract.motor';
  static category = 'motors';
  static displayName = 'Abstract Motor';

  constructor(options = {}) {
    if (new.target === BaseMotor) {
      throw new Error('BaseMotor is an abstract base class and cannot be instantiated directly.');
    }
    super(options);
  }

  getDefaultState() {
    return {
      enabled: true,
      pwm: 0,
      speedNormalized: 0,
      targetAngleDeg: 90,
      currentAngleDeg: 90
    };
  }

  /**
   * Sets 8-bit Arduino PWM duty cycle (0..255).
   * @param {number} pwmValue
   */
  setPwm(pwmValue) {
    const clamped = Math.max(0, Math.min(255, Math.round(Number(pwmValue) || 0)));
    return this.setState({
      pwm: clamped,
      speedNormalized: this.state.enabled ? clamped / 255 : 0
    });
  }

  /**
   * Sets target angle in degrees (0..180) for positional servo motors.
   * @param {number} deg
   */
  setTargetAngle(deg) {
    const clamped = Math.max(0, Math.min(180, Number(deg) || 0));
    return this.setState({ targetAngleDeg: clamped });
  }

  /**
   * Immediately halts motor movement (useful for bulk category operations).
   */
  emergencyStop() {
    return this.setState({
      pwm: 0,
      speedNormalized: 0
    });
  }

  /**
   * Configures the inherited motor coil/driver dipole between VCC and GND,
   * plus optional PWM control input on SIGNAL.
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
        id: `${this.id}.winding`,
        pinA: 'VCC',
        pinB: 'GND',
        resistance: options.windingResistance ?? 28,
        forwardVoltage: 0,
        unidirectional: false,
        maxCurrent: options.maxCurrent ?? 0.8,
        minVoltage: options.minVoltage ?? 1.5,
        closed: true
      });
    }
    const sigPin = this.electricalPins.get('SIGNAL');
    if (sigPin) {
      sigPin.direction = 'IN';
      sigPin.role = 'PWM';
      sigPin.protocol = 'PWM';
    }
  }

  /**
   * Polymorphic electrical flow handler for DC and Servo motors.
   */
  onElectricalFlow(report) {
    if (this.state.burnedOut || !report.closedLoop || report.current <= 0) {
      this.emergencyStop();
      return;
    }

    const pwmSignal = (report.signals || []).find((s) => s.pinName === 'SIGNAL' || s.pinName === 'VCC');
    if (pwmSignal && typeof pwmSignal.pwm === 'number') {
      this.setPwm(pwmSignal.pwm);
      if (this.pins.SIGNAL) {
        this.setTargetAngle(Math.round((pwmSignal.pwm / 255) * 180));
      }
      return;
    }

    const vRatio = Math.max(0, Math.min(1, report.voltage / 5.0));
    this.setPwm(Math.round(vRatio * 255));
  }

  /**
   * ReactFlow-style Node contract (`evaluate({ pins, state, dt, stageEnv, report })`).
   */
  evaluate({ state = {}, report = {} } = {}) {
    if (state.burnedOut || !report?.closedLoop || (report?.current || 0) <= 0) {
      return {
        state: {
          pwm: 0,
          speedNormalized: 0
        }
      };
    }
    return {
      state: {
        pwm: state.pwm,
        speedNormalized: state.speedNormalized,
        targetAngleDeg: state.targetAngleDeg
      }
    };
  }
}
