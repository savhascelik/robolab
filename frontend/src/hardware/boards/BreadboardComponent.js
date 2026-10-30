import * as THREE from 'three';
import { BasePrototypingBoard } from '../../core/components/base/BasePrototypingBoard.js';
import { box, mat } from '../primitives/GeometryFactory.js';
import { createBreadboardTopTexture } from '../primitives/SilkscreenFactory.js';

/**
 * Half-Size Solderless Prototyping Breadboard Component.
 * Inherits prototyping tie-point & rail semantics from BasePrototypingBoard -> BaseBoard.
 */
export class BreadboardComponent extends BasePrototypingBoard {
  static typeId = 'board.breadboard';
  static category = 'boards';
  static displayName = 'Solderless Breadboard';
  static summary = 'Half-Size 400 Tie-Point Prototyping Board';
  static defaultLessonId = 'blink';

  constructor(options = {}) {
    super({
      name: options.name || 'Breadboard',
      description:
        options.description ||
        'Connects components in vertical 5-hole columns without soldering.',
      calloutOffset: options.calloutOffset || [48, 48],
      anchorOffset: options.anchorOffset || [0, 5.5, 16],
      ...options
    });
  }

  buildMesh() {
    const topTex = createBreadboardTopTexture();
    const body = box(64, 5.2, 42, mat('#f2ead9', 0.55), 0, 0, 0);
    const top = new THREE.Mesh(
      new THREE.PlaneGeometry(63.4, 41.4),
      mat('#f2ead9', 0.55, 0, topTex ? { map: topTex, color: new THREE.Color('#ffffff') } : {})
    );
    top.rotation.x = -Math.PI / 2;
    top.position.set(0, 5.22, 0);
    top.receiveShadow = true;
    this.group.add(body, top);
  }
}
