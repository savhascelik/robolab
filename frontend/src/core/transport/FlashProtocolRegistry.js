import { BaseFlashProtocol } from './BaseFlashProtocol.js';
import { AvrStk500Protocol } from './protocols/AvrStk500Protocol.js';
import { Esp32EsptoolProtocol } from './protocols/Esp32EsptoolProtocol.js';
import { JetsonEdgeProtocol } from './protocols/JetsonEdgeProtocol.js';

/**
 * Central Registry for Firmware Compilation & USB Flashing Protocols.
 * Indexes `BaseFlashProtocol` subclasses by `protocolId` and resolves the right flasher
 * for any `BaseHostBoard` (`ArduinoUnoBoard`, `ESP32DevKitBoard`, `BaseSBCBoard` / `JetsonNanoBoard`).
 */
export class FlashProtocolRegistry {
  constructor() {
    /** @type {Map<string, typeof BaseFlashProtocol>} */
    this.byProtocolId = new Map();
    /** @type {Map<string, BaseFlashProtocol>} */
    this.instances = new Map();
  }

  /**
   * Registers a `BaseFlashProtocol` subclass.
   * @param {typeof BaseFlashProtocol} ProtocolClass
   */
  register(ProtocolClass) {
    if (
      typeof ProtocolClass !== 'function' ||
      !(ProtocolClass.prototype instanceof BaseFlashProtocol)
    ) {
      throw new TypeError(
        `FlashProtocolRegistry.register requires a subclass of BaseFlashProtocol (got ${ProtocolClass?.name || ProtocolClass})`
      );
    }

    const { protocolId } = ProtocolClass;
    if (!protocolId || typeof protocolId !== 'string' || protocolId.startsWith('abstract.')) {
      throw new Error(`Invalid or abstract protocolId "${protocolId}" on ${ProtocolClass.name}`);
    }

    this.byProtocolId.set(protocolId, ProtocolClass);
    this.instances.set(protocolId, new ProtocolClass());
    return this;
  }

  has(protocolId) {
    return this.byProtocolId.has(protocolId);
  }

  get(protocolId) {
    const inst = this.instances.get(protocolId);
    if (!inst) {
      throw new Error(`Unknown flash protocolId "${protocolId}" in FlashProtocolRegistry`);
    }
    return inst;
  }

  /**
   * Resolves the appropriate `BaseFlashProtocol` instance for a given `BaseHostBoard`.
   * @param {import('../components/base/BaseHostBoard.js').BaseHostBoard} hostBoard
   * @returns {BaseFlashProtocol}
   */
  resolveForBoard(hostBoard) {
    const protocolId = hostBoard?.getFlashProtocolId?.() || 'avr.stk500v1';
    if (this.has(protocolId)) {
      return this.get(protocolId);
    }
    return this.get('avr.stk500v1');
  }

  listAll() {
    return [...this.instances.values()];
  }
}

export const flashProtocolRegistry = new FlashProtocolRegistry()
  .register(AvrStk500Protocol)
  .register(Esp32EsptoolProtocol)
  .register(JetsonEdgeProtocol);
