import * as THREE from 'three';

const DEG = Math.PI / 180;
export const DEFAULT_AZIMUTH = -38 * DEG;
export const DEFAULT_ELEVATION = 35.264 * DEG; // True isometric atan(1/sqrt(2))

/**
 * Single-Responsibility Controller for the Orthographic Isometric Camera,
 * smooth spring-damped interpolation, pointer pan/orbit, wheel zoom, and WASD navigation.
 */
export class CameraController {
  constructor({ camera, canvas, compassNeedle, onResetCallout }) {
    this.camera = camera;
    this.canvas = canvas;
    this.compassNeedle = compassNeedle;
    this.onResetCallout = onResetCallout;

    this.width = 800;
    this.height = 520;

    this.defaultZoom = 1.15;
    this.defaultTarget = new THREE.Vector3(0, 2, 0);

    this.view = {
      azimuth: DEFAULT_AZIMUTH,
      elevation: DEFAULT_ELEVATION,
      zoom: 1.15,
      target: new THREE.Vector3(0, 2, 0)
    };
    this.goal = {
      azimuth: DEFAULT_AZIMUTH,
      elevation: DEFAULT_ELEVATION,
      zoom: 1.15,
      target: new THREE.Vector3(0, 2, 0)
    };

    this.keys = new Set();
    this.dragging = false;
    this.interactionLocked = false;
    this.dragMode = 'pan';
    this.lastPointer = { x: 0, y: 0 };

    if (this.canvas) {
      this.bindEvents();
    }
  }

  /**
   * Locks/unlocks camera pointer pan/orbit while a 3D Gizmo handle is being dragged.
   * @param {boolean} locked
   */
  setInteractionLocked(locked) {
    this.interactionLocked = Boolean(locked);
    if (this.interactionLocked) {
      this.dragging = false;
    }
  }

  bindEvents() {
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.interactionLocked) return;
      this.dragging = true;
      this.dragMode = e.button === 2 || e.shiftKey ? 'orbit' : 'pan';
      this.lastPointer = { x: e.clientX, y: e.clientY };
      this.canvas.setPointerCapture?.(e.pointerId);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (this.interactionLocked || !this.dragging) return;
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      this.lastPointer = { x: e.clientX, y: e.clientY };

      if (this.dragMode === 'orbit') {
        this.goal.azimuth -= dx * 0.007;
      } else {
        const scale = 0.16 / this.view.zoom;
        const cosA = Math.cos(this.view.azimuth);
        const sinA = Math.sin(this.view.azimuth);
        const rightX = cosA;
        const rightZ = -sinA;
        const fwdX = sinA;
        const fwdZ = cosA;

        this.goal.target.x -= (dx * rightX - dy * fwdX * 1.35) * scale;
        this.goal.target.z -= (dx * rightZ - dy * fwdZ * 1.35) * scale;
        this.clampTarget();
      }
    });

    const endDrag = () => {
      this.dragging = false;
    };
    this.canvas.addEventListener('pointerup', endDrag);
    this.canvas.addEventListener('pointercancel', endDrag);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 0.89;
        this.zoomBy(factor);
      },
      { passive: false }
    );

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        if (typeof e.key !== 'string') return;
        const k = e.key.toLowerCase();
        if (['w', 'a', 's', 'd'].includes(k)) {
          this.keys.add(k);
        } else if (k === 'q') {
          this.turn(-1);
        } else if (k === 'e') {
          this.turn(1);
        } else if (k === 'r') {
          this.resetView();
        }
      });

      window.addEventListener('keyup', (e) => {
        if (typeof e.key !== 'string') return;
        this.keys.delete(e.key.toLowerCase());
      });
    }
  }

  setDefaults({ target, zoom }) {
    if (target) this.defaultTarget.copy(target);
    if (typeof zoom === 'number') this.defaultZoom = zoom;
  }

  clampTarget() {
    this.goal.target.x = Math.max(-75, Math.min(85, this.goal.target.x));
    this.goal.target.z = Math.max(-65, Math.min(65, this.goal.target.z));
  }

  setGoalXZ(x, z) {
    this.goal.target.x = x;
    this.goal.target.z = z;
    this.clampTarget();
  }

  turn(dir = 1) {
    this.goal.azimuth += dir * (45 * DEG);
  }

  zoomBy(factor) {
    this.goal.zoom = Math.min(2.6, Math.max(0.55, this.goal.zoom * factor));
  }

  resetView() {
    this.goal.azimuth = DEFAULT_AZIMUTH;
    this.goal.elevation = DEFAULT_ELEVATION;
    this.goal.zoom = this.defaultZoom;
    this.goal.target.copy(this.defaultTarget);
    this.onResetCallout?.();
  }

  setViewportSize(width, height) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.updateProjection();
  }

  updateProjection() {
    const aspect = this.width / Math.max(1, this.height);
    const frustumHeight = 82 / this.view.zoom;
    const frustumWidth = frustumHeight * aspect;

    this.camera.left = -frustumWidth / 2;
    this.camera.right = frustumWidth / 2;
    this.camera.top = frustumHeight / 2;
    this.camera.bottom = -frustumHeight / 2;
    this.camera.updateProjectionMatrix();

    const dist = 180;
    const cosE = Math.cos(this.view.elevation);
    const sinE = Math.sin(this.view.elevation);
    const cosA = Math.cos(this.view.azimuth);
    const sinA = Math.sin(this.view.azimuth);

    this.camera.position.set(
      this.view.target.x - sinA * cosE * dist,
      this.view.target.y + sinE * dist,
      this.view.target.z + cosA * cosE * dist
    );
    this.camera.lookAt(this.view.target);
    this.camera.updateMatrixWorld();
  }

  projectToScreen(worldVec) {
    const v = worldVec.clone().project(this.camera);
    return {
      x: (v.x * 0.5 + 0.5) * this.width,
      y: (-v.y * 0.5 + 0.5) * this.height
    };
  }

  update(dt) {
    if (this.keys.size > 0) {
      const speed = (48 * dt) / this.view.zoom;
      const cosA = Math.cos(this.view.azimuth);
      const sinA = Math.sin(this.view.azimuth);
      if (this.keys.has('w')) {
        this.goal.target.x += sinA * speed;
        this.goal.target.z -= cosA * speed;
      }
      if (this.keys.has('s')) {
        this.goal.target.x -= sinA * speed;
        this.goal.target.z += cosA * speed;
      }
      if (this.keys.has('a')) {
        this.goal.target.x -= cosA * speed;
        this.goal.target.z -= sinA * speed;
      }
      if (this.keys.has('d')) {
        this.goal.target.x += cosA * speed;
        this.goal.target.z += sinA * speed;
      }
      this.clampTarget();
    }

    const damp = 1 - Math.exp(-12 * dt);
    this.view.azimuth += (this.goal.azimuth - this.view.azimuth) * damp;
    this.view.elevation += (this.goal.elevation - this.view.elevation) * damp;
    this.view.zoom += (this.goal.zoom - this.view.zoom) * damp;
    this.view.target.lerp(this.goal.target, damp);

    if (this.compassNeedle) {
      const deg = ((this.view.azimuth - DEFAULT_AZIMUTH) * 180) / Math.PI;
      this.compassNeedle.style.transformOrigin = '12px 12px';
      this.compassNeedle.style.transform = `rotate(${deg.toFixed(1)}deg)`;
    }

    this.updateProjection();
  }
}
