import * as THREE from 'three';
import { BaseVisionSensor } from '../../core/components/base/BaseVisionSensor.js';
import { box, cyl, makeHeaderBlock, mat } from '../primitives/GeometryFactory.js';
import { createImx219CameraSilkscreenTexture } from '../primitives/SilkscreenFactory.js';
import { buildMountingHoles } from '../subcomponents/BoardSubcomponents.js';

/**
 * Sony IMX219 8MP 160° Wide-Angle MIPI CSI-2 AI Camera Module.
 * Extends `BaseVisionSensor` (`extends BaseSensor extends HardwareComponent`).
 * Features teal carrier PCB with silkscreen, 24x24mm square lens housing, multi-element glass fisheye barrel
 * with cyan optical anti-reflective coating, dual IR night-vision illuminator pods, and MIPI CSI-2 / I2C pins.
 */
export class Imx219CsiCameraModule extends BaseVisionSensor {
  static typeId = 'sensor.imx219_csi';
  static category = 'sensors';
  static displayName = 'Sony IMX219 8MP CSI-2 Camera';
  static summary = '8MP 160° Wide-Angle MIPI CSI-2 Vision Sensor with Multi-Element Glass Lens & IR Pods';

  constructor(options = {}) {
    super({
      name: options.name || 'Sony IMX219 8MP CSI-2 Camera',
      description:
        options.description ||
        'Sony Exmor R IMX219 8-megapixel (3280x2464 @ 60fps) MIPI CSI-2 camera module with 160° M12 wide-angle glass lens and dual 850nm IR illuminator pods.',
      ...options
    });
    this.setupElectricalModel({ trackResistance: 4800, maxCurrent: 0.18, minVoltage: 3.0 });
  }

  buildMesh() {
    const g = this.group;
    const pcbMat = mat('#0f3d3e', 0.46, 0.16);
    const lensMountMat = mat('#111827', 0.38, 0.42);
    const barrelMat = mat('#1e293b', 0.28, 0.78);
    const brassRingMat = mat('#d97706', 0.28, 0.86);
    const glassMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      emissive: '#0ea5e9',
      emissiveIntensity: 0.38,
      roughness: 0.08,
      metalness: 0.92
    });

    // 1. Carrier PCB (25 x 24 x 1.6 mm vertical orientation facing +Z) + Silkscreen
    g.add(box(25.0, 24.0, 1.6, pcbMat, 0, 12.0, 0));

    const silkMat = new THREE.MeshStandardMaterial({
      map: createImx219CameraSilkscreenTexture(),
      roughness: 0.42,
      metalness: 0.08
    });
    const silkPlane = new THREE.Mesh(new THREE.PlaneGeometry(24.4, 23.4), silkMat);
    silkPlane.position.set(0, 12.0, 0.82);
    g.add(silkPlane);

    buildMountingHoles(
      g,
      [
        [-10.2, -9.5],
        [10.2, -9.5],
        [-10.2, 9.5],
        [10.2, 9.5]
      ],
      { y: 0.85, padRadius: 1.5, holeRadius: 0.8 }
    );

    // 2. Square M12 Lens Holder Base + Knurled Multi-Element Fisheye Lens Barrel
    g.add(box(14.0, 14.0, 5.5, lensMountMat, 0, 12.0, 3.4));

    const outerBarrel = cyl(6.6, 6.6, 7.2, 32, barrelMat, 0, 12.0, 8.2);
    outerBarrel.rotation.x = Math.PI / 2;
    g.add(outerBarrel);

    const focusRing = cyl(7.1, 7.1, 2.2, 32, brassRingMat, 0, 12.0, 7.2);
    focusRing.rotation.x = Math.PI / 2;
    g.add(focusRing);

    const frontHood = cyl(7.8, 6.8, 3.0, 32, barrelMat, 0, 12.0, 12.5);
    frontHood.rotation.x = Math.PI / 2;
    g.add(frontHood);

    // Multi-coated curved glass front element
    const glassElement = cyl(6.2, 6.2, 1.0, 32, glassMat, 0, 12.0, 13.6);
    glassElement.rotation.x = Math.PI / 2;
    g.add(glassElement);
    this.refs.lensGlass = glassElement;

    // 3. Dual 850nm Night-Vision IR LED Illuminator Side Pods
    for (const xSide of [-15.8, 15.8]) {
      g.add(box(6.2, 18.0, 1.6, pcbMat, xSide, 12.0, 0));
      const irBezel = cyl(2.6, 2.6, 2.4, 20, barrelMat, xSide, 12.0, 1.8);
      irBezel.rotation.x = Math.PI / 2;
      g.add(irBezel);
      const irDome = cyl(1.9, 1.9, 1.2, 20, mat('#ef4444', 0.25, 0.4), xSide, 12.0, 2.8);
      irDome.rotation.x = Math.PI / 2;
      g.add(irDome);
    }

    // 4. Bottom MIPI CSI-2 15-Pin Ribbon Connector Latch + 4-Pin I2C/Power Header
    g.add(box(18.0, 2.8, 3.2, mat('#f8fafc', 0.45, 0.1), 0, 1.6, -1.2));

    const hdr = makeHeaderBlock(4, 2.54);
    hdr.position.set(0, 1.2, 2.5);
    hdr.rotation.y = Math.PI / 2;
    g.add(hdr);

    const pinDefs = [
      { name: 'VCC', x: -3.81, dir: 'IN', role: 'VCC_IN', proto: 'DC' },
      { name: 'GND', x: -1.27, dir: 'IN', role: 'GND_IN', proto: 'DC' },
      { name: 'SCL', x: 1.27, dir: 'IN', role: 'I2C_SCL', proto: 'I2C' },
      { name: 'SDA', x: 3.81, dir: 'BIDIR', role: 'I2C_SDA', proto: 'I2C' }
    ];
    for (const p of pinDefs) {
      this.definePin(p.name, new THREE.Vector3(p.x, 3.2, 2.5), {
        direction: p.dir,
        role: p.role,
        protocol: p.proto
      });
    }
  }
}
