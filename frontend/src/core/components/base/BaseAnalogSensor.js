import { BaseSensor } from './BaseSensor.js';

/**
 * Abstract Base Class for Continuous Analog Voltage Sensors (Potentiometer, LDR, Analog Joystick, Flex Sensor).
 * Extends `BaseSensor` with multi-resolution ADC conversion (10-bit Uno vs 12-bit ESP32) and voltage calculation.
 */
export class BaseAnalogSensor extends BaseSensor {
  static typeId = 'abstract.analog_sensor';
  static category = 'sensors';
  static displayName = 'Abstract Analog Sensor';

  constructor(options = {}) {
    if (new.target === BaseAnalogSensor) {
      throw new Error('BaseAnalogSensor is an abstract base class and cannot be instantiated directly.');
    }
    super(options);
  }

  /**
   * Computes output voltage at the analog wiper/signal pin given a board reference voltage.
   * @param {number} [vRef=5.0]
   * @returns {number}
   */
  readVoltage(vRef = 5.0) {
    return Number((this.getNormalizedValue() * vRef).toFixed(2));
  }

  /**
   * Simulates 12-bit SAR ADC readout (0..4095) for 32-bit MCUs like ESP32.
   * @returns {number}
   */
  readAnalog12Bit() {
    return Math.round(this.getNormalizedValue() * 4095);
  }

  /**
   * Reads the ADC integer scaled dynamically to the connected `BaseHostBoard` (e.g. 1023 on Uno, 4095 on ESP32).
   * @param {import('./BaseHostBoard.js').BaseHostBoard} [hostBoard]
   * @returns {number}
   */
  readAnalogForBoard(hostBoard) {
    const maxAdc = hostBoard?.getMaxAdcValue?.() || 1023;
    return Math.round(this.getNormalizedValue() * maxAdc);
  }
}
