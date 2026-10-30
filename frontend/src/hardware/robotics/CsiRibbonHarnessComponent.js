import * as THREE from 'three';
import { BaseChassisPart } from '../../core/components/base/BaseChassisPart.js';
import { box, mat } from '../primitives/GeometryFactory.js';

/**
 * 15-Pin MIPI CSI-2 High-Speed Differential Flex Ribbon Cable & Braided I2C Bus Harness.
 * Extends `BaseChassisPart` (`extends HardwareComponent`).
 */
export class CsiRibbonHarnessComponent extends BaseChassisPart {
  static typeId = 'robotics.csi_ribbon_harness';
  static category = 'robotics';
  static displayName = 'MIPI CSI-2 15-Pin Flex Ribbon & I2C Bus Harness';
  static summary = 'Impedance-Controlled 15-Pin MIPI CSI-2 Flat Flex Cable with Gold Contacts & EMI Ferrite';

  constructor(options = {}) {
    super({
      name: options.name || 'MIPI CSI-2 15-Pin Flex Ribbon & I2C Bus Harness',
      description:
        options.description ||
        '15-pin 1.0mm pitch MIPI CSI-2 flat flexible camera ribbon cable with gold-plated contact fingers, EMI shield segments, and I2C telemetry Loom.',
      ...options
    });
    this.setupElectricalModel();
  }

  buildMesh() {
    const g = this.group;
    const ribbonWhiteMat = mat('#f1f5f9', 0.42, 0.12);
    const blueStiffenerMat = mat('#0284c7', 0.35, 0.2);
    const goldContactMat = mat('#f59e0b', 0.22, 0.9);
    const traceStripeMat = mat('#334155', 0.45, 0.3);

    // 1. Stepped S-Curve Flat Ribbon Segments linking Camera Gimbal to Jetson CAM0
    g.add(box(16.0, 0.6, 26.0, ribbonWhiteMat, 0, 4.0, 0));

    const riserSeg = box(16.0, 0.6, 16.0, ribbonWhiteMat, 0, 9.2, 16.5);
    riserSeg.rotation.x = -0.68;
    g.add(riserSeg);

    const topSeg = box(16.0, 0.6, 12.0, ribbonWhiteMat, 0, 14.2, 26.5);
    g.add(topSeg);

    // Subtle differential pair trace lines along ribbon
    for (let t = -6; t <= 6; t += 2.4) {
      g.add(box(0.5, 0.65, 25.0, traceStripeMat, t, 4.0, 0));
    }

    // 2. Blue Polyester Stiffener Tabs + 15 Gold Contact Fingers at Both Ends
    g.add(box(16.2, 0.8, 4.2, blueStiffenerMat, 0, 4.0, -13.5));
    g.add(box(16.2, 0.8, 4.2, blueStiffenerMat, 0, 14.2, 32.5));

    for (let p = -6.5; p <= 6.5; p += 1.3) {
      g.add(box(0.7, 0.85, 3.0, goldContactMat, p, 4.0, -14.2));
      g.add(box(0.7, 0.85, 3.0, goldContactMat, p, 14.2, 33.2));
    }

    this.definePin('CSI_IN', new THREE.Vector3(0, 14.2, 33.2), {
      direction: 'BIDIR',
      role: 'BUS_PASS',
      protocol: 'DC'
    });
    this.definePin('CSI_OUT', new THREE.Vector3(0, 4.0, -14.2), {
      direction: 'BIDIR',
      role: 'BUS_PASS',
      protocol: 'DC'
    });
  }
}
