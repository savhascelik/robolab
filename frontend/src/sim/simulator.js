import { AudioSynthesizer } from './AudioSynthesizer.js';
import { HardwareControlView } from './HardwareControlView.js';
import { i18n } from '../core/i18n/I18nService.js';
import { VirtualSimTransport } from '../core/transport/VirtualSimTransport.js';
import { WebSerialTransport } from '../core/transport/WebSerialTransport.js';
import { flashProtocolRegistry } from '../core/transport/FlashProtocolRegistry.js';

/**
 * Modular Embedded Sketch Execution Simulator & WebSerial USB Flasher.
 * Delegates Web Audio synthesis to `AudioSynthesizer`, UI input bindings to `HardwareControlView`,
 * polymorphic lesson loops to `BaseLesson.startSimulation(this)`, and firmware compilation/flashing
 * to `BaseTransport` + `FlashProtocolRegistry`.
 */
export class SketchSimulator {
  constructor(stage, { onLine, onLog, onStatus, controlsEl }) {
    this.stage = stage;
    this.onLine = onLine;
    this.onLog = onLog;
    this.onStatus = onStatus;

    this.running = false;
    this.timers = [];

    this.audio = new AudioSynthesizer();
    this.virtualTransport = new VirtualSimTransport();
    this.webSerialTransport = new WebSerialTransport();

    this.params = {
      buttonPressed: false,
      knobValue: 680,
      distanceCm: 28,
      motorPower: 210
    };

    this.controlView = new HardwareControlView({
      controlsEl,
      stage: this.stage,
      simulator: this
    });
  }

  get soundEnabled() {
    return this.audio.enabled;
  }

  set soundEnabled(val) {
    this.audio.enabled = Boolean(val);
  }

  schedule(fn, delayMs) {
    const id = setTimeout(fn, delayMs);
    this.timers.push(id);
    return id;
  }

  renderHardwareControls(lessonId) {
    this.controlView.render(lessonId);
  }

  /**
   * Resolves the active board's `BaseFlashProtocol` from `flashProtocolRegistry`.
   */
  getActiveFlashProtocol() {
    return (
      flashProtocolRegistry.resolveForBoard(this.stage?.hostBoard) ||
      flashProtocolRegistry.get('avr.stk500v1')
    );
  }

  start(lesson) {
    this.stop();
    this.running = true;
    this.renderHardwareControls(lesson.id);

    const protocol = this.getActiveFlashProtocol();
    const compiled = protocol.compileSketch(lesson.code, this.stage?.hostBoard?.id);

    this.onStatus(i18n.t('ui.code.statusUploading'));
    this.onLog(
      `[${protocol.name}] Compiling sketch (${compiled.sizeBytes} bytes, ${compiled.arch})…`
    );

    let flickCount = 0;
    const flickTimer = setInterval(() => {
      flickCount++;
      this.stage.setBoardLed('tx', flickCount % 2 === 0);
      this.stage.setBoardLed('rx', flickCount % 2 === 1);
      if (flickCount >= 6) {
        clearInterval(flickTimer);
        this.stage.setBoardLed('tx', false);
        this.stage.setBoardLed('rx', false);
      }
    }, 85);
    this.timers.push(flickTimer);

    this.schedule(() => {
      if (!this.running) return;
      const hostName = this.stage.hostBoard?.name || 'Arduino Uno (ATmega328P)';
      this.onLog(`Uploading firmware to ${hostName} via ${protocol.id}…`);
    }, 280);

    this.schedule(() => {
      if (!this.running) return;
      this.onLog('Done uploading. Running loop()…');
      this.onStatus(i18n.t('ui.code.statusRunning'));
      this.runLessonLoop(lesson);
    }, 580);
  }

  /**
   * Connects to a physical microcontroller over Browser WebSerial USB (or runs virtual fallback
   * handshake if no port is selected) and flashes the active lesson using `FlashProtocolRegistry`.
   */
  async flashOverWebSerial(lesson) {
    const hostBoard = this.stage?.hostBoard;
    const protocol = this.getActiveFlashProtocol();
    const usbFilters = hostBoard?.getUsbFilters?.() || [];

    this.onStatus(i18n.t('ui.code.statusFlashingUsb'));
    this.onLog(`[WebSerial USB] Target: ${hostBoard?.name || 'MCU'} | Protocol: ${protocol.name}`);

    let transport = this.webSerialTransport;

    if (WebSerialTransport.isSupported()) {
      try {
        await this.webSerialTransport.connect({
          baudRate: protocol.defaultBaudRate,
          filters: usbFilters
        });
      } catch (err) {
        this.onLog(
          `[WebSerial] Port prompt closed or unavailable (${err.message}). Running protocol dry-run on VirtualSimTransport…`
        );
        transport = this.virtualTransport;
        await transport.connect({ baudRate: protocol.defaultBaudRate });
      }
    } else {
      this.onLog(
        '[WebSerial] navigator.serial not available in this browser context. Running protocol dry-run on VirtualSimTransport…'
      );
      transport = this.virtualTransport;
      await transport.connect({ baudRate: protocol.defaultBaudRate });
    }

    const result = await protocol.flash(transport, lesson.code, {
      onProgress: (pct, msg) => {
        this.onLog(`[${pct}%] ${msg}`);
        this.stage.setBoardLed('tx', pct % 20 === 0);
        this.stage.setBoardLed('rx', pct % 20 !== 0);
      }
    });

    this.stage.setBoardLed('tx', false);
    this.stage.setBoardLed('rx', false);

    if (transport === this.virtualTransport) {
      await transport.disconnect();
    }

    // Start the interactive 3D simulation loop after flashing completes
    this.start(lesson);
    return result;
  }

  /**
   * Polymorphically delegates lesson execution to `BaseLesson.startSimulation(this)`.
   */
  runLessonLoop(lesson) {
    if (lesson && typeof lesson.startSimulation === 'function') {
      lesson.startSimulation(this);
    }
  }

  stop() {
    this.running = false;
    for (const id of this.timers) {
      clearTimeout(id);
      clearInterval(id);
    }
    this.timers = [];
    this.onLine(-1);
    this.onStatus(i18n.t('ui.code.statusStopped'));
    this.stage.setBoardLed('l', false);
    this.stage.setBoardLed('tx', false);
    this.stage.setBoardLed('rx', false);

    // Bulk category operations via Central ComponentRegistry!
    this.stage.registry?.invokeOnCategory('leds', (led) => led.turnOff());
    this.stage.registry?.invokeOnCategory('motors', (motor) => motor.emergencyStop());
    this.stage.registry?.invokeOnCategory('buttons', (btn) => btn.release());
    this.stage.registry?.invokeOnCategory('audio', (aud) => aud.noTone());
  }
}
