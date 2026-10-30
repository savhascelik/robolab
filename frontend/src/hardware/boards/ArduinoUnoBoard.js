import * as THREE from 'three';
import { BaseMCUBoard } from '../../core/components/base/BaseMCUBoard.js';
import { box, cyl, makeHeaderBlock, mat } from '../primitives/GeometryFactory.js';
import {
  createArduinoSilkscreenTexture,
  createAtmegaChipTexture
} from '../primitives/SilkscreenFactory.js';
import {
  buildMountingHoles,
  buildSmdLedBank,
  createSmdTactileSwitch
} from '../subcomponents/BoardSubcomponents.js';

/**
 * Arduino Uno R3 Development Board Component.
 * Inherits MCU ADC/PWM/Flash capabilities from BaseMCUBoard -> BaseHostBoard -> BaseBoard.
 */
export class ArduinoUnoBoard extends BaseMCUBoard {
  static typeId = 'board.arduino_uno';
  static category = 'boards';
  static hostFamily = 'mcu';
  static displayName = 'Arduino Uno R3';
  static summary = 'ATmega328P 16MHz 5V Microcontroller Development Board';
  static defaultLessonId = 'board';
  static flashProtocolId = 'avr.stk500v1';
  static usbFilters = [
    { usbVendorId: 0x2341, usbProductId: 0x0043 }, // Official Arduino Uno R3 (ATmega16U2)
    { usbVendorId: 0x1a86, usbProductId: 0x7523 }  // CH340G USB-Serial Clone
  ];

  constructor(options = {}) {
    super({
      name: options.name || 'Arduino Uno R3',
      description: options.description || 'ATmega328P 8-bit 5V microcontroller development board.',
      ...options
    });
  }

  getBoardCapabilities() {
    return {
      architecture: 'AVR 8-bit RISC (ATmega328P)',
      logicVoltage: 5.0,
      adcBits: 10,
      pwmBits: 8,
      clockMHz: 16,
      wireless: [],
      interfaces: ['GPIO', 'PWM', 'ADC', 'UART', 'I2C', 'SPI']
    };
  }

  registerDefaultPinRoles() {
    const roles = {
      '@LED_BUILTIN': 'PIN13',
      '@DIGITAL_OUT_1': 'PIN13',
      '@BUTTON_IN_1': 'PIN2',
      '@PWM_1': 'PIN9',
      '@PWM_2': 'PIN6',
      '@PWM_3': 'PIN10',
      '@SERVO_1': 'PIN9',
      '@ADC_1': 'A0',
      '@TRIG_1': 'PIN9',
      '@ECHO_1': 'PIN10',
      '@BUZZER_1': 'PIN8',
      '@I2C_SDA': 'A4',
      '@I2C_SCL': 'A5',
      '@UART_TX': 'PIN1',
      '@UART_RX': 'PIN0',
      TX0: 'PIN1',
      RX0: 'PIN0',
      TX: 'PIN1',
      RX: 'PIN0',
      SDA: 'A4',
      SCL: 'A5',
      '@VCC': '5V',
      '@3V3': '5V',
      '@5V': '5V',
      '@GND': 'GND'
    };
    for (const [role, pin] of Object.entries(roles)) {
      this.definePinRole(role, pin);
    }
  }

  buildMesh() {
    const root = this.group;

    // 1. Notched Arduino PCB geometry
    const pcbShape = new THREE.Shape();
    pcbShape.moveTo(-34, -26.5);
    pcbShape.lineTo(31, -26.5);
    pcbShape.lineTo(34, -23.5);
    pcbShape.lineTo(34, 23.5);
    pcbShape.lineTo(31, 26.5);
    pcbShape.lineTo(-34, 26.5);
    pcbShape.closePath();

    const pcbGeo = new THREE.ExtrudeGeometry(pcbShape, {
      depth: 2.2,
      bevelEnabled: true,
      bevelSize: 0.3,
      bevelThickness: 0.3,
      bevelSegments: 2
    });
    pcbGeo.rotateX(Math.PI / 2);
    const pcbMesh = new THREE.Mesh(pcbGeo, mat('#2d4b82', 0.52, 0.08));
    pcbMesh.position.y = 2.2;
    pcbMesh.castShadow = true;
    pcbMesh.receiveShadow = true;
    root.add(pcbMesh);

    // 2. Top Silkscreen
    const silkTex = createArduinoSilkscreenTexture();
    const silkPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(66, 51),
      mat('#2d4b82', 0.55, 0, silkTex ? { map: silkTex, color: new THREE.Color('#ffffff') } : {})
    );
    silkPlane.rotation.x = -Math.PI / 2;
    silkPlane.position.set(0, 2.52, 0);
    silkPlane.receiveShadow = true;
    root.add(silkPlane);

