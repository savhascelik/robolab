import { BaseTransport } from './BaseTransport.js';
import { eventBus } from '../events/EventBus.js';

/**
 * Browser WebSerial USB Transport (`transport.webserial`).
 * Connects directly to physical microcontrollers (Arduino Uno R3, ESP32 DevKit V1, STM32, Jetson USB-CDC)
 * over the W3C WebSerial API (`navigator.serial`).
 */
export class WebSerialTransport extends BaseTransport {
  static transportType = 'transport.webserial';

  constructor(options = {}) {
    super(options);
    this.port = options.port || null;
    this.reader = null;
    this.signalLog = [];
  }

  /**
   * Checks whether the current browser environment supports the WebSerial API.
   * @returns {boolean}
   */
  static isSupported() {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  /**
   * Requests a USB serial port matching the given `hostBoard`'s USB VID/PID filters (or uses an injected port)
   * and opens the serial connection.
   * @param {object} [options]
   * @param {import('../components/base/BaseHostBoard.js').BaseHostBoard} [options.hostBoard]
   * @param {number} [options.baudRate]
   * @param {object} [options.port] Optional pre-selected or mock SerialPort
   */
  async connect(options = {}) {
    const baudRate = options.baudRate || this.baudRate || 115200;
    this.baudRate = baudRate;

    if (options.port) {
      this.port = options.port;
    } else if (!this.port) {
      if (!WebSerialTransport.isSupported()) {
        throw new Error(
          'WebSerial API is not available in this browser. Use Chrome/Edge over HTTPS or localhost.'
        );
      }
      const filters = options.hostBoard?.getUsbFilters?.() || [];
      this.port = await navigator.serial.requestPort(filters.length > 0 ? { filters } : {});
    }

    await this.port.open({ baudRate });
    this.isConnected = true;
    this.txHistory = [];
    this.signalLog = [];

    eventBus.emit('transport:connected', {
      transportType: WebSerialTransport.transportType,
      baudRate
    });

    this._startReadLoop();
    return true;
  }

  async _startReadLoop() {
    if (!this.port?.readable) return;
    try {
      this.reader = this.port.readable.getReader();
      while (this.isConnected) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) this.emitReceive(value);
      }
    } catch (_err) {
      // Port closed or unplugged
    } finally {
      this.reader?.releaseLock?.();
      this.reader = null;
    }
  }

  async writeBytes(bytes) {
    if (!this.isConnected || !this.port?.writable) {
      throw new Error('WebSerialTransport is not connected to an open writable serial port.');
    }
    const payload = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(payload);
      this.txHistory.push(new Uint8Array(payload));
      return payload.byteLength;
    } finally {
      writer.releaseLock();
    }
  }

  async setSignals(dtr, rts) {
    const entry = { dataTerminalReady: Boolean(dtr), requestToSend: Boolean(rts) };
    this.signalLog.push(entry);
    if (this.port?.setSignals) {
      await this.port.setSignals(entry);
    }
  }

  async disconnect() {
    this.isConnected = false;
    try {
      await this.reader?.cancel?.();
    } catch (_e) {
      // Ignore reader cancel error
    }
    try {
      await this.port?.close?.();
    } catch (_e) {
      // Ignore port close error
    }
    await super.disconnect();
  }
}
