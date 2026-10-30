import * as THREE from 'three';
import { BaseMotorDriver } from '../../core/components/base/BaseMotorDriver.js';
import { box, cyl, makeHeaderBlock, mat } from '../primitives/GeometryFactory.js';
import { createL298NSilkscreenTexture } from '../primitives/SilkscreenFactory.js';
import { buildMountingHoles, buildSmdLedBank } from '../subcomponents/BoardSubcomponents.js';

/**
 * L298N Dual Full-Bridge DC/Stepper Motor Driver Module (2A/Channel, 5V–35V).
 * Extends `BaseMotorDriver` (`extends HardwareComponent`).
 * Features crimson FR4 PCB with silkscreen, vertical black anodized multi-fin L298N heatsink,
 * 3x blue screw terminal blocks, 2x 220uF electrolytic capacitors, 8x flyback SMD diodes, and 6-pin logic header.
 */
export class L298NDualBridgeDriver extends BaseMotorDriver {
  static typeId = 'driver.l298n_dual';
  static category = 'drivers';
  static displayName = 'L298N Dual H-Bridge Driver';
  static summary = 'Dual Full-Bridge 2A Motor Driver with Anodized Finned Heatsink & 5V LDO Regulator';

  constructor(options = {}) {
    super({
      name: options.name || 'L298N Dual H-Bridge Driver',
      description:
        options.description ||
        'Dual H-Bridge high-current motor driver module (43x43mm red FR4 PCB) with vertical black anodized heatsink, 3 screw terminal blocks, and 6-pin PWM/direction input header.',
      ...options
    });
    this.setupElectricalModel({ quiescentResistance: 220, maxCurrent: 2.5 });
  }

