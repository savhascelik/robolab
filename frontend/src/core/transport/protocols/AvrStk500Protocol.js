import { BaseFlashProtocol } from '../BaseFlashProtocol.js';

// STK500v1 Optiboot Constants
const STK_GET_SYNC = 0x30;
const STK_ENTER_PROGMODE = 0x50;
const STK_PROG_PAGE = 0x64;
const STK_LEAVE_PROGMODE = 0x51;
const CRC_EOP = 0x20;

/**
 * Arduino Uno R3 (ATmega328P Optiboot) STK500v1 Serial Bootloader Protocol (`avr.stk500v1`).
 */
export class AvrStk500Protocol extends BaseFlashProtocol {
  static protocolId = 'avr.stk500v1';
  static displayName = 'AVR STK500v1 Optiboot (115200 baud)';
  static defaultBaudRate = 115200;
  static pageSize = 128;

  getMagicByte() {
    return 0xa8; // AVR 8-bit marker
  }

  async enterBootloader(transport) {
    // Pulse DTR low then high to reset ATmega328P into Optiboot bootloader
    await transport.setSignals(false, false);
    await transport.setSignals(true, true);
    await transport.setSignals(false, false);

    // Send STK_GET_SYNC + CRC_EOP and STK_ENTER_PROGMODE + CRC_EOP
    await transport.writeBytes(new Uint8Array([STK_GET_SYNC, CRC_EOP]));
    await transport.writeBytes(new Uint8Array([STK_ENTER_PROGMODE, CRC_EOP]));
  }

  encodePageFrame(pageBytes, _pageIndex) {
    const len = pageBytes.byteLength;
    // STK_PROG_PAGE frame: [0x64, lenHi, lenLo, 'F' (0x46), ...data, CRC_EOP (0x20)]
    const frame = new Uint8Array(4 + len + 1);
    frame[0] = STK_PROG_PAGE;
    frame[1] = (len >> 8) & 0xff;
    frame[2] = len & 0xff;
    frame[3] = 0x46; // 'F' for Flash memory
    frame.set(pageBytes, 4);
    frame[frame.byteLength - 1] = CRC_EOP;
    return frame;
  }

  async finishBootloader(transport) {
    await transport.writeBytes(new Uint8Array([STK_LEAVE_PROGMODE, CRC_EOP]));
  }
}
