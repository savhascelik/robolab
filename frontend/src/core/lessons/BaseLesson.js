import { i18n } from '../i18n/I18nService.js';
import { ScenarioSerializer } from '../scenario/ScenarioSerializer.js';

/**
 * Abstract Base Class for all Interactive 3D Hardware Lessons.
 *
 * Encapsulates:
 * 1. Bilingual (`tr` / `en`) curriculum metadata resolved reactively via `i18n.pick()`.
 * 2. Declarative 3D `circuitLayout` (`hostBoardTypeId`, `mode`, `components`, `wires`).
 * 3. Target C++ / Arduino / ESP32 sketch `code` lines.
 * 4. Polymorphic `startSimulation(simulator)` strategy method (eliminates God `if/else` in `SketchSimulator`).
 */
export class BaseLesson {
  constructor(config = {}) {
    if (new.target === BaseLesson) {
      throw new Error('BaseLesson is an abstract base class and cannot be instantiated directly.');
    }

    if (!config.id || typeof config.id !== 'string') {
      throw new Error(`${this.constructor.name} requires a valid string "id"`);
    }

    this.id = config.id;
    this.number = config.number || 1;
    this._title = config.title;
    this._heading = config.heading;
    this._summary = config.summary;
    this._bullets = config.bullets || [];
    this._pinout = config.pinout || [];
    this._circuit = config.circuit || '';
    this._specs = config.specs || [];
    this.code = config.code || [];
    this.circuitLayout = config.circuitLayout || { mode: 'board-only' };
  }

  get title() {
    return i18n.pick(this._title);
  }

  get heading() {
    return i18n.pick(this._heading);
  }

  get summary() {
    return i18n.pick(this._summary);
  }

  get bullets() {
    const raw = i18n.pick(this._bullets) || [];
    return raw.map((b) => ({
      icon: b.icon,
      text: i18n.pick(b.text)
    }));
  }

  get pinout() {
    const raw = i18n.pick(this._pinout) || [];
    return raw.map(([pin, desc]) => [i18n.pick(pin), i18n.pick(desc)]);
  }

  get circuit() {
    return i18n.pick(this._circuit);
  }

  get specs() {
    const raw = i18n.pick(this._specs) || [];
    return raw.map(([k, v]) => [i18n.pick(k), i18n.pick(v)]);
  }

  /**
   * Exports this guided curriculum lesson as an editable `CircuitScenarioSchema v2` JSON object
   * so it can be opened and modified in Freeform Sandbox mode.
   */
  toScenarioData() {
    return ScenarioSerializer.lessonToScenario(this);
  }

  /**
   * Polymorphic simulation loop strategy executed by `SketchSimulator`.
   * Subclasses override to drive 3D hardware components, LEDs, audio, and serial telemetry.
   * @param {import('../../sim/simulator.js').SketchSimulator} _simulator
   */
  startSimulation(_simulator) {
    throw new Error(`${this.constructor.name} must implement startSimulation(simulator)`);
  }
}
