import * as THREE from 'three';
import { BaseDisplayModule } from '../../core/components/base/BaseDisplayModule.js';
import { box, makeHeaderBlock, mat } from '../primitives/GeometryFactory.js';
import { createOledTelemetryScreenTexture } from '../primitives/SilkscreenFactory.js';
import { buildMountingHoles } from '../subcomponents/BoardSubcomponents.js';

/**
 * 0.96" 128x64 SSD1306 I2C Dual-Color (Yellow/Cyan) OLED Telemetry Display Module.
 * Extends `BaseDisplayModule` (`extends HardwareComponent`).
 * Features ultra-crisp canvas-rendered live telemetry glass panel, FPC copper ribbon tail,
 * and 4-pin I2C interface (`GND`, `VCC`, `SCL`, `SDA`).
 */
export class Ssd1306OledDisplayComponent extends BaseDisplayModule {
  static typeId = 'display.ssd1306_oled';
  static category = 'displays';
  static displayName = '0.96" SSD1306 I2C OLED Telemetry Display';
  static summary = '128x64 I2C Graphic OLED Module with Live Yellow/Cyan Edge Telemetry Screen';

  constructor(options = {}) {
    super({
      name: options.name || '0.96" SSD1306 I2C OLED Telemetry Display',
      description:
        options.description ||
        '0.96-inch 128x64 SSD1306 I2C OLED graphic display module showing real-time Edge AI FPS, bus voltage, and sensor lock telemetry.',
      ...options
    });
    this.setupElectricalModel({ panelResistance: 220 });
  }

  buildMesh() {
    const g = this.group;
    const pcbMat = mat('#172554', 0.46, 0.16);
    const bezelMat = mat('#090d16', 0.25, 0.4);
    const fpcMat = mat('#d97706', 0.36, 0.45);

    // 1. Carrier PCB (27.5 x 1.6 x 27.0 mm) + Corner Mounting Holes
    g.add(box(27.5, 1.6, 27.0, pcbMat, 0, 1.0, 0));

    buildMountingHoles(
      g,
      [
        [-11.5, -11.2],
        [11.5, -11.2],
        [-11.5, 11.2],
        [11.5, 11.2]
      ],
      { y: 1.82, padRadius: 1.7, holeRadius: 0.9 }
    );

    // 2. Bevelled Glass OLED Panel Substrate + Active Emissive Telemetry Canvas Texture
    g.add(box(25.0, 1.4, 17.5, bezelMat, 0, 2.4, 1.2));

    const screenTex = createOledTelemetryScreenTexture(
      this.state.headlineText,
      this.state.sublineText
    );
    const screenMat = new THREE.MeshStandardMaterial({
      map: screenTex,
      emissive: '#0891b2',
      emissiveMap: screenTex,
      emissiveIntensity: 0.55,
      roughness: 0.16,
      metalness: 0.12
    });
    const screenPlane = new THREE.Mesh(new THREE.PlaneGeometry(23.2, 14.2), screenMat);
    screenPlane.rotation.x = -Math.PI / 2;
    screenPlane.position.set(0, 3.14, 0.8);
    g.add(screenPlane);
    this.refs.screenPlane = screenPlane;

    // 3. Bottom FPC Kapton Ribbon Tail
    g.add(box(12.0, 0.5, 3.4, fpcMat, 0, 2.0, 11.2));

    // 4. 4-Pin I2C Header (`GND`, `VCC`, `SCL`, `SDA`)
    const hdr = makeHeaderBlock(4, 2.54);
    hdr.position.set(0, 2.4, -10.5);
    hdr.rotation.y = Math.PI / 2;
    g.add(hdr);

    const pins = [
      { name: 'GND', x: -3.81, dir: 'IN', role: 'GND_IN', proto: 'DC' },
      { name: 'VCC', x: -1.27, dir: 'IN', role: 'VCC_IN', proto: 'DC' },
      { name: 'SCL', x: 1.27, dir: 'IN', role: 'I2C_SCL', proto: 'I2C' },
      { name: 'SDA', x: 3.81, dir: 'BIDIR', role: 'I2C_SDA', proto: 'I2C' }
    ];
    for (const p of pins) {
      this.definePin(p.name, new THREE.Vector3(p.x, 4.4, -10.5), {
        direction: p.dir,
        role: p.role,
        protocol: p.proto
      });
    }
  }
}
