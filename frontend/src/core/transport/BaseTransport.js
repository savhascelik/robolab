import { eventBus } from '../events/EventBus.js';

/**
 * Abstract Base Class for Hardware Communication Transports (Virtual 3D Loopback, Browser WebSerial USB, WebUSB).
 */
export class BaseTransport {
  static transportType = 'abstract.transport';

  constructor(options = {}) {
    if (new.target === BaseTransport) {
      throw new Error('BaseTransport is an abstract base class and cannot be instantiated directly.');
    }
    this.baudRate = options.baudRate || 115200;
    this.isConnected = false;
    this.rxListeners = new Set();
    this.txHistory = [];
  }

  /**
   * Opens the transport channel.
   * @param {object} [_options]
   * @returns {Promise<boolean>}
   */
  async connect(_options = {}) {
    throw new Error(`${this.constructor.name} must implement connect()`);
  }

  /**
   * Closes the transport channel.
   * @returns {Promise<void>}
   */
  async disconnect() {
    this.isConnected = false;
    eventBus.emit('transport:disconnected', { transportType: this.constructor.transportType });
  }

  /**
   * Writes raw binary bytes (`Uint8Array`) to the transport.
   * @param {Uint8Array} _bytes
   * @returns {Promise<number>} Number of bytes written
   */
  async writeBytes(_bytes) {
    throw new Error(`${this.constructor.name} must implement writeBytes(bytes)`);
  }

  /**
   * Encodes and writes a UTF-8 string to the transport.
   * @param {string} text
   * @returns {Promise<number>}
   */
  async writeText(text) {
    const encoder = new TextEncoder();
    return this.writeBytes(encoder.encode(String(text)));
  }

  /**
   * Sets DTR (Data Terminal Ready) and RTS (Request To Send) control lines
   * to trigger hardware reset / bootloader entry on Arduino Uno & ESP32.
   * @param {boolean} _dtr
   * @param {boolean} _rts
   * @returns {Promise<void>}
   */
  async setSignals(_dtr, _rts) {}

  /**
   * Subscribes to incoming data frames.
   * @param {(chunk: Uint8Array) => void} listener
   */
  onReceive(listener) {
    this.rxListeners.add(listener);
    return () => this.rxListeners.delete(listener);
  }

  emitReceive(chunk) {
    for (const fn of this.rxListeners) {
      fn(chunk);
    }
    eventBus.emit('transport:rx', { chunk });
  }
}
