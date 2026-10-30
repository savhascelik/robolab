import { BaseDistanceSensor } from '../../core/components/base/BaseDistanceSensor.js';
import { box, cyl, mat } from '../primitives/GeometryFactory.js';

/**
 * HC-SR04 Ultrasonic Distance Sensor (4cm – 120cm).
 * Inherits range clamping and acoustic echo time-of-flight calculation from BaseDistanceSensor -> BaseSensor.
 */
export class UltrasonicSensorComponent extends BaseDistanceSensor {
  static typeId = 'sensor.ultrasonic';
  static category = 'sensors';
  static displayName = 'HC-SR04 Ultrasonic';
  static summary = '40 kHz Echo Time-of-Flight Distance Sensor';
  static defaultLessonId = 'sensor';

  constructor(options = {}) {
    super({
      name: options.name || 'HC-SR04 Ultrasonic',
      description:
        options.description ||
        'Emits 40 kHz ultrasound pulses and measures echo time to compute distance.',
      calloutOffset: options.calloutOffset || [56, -44],
      anchorOffset: options.anchorOffset || [0, 17, 0],
      ...options
    });
  }

  buildMesh() {
    const legMat = mat('#c8c4b8', 0.3, 0.75);
    for (let i = 0; i < 4; i++) {
      this.group.add(box(0.65, 5.5, 0.65, legMat, -3.81 + i * 2.54, 0, 0));
    }

    const pcb = box(28, 13.5, 1.6, mat('#2b569a', 0.5), 0, 4.8, 0);
    this.group.add(pcb);

    const canMat = mat('#d6d2c6', 0.3, 0.75);
    const meshDark = mat('#222632', 0.75);
    for (const cx of [-7.8, 7.8]) {
      const barrel = cyl(5.2, 5.2, 7.5, 28, canMat, cx, 11.5, 4.2);
      barrel.rotation.x = Math.PI / 2;
      const screen = cyl(4.1, 4.1, 7.8, 24, meshDark, cx, 11.5, 4.2);
      screen.rotation.x = Math.PI / 2;
      this.group.add(barrel, screen);
    }

    this.definePin('VCC', [-3.81, 0.3, 0]);
    this.definePin('TRIG', [-1.27, 0.3, 0]);
    this.definePin('ECHO', [1.27, 0.3, 0]);
    this.definePin('GND', [3.81, 0.3, 0]);
  }
}
