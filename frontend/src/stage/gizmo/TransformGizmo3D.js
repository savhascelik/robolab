import * as THREE from 'three';

const HANDLE_COLORS = {
  X: '#e04b3a',
  Y: '#22c55e',
  Z: '#2563eb',
  XZ: '#f59e0b',
  RY: '#8b5cf6',
  HIGHLIGHT: '#facc15'
};

/**
 * 3D Visual Transform Gizmo Mesh Builder & Highlighter (`TransformGizmo3D`).
 *
 * Single Responsibility:
 * - Constructs the 3D axis arrows (`X`, `Y`, `Z`), horizontal workbench plane pad (`XZ`),
 *   yaw rotation ring (`RY`), and selection footprint ring.
 * - Renders on Layer 1 with `depthTest: false` so handles remain crisp and accessible above 3D components.
 * - Provides hit-testable collider meshes tagged with `userData.gizmoHandle` (`'X' | 'Y' | 'Z' | 'XZ' | 'RY'`).
 */
export class TransformGizmo3D {
  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'TransformGizmo3D';
    this.group.visible = false;

    /** @type {import('../../core/components/HardwareComponent.js').HardwareComponent | null} */
    this.attachedComponent = null;

    /** @type {string | null} */
    this.highlightedHandle = null;

    /** @type {Map<string, THREE.MeshBasicMaterial[]>} */
    this.handleMaterials = new Map();

    /** @type {THREE.Object3D[]} Raycast target meshes */
    this.pickables = [];

    /**
     * Whether the 3D axis arrows (`X`, `Y`, `Z`, `XZ`, `RY`) are visible on top of the component.
     * Defaults to `false` so direct tabletop dragging on the `XZ` desk plane is unobstructed;
     * can be toggled on at any time from the HUD bar.
     */
    this.axesVisible = false;
    this.axesGroup = new THREE.Group();
    this.axesGroup.name = 'TransformGizmoAxes';
    this.axesGroup.visible = false;

