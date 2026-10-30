import * as THREE from 'three';
import { BaseMCUBoard } from '../../core/components/base/BaseMCUBoard.js';
import { box, makeHeaderBlock, mat } from '../primitives/GeometryFactory.js';
import {
  createEsp32SilkscreenTexture,
  createEspWroomShieldTexture
} from '../primitives/SilkscreenFactory.js';
import {
  buildMountingHoles,
  buildSmdLedBank,
  createSmdTactileSwitch
} from '../subcomponents/BoardSubcomponents.js';

/**
 * ESP32 DevKit V1 (ESP-WROOM-32) 3D Development Board Component.
 *
 * Extends `BaseMCUBoard` (`extends BaseHostBoard extends BaseBoard extends HardwareComponent`):
 * - 3.3V CMOS Logic, 12-bit SAR ADC (0–4095), 240 MHz Dual-Core Xtensa LX6, Wi-Fi + BLE 4.2
 * - Full 30-pin dual header coordinate table + cross-board role & alias mapping so any LED,
 *   Button, Motor, Servo, Sensor, or Buzzer connects to the ESP32 seamlessly.
 */
export class ESP32DevKitBoard extends BaseMCUBoard {
  static typeId = 'board.esp32_devkit';
  static category = 'boards';
  static hostFamily = 'mcu';
  static displayName = 'ESP32 DevKit V1';
  static summary = 'ESP-WROOM-32 Dual-Core 240MHz Wi-Fi + BLE 3.3V Microcontroller Board';
  static defaultLessonId = 'esp32';
  static flashProtocolId = 'esp32.esptool';
  static usbFilters = [
    { usbVendorId: 0x10c4, usbProductId: 0xea60 }, // Silicon Labs CP2102 USB to UART Bridge
    { usbVendorId: 0x1a86, usbProductId: 0x7523 }  // QinHeng CH340 Serial Bridge
  ];

  constructor(options = {}) {
    super({
      name: options.name || 'ESP32 DevKit V1 (ESP-WROOM-32)',
      description:
        options.description ||
        'Dual-core 240 MHz Xtensa LX6 Wi-Fi + Bluetooth 4.2 BLE development board with 12-bit ADC and 3.3V logic.',
      ...options
    });
  }

  getBoardCapabilities() {
    return {
      architecture: 'Xtensa Dual-Core 32-bit LX6 (ESP-WROOM-32)',
      logicVoltage: 3.3,
      adcBits: 12, // 0..4095
      pwmBits: 8,
      clockMHz: 240,
      wireless: ['Wi-Fi 802.11 b/g/n (2.4 GHz)', 'Bluetooth v4.2 BR/EDR & BLE'],
      interfaces: ['GPIO', 'PWM (16-ch LEDC)', 'ADC (18-ch 12-bit)', 'DAC (2-ch 8-bit)', 'Touch', 'UART', 'I2C', 'SPI', 'I2S']
    };
  }

  registerDefaultPinRoles() {
    const roles = {
      // Universal Logical Roles
      '@LED_BUILTIN': 'GPIO2',
      '@DIGITAL_OUT_1': 'GPIO2',
      '@BUTTON_IN_1': 'GPIO4',
      '@PWM_1': 'GPIO18',
      '@PWM_2': 'GPIO19',
      '@PWM_3': 'GPIO5',
      '@SERVO_1': 'GPIO18',
      '@ADC_1': 'GPIO34',
      '@TRIG_1': 'GPIO5',
      '@ECHO_1': 'GPIO18',
      '@BUZZER_1': 'GPIO23',
      '@I2C_SDA': 'GPIO21',
      '@I2C_SCL': 'GPIO22',
      '@VCC': '3V3',
      '@3V3': '3V3',
      '@5V': 'VIN',
      '@GND': 'GND',

      // Cross-board Arduino Uno pin aliases (allows any existing Arduino circuit to attach to ESP32!)
      PIN13: 'GPIO2',
      PIN12: 'GPIO12',
      PIN11: 'GPIO23',
      PIN10: 'GPIO5',
      PIN9: 'GPIO18',
      PIN8: 'GPIO19',
      PIN7: 'GPIO21',
      PIN6: 'GPIO22',
      PIN5: 'GPIO25',
      PIN4: 'GPIO26',
      PIN3: 'GPIO27',
      PIN2: 'GPIO4',
      PIN1: 'TX0',
      PIN0: 'RX0',
      TX: 'TX0',
      RX: 'RX0',
      SDA: 'GPIO21',
      SCL: 'GPIO22',
      A0: 'GPIO34',
      A1: 'GPIO35',
      A2: 'GPIO32',
      '5V': 'VIN',
      GND_TOP: 'GND_TOP',
      GND2: 'GND'
    };

    for (const [role, pin] of Object.entries(roles)) {
      this.definePinRole(role, pin);
    }
  }

