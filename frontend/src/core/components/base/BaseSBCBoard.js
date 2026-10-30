import { BaseHostBoard } from './BaseHostBoard.js';

/**
 * Abstract Base Class for Single-Board Computers & Edge AI Platforms (e.g., NVIDIA Jetson Nano, Raspberry Pi).
 * Extends `BaseHostBoard` with 40-pin Linux GPIO sysfs/Jetson.GPIO numbering, GPU compute descriptors,
 * CSI camera lanes, and strict 3.3V CMOS I/O protection.
 */
export class BaseSBCBoard extends BaseHostBoard {
  static typeId = 'abstract.sbc_board';
  static category = 'boards';
  static hostFamily = 'sbc';
  static displayName = 'Abstract Single-Board Computer (SBC)';
  static flashProtocolId = 'sbc.jetson_edge';
  static usbFilters = [
    { usbVendorId: 0x0955, usbProductId: 0x7020 } // NVIDIA Jetson L4T USB Gadget
  ];

  constructor(options = {}) {
    if (new.target === BaseSBCBoard) {
      throw new Error('BaseSBCBoard is an abstract base class and cannot be instantiated directly.');
    }
    super(options);
  }

  getBoardCapabilities() {
    return {
      architecture: 'ARM64 SoC + Accelerated GPU',
      logicVoltage: 3.3,
      adcBits: 0, // 40-pin SBC headers use digital GPIO + I2C/SPI external ADC modules
      pwmBits: 8,
      clockMHz: 1479,
      gpuCores: 128,
      wireless: [],
      interfaces: ['GPIO (40-Pin)', 'PWM', 'I2C', 'SPI', 'UART', 'I2S', 'CSI-2 Camera', 'USB 3.0', 'Gigabit Ethernet']
    };
  }

  /**
   * Standard 40-pin header logical role mapping shared by Jetson Nano & Raspberry Pi J41 headers.
   */
  registerDefaultPinRoles() {
    const roles = {
      '@LED_BUILTIN': 'GPIO_PIN7',
      '@DIGITAL_OUT_1': 'GPIO_PIN7',
      '@BUTTON_IN_1': 'GPIO_PIN11',
      '@PWM_1': 'PWM_PIN32',
      '@PWM_2': 'PWM_PIN33',
      '@SERVO_1': 'PWM_PIN32',
      '@TRIG_1': 'GPIO_PIN13',
      '@ECHO_1': 'GPIO_PIN15',
      '@BUZZER_1': 'PWM_PIN33',
      '@I2C_SDA': 'I2C1_SDA_PIN3',
      '@I2C_SCL': 'I2C1_SCL_PIN5',
      '@VCC': '3V3',
      '@3V3': '3V3',
      '@5V': '5V',
      '@GND': 'GND',
      // Cross-board Arduino/ESP32 aliases so existing lessons & components plug directly into SBCs
      PIN13: 'GPIO_PIN7',
      GPIO2: 'GPIO_PIN7',
      PIN2: 'GPIO_PIN11',
      GPIO4: 'GPIO_PIN11',
      PIN9: 'PWM_PIN32',
      GPIO18: 'PWM_PIN32',
      PIN6: 'PWM_PIN33',
      GPIO19: 'PWM_PIN33',
      PIN10: 'GPIO_PIN15',
      GPIO5: 'GPIO_PIN13',
      PIN8: 'PWM_PIN33'
    };
    for (const [role, pin] of Object.entries(roles)) {
      this.definePinRole(role, pin);
    }
  }
}