    this.buildGizmoGeometry();
  }

  _registerHandleMaterial(handleId, material) {
    if (!this.handleMaterials.has(handleId)) {
      this.handleMaterials.set(handleId, []);
    }
    this.handleMaterials.get(handleId).push(material);
  }

  _createHandleMaterial(handleId, colorHex, opacity = 0.95) {
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    mat.userData.baseColor = colorHex;
    mat.userData.baseOpacity = opacity;
    this._registerHandleMaterial(handleId, mat);
    return mat;
  }

  _createColliderMaterial() {
    return new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }

  buildGizmoGeometry() {
    const shaftLength = 15;
    const shaftRadius = 0.48;
    const coneHeight = 3.6;
    const coneRadius = 1.35;

    // 1. Base selection footprint ring
    const baseRingGeo = new THREE.RingGeometry(8.5, 9.4, 40);
    baseRingGeo.rotateX(-Math.PI / 2);
    const baseRingMat = new THREE.MeshBasicMaterial({
      color: '#1aa3a1',
      transparent: true,
      opacity: 0.55,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
    baseRing.position.y = 0.2;
    this.group.add(baseRing);

    // 2. X Axis Arrow (Red, +X)
    const xMat = this._createHandleMaterial('X', HANDLE_COLORS.X);
    const xGroup = new THREE.Group();
    const xShaft = new THREE.Mesh(new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLength, 14), xMat);
    xShaft.rotation.z = -Math.PI / 2;
    xShaft.position.x = shaftLength / 2;
    const xCone = new THREE.Mesh(new THREE.ConeGeometry(coneRadius, coneHeight, 16), xMat);
    xCone.rotation.z = -Math.PI / 2;
    xCone.position.x = shaftLength + coneHeight / 2;
    const xHit = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.1, shaftLength + coneHeight, 10),
      this._createColliderMaterial()
    );
    xHit.rotation.z = -Math.PI / 2;
    xHit.position.x = (shaftLength + coneHeight) / 2;
    xHit.userData.gizmoHandle = 'X';
    xShaft.userData.gizmoHandle = 'X';
    xCone.userData.gizmoHandle = 'X';
    xGroup.add(xShaft, xCone, xHit);
    this.pickables.push(xHit, xShaft, xCone);
    this.axesGroup.add(xGroup);

    // 3. Y Axis Arrow (Green, +Y)
    const yMat = this._createHandleMaterial('Y', HANDLE_COLORS.Y);
    const yGroup = new THREE.Group();
    const yShaft = new THREE.Mesh(new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLength, 14), yMat);
    yShaft.position.y = shaftLength / 2;
    const yCone = new THREE.Mesh(new THREE.ConeGeometry(coneRadius, coneHeight, 16), yMat);
    yCone.position.y = shaftLength + coneHeight / 2;
    const yHit = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.1, shaftLength + coneHeight, 10),
      this._createColliderMaterial()
    );
    yHit.position.y = (shaftLength + coneHeight) / 2;
    yHit.userData.gizmoHandle = 'Y';
    yShaft.userData.gizmoHandle = 'Y';
    yCone.userData.gizmoHandle = 'Y';
    yGroup.add(yShaft, yCone, yHit);
    this.pickables.push(yHit, yShaft, yCone);
    this.axesGroup.add(yGroup);

    // 4. Z Axis Arrow (Blue, +Z)
    const zMat = this._createHandleMaterial('Z', HANDLE_COLORS.Z);
    const zGroup = new THREE.Group();
    const zShaft = new THREE.Mesh(new THREE.CylinderGeometry(shaftRadius, shaftRadius, shaftLength, 14), zMat);
    zShaft.rotation.x = Math.PI / 2;
    zShaft.position.z = shaftLength / 2;
    const zCone = new THREE.Mesh(new THREE.ConeGeometry(coneRadius, coneHeight, 16), zMat);
    zCone.rotation.x = Math.PI / 2;
    zCone.position.z = shaftLength + coneHeight / 2;
    const zHit = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.1, shaftLength + coneHeight, 10),
      this._createColliderMaterial()
    );
    zHit.rotation.x = Math.PI / 2;
    zHit.position.z = (shaftLength + coneHeight) / 2;
    zHit.userData.gizmoHandle = 'Z';
    zShaft.userData.gizmoHandle = 'Z';
    zCone.userData.gizmoHandle = 'Z';
    zGroup.add(zShaft, zCone, zHit);
    this.pickables.push(zHit, zShaft, zCone);
    this.axesGroup.add(zGroup);

    // 5. XZ Planar Pad (Amber square between +X and +Z for free horizontal table drag)
    const xzMat = this._createHandleMaterial('XZ', HANDLE_COLORS.XZ, 0.72);
    const xzGeo = new THREE.PlaneGeometry(5.6, 5.6);
    xzGeo.rotateX(-Math.PI / 2);
    const xzPad = new THREE.Mesh(xzGeo, xzMat);
    xzPad.position.set(4.8, 0.35, 4.8);
    xzPad.userData.gizmoHandle = 'XZ';
    this.pickables.push(xzPad);
    this.axesGroup.add(xzPad);

    // 6. RY Yaw Rotation Ring (Purple torus around Y axis)
    const ryMat = this._createHandleMaterial('RY', HANDLE_COLORS.RY, 0.85);
    const ryGeo = new THREE.TorusGeometry(12.2, 0.42, 12, 48);
    ryGeo.rotateX(Math.PI / 2);
    const ryRing = new THREE.Mesh(ryGeo, ryMat);
    ryRing.position.y = 0.5;
    ryRing.userData.gizmoHandle = 'RY';

    const ryHitGeo = new THREE.TorusGeometry(12.2, 1.65, 8, 32);
    ryHitGeo.rotateX(Math.PI / 2);
    const ryHit = new THREE.Mesh(ryHitGeo, this._createColliderMaterial());
    ryHit.position.y = 0.5;
    ryHit.userData.gizmoHandle = 'RY';

    this.pickables.push(ryHit, ryRing);
    this.axesGroup.add(ryRing, ryHit);
    this.group.add(this.axesGroup);

    // Put all gizmo meshes on Layer 1 with high renderOrder so OutlineComposer renders them cleanly on top
    this.group.traverse((obj) => {
      obj.layers.set(1);
      obj.renderOrder = 999;
    });
  }

  /**
   * Attaches the 3D Gizmo to a target `HardwareComponent` instance.
   * @param {import('../../core/components/HardwareComponent.js').HardwareComponent | null} component
   */
  attach(component) {
    this.attachedComponent = component || null;
    if (!this.attachedComponent) {
      this.group.visible = false;
      this.setHighlightedHandle(null);
      return;
    }
    this.syncTransform();
    this.group.visible = true;
  }

  /**
   * Detaches and hides the 3D Gizmo.
   */
  detach() {
    this.attach(null);
  }

  /**
   * Synchronizes the 3D Gizmo position with the attached component's world position.
   */
  syncTransform() {
    if (!this.attachedComponent) return;
    const pos = this.attachedComponent.group.position;
    this.group.position.set(pos.x, pos.y + 1.2, pos.z);
  }

  /**
   * Shows or hides the 3D axis arrows (`X`, `Y`, `Z`, `XZ`, `RY`) while keeping the tabletop selection ring visible.
   * @param {boolean} visible
   */
  setAxesVisible(visible) {
    this.axesVisible = Boolean(visible);
    if (this.axesGroup) {
      this.axesGroup.visible = this.axesVisible;
    }
    if (!this.axesVisible) {
      this.setHighlightedHandle(null);
    }
    return this.axesVisible;
  }

  /**
   * Returns all hit-testable collider meshes for raycasting (only active when 3D axes are enabled).
   * @returns {THREE.Object3D[]}
   */
  getColliders() {
    return this.axesVisible ? this.pickables : [];
  }

  /**
   * Highlights the active or hovered handle (`'X' | 'Y' | 'Z' | 'XZ' | 'RY' | null`).
   * @param {string | null} handleId
   */
  setHighlightedHandle(handleId) {
    this.highlightedHandle = handleId;
    for (const [id, mats] of this.handleMaterials.entries()) {
      const isHighlighted = id === handleId;
      for (const m of mats) {
        m.color.set(isHighlighted ? HANDLE_COLORS.HIGHLIGHT : m.userData.baseColor);
        m.opacity = isHighlighted ? 1.0 : m.userData.baseOpacity;
      }
    }
  }

  setHoveredHandle(handleId) {
    this.setHighlightedHandle(handleId);
  }

  setActiveHandle(handleId) {
    this.setHighlightedHandle(handleId);
  }
}
