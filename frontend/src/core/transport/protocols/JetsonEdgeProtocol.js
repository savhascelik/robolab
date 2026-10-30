import { BaseFlashProtocol } from '../BaseFlashProtocol.js';

/**
 * NVIDIA Jetson Nano / Linux SBC USB-CDC Edge Runner Protocol (`sbc.jetson_edge`).
 * Streams compiled GPIO/TensorRT edge bundles over L4T USB gadget serial.
 */
export class JetsonEdgeProtocol extends BaseFlashProtocol {
  static protocolId = 'sbc.jetson_edge';
  static displayName = 'NVIDIA Jetson L4T USB-CDC Edge Deployer';
  static defaultBaudRate = 115200;
  static pageSize = 512;

  getMagicByte() {
    return 0x4a; // 'J' for Jetson Edge
  }

  async enterBootloader(transport) {
    await transport.setSignals(true, false);
    // Send Jetson Edge start marker "J4T:BEGIN\n"
    await transport.writeText('J4T:BEGIN\n');
  }

  encodePageFrame(pageBytes, pageIndex) {
    // [0x4A ('J'), pageIndex, lenHi, lenLo, ...pageBytes, 0x0A ('\n')]
    const len = pageBytes.byteLength;
    const frame = new Uint8Array(4 + len + 1);
    frame[0] = 0x4a;
    frame[1] = pageIndex & 0xff;
    frame[2] = (len >> 8) & 0xff;
    frame[3] = len & 0xff;
    frame.set(pageBytes, 4);
    frame[frame.byteLength - 1] = 0x0a;
    return frame;
  }

  async finishBootloader(transport) {
    await transport.writeText('J4T:RUN\n');
  }
}
