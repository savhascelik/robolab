import * as THREE from 'three';
import { BaseChassisPart } from '../../core/components/base/BaseChassisPart.js';
import { box, cyl, mat } from '../primitives/GeometryFactory.js';

/**
 * CNC-Machined 6061-T6 Lower Sumo Chassis Baseplate with Brass M3 Standoffs & Wheel Drop-Slots.
 * Extends `BaseChassisPart` (`extends HardwareComponent`).
 */
export class SumoChassisPlateComponent extends BaseChassisPart {
  static typeId = 'robotics.sumo_chassis_plate';
  static category = 'robotics';
  static displayName = 'Sumo CNC 6061-T6 Lower Chassis Plate';
  static summary = 'Anodized 6061-T6 Aluminum Sumo Baseplate with 4x Brass Standoffs & Weight Pockets';

  constructor(options = {}) {
    super({
      name: options.name || 'Sumo CNC 6061-T6 Lower Chassis Plate',
      description:
        options.description ||
        'CNC-milled dark gunmetal 6061-T6 aluminum lower chassis deck with wheel clearance cutouts, crimson side stiffeners, and 4x M3 hexagonal brass standoffs.',
      ...options
    });
    this.setupElectricalModel();
  }

  buildMesh() {
    const g = this.group;
    const gunmetalMat = mat('#1e293b', 0.36, 0.78);
    const carbonTrimMat = mat('#0f172a', 0.45, 0.35);
    const crimsonAccentMat = mat('#e11d48', 0.32, 0.6);
    const brassMat = mat('#d97706', 0.26, 0.88);

    // 1. Main CNC Base Deck (72 x 3.2 x 78 mm) + Stepped Weight Pocket Frame
    g.add(box(72.0, 3.2, 78.0, gunmetalMat, 0, 1.6, 0));
    g.add(box(58.0, 1.2, 64.0, carbonTrimMat, 0, 3.4, 0));

    // Crimson Anodized Side Guard Rails
    g.add(box(2.6, 5.2, 68.0, crimsonAccentMat, -35.8, 3.4, 0));
    g.add(box(2.6, 5.2, 68.0, crimsonAccentMat, 35.8, 3.4, 0));

    // 2. 4x Hexagonal M3 Brass Standoffs (`segs = 6` for hexagonal profile)
    const standoffCoords = [
      [-26.0, -24.0],
      [26.0, -24.0],
      [-26.0, 22.0],
      [26.0, 22.0]
    ];
    for (const [sx, sz] of standoffCoords) {
      g.add(cyl(2.2, 2.2, 12.0, 6, brassMat, sx, 9.2, sz));
    }

    // Chassis Ground Bonding Terminals (`GND_A`, `GND_B`)
    this.definePin('GND_A', new THREE.Vector3(-26.0, 15.2, -24.0), {
      direction: 'BIDIR',
      role: 'GND_SHIELD',
      protocol: 'DC'
    });
    this.definePin('GND_B', new THREE.Vector3(26.0, 15.2, 22.0), {
      direction: 'BIDIR',
      role: 'GND_SHIELD',
      protocol: 'DC'
    });
  }
}
