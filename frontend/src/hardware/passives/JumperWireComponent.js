import * as THREE from 'three';
import { BasePassiveComponent } from '../../core/components/base/BasePassiveComponent.js';
import { box, mat } from '../primitives/GeometryFactory.js';

/**
 * 3D Catmull-Rom Spline Jumper Wire with DuPont Connector Housings.
 */
export class JumperWireComponent extends BasePassiveComponent {
  static typeId = 'passive.wire';
  static category = 'passives';
  static displayName = 'DuPont Jumper Wire';
  static summary = 'Insulated Copper Breadboard Jumper Wire';
  static defaultLessonId = 'blink';

  constructor(options = {}) {
    super({
      name: options.name || 'Jumper Wire',
      description: options.description || 'Routes signals and power between headers and breadboard rails.',
      ...options
    });
  }

  buildMesh(options = {}) {
    const points = options.points || [
      [0, 10, 0],
      [10, 18, 0],
      [20, 6, 0]
    ];
    const colorHex = options.color || '#e04b3a';
    const vectors = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    const curve = new THREE.CatmullRomCurve3(vectors, false, 'catmullrom', 0.25);
    const tubeGeo = new THREE.TubeGeometry(curve, 36, 0.72, 10, false);
    const tubeMesh = new THREE.Mesh(tubeGeo, mat(colorHex, 0.42, 0.05));
    tubeMesh.castShadow = true;
    tubeMesh.receiveShadow = true;
    this.group.add(tubeMesh);
    this.refs.tubeMesh = tubeMesh;

    const housingMat = mat('#232733', 0.55);
    const startVec = vectors[0];
    const endVec = vectors[vectors.length - 1];
    const capStart = box(2.1, 4.2, 2.1, housingMat, startVec.x, startVec.y - 0.5, startVec.z);
    const capEnd = box(2.1, 4.2, 2.1, housingMat, endVec.x, endVec.y - 0.5, endVec.z);
    this.group.add(capStart, capEnd);
    this.refs.capStart = capStart;
    this.refs.capEnd = capEnd;

    this.definePin('END_A', points[0], { direction: 'IO', role: 'SIGNAL' });
    this.definePin('END_B', points[points.length - 1], { direction: 'IO', role: 'SIGNAL' });
    this.defineInternalBridge('END_A', 'END_B');

    this.wireMeta = {
      from: options.from || null,
      to: options.to || null,
      color: colorHex,
      points: points.map((p) => [...p])
    };
    this.group.userData.wire = true;
    this.group.userData.wireMeta = this.wireMeta;
  }

  /**
   * Dynamically rebuilds the 3D Catmull-Rom spline tube and DuPont connector caps
   * when an attached component or board is moved/rotated via the 3D Transform Gizmo.
   * @param {number[][]} points
   */
  updateWaypoints(points) {
    if (!Array.isArray(points) || points.length < 2) return this;
    const vectors = points.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    const curve = new THREE.CatmullRomCurve3(vectors, false, 'catmullrom', 0.25);

    if (this.refs.tubeMesh) {
      if (this.refs.tubeMesh.geometry) {
        this.refs.tubeMesh.geometry.dispose();
      }
      this.refs.tubeMesh.geometry = new THREE.TubeGeometry(curve, 36, 0.72, 10, false);
    }

    const startVec = vectors[0];
    const endVec = vectors[vectors.length - 1];
    if (this.refs.capStart) {
      this.refs.capStart.position.set(startVec.x, startVec.y - 0.5, startVec.z);
    }
    if (this.refs.capEnd) {
      this.refs.capEnd.position.set(endVec.x, endVec.y - 0.5, endVec.z);
    }

    this.pins.END_A = [...points[0]];
    this.pins.END_B = [...points[points.length - 1]];
    this.wireMeta.points = points.map((p) => [...p]);
    return this;
  }
}
