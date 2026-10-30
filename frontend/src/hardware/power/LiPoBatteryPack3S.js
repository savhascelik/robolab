import * as THREE from 'three';
import { BasePowerModule } from '../../core/components/base/BasePowerModule.js';
import { box, cyl, mat } from '../primitives/GeometryFactory.js';
import { createLiPoBatteryLabelTexture } from '../primitives/SilkscreenFactory.js';

/**
 * 3S 11.1V 1300mAh 75C High-Discharge Competition LiPo Battery Pack Component.
 * Extends `BasePowerModule` (`extends HardwareComponent`).
 * Features shrink-wrapped 3-cell pouch geometry, custom competition telemetry graphic label,
 * yellow Amass XT60 high-current discharge plug (`VCC`, `GND`), and 4-pin JST-XH balance lead.
 */
export class LiPoBatteryPack3S extends BasePowerModule {
  static typeId = 'power.lipo_3s_1300mah';
  static category = 'power';
  static displayName = '3S 11.1V 1300mAh 75C LiPo Pack';
  static summary = 'High-Discharge 3-Cell 11.1V LiPo Battery with XT60 Power Connector & JST-XH Balance Tap';

  constructor(options = {}) {
    super({
      name: options.name || '3S 11.1V 1300mAh 75C LiPo Pack',
      description:
        options.description ||
        'Competition-grade 3S 11.1V 1300mAh 75C lithium-polymer battery pack with 12AWG silicone power leads, yellow XT60 connector, and 4-pin JST-XH balance plug.',
      ...options
    });
    this.setupElectricalModel({ outputVoltage: 11.1, internalResistance: 600, maxCurrent: 35.0 });
  }

  buildMesh() {
    const g = this.group;
    const shrinkWrapMat = mat('#111827', 0.42, 0.18);
    const cellFoilMat = mat('#334155', 0.35, 0.55);
    const xt60YellowMat = mat('#eab308', 0.35, 0.12);
    const goldBulletMat = mat('#f59e0b', 0.22, 0.9);
    const redWireMat = mat('#dc2626', 0.65, 0.08);
    const blackWireMat = mat('#18181b', 0.65, 0.08);

    // 1. 3-Stacked LiPo Pouch Cells inside Protective Heat-Shrink Sleeve (44 x 13.5 x 24 mm)
    g.add(box(44.0, 13.5, 24.0, shrinkWrapMat, 0, 6.8, 0));
    for (const yLayer of [2.8, 6.8, 10.8]) {
      g.add(box(44.4, 3.4, 23.2, cellFoilMat, 0, yLayer, 0));
    }

    // Competition Graphic Label on Top Surface
    const labelMat = new THREE.MeshStandardMaterial({
      map: createLiPoBatteryLabelTexture(),
      roughness: 0.38,
      metalness: 0.1
    });
    const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(41.5, 21.5), labelMat);
    labelMesh.rotation.x = -Math.PI / 2;
    labelMesh.position.set(0, 13.56, 0);
    g.add(labelMesh);

    // Kapton amber insulation tape around front tab exit
    g.add(box(4.2, 13.7, 24.3, mat('#d97706', 0.32, 0.15), 19.5, 6.8, 0));

    // 2. 12AWG Silicone Leads + Yellow XT60 High-Current Connector
    const redLead = cyl(1.6, 1.6, 10.0, 14, redWireMat, 25.5, 6.8, -4.0);
    redLead.rotation.z = Math.PI / 2;
    g.add(redLead);

    const blackLead = cyl(1.6, 1.6, 10.0, 14, blackWireMat, 25.5, 6.8, 4.0);
    blackLead.rotation.z = Math.PI / 2;
    g.add(blackLead);

    // Yellow XT60 Housing + Dual 3.5mm Gold Bullet Terminals
    g.add(box(9.5, 7.5, 14.5, xt60YellowMat, 33.0, 6.8, 0));
    const posBullet = cyl(1.7, 1.7, 3.0, 16, goldBulletMat, 38.2, 6.8, -3.5);
    posBullet.rotation.z = Math.PI / 2;
    g.add(posBullet);
    const negBullet = cyl(1.7, 1.7, 3.0, 16, goldBulletMat, 38.2, 6.8, 3.5);
    negBullet.rotation.z = Math.PI / 2;
    g.add(negBullet);

    // 3. White 4-Pin JST-XH Balance Plug
    g.add(box(6.5, 4.2, 10.8, mat('#f8fafc', 0.45, 0.08), 24.5, 3.2, 13.8));

    // Define Electrical Pins (`VCC`, `GND`, `BAL_1`, `BAL_2`, `BAL_3`)
    this.definePin('VCC', new THREE.Vector3(38.2, 6.8, -3.5), {
      direction: 'OUT',
      role: 'VCC_SOURCE',
      protocol: 'DC'
    });
    this.definePin('GND', new THREE.Vector3(38.2, 6.8, 3.5), {
      direction: 'BIDIR',
      role: 'GND_REF',
      protocol: 'DC'
    });
    this.definePin('BAL_1', new THREE.Vector3(24.5, 4.2, 11.0), {
      direction: 'OUT',
      role: 'ADC',
      protocol: 'ADC'
    });
    this.definePin('BAL_2', new THREE.Vector3(24.5, 4.2, 13.8), {
      direction: 'OUT',
      role: 'ADC',
      protocol: 'ADC'
    });
    this.definePin('BAL_3', new THREE.Vector3(24.5, 4.2, 16.5), {
      direction: 'OUT',
      role: 'ADC',
      protocol: 'ADC'
    });
  }
}