    // Mounting holes via shared BoardSubcomponents
    buildMountingHoles(
      root,
      [
        [-29, -22],
        [29, -19],
        [29, 20],
        [-20, 22]
      ],
      { y: 2.48, padRadius: 2.6, holeRadius: 1.4 }
    );

    // 3. USB-B Connector
    const usbGroup = new THREE.Group();
    usbGroup.position.set(-28, 2.5, -11);
    usbGroup.add(box(15.5, 10.8, 12, mat('#d8d4c8', 0.28, 0.75), 0, 0, 0));
    usbGroup.add(box(2.2, 7.6, 8.8, mat('#1e222d', 0.7), -7.1, 1.6, 0));
    usbGroup.add(box(3.5, 2.2, 5.4, mat('#e6dec8', 0.5), -6.5, 4.2, 0));
    root.add(usbGroup);

    // 4. DC Power Barrel Jack
    const jackGroup = new THREE.Group();
    jackGroup.position.set(-29, 2.5, 13.5);
    jackGroup.add(box(14, 10.5, 9.2, mat('#20242f', 0.55), 0, 0, 0));
    const barrel = cyl(3.6, 3.6, 4.5, 24, mat('#20242f', 0.5), -6.8, 3.2, 0);
    barrel.rotation.z = Math.PI / 2;
    jackGroup.add(barrel);
    const pinCenter = cyl(1.1, 1.1, 5.5, 16, mat('#cfd2d8', 0.25, 0.8), -6.6, 3.2, 0);
    pinCenter.rotation.z = Math.PI / 2;
    jackGroup.add(pinCenter);
    root.add(jackGroup);

    // 5. Reset Button via shared BoardSubcomponents
    root.add(
      createSmdTactileSwitch(-28, 2.5, -21.5, {
        width: 6.2,
        depth: 6.2,
        capColor: '#e04838',
        capRadius: 2.0
      })
    );

    // 6. Crystal Oscillator & Electrolytic Capacitors
    root.add(box(9.5, 3.2, 4.4, mat('#d6d2c4', 0.25, 0.8), -11, 2.5, -4));
    for (const cz of [12, 19]) {
      root.add(cyl(3.1, 3.1, 6.2, 24, mat('#cfd3da', 0.28, 0.78), -16, 2.5, cz));
      root.add(box(6.6, 0.5, 6.6, mat('#222632', 0.6), -16, 2.5, cz));
    }

    // 7. ATmega328P DIP-28 Microcontroller
    const mcuGroup = new THREE.Group();
    mcuGroup.position.set(8, 2.5, 8.5);
    mcuGroup.add(box(35.5, 2.4, 9.4, mat('#1c202b', 0.65), 0, 0, 0));
    const chipTex = createAtmegaChipTexture();
    mcuGroup.add(box(34.2, 3.2, 7.6, mat('#252a38', 0.5), 0, 2.2, 0));
    const chipTop = new THREE.Mesh(
      new THREE.PlaneGeometry(33.8, 7.2),
      mat('#252a38', 0.5, 0, chipTex ? { map: chipTex, color: new THREE.Color('#ffffff') } : {})
    );
    chipTop.rotation.x = -Math.PI / 2;
    chipTop.position.set(0, 5.42, 0);
    mcuGroup.add(chipTop);

    const legMat = mat('#c9c5ba', 0.3, 0.75);
    for (let i = 0; i < 14; i++) {
      const lx = -15.6 + i * 2.4;
      for (const lz of [-4.2, 4.2]) {
        mcuGroup.add(box(0.75, 3.2, 0.85, legMat, lx, 1.2, lz));
      }
    }
    root.add(mcuGroup);

    // 8. Female Pin Header Banks
    const digHigh = makeHeaderBlock(10);
    digHigh.position.set(-5.5, 2.5, -23.2);
    root.add(digHigh);

    const digLow = makeHeaderBlock(8);
    digLow.position.set(20.2, 2.5, -23.2);
    root.add(digLow);

    const pwrHeader = makeHeaderBlock(8);
    pwrHeader.position.set(-4.5, 2.5, 23.2);
    root.add(pwrHeader);

