import { BaseTransport } from './BaseTransport.js';
import { eventBus } from '../events/EventBus.js';

/**
 * Virtual 3D Simulation Transport (`transport.virtual_sim`).
 * Implements `BaseTransport` in memory so firmware flashing protocols (STK500v1, Esptool SLIP, Jetson Edge)
 * can execute full packet framing and verification in-browser or in headless tests without physical USB hardware.
 */
export class VirtualSimTransport extends BaseTransport {
  static transportType = 'transport.virtual_sim';

  constructor(options = {}) {
    super(options);
    this.signalHistory = [];
  }

  async connect(options = {}) {
    if (options.baudRate) this.baudRate = options.baudRate;
    this.isConnected = true;
    this.txHistory = [];
    this.signalHistory = [];
    eventBus.emit('transport:connected', {
      transportType: VirtualSimTransport.transportType,
      baudRate: this.baudRate
    });
    return true;
  }

  async writeBytes(bytes) {
    if (!this.isConnected) {
      throw new Error('VirtualSimTransport cannot writeBytes while disconnected.');
    }
    const copy = bytes instanceof Uint8Array ? new Uint8Array(bytes) : new Uint8Array(bytes || []);
    this.txHistory.push(copy);
    // Simulate bootloader ACK response `[0x14, 0x10]` (STK_INSYNC, STK_OK)
    this.emitReceive(new Uint8Array([0x14, 0x10]));
    return copy.byteLength;
  }

  async setSignals(dtr, rts) {
    this.signalHistory.push({ dtr: Boolean(dtr), rts: Boolean(rts) });
  }
}
