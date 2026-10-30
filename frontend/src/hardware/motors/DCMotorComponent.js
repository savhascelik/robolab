import * as THREE from 'three';
import { BaseMotor } from '../../core/components/base/BaseMotor.js';
import { DEG, box, cyl, mat } from '../primitives/GeometryFactory.js';

/**
 * Brushed DC Fan Motor with 3-Blade Propeller.
 * Inherits PWM duty-cycle clamping, speedNormalized calculation, and emergencyStop() from BaseMotor.
 */
export class DCMotorComponent extends BaseMotor {
  static typeId = 'motor.dc';
  static category = 'motors';
  static displayName = 'DC Fan Motor';
  static summary = 'Continuous Rotary Actuator (PWM Speed Control)';
  static defaultLessonId = 'motor';

  constructor(options = {}) {
    super({
      name: options.name || 'DC Fan Motor',
      description:
        options.description ||
        'Spins faster as the PWM duty cycle (analogWrite 0–255) increases.',
      calloutOffset: options.calloutOffset || [64, -40],
      anchorOffset: options.anchorOffset || [0, 20, 0],
      ...options
    });
  }

  getDefaultState() {
    return {
      ...super.getDefaultState(),
      maxRadPerSec: 25
    };
  }

  buildMesh() {
    const standMat = mat('#d9b98b', 0.65);
    this.group.add(box(14, 2.6, 14, standMat, 0, 0, 0));
    this.group.add(box(3.2, 10, 8, standMat, 0, 2.6, 0));

    const motorBody = cyl(6.2, 6.2, 15, 28, mat('#d5d1c6', 0.32, 0.68), 0, 12.5, 0);
    motorBody.rotation.x = Math.PI / 2;
    motorBody.position.set(0, 12.5, -7.5);
    this.group.add(motorBody);

    const propGroup = new THREE.Group();
    propGroup.position.set(0, 12.5, 9.5);
    const propMat = mat('#f08a38', 0.42);
    const hub = cyl(2.2, 2.4, 3.2, 20, propMat, 0, -1.6, 0);
    hub.rotation.x = Math.PI / 2;
    propGroup.add(hub);

    for (let i = 0; i < 3; i++) {
      const bladeHolder = new THREE.Group();
      bladeHolder.rotation.z = i * 120 * DEG;
      const blade = box(2.8, 11.5, 0.7, propMat, 0, 2.0, 0);
      blade.rotation.y = 22 * DEG;
      bladeHolder.add(blade);
      propGroup.add(bladeHolder);
    }

    this.group.add(propGroup);
    this.refs.propGroup = propGroup;
    this.group.userData.propGroup = propGroup;

    this.definePin('VCC', [0, 0.3, 0]);
    this.definePin('GND', [2.54, 0.3, 0]);
  }

  update(dt) {
    if (!this.state.enabled || this.state.speedNormalized <= 0) return;
    const prop = this.refs.propGroup;
    if (prop) {
      const omega = (this.state.maxRadPerSec || 25) * this.state.speedNormalized;
      prop.rotation.z += omega * dt;
    }
  }
}