    const anaHeader = makeHeaderBlock(6);
    anaHeader.position.set(18.5, 2.5, 23.2);
    root.add(anaHeader);

    // 9. On-board SMD LEDs (ON, L/Pin13, TX, RX) via shared BoardSubcomponents
    const leds = buildSmdLedBank(
      root,
      [
        { id: 'on', x: 26, z: 2, color: '#39c46e', active: true },
        { id: 'l', x: -6, z: -13, color: '#ffb340', active: false },
        { id: 'tx', x: -11, z: -11, color: '#ffb340', active: false },
        { id: 'rx', x: -11, z: -14.5, color: '#ffb340', active: false }
      ],
      2.5
    );
    this.refs.leds = leds;

    const pinTable = {
      GND_TOP: [-11.8, 11.0, -23.2],
      PIN13: [-9.2, 11.0, -23.2],
      PIN12: [-6.7, 11.0, -23.2],
      PIN11: [-4.2, 11.0, -23.2],
      PIN10: [-1.6, 11.0, -23.2],
      PIN9: [0.9, 11.0, -23.2],
      PIN8: [3.4, 11.0, -23.2],
      PIN7: [11.3, 11.0, -23.2],
      PIN6: [13.8, 11.0, -23.2],
      PIN5: [16.4, 11.0, -23.2],
      PIN4: [18.9, 11.0, -23.2],
      PIN3: [21.5, 11.0, -23.2],
      PIN2: [24.0, 11.0, -23.2],
      PIN1: [26.5, 11.0, -23.2],
      PIN0: [29.1, 11.0, -23.2],
      '3V3': [-7.0, 11.0, 23.2],
      '5V': [-4.5, 11.0, 23.2],
      GND: [-1.9, 11.0, 23.2],
      GND2: [0.6, 11.0, 23.2],
      VIN: [3.2, 11.0, 23.2],
      A0: [12.1, 11.0, 23.2],
      A1: [14.7, 11.0, 23.2],
      A2: [17.2, 11.0, 23.2],
      A3: [19.8, 11.0, 23.2],
      A4: [22.3, 11.0, 23.2],
      A5: [24.9, 11.0, 23.2]
    };
    for (const [k, coords] of Object.entries(pinTable)) {
      this.definePin(k, coords);
    }

    this.boardCallouts = [
      {
        id: 'usb',
        i18nKey: 'callouts.usb',
        label: 'USB Port',
        desc: 'Connects the board to your computer to upload sketches and supply 5V USB power.',
        anchor: new THREE.Vector3(-28, 13.5, -11),
        offset: [-65, -48],
        mesh: usbGroup
      },
      {
        id: 'jack',
        i18nKey: 'callouts.jack',
        label: 'Power Jack',
        desc: 'Accepts a 7–12V DC barrel adapter or battery pack for standalone projects.',
        anchor: new THREE.Vector3(-31, 12.5, 13.5),
        offset: [-78, 12],
        mesh: jackGroup
      },
      {
        id: 'digital',
        i18nKey: 'callouts.digital',
        label: 'Digital Pins',
        desc: 'Pins 0–13 read or write HIGH (5V) / LOW (0V). Pins marked ~ support PWM.',
        anchor: new THREE.Vector3(8, 11.2, -23.2),
        offset: [72, -46],
        mesh: digHigh
      },
      {
        id: 'mcu',
        i18nKey: 'callouts.mcu',
        label: 'Microcontroller',
        desc: 'ATmega328P — the 8-bit AVR brain running your compiled C++ loop at 16 MHz.',
        anchor: new THREE.Vector3(8, 8.2, 8.5),
        offset: [68, 8],
        mesh: mcuGroup
      },
      {
        id: 'power',
        i18nKey: 'callouts.power',
        label: 'Power Pins',
        desc: 'Provides regulated 5V, 3.3V and GND rails to power breadboard circuits.',
        anchor: new THREE.Vector3(-4.5, 11.2, 23.2),
        offset: [-55, 48],
        mesh: pwrHeader
      },
      {
        id: 'analog',
        i18nKey: 'callouts.analog',
        label: 'Analog Pins',
        desc: 'Pins A0–A5 read continuous voltages (0–5V) as 10-bit numbers (0–1023).',
        anchor: new THREE.Vector3(18.5, 11.2, 23.2),
        offset: [64, 52],
        mesh: anaHeader
      }
    ];

    root.userData.leds = leds;
    root.userData.pins = this.pins;
    root.userData.callouts = this.boardCallouts;
  }
}
