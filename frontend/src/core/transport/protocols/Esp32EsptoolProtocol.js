import { BaseFlashProtocol } from '../BaseFlashProtocol.js';

// Espressif ESP32 ROM Bootloader SLIP Constants
const SLIP_END = 0xc0;
const ESP_FLASH_BEGIN = 0x02;
const ESP_FLASH_DATA = 0x03;
const ESP_FLASH_END = 0x04;
const ESP_SYNC = 0x08;

/**
 * Espressif ESP32 ROM Bootloader SLIP Protocol (`esp32.esptool`).
 * Uses DTR/RTS classic auto-reset transistor toggle (EN + GPIO0) and SLIP 0xC0 packet framing.
 */
export class Esp32EsptoolProtocol extends BaseFlashProtocol {
  static protocolId = 'esp32.esptool';
  static displayName = 'Espressif Esptool SLIP Bootloader (921600 / 115200 baud)';
  static defaultBaudRate = 115200;
  static pageSize = 256;

  getMagicByte() {
    return 0xe9; // Official ESP32 image magic byte (0xE9)
  }

  async enterBootloader(transport) {
    // Classic Espressif auto-reset circuit sequence via DTR (GPIO0) & RTS (EN)
    await transport.setSignals(false, true);  // EN=LOW (reset)
    await transport.setSignals(true, false);  // IO0=LOW, EN=HIGH (enter ROM bootloader)
    await transport.setSignals(false, false); // Release both lines

    // Send SLIP-framed ESP_SYNC packet and ESP_FLASH_BEGIN packet
    await transport.writeBytes(new Uint8Array([SLIP_END, 0x00, ESP_SYNC, 0x04, 0x55, 0x55, 0x55, 0x55, SLIP_END]));
    await transport.writeBytes(new Uint8Array([SLIP_END, 0x00, ESP_FLASH_BEGIN, 0x00, SLIP_END]));
  }

  encodePageFrame(pageBytes, pageIndex) {
    const len = pageBytes.byteLength;
    // SLIP frame: [0xC0, 0x00 (request), ESP_FLASH_DATA (0x03), seqIndex, lenHi, lenLo, ...data, 0xC0]
    const frame = new Uint8Array(6 + len + 1);
    frame[0] = SLIP_END;
    frame[1] = 0x00;
    frame[2] = ESP_FLASH_DATA;
    frame[3] = pageIndex & 0xff;
    frame[4] = (len >> 8) & 0xff;
    frame[5] = len & 0xff;
    frame.set(pageBytes, 6);
    frame[frame.byteLength - 1] = SLIP_END;
    return frame;
  }

  async finishBootloader(transport) {
    await transport.writeBytes(new Uint8Array([SLIP_END, 0x00, ESP_FLASH_END, 0x00, SLIP_END]));
  }
}