  buildMesh() {
    const root = this.group;

    // 1. Matte Dark Charcoal ESP32 Carrier PCB (56 x 28.5 x 2.0 mm)
    const pcbMesh = box(56, 2.0, 28.5, mat('#1d222c', 0.56, 0.1), 0, 0.4, 0);
    root.add(pcbMesh);

    const silkTex = createEsp32SilkscreenTexture();
    const silkPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(55.4, 27.9),
      mat('#1d222c', 0.55, 0, silkTex ? { map: silkTex, color: new THREE.Color('#ffffff') } : {})
    );
    silkPlane.rotation.x = -Math.PI / 2;
    silkPlane.position.set(0, 2.42, 0);
    silkPlane.receiveShadow = true;
    root.add(silkPlane);

    // 4 Corner Gold Mounting Holes via shared BoardSubcomponents
    const goldMat = mat('#dfba64', 0.3, 0.78);
    buildMountingHoles(
      root,
      [
        [-25.5, -11.8],
        [25.5, -11.8],
        [-25.5, 11.8],
        [25.5, 11.8]
      ],
      { y: 2.4, padRadius: 1.8, holeRadius: 0.95, padColor: '#dfba64', holeColor: '#12151d' }
    );

    // 2. Surface-Mounted ESP-WROOM-32 Module + Brushed Aluminum RF Shield Can + PCB Antenna
    const wroomGroup = new THREE.Group();
    wroomGroup.position.set(12.5, 2.4, 0);

    // Module substrate PCB (25.5 x 18 mm)
    wroomGroup.add(box(25.5, 0.9, 18.0, mat('#151922', 0.5), 0, 0, 0));

    // Gold plated edge castellations along top, bottom, and left edges of the WROOM module
    for (let i = 0; i < 10; i++) {
      const cx = -10.5 + i * 1.9;
      wroomGroup.add(box(0.85, 0.95, 0.5, goldMat, cx, 0.02, -8.9));
      wroomGroup.add(box(0.85, 0.95, 0.5, goldMat, cx, 0.02, 8.9));
    }

    // Metallic RF Shield Can (18.5 x 16.2 x 2.8 mm)
    const shieldTex = createEspWroomShieldTexture();
    const shieldCan = box(18.5, 2.8, 16.2, mat('#cfd4dc', 0.26, 0.82), -3.2, 0.9, 0);
    wroomGroup.add(shieldCan);

    const shieldTop = new THREE.Mesh(
      new THREE.PlaneGeometry(18.1, 15.8),
      mat('#cfd4dc', 0.28, 0.75, shieldTex ? { map: shieldTex, color: new THREE.Color('#ffffff') } : {})
    );
    shieldTop.rotation.x = -Math.PI / 2;
    shieldTop.position.set(-3.2, 3.72, 0);
    wroomGroup.add(shieldTop);

    // 3. 2.4 GHz Wi-Fi / BLE Gold Meander PCB Antenna (protruding on right end)
    const antennaGroup = new THREE.Group();
    antennaGroup.position.set(9.2, 0.92, 0);
    antennaGroup.add(box(6.2, 0.12, 16.8, mat('#11151d', 0.65), 0, 0, 0));
    // Meander gold traces
    for (let m = -6; m <= 6; m += 3) {
      antennaGroup.add(box(4.4, 0.18, 0.75, goldMat, 0.2, 0.08, m));
    }
    antennaGroup.add(box(0.75, 0.18, 13.0, goldMat, 2.1, 0.08, 0));
    antennaGroup.add(box(0.75, 0.18, 13.0, goldMat, -1.7, 0.08, 0));
    wroomGroup.add(antennaGroup);
    root.add(wroomGroup);

    // 4. Micro-USB Port (left edge)
    const usbGroup = new THREE.Group();
    usbGroup.position.set(-26.2, 2.4, 0);
    usbGroup.add(box(6.5, 3.1, 8.2, mat('#d4d8e0', 0.25, 0.82), 0, 0, 0));
    usbGroup.add(box(1.4, 1.9, 6.2, mat('#181c26', 0.75), -2.8, 0.6, 0));
    root.add(usbGroup);

    // 5. CP2102 USB-to-UART Bridge QFN-28 IC & AMS1117-3.3 Regulator
    const cp2102Group = new THREE.Group();
    cp2102Group.position.set(-14.5, 2.4, 0);
    cp2102Group.add(box(5.2, 1.1, 5.2, mat('#202532', 0.45), 0, 0, 0));
    // AMS1117 3.3V LDO regulator beside CP2102
    cp2102Group.add(box(6.5, 1.6, 3.6, mat('#232836', 0.5), 4.5, 0, -5.2));
    cp2102Group.add(box(3.2, 0.5, 1.8, mat('#cfd4dc', 0.3, 0.8), 4.5, 0.1, -7.2));
    root.add(cp2102Group);

    // 6. Dual Tactile Buttons: EN (Reset) & BOOT (IO0 Flash mode) via shared BoardSubcomponents
    const buttonsGroup = new THREE.Group();
    buttonsGroup.add(
      createSmdTactileSwitch(-21.5, 2.4, -7.2, { width: 4.2, depth: 3.2, capRadius: 1.15 }),
      createSmdTactileSwitch(-21.5, 2.4, 7.2, { width: 4.2, depth: 3.2, capRadius: 1.15 })
    );
    root.add(buttonsGroup);

