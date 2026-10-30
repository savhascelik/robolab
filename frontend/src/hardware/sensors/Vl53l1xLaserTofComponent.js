import * as THREE from 'three';
import { BaseDistanceSensor } from '../../core/components/base/BaseDistanceSensor.js';
import { box, cyl, makeHeaderBlock, mat } from '../primitives/GeometryFactory.js';
import { buildMountingHoles } from '../subcomponents/BoardSubcomponents.js';

/**
 * VL53L1X 4-Meter Laser Time-of-Flight (ToF) Ranging Sensor Module (I2C 940nm VCSEL).
 * Extends `BaseDistanceSensor` (`extends BaseSensor extends HardwareComponent`).
 * Features royal-purple carrier PCB, gold-rimmed SPAD photon detector & 940nm VCSEL laser aperture,
 * 2.8V LDO regulator IC, and 6-pin I2C header (`VCC`, `GND`, `SCL`, `SDA`, `XSHUT`, `GPIO1`).
 */
export class Vl53l1xLaserTofComponent extends BaseDistanceSensor {
  static typeId = 'sensor.vl53l1x_tof';
  static category = 'sensors';
  static displayName = 'VL53L1X Laser ToF Distance Sensor';
  static summary = '940nm VCSEL Laser Time-of-Flight Ranging Sensor (40–4000mm, I2C)';

  constructor(options = {}) {
    super({
      name: options.name || 'VL53L1X Laser ToF Distance Sensor',
      description:
        options.description ||
        'STMicroelectronics VL53L1X 940nm VCSEL Time-of-Flight laser ranging sensor module with millimeter accuracy up to 4 meters over I2C.',
      ...options
    });
    this.setupElectricalModel({ trackResistance: 8200, maxCurrent: 0.04, minVoltage: 2.6 });
  }

  buildMesh() {
    const g = this.group;
    const pcbMat = mat('#311042', 0.46, 0.18);
    const packageMat = mat('#111827', 0.34, 0.45);
    const goldMat = mat('#f59e0b', 0.24, 0.9);
    const apertureMat = new THREE.MeshStandardMaterial({
      color: '#dc2626',
      emissive: '#ef4444',
      emissiveIntensity: 0.42,
      roughness: 0.15,
      metalness: 0.8
    });

    // 1. Compact Carrier PCB (25 x 1.6 x 13 mm)
    g.add(box(25.0, 1.6, 13.0, pcbMat, 0, 1.2, 0));

    buildMountingHoles(
      g,
      [
        [-9.8, 0],
        [9.8, 0]
      ],
      { y: 2.02, padRadius: 1.8, holeRadius: 0.95 }
    );

    // 2. VL53L1X Optical LGA12 Module + Dual VCSEL/SPAD Laser Windows
    g.add(box(4.9, 1.6, 2.8, packageMat, 0, 2.6, -1.2));
    g.add(box(5.3, 0.3, 3.2, goldMat, 0, 2.05, -1.2));

    // Emitter & Receiver optical apertures
    const vcselWindow = cyl(0.75, 0.75, 0.4, 16, apertureMat, -1.1, 3.45, -1.2);
    g.add(vcselWindow);
    const spadWindow = cyl(0.85, 0.85, 0.4, 16, apertureMat, 1.1, 3.45, -1.2);
    g.add(spadWindow);

    // 3. SOT23-5 2.8V LDO Voltage Regulator & Level-Shifter MOSFETs
    g.add(box(2.9, 1.1, 1.8, packageMat, -5.2, 2.4, -1.5));
    g.add(box(2.0, 0.9, 1.4, packageMat, 5.2, 2.3, -1.5));

    // 4. 6-Pin I2C Breakout Header (`VCC`, `GND`, `SCL`, `SDA`, `XSHUT`, `GPIO1`)
    const hdr = makeHeaderBlock(6, 2.54);
    hdr.position.set(0, 2.4, 4.2);
    hdr.rotation.y = Math.PI / 2;
    g.add(hdr);

    const pins = [
      { name: 'VCC', x: -6.35, dir: 'IN', role: 'VCC_IN', proto: 'DC' },
      { name: 'GND', x: -3.81, dir: 'IN', role: 'GND_IN', proto: 'DC' },
      { name: 'SCL', x: -1.27, dir: 'IN', role: 'I2C_SCL', proto: 'I2C' },
      { name: 'SDA', x: 1.27, dir: 'BIDIR', role: 'I2C_SDA', proto: 'I2C' },
      { name: 'XSHUT', x: 3.81, dir: 'IN', role: 'GPIO', proto: 'GPIO' },
      { name: 'GPIO1', x: 6.35, dir: 'OUT', role: 'GPIO', proto: 'GPIO' }
    ];
    for (const p of pins) {
      this.definePin(p.name, new THREE.Vector3(p.x, 4.4, 4.2), {
        direction: p.dir,
        role: p.role,
        protocol: p.proto
      });
    }
  }
}
