import * as THREE from 'three';
import { BaseLightEmitter } from '../../core/components/base/BaseLightEmitter.js';
import { cyl, glowSprite, mat } from '../primitives/GeometryFactory.js';

/**
 * 5mm Through-Hole Light-Emitting Diode (Red, Green, Amber, Blue, or Violet).
 * Inherits brightness/PWM control and optical emissive + Layer 1 glow sprite behavior from BaseLightEmitter.
 */
export class SingleLEDComponent extends BaseLightEmitter {
  static typeId = 'led.single';
  static category = 'leds';
  static displayName = '5mm LED Indicator';
  static summary = 'Through-Hole Light-Emitting Diode (Anode / Cathode)';
  static defaultLessonId = 'blink';

  constructor(options = {}) {
    super({
      name: options.name || 'Red LED',
      description:
        options.description ||
        'Emits light when current flows from the long anode (+) to the cathode (−).',
      calloutOffset: options.calloutOffset || [58, -42],
      anchorOffset: options.anchorOffset || [0, 13, 0],
      initialState: {
        color: options.color || '#e6392e',
        brightness: options.brightness || 0
      },
      ...options
    });
  }

  buildMesh(options = {}) {
    const colorHex = options.color || this.defaultState.color || '#e6392e';
    const legMat = mat('#c8c4b8', 0.3, 0.75);
    this.group.add(cyl(0.45, 0.45, 7.5, 12, legMat, -1.3, 0, 0));
    this.group.add(cyl(0.45, 0.45, 7.5, 12, legMat, 1.3, 0, 0));

    const lensMat = mat(colorHex, 0.2, 0.05, {
      emissive: new THREE.Color(colorHex),
      emissiveIntensity: 0.08,
      transparent: true,
      opacity: 0.92
    });

    const rim = cyl(3.4, 3.4, 1.2, 24, lensMat, 0, 6.8, 0);
    const barrel = cyl(2.9, 2.9, 5.2, 24, lensMat, 0, 8.0, 0);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(2.9, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      lensMat
    );
    dome.position.set(0, 13.2, 0);
    dome.castShadow = true;

    const glow = glowSprite(colorHex, 22);
    glow.position.set(0, 12, 0);

    this.group.add(rim, barrel, dome, glow);

    this.refs.lensMat = lensMat;
    this.refs.glow = glow;

    this.group.userData.lensMat = lensMat;
    this.group.userData.glow = glow;
    this.group.userData.baseColor = new THREE.Color(colorHex);

    this.definePin('ANODE', [-1.3, 0.3, 0]);
    this.definePin('CATHODE', [1.3, 0.3, 0]);
  }
}
