import * as THREE from 'three';
import { BaseSBCBoard } from '../../core/components/base/BaseSBCBoard.js';
import { box, cyl, makeHeaderBlock, mat } from '../primitives/GeometryFactory.js';
import { createJetsonNanoSilkscreenTexture } from '../primitives/SilkscreenFactory.js';
import {
  buildMountingHoles,
  buildSmdLedBank
} from '../subcomponents/BoardSubcomponents.js';

/**
 * NVIDIA Jetson Nano Developer Kit (B01) 3D Single-Board Computer Component.
 *
 * Extends `BaseSBCBoard` (`extends BaseHostBoard extends BaseBoard extends HardwareComponent`):
 * - 128-Core NVIDIA Maxwell GPU + Quad-Core ARM Cortex-A57 @ 1.43 GHz, 4GB LPDDR4
 * - Strictly 3.3V CMOS J41 40-Pin Expansion Header (`maxVoltage = 3.6V`; 5.0V signals trigger overvoltage fault)
 * - Finned black anodized aluminum heatsink, MIPI CSI-2 camera connector, RJ45 Ethernet & USB 3.0 stack
 */
export class JetsonNanoBoard extends BaseSBCBoard {
  static typeId = 'board.jetson_nano';
  static category = 'boards';
  static hostFamily = 'sbc';
  static displayName = 'NVIDIA Jetson Nano';
  static summary = '128-Core Maxwell GPU + Quad-Core ARM Cortex-A57 Edge AI SBC (3.3V J41 Header)';
  static flashProtocolId = 'sbc.jetson_edge';

  constructor(options = {}) {
    super({
      name: options.name || 'NVIDIA Jetson Nano Developer Kit',
      description:
        options.description ||
        '128-core Maxwell GPU Edge AI Single-Board Computer with 40-pin 3.3V J41 GPIO header, I2C, SPI, PWM, and MIPI CSI-2.',
      ...options
    });
  }

  registerDefaultPinRoles() {
    super.registerDefaultPinRoles();
    const extraAliases = {
      GPIO7: 'GPIO_PIN7',
      GPIO11: 'GPIO_PIN11',
      GPIO12: 'GPIO_PIN12',
      GPIO13: 'GPIO_PIN13',
      GPIO15: 'GPIO_PIN15',
      GPIO18: 'PWM_PIN32',
      GPIO19: 'PWM_PIN33',
      PIN12: 'GPIO_PIN12',
      SDA: 'I2C1_SDA_PIN3',
      SCL: 'I2C1_SCL_PIN5',
      TX0: 'UART_TX_PIN8',
      RX0: 'UART_RX_PIN10',
      GND_2: 'GND_PIN9',
      GND_3: 'GND_PIN39'
    };
    for (const [alias, pin] of Object.entries(extraAliases)) {
      this.definePinRole(alias, pin);
    }
  }