    // 7. Dual 15-Pin Header Banks (Top row z = -11.5, Bottom row z = +11.5)
    const headerTop = makeHeaderBlock(15);
    headerTop.position.set(0, 2.4, -11.5);
    root.add(headerTop);

    const headerBottom = makeHeaderBlock(15);
    headerBottom.position.set(0, 2.4, 11.5);
    root.add(headerBottom);

    // 8. Onboard SMD LEDs: Red Power ('on'), Blue GPIO2 ('l' / 'wifi'), TX/RX via shared BoardSubcomponents
    const leds = buildSmdLedBank(
      root,
      [
        { id: 'on', x: -18.5, z: -3.6, color: '#e6392e', active: true },
        { id: 'l', x: -18.5, z: 3.6, color: '#2b8cff', active: false },
        { id: 'tx', x: -10.5, z: 4.2, color: '#39c46e', active: false },
        { id: 'rx', x: -10.5, z: 6.4, color: '#ffb340', active: false }
      ],
      2.4
    );
    this.refs.leds = leds;

    // 9. Exact 3D Pin Coordinate Table for all 30 ESP32 DevKit V1 Pins
    // Pitch = 2.54mm across 15 pins -> x from -17.78 to +17.78
    const topPinNames = [
      '3V3',
      'GND_TOP',
      'GPIO15',
      'GPIO2',
      'GPIO4',
      'GPIO16',
      'GPIO17',
      'GPIO5',
      'GPIO18',
      'GPIO19',
      'GPIO21',
      'RX0',
      'TX0',
      'GPIO22',
      'GPIO23'
    ];
    topPinNames.forEach((name, idx) => {
      const x = -17.78 + idx * 2.54;
      this.definePin(name, [x, 10.9, -11.5]);
    });

    const bottomPinNames = [
      'VIN',
      'GND',
      'GPIO13',
      'GPIO12',
      'GPIO14',
      'GPIO27',
      'GPIO26',
      'GPIO25',
      'GPIO33',
      'GPIO32',
      'GPIO35',
      'GPIO34',
      'VN',
      'VP',
      'EN'
    ];
    bottomPinNames.forEach((name, idx) => {
      const x = -17.78 + idx * 2.54;
      this.definePin(name, [x, 10.9, 11.5]);
    });

    // 10. Interactive 3D Callouts for ESP32 Subsystems
    this.boardCallouts = [
      {
        id: 'wroom',
        i18nKey: 'callouts.wroom',
        label: 'ESP-WROOM-32 SoC',
        desc: '240 MHz Dual-Core Xtensa LX6 32-bit microprocessor with 520 KB SRAM & 4 MB Flash under an RF shield.',
        anchor: new THREE.Vector3(9.5, 6.5, 0),
        offset: [64, -48],
        mesh: wroomGroup
      },
      {
        id: 'antenna',
        i18nKey: 'callouts.antenna',
        label: '2.4 GHz Wi-Fi / BLE Antenna',
        desc: 'Onboard gold meander PCB trace antenna supporting 802.11 b/g/n Wi-Fi and Bluetooth 4.2 + BLE.',
        anchor: new THREE.Vector3(22.0, 4.2, 0),
        offset: [78, 8],
        mesh: antennaGroup
      },
      {
        id: 'usb',
        i18nKey: 'callouts.esp_usb',
        label: 'Micro-USB Port',
        desc: 'Supplies 5V power and flashes firmware at up to 921,600 baud via the CP2102 bridge.',
        anchor: new THREE.Vector3(-26.2, 6.2, 0),
        offset: [-72, -38],
        mesh: usbGroup
      },
      {
        id: 'cp2102',
        i18nKey: 'callouts.cp2102',
        label: 'CP2102 & 3.3V LDO',
        desc: 'Silicon Labs USB-to-UART bridge + AMS1117-3.3 regulator converting 5V USB down to 3.3V logic.',
        anchor: new THREE.Vector3(-13.5, 4.5, -2),
        offset: [-68, 42],
        mesh: cp2102Group
      },
      {
        id: 'buttons',
        i18nKey: 'callouts.buttons',
        label: 'EN & BOOT Buttons',
        desc: 'EN resets the SoC; holding BOOT (GPIO0) enters serial bootloader flashing mode.',
        anchor: new THREE.Vector3(-21.5, 5.2, 7.2),
        offset: [-78, 12],
        mesh: buttonsGroup
      },
      {
        id: 'gpio',
        i18nKey: 'callouts.gpio',
        label: '30-Pin Muliplexed GPIO',
        desc: '3.3V pins with 12-bit SAR ADC (0–4095), 16 PWM LEDC channels, capacitive touch, I2C, SPI & DAC.',
        anchor: new THREE.Vector3(0, 10.9, -11.5),
        offset: [12, -54],
        mesh: headerTop
      }
    ];

    root.userData.leds = leds;
    root.userData.pins = this.pins;
    root.userData.callouts = this.boardCallouts;
  }
}
