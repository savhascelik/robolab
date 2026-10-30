import * as THREE from 'three';
import { BaseAnalogSensor } from '../../core/components/base/BaseAnalogSensor.js';
import { box, cyl, mat } from '../primitives/GeometryFactory.js';

/**
 * 10kΩ Rotary Potentiometer (Analog Voltage Divider).
 * Inherits multi-bit ADC conversion & voltage readout from BaseAnalogSensor -> BaseSensor.
 */
export class PotentiometerComponent extends BaseAnalogSensor {
  static typeId = 'sensor.potentiometer';
  static category = 'sensors';
  static displayName = '10kΩ Potentiometer';
  static summary = 'Rotary Analog Voltage Divider Knob (0–1023 ADC)';
  static defaultLessonId = 'knob';

  constructor(options = {}) {
    super({
      name: options.name || '10kΩ Potentiometer',
      description:
        options.description ||
        'Variable resistor voltage divider read by analogRead(A0).',
      calloutOffset: options.calloutOffset || [-42, -45],
      anchorOffset: options.anchorOffset || [0, 15, 0],
      ...options
    });
  }

  getDefaultState() {
    return {
      minValue: 0,
      maxValue: 1023,
      value: 680,
      unit: 'adc'
    };
  }

  buildMesh() {
    const legMat = mat('#c8c4b8', 0.3, 0.75);
    for (const lx of [-2.54, 0, 2.54]) {
      this.group.add(box(0.7, 4.5, 0.7, legMat, lx, 0, 3.2));
    }
    this.group.add(cyl(5.8, 5.8, 4.8, 28, mat('#2d63a8', 0.48), 0, 3.5, 0));

    const knobGroup = new THREE.Group();
    knobGroup.position.set(0, 8.3, 0);
    knobGroup.add(cyl(3.8, 4.1, 6.5, 28, mat('#242936', 0.45), 0, 0, 0));
    knobGroup.add(box(1.1, 0.6, 3.6, mat('#f5efe0', 0.4), 0, 6.3, -1.2));
    this.group.add(knobGroup);

    this.refs.knobGroup = knobGroup;
    this.group.userData.knobGroup = knobGroup;

    this.definePin('VCC', [-2.54, 0.3, 3.2]);
    this.definePin('WIPER', [0, 0.3, 3.2]);
    this.definePin('GND', [2.54, 0.3, 3.2]);
  }

  onStateChange() {
    const knob = this.refs.knobGroup;
    if (knob) {
      const norm = this.getNormalizedValue();
      knob.rotation.y = (norm - 0.5) * 4.2;
    }
  }
}
