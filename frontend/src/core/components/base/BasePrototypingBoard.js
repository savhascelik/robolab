import { BaseBoard } from './BaseBoard.js';

/**
 * Abstract Base Class for Solderless Breadboards, Proto-Shields, and Breakout Carrier Surfaces.
 * Separates passive prototyping boards from programmable host boards (`BaseHostBoard`).
 */
export class BasePrototypingBoard extends BaseBoard {
  static typeId = 'abstract.prototyping_board';
  static category = 'boards';
  static displayName = 'Abstract Prototyping Board';

  constructor(options = {}) {
    if (new.target === BasePrototypingBoard) {
      throw new Error('BasePrototypingBoard is an abstract base class and cannot be instantiated directly.');
    }
    super(options);
    this.tiePoints = options.tiePoints || this.getTiePointCount();
  }

  getDefaultState() {
    return {
      powered: true,
      railsConnected: true
    };
  }

  /**
   * Returns total number of tie-point insertion sockets on the prototyping surface.
   */
  getTiePointCount() {
    return 400;
  }

  /**
   * Computes the local X coordinate (in mm) for a given breadboard column/row index (2.54mm pitch).
   * @param {number} rowIndex
   * @returns {number}
   */
  getRowX(rowIndex = 0) {
    return Number((-34.5 + rowIndex * 2.54).toFixed(2));
  }

  /**
   * Configures realistic solderless breadboard 5-hole vertical terminal strips (A-E and F-J)
   * and horizontal power distribution rails using zero-ohm `internalBridges`.
   */
  setupElectricalModel() {
    if (this.internalBridges.length > 0) return;

    const topRows = [
      ['A', -11.0],
      ['B', -8.5],
      ['C', -6.0],
      ['D', -3.5],
      ['E', -1.2]
    ];
    const botRows = [
      ['F', 1.2],
      ['G', 3.5],
      ['H', 6.0],
      ['I', 8.5],
      ['J', 11.0]
    ];

    for (let col = 1; col <= 15; col++) {
      const x = Number((-21.0 + (col - 1) * 3.0).toFixed(2));

      for (const [rowLetter, z] of topRows) {
        const pinId = `${rowLetter}${col}`;
        this.definePin(pinId, [x, 5.4, z], { direction: 'IO', role: 'SIGNAL' });
        if (rowLetter !== 'A') {
          this.defineInternalBridge(`A${col}`, pinId);
        }
      }

      for (const [rowLetter, z] of botRows) {
        const pinId = `${rowLetter}${col}`;
        this.definePin(pinId, [x, 5.4, z], { direction: 'IO', role: 'SIGNAL' });
        if (rowLetter !== 'F') {
          this.defineInternalBridge(`F${col}`, pinId);
        }
      }
    }

    // Horizontal power & ground bus rails (5 tap points per rail)
    for (let tap = 1; tap <= 5; tap++) {
      const rx = Number((-20.0 + (tap - 1) * 10.0).toFixed(2));
      this.definePin(`PLUS_TOP_${tap}`, [rx, 5.4, -17.0], { direction: 'IO', role: 'POWER' });
      this.definePin(`MINUS_TOP_${tap}`, [rx, 5.4, -14.5], { direction: 'IO', role: 'GND' });
      this.definePin(`PLUS_BOT_${tap}`, [rx, 5.4, 14.5], { direction: 'IO', role: 'POWER' });
      this.definePin(`MINUS_BOT_${tap}`, [rx, 5.4, 17.0], { direction: 'IO', role: 'GND' });

      this.definePinAlias(`VCC_TOP_${tap}`, `PLUS_TOP_${tap}`);
      this.definePinAlias(`GND_TOP_${tap}`, `MINUS_TOP_${tap}`);
      this.definePinAlias(`VCC_BOT_${tap}`, `PLUS_BOT_${tap}`);
      this.definePinAlias(`GND_BOT_${tap}`, `MINUS_BOT_${tap}`);

      if (tap > 1) {
        this.defineInternalBridge('PLUS_TOP_1', `PLUS_TOP_${tap}`);
        this.defineInternalBridge('MINUS_TOP_1', `MINUS_TOP_${tap}`);
        this.defineInternalBridge('PLUS_BOT_1', `PLUS_BOT_${tap}`);
        this.defineInternalBridge('MINUS_BOT_1', `MINUS_BOT_${tap}`);
      }
    }
  }
}
