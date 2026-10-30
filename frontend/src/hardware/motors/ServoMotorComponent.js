import * as THREE from 'three';
import { BaseMotor } from '../../core/components/base/BaseMotor.js';
import { DEG, box, cyl, mat } from '../primitives/GeometryFactory.js';

/**
 * SG90 Micro Positional Servo Motor (0° – 180°).
 * Inherits angular target clamping and emergencyStop() from BaseMotor.
 */
export class ServoMotorComponent extends BaseMotor {
  static typeId = 'motor.servo';
  static category = 'motors';
  static displayName = 'SG90 Micro Servo';
  static summary = 'Positional Geared Servo Actuator (0°–180°)';
  static defaultLessonId = 'motor';

  constructor(options = {}) {
    super({
      name: options.name || 'SG90 Servo',
      description:
        options.description ||
        'Rotates its horn to an exact target angle between 0° and 180°.',
      calloutOffset: options.calloutOffset || [-48, -44],
      anchorOffset: options.anchorOffset || [-4, 18, 0],
      ...options
    });
  }

  getDefaultState() {
    return {
      ...super.getDefaultState(),
      targetAngleDeg: 90,
      currentAngleDeg: 90
    };
  }

  buildMesh() {
    const blueMat = mat('#2a68b5', 0.45);
    this.group.add(box(18, 14, 9.5, blueMat, 0, 0, 0));
    this.group.add(box(25, 2.0, 9.5, blueMat, 0, 9.5, 0));
    this.group.add(cyl(4.4, 4.4, 3.5, 24, blueMat, -4.5, 14, 0));

    const hornGroup = new THREE.Group();
    hornGroup.position.set(-4.5, 17.6, 0);
    const hornMat = mat('#f5efe2', 0.4);
    hornGroup.add(cyl(2.6, 2.6, 1.8, 20, hornMat, 0, 0, 0));
    hornGroup.add(box(15, 1.3, 3.2, hornMat, 4.8, 0.4, 0));
    this.group.add(hornGroup);

    this.refs.hornGroup = hornGroup;
    this.group.userData.hornGroup = hornGroup;

    this.definePin('SIGNAL', [0, 0.3, 0]);
    this.definePin('VCC', [2.54, 0.3, 0]);
    this.definePin('GND', [5.08, 0.3, 0]);
  }

  onStateChange(newState) {
    if (this.refs.hornGroup && typeof newState.currentAngleDeg === 'number') {
      this.refs.hornGroup.rotation.y = (newState.currentAngleDeg - 90) * DEG;
    }
  }

  update(dt) {
    if (!this.state.enabled) return;
    const diff = this.state.targetAngleDeg - this.state.currentAngleDeg;
    if (Math.abs(diff) < 0.05) return;
    const step = diff * Math.min(1, dt * 8.5);
    this.state.currentAngleDeg += step;
    if (this.refs.hornGroup) {
      this.refs.hornGroup.rotation.y = (this.state.currentAngleDeg - 90) * DEG;
    }
  }
}
