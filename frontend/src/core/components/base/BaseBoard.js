import { HardwareComponent } from '../HardwareComponent.js';

/**
 * Abstract Base Class for Development Boards & Prototyping Surfaces (Arduino Uno, Breadboard).
 */
export class BaseBoard extends HardwareComponent {
  static typeId = 'abstract.board';
  static category = 'boards';
  static displayName = 'Abstract Board';

  constructor(options = {}) {
    if (new.target === BaseBoard) {
      throw new Error('BaseBoard is an abstract base class and cannot be instantiated directly.');
    }
    super(options);
  }

  getDefaultState() {
    return {
      powered: true,
      leds: {
        on: true,
        l: false,
        tx: false,
        rx: false
      }
    };
  }
}
