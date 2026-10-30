import * as THREE from 'three';
import { BaseSensor } from './BaseSensor.js';

/**
 * Abstract Base Class for Optical & MIPI CSI-2 Vision Camera Sensors (e.g. Sony IMX219, OV5647).
 * Extends `BaseSensor` with FOV angle, resolution, frame-rate telemetry, MIPI CSI-2/I2C pin setup,
 * and a reusable 3D holographic FOV frustum pyramid builder (`createFovFrustumGroup`).
 */
export class BaseVisionSensor extends BaseSensor {
  static typeId = 'abstract.vision_sensor';
  static category = 'sensors';
  static displayName = 'Abstract Vision Sensor';

  constructor(options = {}) {
    if (new.target === BaseVisionSensor) {
      throw new Error('BaseVisionSensor is an abstract base class and cannot be instantiated directly.');
    }
    super(options);
  }

  getDefaultState() {
    return {
      minValue: 0,
      maxValue: 100,
      value: 92,
      unit: '%',
      fovDeg: 160,
      resolution: '3280x2464',
      fps: 60,
      streaming: true
    };
  }

  /**
   * Builds a subtle holographic 3D camera Field-of-View (FOV) cone/frustum group
   * with scanline grid planes that can be toggled in showcase or workbench views.
   * @param {object} [opts]
   * @returns {THREE.Group}
   */
  createFovFrustumGroup(opts = {}) {
    const length = opts.length ?? 26;
    const radius = opts.radius ?? 11;
    const color = opts.color ?? '#0ea5e9';

    const frustumGroup = new THREE.Group();
    frustumGroup.name = `${this.id || 'vision'}_fov_frustum`;

    const coneGeo = new THREE.ConeGeometry(radius, length, 4, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.09,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const coneMesh = new THREE.Mesh(coneGeo, coneMat);
    coneMesh.rotation.x = -Math.PI / 2;
    coneMesh.rotation.z = Math.PI / 4;
    coneMesh.position.z = length * 0.5 + 2.5;
    frustumGroup.add(coneMesh);

    const edgesGeo = new THREE.EdgesGeometry(coneGeo);
    const edgesMat = new THREE.LineBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.36
    });
    const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
    wireframe.rotation.copy(coneMesh.rotation);
    wireframe.position.copy(coneMesh.position);
    frustumGroup.add(wireframe);

    return frustumGroup;
  }

  setupElectricalModel(options = {}) {
    super.setupElectricalModel(options);
    const scl = this.electricalPins.get('SCL');
    if (scl) {
      scl.direction = 'IN';
      scl.role = 'I2C_SCL';
      scl.protocol = 'I2C';
    }
    const sda = this.electricalPins.get('SDA');
    if (sda) {
      sda.direction = 'BIDIR';
      sda.role = 'I2C_SDA';
      sda.protocol = 'I2C';
    }
  }

  /**
   * ReactFlow-style Node contract (`evaluate({ pins, state, dt, stageEnv, report })`).
   * Detects 3D environmental stage props (`prop.toy_bear`, `prop.obstacle_wall`, etc.)
   * within the camera's directional 3D field-of-view cone (`inFov`) and exposes structured vision telemetry.
   */
  evaluate({ state = {}, stageEnv = null } = {}) {
    if (stageEnv?.nearestObstacle) {
      const nearest = stageEnv.nearestObstacle;
      const visibleList = Array.isArray(stageEnv.visibleObstacles)
        ? stageEnv.visibleObstacles
        : Array.isArray(stageEnv.obstacles)
          ? stageEnv.obstacles.filter((o) => o.inFov !== false)
          : [];
      const detectedObjects = visibleList.map((o) => ({
        id: o.id,
        visualClass: o.visualClass,
        distanceCm: o.distanceCm,
        angleDeg: o.angleDeg ?? 0,
        inFov: Boolean(o.inFov),
        raycastHit: Boolean(o.raycastHit)
      }));
      return {
        state: {
          targetDetected: true,
          detectedTarget: nearest.visualClass || nearest.typeId,
          detectedObstacleId: nearest.id,
          targetDistanceCm: nearest.distanceCm,
          targetAngleDeg: nearest.angleDeg ?? 0,
          inFov: true,
          raycastHit: Boolean(nearest.raycastHit),
          detectedObjects
        },
        outputs: {
          CSI_D0: {
            voltage: 1.8,
            high: true,
            protocol: 'MIPI_CSI2',
            detectedTarget: nearest.visualClass || nearest.typeId,
            distanceCm: nearest.distanceCm,
            inFov: true
          }
        }
      };
    }

    return {
      state: {
        targetDetected: false,
        detectedTarget: null,
        detectedObstacleId: null,
        targetDistanceCm: null,
        targetAngleDeg: stageEnv?.nearestAnyDirectionObstacle?.angleDeg ?? null,
        inFov: false,
        raycastHit: false,
        detectedObjects: []
      },
      outputs: {
        CSI_D0: {
          voltage: 0.0,
          high: false,
          protocol: 'MIPI_CSI2',
          detectedTarget: null,
          distanceCm: null,
          inFov: false
        }
      }
    };
  }
}