  buildMesh() {
    const root = this.group;

    // 1. Matte Dark Obsidian Carrier PCB (78 x 54 x 2.0 mm) + Silkscreen Overlay
    const pcbMesh = box(78, 2.0, 54, mat('#151921', 0.55, 0.12), 0, 0.4, 0);
    root.add(pcbMesh);

    const silkMat = new THREE.MeshStandardMaterial({
      map: createJetsonNanoSilkscreenTexture(),
      roughness: 0.45,
      metalness: 0.08
    });
    const silkPlane = new THREE.Mesh(new THREE.PlaneGeometry(77.4, 53.4), silkMat);
    silkPlane.rotation.x = -Math.PI / 2;
    silkPlane.position.set(0, 1.42, 0);
    root.add(silkPlane);

    buildMountingHoles(
      root,
      [
        [-35.5, -23.5],
        [35.5, -23.5],
        [-35.5, 23.5],
        [35.5, 23.5]
      ],
      { y: 2.4, padRadius: 2.1, holeRadius: 1.1, padColor: '#dfba64', holeColor: '#0e1117' }
    );

    // 2. SO-DIMM Module + Black Anodized Aluminum Finned Heatsink Block (center-right)
    const heatsinkGroup = new THREE.Group();
    heatsinkGroup.position.set(8, 2.4, 2);

    // SoM substrate PCB
    heatsinkGroup.add(box(46, 1.2, 34, mat('#1b241e', 0.5), 0, 0.2, 0));

    // Base heatsink plate
    const sinkMat = mat('#22262e', 0.34, 0.78);
    heatsinkGroup.add(box(44, 2.4, 32, sinkMat, 0, 1.8, 0));

    // 11 Anodized Cooling Fins
    for (let i = -5; i <= 5; i++) {
      heatsinkGroup.add(box(44, 7.5, 1.2, sinkMat, 0, 5.5, i * 2.8));
    }

    // Subtle green Edge AI badge strip on heatsink
    heatsinkGroup.add(box(14, 0.3, 4.2, mat('#76b900', 0.35, 0.2), 0, 9.4, 0));
    root.add(heatsinkGroup);

    // 3. J41 40-Pin (2x20) Dual Expansion Header along top edge (z = -22.5)
    const headerGroup = new THREE.Group();
    const headerRowA = makeHeaderBlock(20);
    headerRowA.position.set(2, 2.4, -23.2);
    const headerRowB = makeHeaderBlock(20);
    headerRowB.position.set(2, 2.4, -20.66);
    headerGroup.add(headerRowA, headerRowB);
    root.add(headerGroup);

    // 4. MIPI CSI-2 Camera Ribbon Connector (right edge)
    const csiGroup = new THREE.Group();
    csiGroup.position.set(34.5, 2.4, 2);
    csiGroup.add(box(3.2, 5.2, 22, mat('#1e222a', 0.5), 0, 0, 0));
    csiGroup.add(box(2.4, 1.4, 20.5, mat('#d8dce3', 0.4), 0, 4.6, 0));
    root.add(csiGroup);

    // 5. Left I/O Port Stack: Gigabit Ethernet RJ45 + 2x USB 3.0 Towers + HDMI
    const portsGroup = new THREE.Group();
    portsGroup.position.set(-32, 2.4, 2);
    const shieldMat = mat('#cfd5de', 0.26, 0.84);
    // RJ45 Gigabit Ethernet
    portsGroup.add(box(13.5, 11.2, 14.0, shieldMat, 0, 0, -12));
    // USB 3.0 Dual Stack 1
    portsGroup.add(box(12.5, 13.0, 12.2, shieldMat, 0, 0, 2));
    portsGroup.add(box(2.0, 3.0, 9.0, mat('#1d63d8', 0.4), -5.6, 4.2, 2));
    portsGroup.add(box(2.0, 3.0, 9.0, mat('#1d63d8', 0.4), -5.6, 9.2, 2));
    // HDMI / DP Stack
    portsGroup.add(box(10.5, 6.2, 12.0, shieldMat, 0, 0, 15.5));
    root.add(portsGroup);

    // 6. 5V / 4A DC Barrel Jack (bottom-left edge)
    const powerGroup = new THREE.Group();
    powerGroup.position.set(-22, 2.4, 21.5);
    powerGroup.add(box(9.0, 8.2, 10.5, mat('#1b1e24', 0.45), 0, 0, 0));
    const barrelCyl = cyl(2.6, 2.6, 4.2, 20, mat('#cfd5de', 0.28, 0.82), 0, 4.1, 4.2);
    barrelCyl.rotation.x = Math.PI / 2;
    powerGroup.add(barrelCyl);
    root.add(powerGroup);

    // 7. Onboard Status LEDs
    const leds = buildSmdLedBank(
      root,
      [
        { id: 'on', x: -12, z: 22.5, color: '#10b981', active: true },
        { id: 'l', x: -7, z: 22.5, color: '#76b900', active: false }
      ],
      2.4
    );
    this.refs.leds = leds;

    // 8. Define Physical J41 40-Pin Header Coordinates (3.3V CMOS Logic!)
    const j41Pins = [
      { name: '3V3', col: 0, row: 0 },
      { name: '5V', col: 0, row: 1 },
      { name: 'I2C1_SDA_PIN3', col: 1, row: 0 },
      { name: 'I2C1_SCL_PIN5', col: 2, row: 0 },
      { name: 'GND', col: 2, row: 1 },
      { name: 'GPIO_PIN7', col: 3, row: 0 },
      { name: 'UART_TX_PIN8', col: 3, row: 1 },
      { name: 'GND_PIN9', col: 4, row: 0 },
      { name: 'UART_RX_PIN10', col: 4, row: 1 },
      { name: 'GPIO_PIN11', col: 5, row: 0 },
      { name: 'GPIO_PIN12', col: 5, row: 1 },
      { name: 'GPIO_PIN13', col: 6, row: 0 },
      { name: 'GPIO_PIN15', col: 7, row: 0 },
      { name: 'GPIO_PIN16', col: 7, row: 1 },
      { name: 'GPIO_PIN18', col: 8, row: 1 },
      { name: 'SPI1_MOSI_PIN19', col: 9, row: 0 },
      { name: 'SPI1_MISO_PIN21', col: 10, row: 0 },
      { name: 'GPIO_PIN22', col: 10, row: 1 },
      { name: 'SPI1_SCK_PIN23', col: 11, row: 0 },
      { name: 'SPI1_CS0_PIN24', col: 11, row: 1 },
      { name: 'I2C0_SDA_PIN27', col: 13, row: 0 },
      { name: 'I2C0_SCL_PIN28', col: 13, row: 1 },
      { name: 'GPIO_PIN29', col: 14, row: 0 },
      { name: 'GPIO_PIN31', col: 15, row: 0 },
      { name: 'PWM_PIN32', col: 15, row: 1 },
      { name: 'PWM_PIN33', col: 16, row: 0 },
      { name: 'GPIO_PIN35', col: 17, row: 0 },
      { name: 'GPIO_PIN36', col: 17, row: 1 },
      { name: 'GPIO_PIN37', col: 18, row: 0 },
      { name: 'GPIO_PIN38', col: 18, row: 1 },
      { name: 'GND_PIN39', col: 19, row: 0 },
      { name: 'GPIO_PIN40', col: 19, row: 1 }
    ];

    for (const p of j41Pins) {
      const x = -22.13 + p.col * 2.54;
      const z = p.row === 0 ? -23.2 : -20.66;
      this.definePin(p.name, [x, 10.9, z]);
    }

    // Mark PWM_PIN32 & PWM_PIN33 explicitly as PWM protocol and I2C pins as I2C
    for (const pwmName of ['PWM_PIN32', 'PWM_PIN33']) {
      const ep = this.electricalPins.get(pwmName);
      if (ep) {
        ep.protocol = 'PWM';
        ep.role = 'GPIO';
        ep.maxVoltage = 3.6;
      }
    }
    for (const i2cName of ['I2C1_SDA_PIN3', 'I2C1_SCL_PIN5', 'I2C0_SDA_PIN27', 'I2C0_SCL_PIN28']) {
      const ep = this.electricalPins.get(i2cName);
      if (ep) {
        ep.protocol = 'I2C';
        ep.role = i2cName.includes('SDA') ? 'SDA' : 'SCL';
        ep.maxVoltage = 3.6;
      }
    }

    // 9. Interactive 3D Subsystem Callouts
    this.boardCallouts = [
      {
        id: 'jetson_heatsink',
        i18nKey: 'callouts.jetson_heatsink',
        label: '128-Core Maxwell GPU & Heatsink Block',
        desc: 'Quad-Core ARM Cortex-A57 + 128-core NVIDIA Maxwell SoM delivering 472 GFLOPS Edge AI inference.',
        anchor: new THREE.Vector3(8, 12.0, 2),
        offset: [54, -44],
        mesh: heatsinkGroup
      },
      {
        id: 'jetson_gpio',
        i18nKey: 'callouts.jetson_gpio',
        label: 'J41 40-Pin 3.3V GPIO Header',
        desc: 'Linux sysfs / Jetson.GPIO compatible I2C, SPI, UART, PWM and 3.3V CMOS logic pins.',
        anchor: new THREE.Vector3(2, 10.9, -22.0),
        offset: [18, -52],
        mesh: headerGroup
      },
      {
        id: 'jetson_csi',
        i18nKey: 'callouts.jetson_csi',
        label: 'MIPI CSI-2 Camera Connector',
        desc: 'High-speed MIPI CSI-2 ribbon camera bus for real-time computer vision and TensorRT models.',
        anchor: new THREE.Vector3(34.5, 7.5, 2),
        offset: [72, 12],
        mesh: csiGroup
      },
      {
        id: 'jetson_ports',
        i18nKey: 'callouts.jetson_ports',
        label: 'Gigabit Ethernet & 4× USB 3.0 Stack',
        desc: 'Dual-stack USB 3.0 and RJ45 Gigabit Ethernet ports for high-bandwidth sensors and networking.',
        anchor: new THREE.Vector3(-32, 12.0, -4),
        offset: [-74, -36],
        mesh: portsGroup
      },
      {
        id: 'jetson_power',
        i18nKey: 'callouts.jetson_power',
        label: '5V 4A Barrel Jack & Micro-USB Power',
        desc: 'Regulated 5V / 4A (20W) DC power input for sustained high-load GPU inference.',
        anchor: new THREE.Vector3(-22, 8.5, 21.5),
        offset: [-62, 38],
        mesh: powerGroup
      }
    ];

    root.userData.leds = leds;
    root.userData.pins = this.pins;
    root.userData.callouts = this.boardCallouts;
  }
}
