import * as THREE from 'three';
import { HardwareComponent } from '../HardwareComponent.js';

/**
 * Abstract Base Class for Multi-Layer Composite Robot Assemblies (e.g. Autonomous Sumo Robot, Jetson Vision Rover).
 * Composes registered `HardwareComponent` children into articulated `assembledPos` / `explodedPos` layers,
 * exposing `setExplodeProgress(0..1)` and `setApproachProgress(0..1)` for both Landing Showcase and Workbench use.
 */
export class BaseRobotAssembly extends HardwareComponent {
  static typeId = 'abstract.robot_assembly';
  static category = 'robotics';
  static displayName = 'Abstract Robot Assembly';

  constructor(options = {}) {
    if (new.target === BaseRobotAssembly) {
      throw new Error('BaseRobotAssembly is an abstract base class and cannot be instantiated directly.');
    }
    super(options);
    if (!Array.isArray(this.partEntries)) {
      /** @type {Array<{id: string, component: HardwareComponent, wrapper: THREE.Group, assembledPos: THREE.Vector3, explodedPos: THREE.Vector3, assembledRot?: THREE.Euler, explodedRot?: THREE.Euler}>} */
      this.partEntries = [];
    }
  }

  get explodeFactor() {
    return this.state.explodeProgress ?? 0;
  }

  setExplodeFactor(factor) {
    return this.setExplodeProgress(factor);
  }

  getSubAssemblyKeys() {
    return (this.partEntries || []).map((entry) => entry.id);
  }

  getDefaultState() {
    return {
      explodeProgress: 0,
      approachProgress: 1,
      activeLayerId: null,
      powered: true
    };
  }

  /**
   * Smoothly interpolates all child sub-assemblies between their assembled (0) and exploded (1) positions.
   * @param {number} progress
   */
  setExplodeProgress(progress) {
    const t = Math.max(0, Math.min(1, Number(progress) || 0));
    const smooth = t * t * (3 - 2 * t);
    this.state.explodeProgress = t;

    for (const entry of this.partEntries) {
      entry.wrapper.position.lerpVectors(entry.assembledPos, entry.explodedPos, smooth);
      if (entry.assembledRot && entry.explodedRot) {
        entry.wrapper.rotation.set(
          THREE.MathUtils.lerp(entry.assembledRot.x, entry.explodedRot.x, smooth),
          THREE.MathUtils.lerp(entry.assembledRot.y, entry.explodedRot.y, smooth),
          THREE.MathUtils.lerp(entry.assembledRot.z, entry.explodedRot.z, smooth)
        );
      }
    }
    return this.state;
  }

  /**
   * Returns a map of sub-assembly IDs to their instantiated `HardwareComponent` instances.
   * @returns {Map<string, HardwareComponent>}
   */
  getSubComponentsMap() {
    const map = new Map();
    for (const entry of this.partEntries) {
      if (entry.component) {
        map.set(entry.id, entry.component);
      }
    }
    return map;
  }

  setupElectricalModel() {
    if (this.pins.VCC && this.pins.GND && this.internalDipoles.length === 0) {
      this.defineDipole({
        id: `${this.id}.main_bus`,
        pinA: 'VCC',
        pinB: 'GND',
        resistance: 45,
        forwardVoltage: 0,
        unidirectional: false,
        maxCurrent: 12.0,
        minVoltage: 3.3,
        closed: true
      });
    }
  }
}