  buildMesh() {
    const g = this.group;
    const pcbMat = mat('#991b1b', 0.48, 0.14);
    const heatsinkMat = mat('#18181b', 0.34, 0.78);
    const terminalBlueMat = mat('#1d4ed8', 0.4, 0.15);
    const screwMetalMat = mat('#e2e8f0', 0.25, 0.88);
    const capBodyMat = mat('#1e293b', 0.35, 0.3);

    // 1. Red Double-Sided FR4 PCB (36 x 2.0 x 36 mm) + Silkscreen Overlay
    g.add(box(36, 2.0, 36, pcbMat, 0, 1.0, 0));

    const silkMat = new THREE.MeshStandardMaterial({
      map: createL298NSilkscreenTexture(),
      roughness: 0.44,
      metalness: 0.08
    });
    const silkPlane = new THREE.Mesh(new THREE.PlaneGeometry(35.4, 35.4), silkMat);
    silkPlane.rotation.x = -Math.PI / 2;
    silkPlane.position.set(0, 2.02, 0);
    g.add(silkPlane);

    buildMountingHoles(
      g,
      [
        [-15.2, -15.2],
        [15.2, -15.2],
        [-15.2, 15.2],
        [15.2, 15.2]
      ],
      { y: 2.02, padRadius: 1.8, holeRadius: 0.95 }
    );

    // 2. Vertical Black Anodized Aluminum Heatsink + Multiwatt15 L298N IC Package
    g.add(box(14.5, 16.0, 8.5, heatsinkMat, 0, 10.0, -2.5));
    for (let f = -5.5; f <= 5.5; f += 2.75) {
      g.add(box(1.1, 16.2, 11.2, heatsinkMat, f, 10.0, -2.5));
    }
    // L298N IC vertical package + 15 bent lead legs
    g.add(box(13.0, 9.5, 2.6, mat('#111827', 0.5, 0.2), 0, 6.8, 3.0));
    for (let p = -6; p <= 6; p += 2) {
      g.add(box(0.55, 4.0, 0.8, screwMetalMat, p * 0.9, 3.2, 4.2));
    }

    // 3. Three Blue Screw Terminal Blocks (OUT1/OUT2 left, OUT3/OUT4 right, 12V/GND/5V front-left)
    // Left Motor A Terminal (OUT1, OUT2)
    g.add(box(6.5, 8.5, 11.0, terminalBlueMat, -14.2, 6.2, -2.0));
    g.add(cyl(1.6, 1.6, 1.2, 16, screwMetalMat, -14.2, 10.6, -4.6));
    g.add(cyl(1.6, 1.6, 1.2, 16, screwMetalMat, -14.2, 10.6, 0.6));

    // Right Motor B Terminal (OUT3, OUT4)
    g.add(box(6.5, 8.5, 11.0, terminalBlueMat, 14.2, 6.2, -2.0));
    g.add(cyl(1.6, 1.6, 1.2, 16, screwMetalMat, 14.2, 10.6, -4.6));
    g.add(cyl(1.6, 1.6, 1.2, 16, screwMetalMat, 14.2, 10.6, 0.6));

    // Front 3-way Power Terminal (12V, GND, 5V)
    g.add(box(14.5, 8.5, 6.5, terminalBlueMat, -7.5, 6.2, 13.0));
    for (const xOff of [-12.0, -7.5, -3.0]) {
      g.add(cyl(1.5, 1.5, 1.2, 16, screwMetalMat, xOff, 10.6, 13.0));
    }

    // 4. Dual 220uF 35V Electrolytic Filter Capacitors + 78M05 LDO Regulator + 8 Flyback Diodes
    for (const xCap of [-7.5, 7.5]) {
      g.add(cyl(3.2, 3.2, 8.5, 20, capBodyMat, xCap, 6.2, -11.5));
      g.add(cyl(2.8, 2.8, 0.4, 20, screwMetalMat, xCap, 10.5, -11.5));
    }
    // 8x M7 Flyback Protection Diodes (4 per bridge)
    for (let d = 0; d < 4; d++) {
      g.add(box(2.6, 1.2, 1.5, mat('#0f172a', 0.45, 0.2), -9.0 + d * 2.4, 2.6, 7.0));
      g.add(box(2.6, 1.2, 1.5, mat('#0f172a', 0.45, 0.2), 2.0 + d * 2.4, 2.6, 7.0));
    }

    // Power LED
    this.refs.leds = buildSmdLedBank(
      g,
      [{ id: 'pwr', x: 13.5, z: -12.0, color: '#ef4444', active: true }],
      2.1
    );

    // 5. 6-Pin Logic Input Header (`ENA`, `IN1`, `IN2`, `IN3`, `IN4`, `ENB`)
    const hdr = makeHeaderBlock(6, 2.54);
    hdr.position.set(8.5, 3.2, 13.5);
    hdr.rotation.y = Math.PI / 2;
    g.add(hdr);

    const logicNames = ['ENA', 'IN1', 'IN2', 'IN3', 'IN4', 'ENB'];
    logicNames.forEach((name, idx) => {
      const xPos = 8.5 + (idx - 2.5) * 2.54;
      this.definePin(name, new THREE.Vector3(xPos, 5.2, 13.5), {
        direction: 'IN',
        role: name.startsWith('EN') ? 'PWM' : 'GPIO',
        protocol: name.startsWith('EN') ? 'PWM' : 'GPIO'
      });
    });

    // Power & Motor Output Pins
    this.definePin('12V', new THREE.Vector3(-12.0, 8.5, 13.0), { direction: 'IN', role: 'VCC_IN', protocol: 'DC' });
    this.definePin('GND', new THREE.Vector3(-7.5, 8.5, 13.0), { direction: 'IN', role: 'GND_IN', protocol: 'DC' });
    this.definePin('5V', new THREE.Vector3(-3.0, 8.5, 13.0), { direction: 'BIDIR', role: 'VCC_OUT', protocol: 'DC' });
    this.definePin('OUT1', new THREE.Vector3(-14.2, 8.5, -4.6), { direction: 'OUT', role: 'MOTOR_OUT', protocol: 'DC' });
    this.definePin('OUT2', new THREE.Vector3(-14.2, 8.5, 0.6), { direction: 'OUT', role: 'MOTOR_OUT', protocol: 'DC' });
    this.definePin('OUT3', new THREE.Vector3(14.2, 8.5, -4.6), { direction: 'OUT', role: 'MOTOR_OUT', protocol: 'DC' });
    this.definePin('OUT4', new THREE.Vector3(14.2, 8.5, 0.6), { direction: 'OUT', role: 'MOTOR_OUT', protocol: 'DC' });
  }
}
