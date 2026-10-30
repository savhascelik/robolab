import { BaseHostBoard } from './BaseHostBoard.js';

/**
 * Abstract Base Class for Microcontroller Unit (MCU) Development Boards:
 * - Arduino Uno R3 (ATmega328P 8-bit AVR, 5V, 10-bit ADC)
 * - ESP32 DevKit V1 (ESP-WROOM-32 Dual-Core Xtensa LX6, 3.3V, 12-bit ADC)
 * - Future STM32 Nucleo, Raspberry Pi Pico (RP2040), Arduino Mega
 *
 * Extends `BaseHostBoard` with MCU-specific ADC voltage conversion, PWM duty resolution,
 * and serial bootloader flashing properties.
 */
export class BaseMCUBoard extends BaseHostBoard {
  static typeId = 'abstract.mcu_board';
  static category = 'boards';
  static hostFamily = 'mcu';
  static displayName = 'Abstract Microcontroller (MCU) Board';
  static flashProtocolId = 'avr.stk500v1';

  constructor(options = {}) {
    if (new.target === BaseMCUBoard) {
      throw new Error('BaseMCUBoard is an abstract base class and cannot be instantiated directly.');
    }
    super(options);
  }

  /**
   * Converts a raw ADC integer reading (e.g. 0..1023 or 0..4095) to physical voltage (0..logicVoltage).
   * @param {number} rawAdc
   * @returns {number}
   */
  adcToVoltage(rawAdc) {
    const maxAdc = this.getMaxAdcValue();
    if (maxAdc <= 0) return 0;
    const clamped = Math.max(0, Math.min(maxAdc, Number(rawAdc) || 0));
    const vRef = this.capabilities?.logicVoltage || 5.0;
    return Number(((clamped / maxAdc) * vRef).toFixed(3));
  }

  /**
   * Converts a physical analog voltage (0..logicVoltage) into this MCU's native ADC reading.
   * @param {number} voltage
   * @returns {number}
   */
  voltageToAdc(voltage) {
    const maxAdc = this.getMaxAdcValue();
    if (maxAdc <= 0) return 0;
    const vRef = this.capabilities?.logicVoltage || 5.0;
    const ratio = Math.max(0, Math.min(1, (Number(voltage) || 0) / vRef));
    return Math.round(ratio * maxAdc);
  }
}
