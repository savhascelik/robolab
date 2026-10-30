import { BaseSensor } from './BaseSensor.js';

/**
 * Abstract Base Class for Time-of-Flight & Ranging Distance Sensors (HC-SR04 Ultrasonic, VL53L0X Laser ToF).
 * Extends `BaseSensor` with acoustic/optical time-of-flight calculation, millimeter conversion, and proximity thresholds.
 */
export class BaseDistanceSensor extends BaseSensor {
  static typeId = 'abstract.distance_sensor';
  static category = 'sensors';
  static displayName = 'Abstract Distance Sensor';

  constructor(options = {}) {
    if (new.target === BaseDistanceSensor) {
      throw new Error('BaseDistanceSensor is an abstract base class and cannot be instantiated directly.');
    }
    super(options);
  }

  getDefaultState() {
    return {
      minValue: 4,
      maxValue: 120,
      value: 15,
      fovDeg: 60,
      inFov: false,
      raycastHit: false,
      unit: 'cm'
    };
  }

  /**
   * Computes round-trip ultrasonic pulseIn() duration in microseconds for current distance (cm).
   * Speed of sound ~ 0.0343 cm/µs at 20°C.
   * @param {number} [speedOfSoundCmPerUs=0.0343]
   * @returns {number}
   */
  computeEchoMicroseconds(speedOfSoundCmPerUs = 0.0343) {
    const distanceCm = this.state.value;
    return Math.round((distanceCm * 2) / speedOfSoundCmPerUs);
  }

  /**
   * Returns measured distance in millimeters (mm).
   * @returns {number}
   */
  getDistanceMm() {
    return Math.round((this.state.value || 0) * 10);
  }

  /**
   * Checks whether an obstacle is closer than or equal to `thresholdCm`.
   * @param {number} thresholdCm
   * @returns {boolean}
   */
  isWithinThreshold(thresholdCm) {
    return (this.state.value || 0) <= thresholdCm;
  }

  /**
   * ReactFlow-style Node contract (`evaluate({ pins, state, dt, stageEnv, report })`).
   * Automatically senses 3D obstacle props (`prop.obstacle_wall`, `prop.toy_bear`, or custom props)
   * inside the sensor's 3D FOV cone & directional raycast, and drives the `ECHO` / `OUT` output signal pin
   * with the round-trip acoustic pulse duration.
   */
  evaluate({ pins = {}, state = {}, stageEnv = null, report = {} } = {}) {
    const minVal = Number(state.minValue ?? 2);
    const maxVal = Number(state.maxValue ?? 400);
    let distanceCm = Number(state.value ?? 15);
    let detectedObstacleId = state.detectedObstacleId || null;
    let detectedObstacleClass = state.detectedObstacleClass || null;
    let inFov = false;
    let raycastHit = false;
    let obstacleAngleDeg = null;

    if (stageEnv?.nearestObstacle) {
      distanceCm = Math.max(
        minVal,
        Math.min(maxVal, Number(stageEnv.nearestObstacle.distanceCm.toFixed(1)))
      );
      detectedObstacleId = stageEnv.nearestObstacle.id;
      detectedObstacleClass = stageEnv.nearestObstacle.visualClass || stageEnv.nearestObstacle.typeId;
      inFov = Boolean(stageEnv.nearestObstacle.inFov);
      raycastHit = Boolean(stageEnv.nearestObstacle.raycastHit);
      obstacleAngleDeg = stageEnv.nearestObstacle.angleDeg ?? 0;
    } else if (stageEnv && Array.isArray(stageEnv.obstacles)) {
      detectedObstacleId = null;
      detectedObstacleClass = null;
      inFov = false;
      raycastHit = false;
      if (stageEnv.obstacles.length > 0) {
        // Obstacles exist on stage, but all are outside this sensor's 3D FOV cone (sensor aimed away)
        distanceCm = maxVal;
        obstacleAngleDeg = stageEnv.nearestAnyDirectionObstacle?.angleDeg ?? null;
      }
    }

    const echoPulseUs = Math.round((distanceCm * 2) / 0.0343);
    const trigHigh = Boolean(pins.TRIG?.high || pins.VCC?.high || report?.closedLoop || state.powered);
    const echoVoltage = trigHigh ? 5.0 : 0.0;

    return {
      state: {
        value: distanceCm,
        distanceCm,
        echoPulseUs,
        detectedObstacleId,
        detectedObstacleClass,
        inFov,
        raycastHit,
        obstacleAngleDeg
      },
      outputs: {
        ECHO: {
          voltage: echoVoltage,
          high: trigHigh,
          protocol: 'PULSE_US',
          pulseUs: echoPulseUs,
          distanceCm,
          inFov,
          raycastHit
        }
      }
    };
  }
}
