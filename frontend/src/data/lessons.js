import { lessonRegistry } from '../core/registry/LessonRegistry.js';
import { scenarioRegistry } from '../core/scenario/ScenarioRegistry.js';
import { ArduinoBoardLesson } from './lessons/01-ArduinoBoardLesson.js';
import { BlinkLedLesson } from './lessons/02-BlinkLedLesson.js';
import { PushButtonLesson } from './lessons/03-PushButtonLesson.js';
import { PotentiometerKnobLesson } from './lessons/04-PotentiometerKnobLesson.js';
import { RgbColorMixLesson } from './lessons/05-RgbColorMixLesson.js';
import { UltrasonicSensorLesson } from './lessons/06-UltrasonicSensorLesson.js';
import { PiezoBuzzerLesson } from './lessons/07-PiezoBuzzerLesson.js';
import { MotorsControlLesson } from './lessons/08-MotorsControlLesson.js';
import { Esp32WifiLesson } from './lessons/09-Esp32WifiLesson.js';

/**
 * Modular Lesson Instances — each lesson inherits from `BaseLesson` (`src/core/lessons/BaseLesson.js`),
 * provides bilingual (`tr` / `en`) curriculum metadata, and encapsulates its own `startSimulation(sim)` strategy.
 */
export const LESSONS = [
  new ArduinoBoardLesson(),
  new BlinkLedLesson(),
  new PushButtonLesson(),
  new PotentiometerKnobLesson(),
  new RgbColorMixLesson(),
  new UltrasonicSensorLesson(),
  new PiezoBuzzerLesson(),
  new MotorsControlLesson(),
  new Esp32WifiLesson()
];

lessonRegistry.registerAll(LESSONS);
scenarioRegistry.registerLessons(LESSONS);

export {
  ArduinoBoardLesson,
  BlinkLedLesson,
  PushButtonLesson,
  PotentiometerKnobLesson,
  RgbColorMixLesson,
  UltrasonicSensorLesson,
  PiezoBuzzerLesson,
  MotorsControlLesson,
  Esp32WifiLesson
};
