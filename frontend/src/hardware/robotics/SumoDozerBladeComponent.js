import * as THREE from 'three';
import { BaseChassisPart } from '../../core/components/base/BaseChassisPart.js';
import { box, cyl, mat } from '../primitives/GeometryFactory.js';

/**
 * Low-Angle 18° Hardened Steel Sumo Wedge Dozer Blade Assembly.
 * Extends `BaseChassisPart` (`extends HardwareComponent`).
 */
export class SumoDozerBladeComponent extends BaseChassisPart {
  static typeId = 'robotics.sumo_dozer_blade';
  static category = 'robotics';
  static displayName = 'Sumo 18° Hardened Steel Dozer Wedge';
  static summary = 'Precision Ground 18° Low-Clearance Sumo Dozer Blade with Gusset Ribs & Hazard Chevrons';

  constructor(options = {}) {
    super({
      name: options.name || 'Sumo 18° Hardened Steel Dozer Wedge',
      description:
        options.description ||
        'CNC-ground 18-degree hardened tool-steel front wedge blade with structural side gussets, ground-scraping leading edge, and high-visibility hazard stripes.',
      ...options
    });
    this.setupElectricalModel();
  }

  buildMesh() {
    const g = this.group;
    const darkSteelMat = mat('#1e293b', 0.34, 0.82);
    const groundEdgeMat = mat('#e2e8f0', 0.18, 0.94);
    const crimsonGussetMat = mat('#e11d48', 0.32, 0.62);
    const hazardAmberMat = mat('#f59e0b', 0.35, 0.3);

    // 1. Sloped Main Dozer Wedge Plate (78mm wide)
    const wedgePlate = box(78.0, 2.4, 24.0, darkSteelMat, 0, 6.2, 0);
    wedgePlate.rotation.x = 0.42;
    g.add(wedgePlate);

    // Razor-sharp polished steel ground-scraping lip
    const scrapingLip = box(78.4, 1.0, 4.8, groundEdgeMat, 0, 1.2, 11.2);
    scrapingLip.rotation.x = 0.18;
    g.add(scrapingLip);

    // 2. Left & Right Structural Side Cheek Gussets + Pivot Pins
    for (const xSide of [-38.2, 38.2]) {
      g.add(box(2.2, 11.0, 20.0, crimsonGussetMat, xSide, 6.2, -1.5));
      const hingeBolt = cyl(1.8, 1.8, 4.0, 16, groundEdgeMat, xSide, 7.5, -8.5);
      hingeBolt.rotation.z = Math.PI / 2;
      g.add(hingeBolt);
    }

    // 3. Internal Reinforcing Ribs + Amber Competition Hazard Bars
    for (const xRib of [-22.0, 0, 22.0]) {
      g.add(box(2.0, 7.5, 14.0, darkSteelMat, xRib, 5.2, -3.5));
    }
    for (let h = -3; h <= 3; h++) {
      const stripe = box(5.5, 0.5, 3.2, hazardAmberMat, h * 10.2, 8.8, -5.0);
      stripe.rotation.x = 0.42;
      g.add(stripe);
    }

    this.definePin('MOUNT_L', new THREE.Vector3(-32.0, 6.0, -9.0), {
      direction: 'BIDIR',
      role: 'GND_SHIELD',
      protocol: 'DC'
    });
    this.definePin('MOUNT_R', new THREE.Vector3(32.0, 6.0, -9.0), {
      direction: 'BIDIR',
      role: 'GND_SHIELD',
      protocol: 'DC'
    });
  }
}
