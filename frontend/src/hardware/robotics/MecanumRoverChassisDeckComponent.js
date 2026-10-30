import * as THREE from 'three';
import { BaseChassisPart } from '../../core/components/base/BaseChassisPart.js';
import { box, cyl, mat } from '../primitives/GeometryFactory.js';

/**
 * Multi-Deck CNC Aluminum & Carbon-Fiber Mecanum AI Rover Chassis Frame.
 * Extends `BaseChassisPart` (`extends HardwareComponent`).
 */
export class MecanumRoverChassisDeckComponent extends BaseChassisPart {
  static typeId = 'robotics.jetson_rover_chassis';
  static category = 'robotics';
  static displayName = 'Jetson Mecanum Rover CNC Chassis Deck';
  static summary = 'Dual-Rail 6061-T6 Aluminum & Carbon Rover Frame with Vibration-Damped Standoffs';

  constructor(options = {}) {
    super({
      name: options.name || 'Jetson Mecanum Rover CNC Chassis Deck',
      description:
        options.description ||
        'Precision CNC-machined 6061-T6 aluminum and carbon-fiber rover frame with NVIDIA-green side rails, suspension swing-arms, and 6x brass standoffs.',
      ...options
    });
    this.setupElectricalModel();
  }

  buildMesh() {
    const g = this.group;
    const deckMat = mat('#111827', 0.38, 0.65);
    const railMat = mat('#1e293b', 0.34, 0.78);
    const accentGreenMat = mat('#76b900', 0.32, 0.45);
    const brassMat = mat('#d97706', 0.26, 0.88);

    // 1. Main Structural Carrier Deck (88 x 3.2 x 104 mm)
    g.add(box(88.0, 3.2, 104.0, deckMat, 0, 1.6, 0));

    // Left & Right Anodized Structural Side Rails + Green Accent Trim
    g.add(box(4.0, 7.5, 100.0, railMat, -43.5, 4.0, 0));
    g.add(box(4.0, 7.5, 100.0, railMat, 43.5, 4.0, 0));
    g.add(box(1.4, 2.4, 92.0, accentGreenMat, -45.2, 4.5, 0));
    g.add(box(1.4, 2.4, 92.0, accentGreenMat, 45.2, 4.5, 0));

    // Front & Rear Bumper Crossbars
    g.add(box(84.0, 4.8, 3.5, railMat, 0, 3.2, 51.5));
    g.add(box(84.0, 4.8, 3.5, railMat, 0, 3.2, -51.5));

    // 2. 6x Hexagonal Brass Standoffs (`segs = 6`) for Upper Jetson Compute Deck
    const standoffs = [
      [-34.0, -34.0],
      [34.0, -34.0],
      [-34.0, 0],
      [34.0, 0],
      [-34.0, 34.0],
      [34.0, 34.0]
    ];
    for (const [sx, sz] of standoffs) {
      g.add(cyl(2.2, 2.2, 14.0, 6, brassMat, sx, 10.2, sz));
    }

    this.definePin('CHASSIS_GND_F', new THREE.Vector3(-34.0, 17.2, 34.0), {
      direction: 'BIDIR',
      role: 'GND_SHIELD',
      protocol: 'DC'
    });
    this.definePin('CHASSIS_GND_R', new THREE.Vector3(34.0, 17.2, -34.0), {
      direction: 'BIDIR',
      role: 'GND_SHIELD',
      protocol: 'DC'
    });
  }
}
