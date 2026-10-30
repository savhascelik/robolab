import { ScenarioSerializer } from './ScenarioSerializer.js';
import { i18n } from '../i18n/I18nService.js';

/**
 * Built-in Multi-Board Freeform Scenario Preset:
 * Demonstrates simultaneous Arduino Uno R3 (5.0V) + ESP32 DevKit V1 (3.3V) + Breadboard + LED + Resistor
 * on the same 3D workbench.
 */
export function createMultiBoardBridgePreset() {
  return {
    version: ScenarioSerializer.SCHEMA_VERSION,
    id: 'scenario.multiboard_uno_esp32',
    mode: 'freeform',
    meta: {
      title: i18n.pick({
        tr: 'Çoklu Kart Köprüsü: Arduino Uno + ESP32',
        en: 'Multi-Board Bridge: Arduino Uno + ESP32'
      }),
      summary: i18n.pick({
        tr: 'Arduino Uno (5V) ve ESP32 DevKit V1 (3.3V) kartlarının ortak GND hattı ve breadboard üzerinde birlikte çalıştığı serbest kablolama senaryosu.',
        en: 'Freeform multi-board scenario combining Arduino Uno (5V) and ESP32 DevKit V1 (3.3V) with shared common ground on a prototyping breadboard.'
      })
    },
    boards: [
      {
        id: 'uno_main',
        typeId: 'board.arduino_uno',
        i18nKey: 'hw.board.arduino_uno',
        position: [-46, 0, 0],
        firmware: [
          '// Arduino Uno + ESP32 Common-Ground Bridge',
          'void setup() { pinMode(13, OUTPUT); }',
          'void loop() { digitalWrite(13, HIGH); }'
        ]
      },
      {
        id: 'esp32_aux',
        typeId: 'board.esp32_devkit',
        i18nKey: 'hw.board.esp32_devkit',
        position: [0, 0, -28],
        firmware: [
          '// ESP32 DevKit V1 Telemetry Node (3.3V Logic)',
          'void setup() { Serial.begin(115200); }',
          'void loop() {}'
        ]
      }
    ],
    components: [
      {
        id: 'bb_shared',
        typeId: 'board.breadboard',
        i18nKey: 'hw.board.breadboard',
        position: [38, 0, 8]
      },
      {
        id: 'res_limit',
        typeId: 'passive.resistor',
        i18nKey: 'hw.passive.resistor',
        position: [26, 5.2, 10],
        state: { ohms: 220 }
      },
      {
        id: 'led_status',
        typeId: 'led.single',
        i18nKey: 'hw.led.single',
        color: '#22c55e',
        position: [40, 5.2, 6]
      }
    ],
    connections: [
      { id: 'mb_w1', from: 'uno_main.GND', to: 'esp32_aux.GND', color: '#232836' },
      { id: 'mb_w2', from: 'uno_main.PIN13', to: 'res_limit.LEAD_A', color: '#e04b3a' },
      { id: 'mb_w3', from: 'res_limit.LEAD_B', to: 'led_status.ANODE', color: '#f59e0b' },
      { id: 'mb_w4', from: 'led_status.CATHODE', to: 'esp32_aux.GND', color: '#232836' }
    ]
  };
}

/**
 * Central Registry for Guided & Freeform Circuit Scenarios (`ScenarioRegistry`).
 * Supports bidirectional conversion between `BaseLesson` curriculum lessons and
 * custom user/AI `CircuitScenarioSchema v2` documents.
 */
export class ScenarioRegistry {
  constructor() {
    /** @type {Map<string, object>} */
    this.scenarios = new Map();
    this.register(createMultiBoardBridgePreset());
  }

  /**
   * Registers and validates a `CircuitScenarioSchema v2` document.
   * @param {object} scenarioData
   */
  register(scenarioData) {
    const check = ScenarioSerializer.validate(scenarioData);
    if (!check.valid) {
      throw new Error(`Cannot register invalid scenario: ${check.errors.join(', ')}`);
    }
    this.scenarios.set(scenarioData.id, scenarioData);
    return scenarioData;
  }

  /**
   * Imports and indexes all `BaseLesson` instances as `CircuitScenarioSchema v2` blueprints.
   * @param {import('../lessons/BaseLesson.js').BaseLesson[]} lessons
   */
  registerLessons(lessons = []) {
    for (const lesson of lessons) {
      const scenario = ScenarioSerializer.lessonToScenario(lesson);
      this.scenarios.set(scenario.id, scenario);
    }
    return this;
  }

  /**
   * Retrieves a scenario by ID (or by lesson ID, e.g. 'blink' -> 'scenario.blink').
   * @param {string} idOrLessonId
   */
  get(idOrLessonId) {
    if (this.scenarios.has(idOrLessonId)) {
      return this.scenarios.get(idOrLessonId);
    }
    if (this.scenarios.has(`scenario.${idOrLessonId}`)) {
      return this.scenarios.get(`scenario.${idOrLessonId}`);
    }
    return null;
  }

  /**
   * Returns all registered scenarios.
   * @returns {object[]}
   */
  getAll() {
    return [...this.scenarios.values()];
  }

  /**
   * Exports a scenario by ID as a formatted JSON string.
   * @param {string} id
   * @returns {string}
   */
  exportJSON(id) {
    const sc = this.get(id);
    if (!sc) {
      throw new Error(`Scenario "${id}" not found in ScenarioRegistry`);
    }
    return JSON.stringify(sc, null, 2);
  }

  /**
   * Parses, validates, and registers a scenario from a raw JSON string or object.
   * @param {string|object} jsonInput
   */
  importJSON(jsonInput) {
    const parsed = typeof jsonInput === 'string' ? JSON.parse(jsonInput) : jsonInput;
    return this.register(parsed);
  }
}

export const scenarioRegistry = new ScenarioRegistry();
