import * as THREE from 'three';
import { BaseAnalogSensor } from '../../core/components/base/BaseAnalogSensor.js';
import { box, cyl, makeHeaderBlock, mat } from '../primitives/GeometryFactory.js';
import { buildSmdLedBank } from '../subcomponents/BoardSubcomponents.js';

/**
 * 4-Channel TCRT5000 Infrared Reflective Line & Dohyo Edge Sensor Array Module.
 * Extends `BaseAnalogSensor` (`extends BaseSensor extends HardwareComponent`).
 * Features 4x TCRT5000 dual optical modules (blue 950nm IR emitter diode + black phototransistor),
 * LM393 comparator IC, multi-turn sensitivity trimmer pot, status LEDs, and 4-pin (`VCC`, `GND`, `DO`, `AO`) header.
 */
export class Tcrt5000LineSensorArray extends BaseAnalogSensor {
  static typeId = 'sensor.tcrt5000_line';
  static category = 'sensors';
  static displayName = 'TCRT5000 4-Ch IR Edge/Line Sensor Array';
  static summary = 'Quad TCRT5000 950nm IR Reflective Dohyo Edge & Line Detector with LM393 Comparator';

  constructor(options = {}) {
    super({
      name: options.name || 'TCRT5000 4-Ch IR Edge/Line Sensor Array',
      description:
        options.description ||
        'High-speed 4-channel TCRT5000 infrared reflective line and sumo Dohyo white-border detector with analog/digital outputs and LM393 comparator.',
      ...options
    });
    this.setupElectricalModel({ trackResistance: 6800, maxCurrent: 0.06, minVoltage: 3.0 });
  }

  buildMesh() {
    const g = this.group;
    const pcbMat = mat('#1e3a8a', 0.46, 0.16);
    const shroudMat = mat('#0f172a', 0.5, 0.2);
    const irEmitterMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.35,
      roughness: 0.18,
      metalness: 0.2
    });
    const photoDetectorMat = mat('#111827', 0.2, 0.6);
    const trimPotMat = mat('#2563eb', 0.42, 0.15);
    const brassMat = mat('#f59e0b', 0.28, 0.85);

    // 1. Deep-Blue Sensor Bar PCB (42 x 1.6 x 14 mm)
    g.add(box(42.0, 1.6, 14.0, pcbMat, 0, 1.6, 0));

    // 2. 4x TCRT5000 Dual IR LED + Phototransistor Optical Housings
    for (const xSensor of [-15.0, -5.0, 5.0, 15.0]) {
      // Black optical divider shroud
      g.add(box(6.8, 4.2, 5.6, shroudMat, xSensor, 3.8, 3.0));
      // Blue 950nm IR Emitter Dome
      g.add(cyl(1.3, 1.3, 2.2, 16, irEmitterMat, xSensor - 1.5, 5.8, 3.0));
      // Dark IR Phototransistor Dome
      g.add(cyl(1.3, 1.3, 2.2, 16, photoDetectorMat, xSensor + 1.5, 5.8, 3.0));
    }

    // 3. LM393 Dual Comparator SOIC-8 IC + Precision Trimmer Potentiometer
    g.add(box(5.2, 1.4, 4.0, shroudMat, -6.5, 2.8, -3.2));
    g.add(box(4.8, 3.6, 4.8, trimPotMat, 6.5, 3.8, -3.2));
    g.add(cyl(1.4, 1.4, 0.8, 16, brassMat, 6.5, 5.8, -3.2));

    this.refs.leds = buildSmdLedBank(
      g,
      [
        { id: 'pwr', x: -16.5, z: -4.2, color: '#10b981', active: true },
        { id: 'trig', x: 16.5, z: -4.2, color: '#f59e0b', active: true }
      ],
      2.45
    );

    // 4. 4-Pin Interface Header (`VCC`, `GND`, `DO`, `AO` / `WIPER`)
    const hdr = makeHeaderBlock(4, 2.54);
    hdr.position.set(0, 2.8, -4.8);
    hdr.rotation.y = Math.PI / 2;
    g.add(hdr);

    const pins = [
      { name: 'VCC', x: -3.81, dir: 'IN', role: 'VCC_IN', proto: 'DC' },
      { name: 'GND', x: -1.27, dir: 'IN', role: 'GND_IN', proto: 'DC' },
      { name: 'DO', x: 1.27, dir: 'OUT', role: 'GPIO', proto: 'GPIO' },
      { name: 'WIPER', x: 3.81, dir: 'OUT', role: 'ADC', proto: 'ADC' }
    ];
    for (const p of pins) {
      this.definePin(p.name, new THREE.Vector3(p.x, 4.8, -4.8), {
        direction: p.dir,
        role: p.role,
        protocol: p.proto
      });
    }
    this.definePinRole('AO', 'WIPER');
    this.definePinRole('OUT', 'DO');
  }
}
