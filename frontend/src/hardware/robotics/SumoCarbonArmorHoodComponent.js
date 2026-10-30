import * as THREE from 'three';
import { BaseChassisPart } from '../../core/components/base/BaseChassisPart.js';
import { box, cyl, mat } from '../primitives/GeometryFactory.js';

/**
 * 3K Matte Carbon-Fiber Sumo Top Armor Hood with Emergency Kill-Switch & Telemetry Status Bar.
 * Extends `BaseChassisPart` (`extends HardwareComponent`).
 */
export class SumoCarbonArmorHoodComponent extends BaseChassisPart {
  static typeId = 'robotics.sumo_armor_hood';
  static category = 'robotics';
  static displayName = 'Sumo 3K Carbon-Fiber Armor Hood';
  static summary = 'Faceted 3K Carbon Top Armor Shell with Competition Kill-Switch & Ventilation Louvers';

  constructor(options = {}) {
    super({
      name: options.name || 'Sumo 3K Carbon-Fiber Armor Hood',
      description:
        options.description ||
        'Low-profile 3K carbon-fiber protective upper armor canopy with anodized crimson trim, heat-dissipation louvers, and competition emergency kill-switch.',
      ...options
    });
    this.setupElectricalModel();
  }

  buildMesh() {
    const g = this.group;
    const carbonMat = mat('#111827', 0.36, 0.48);
    const crimsonMat = mat('#e11d48', 0.3, 0.62);
    const steelMat = mat('#e2e8f0', 0.22, 0.88);
    const statusGlowMat = new THREE.MeshStandardMaterial({
      color: '#10b981',
      emissive: '#10b981',
      emissiveIntensity: 0.65,
      roughness: 0.2
    });

    // 1. Main Carbon Canopy Roof Plate + Angled Front & Rear Visor Panels
    g.add(box(68.0, 2.4, 56.0, carbonMat, 0, 5.0, -2.0));

    const frontSlope = box(66.0, 2.0, 16.0, carbonMat, 0, 3.0, 24.5);
    frontSlope.rotation.x = 0.28;
    g.add(frontSlope);

    // Side Armor Skirts
    g.add(box(2.2, 6.2, 56.0, crimsonMat, -34.2, 3.2, -2.0));
    g.add(box(2.2, 6.2, 56.0, crimsonMat, 34.2, 3.2, -2.0));

    // 2. Heat-Dissipation Louver Fins + Emergency Competition Kill-Switch Mushroom Button
    for (let l = -2; l <= 2; l++) {
      g.add(box(26.0, 1.0, 2.2, crimsonMat, 0, 6.4, -14.0 + l * 4.2));
    }

    // Kill-switch collar & red cap
    g.add(cyl(3.8, 4.2, 2.0, 20, steelMat, 18.5, 6.8, 10.0));
    g.add(cyl(4.6, 4.2, 2.4, 24, crimsonMat, 18.5, 8.8, 10.0));

    // Armed LED Light Bar
    g.add(box(22.0, 1.0, 2.4, statusGlowMat, -10.0, 6.4, 14.0));

    this.definePin('HOOD_GND', new THREE.Vector3(-26.0, 1.0, -24.0), {
      direction: 'BIDIR',
      role: 'GND_SHIELD',
      protocol: 'DC'
    });
    this.definePin('KILL_SW', new THREE.Vector3(18.5, 1.0, 10.0), {
      direction: 'OUT',
      role: 'GPIO',
      protocol: 'GPIO'
    });
  }
}
