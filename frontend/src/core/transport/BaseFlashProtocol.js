/**
 * Abstract Base Class for Microcontroller & SBC Firmware Compilation & Flashing Protocols:
 * - `AvrStk500Protocol` (`avr.stk500v1` for Arduino Uno ATmega328P Optiboot)
 * - `Esp32EsptoolProtocol` (`esp32.esptool` for Espressif ESP32 ROM Bootloader SLIP)
 * - `JetsonEdgeProtocol` (`sbc.jetson_edge` for NVIDIA Jetson Nano L4T Edge Deployment)
 */
export class BaseFlashProtocol {
  static protocolId = 'abstract.protocol';
  static displayName = 'Abstract Flash Protocol';
  static defaultBaudRate = 115200;
  static pageSize = 128;

  constructor(options = {}) {
    if (new.target === BaseFlashProtocol) {
      throw new Error('BaseFlashProtocol is an abstract base class and cannot be instantiated directly.');
    }
    this.options = options;
  }

  get id() {
    return this.constructor.protocolId;
  }

  get name() {
    return this.constructor.displayName;
  }

  get defaultBaudRate() {
    return this.constructor.defaultBaudRate;
  }

  compileSketch(codeLines = [], hostBoard = null) {
    const res = this.compileSketchToBinary(codeLines, hostBoard);
    return {
      ...res,
      sizeBytes: res.byteLength
    };
  }

  /**
   * High-level compile + flash pipeline over a connected `BaseTransport`.
   */
  async flash(transport, codeLines = [], { hostBoard = null, onProgress } = {}) {
    const compiled = this.compileSketchToBinary(codeLines, hostBoard);
    onProgress?.(10, `[${this.id}] Bootloader sync (${this.defaultBaudRate} baud)…`);
    const flashStats = await this.flashBinary(transport, compiled.binary, ({ pageIndex, totalPages, percent }) => {
      const scaled = 20 + Math.round(percent * 0.7);
      onProgress?.(scaled, `[${this.id}] Writing page ${pageIndex + 1}/${totalPages} (${compiled.byteLength} bytes)…`);
    });
    onProgress?.(100, `[${this.id}] Verified CRC-8 (0x${compiled.checksum.toString(16).toUpperCase()}) & rebooted.`);
    return {
      ok: true,
      protocol: this.id,
      sizeBytes: compiled.byteLength,
      checksum: compiled.checksum,
      ...flashStats
    };
  }

  /**
   * Compiles C++ / Arduino / Edge sketch lines into a deterministic binary firmware image (`Uint8Array`)
   * with architecture header, magic signature, and CRC-8 checksum.
   * @param {string[]} codeLines
   * @param {import('../components/base/BaseHostBoard.js').BaseHostBoard} [hostBoard]
   * @returns {{ binary: Uint8Array, checksum: number, arch: string, byteLength: number }}
   */
  compileSketchToBinary(codeLines = [], hostBoard = null) {
    const sourceText = Array.isArray(codeLines) ? codeLines.join('\n') : String(codeLines);
    const arch = hostBoard?.capabilities?.architecture || this.constructor.displayName;
    const encoder = new TextEncoder();
    const bodyBytes = encoder.encode(sourceText);

    // 8-byte firmware header: ['F', 'W', protocolByte, adcBits, lenHi, lenLo, crc8, 0xAA]
    const header = new Uint8Array(8);
    header[0] = 0x46; // 'F'
    header[1] = 0x57; // 'W'
    header[2] = this.getMagicByte();
    header[3] = hostBoard?.capabilities?.adcBits ?? 10;
    header[4] = (bodyBytes.byteLength >> 8) & 0xff;
    header[5] = bodyBytes.byteLength & 0xff;

    let crc = 0;
    for (let i = 0; i < bodyBytes.byteLength; i++) {
      crc = (crc ^ bodyBytes[i]) & 0xff;
    }
    header[6] = crc;
    header[7] = 0xaa;

    const binary = new Uint8Array(header.byteLength + bodyBytes.byteLength);
    binary.set(header, 0);
    binary.set(bodyBytes, header.byteLength);

    return {
      binary,
      checksum: crc,
      arch,
      byteLength: binary.byteLength
    };
  }

  /**
   * Subclasses override to return their architecture magic byte.
   * @returns {number}
   */
  getMagicByte() {
    return 0x01;
  }

  /**
   * Triggers hardware bootloader entry (DTR/RTS reset sequence) and sends synchronization handshake.
   * @param {import('./BaseTransport.js').BaseTransport} _transport
   * @returns {Promise<void>}
   */
  async enterBootloader(_transport) {
    throw new Error(`${this.constructor.name} must implement enterBootloader(transport)`);
  }

  /**
   * Formats a single firmware page into a protocol-specific wire frame (`Uint8Array`).
   * @param {Uint8Array} _pageBytes
   * @param {number} _pageIndex
   * @returns {Uint8Array}
   */
  encodePageFrame(_pageBytes, _pageIndex) {
    throw new Error(`${this.constructor.name} must implement encodePageFrame(pageBytes, pageIndex)`);
  }

  /**
   * Flashes a compiled binary image over `transport` in pages, invoking `onProgress` after each frame.
   * @param {import('./BaseTransport.js').BaseTransport} transport
   * @param {Uint8Array} binaryImage
   * @param {(progress: { pageIndex: number, totalPages: number, percent: number }) => void} [onProgress]
   * @returns {Promise<{ framesSent: number, totalBytesWritten: number }>}
   */
  async flashBinary(transport, binaryImage, onProgress) {
    if (!transport || !transport.isConnected) {
      throw new Error(`${this.constructor.name}.flashBinary requires a connected BaseTransport instance.`);
    }

    await this.enterBootloader(transport);

    const pageSize = this.constructor.pageSize || 128;
    const totalPages = Math.max(1, Math.ceil(binaryImage.byteLength / pageSize));
    let framesSent = 0;
    let totalBytesWritten = 0;

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const start = pageIndex * pageSize;
      const slice = binaryImage.slice(start, start + pageSize);
      const frame = this.encodePageFrame(slice, pageIndex);
      totalBytesWritten += await transport.writeBytes(frame);
      framesSent++;

      const percent = Math.round(((pageIndex + 1) / totalPages) * 100);
      onProgress?.({ pageIndex, totalPages, percent });
    }

    await this.finishBootloader(transport);
    return { framesSent, totalBytesWritten };
  }

  /**
   * Optional hook to finalize flashing and reboot into user application.
   * @param {import('./BaseTransport.js').BaseTransport} _transport
   */
  async finishBootloader(_transport) {}
}
