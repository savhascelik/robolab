import * as THREE from 'three';
import { BaseMotor } from '../../core/components/base/BaseMotor.js';
import { box, cyl, makeHeaderBlock, mat } from '../primitives/GeometryFactory.js';

/**
 * 2-Axis Pan/Tilt Micro-Servo Camera Gimbal Turret (Dual MG90S Metal-Gear Servos + CNC Brackets).
 * Extends `BaseMotor` (`extends HardwareComponent`).
 * Provides articulated `refs.panPivot` and `refs.tiltPivot` groups and 4-pin PWM control header.
 */
export class PanTiltCameraGimbalComponent extends BaseMotor {
  static typeId = 'motor.pan_tilt_gimbal';
  static category = 'motors';
  static displayName = '2-Axis Pan/Tilt Servo Gimbal';
  static summary = 'Dual MG90S Micro-Servo 2-DOF Pan/Tilt CNC Aluminum Camera Turret';

  constructor(options = {}) {
    super({
      name: options.name || '2-Axis Pan/Tilt Servo Gimbal',
      description:
        options.description ||
        'Dual-axis Pan/Tilt servo turret with metal-gear MG90S actuators, anodized aluminum U-brackets, and independent PWM pan/tilt inputs.',
      ...options
    });
    this.setupElectricalModel({ windingResistance: 32, maxCurrent: 0.9, minVoltage: 4.5 });
  }

  getDefaultState() {
    return {
      ...super.getDefaultState(),
      panAngleDeg: 90,
      tiltAngleDeg: 90
    };
  }

  /**
   * Sets pan and tilt angles in radians for smooth real-time tracking in Showcase or Workbench.
   * @param {number} panRad
   * @param {number} tiltRad
   */
  setPanTiltRadians(panRad, tiltRad) {
    if (this.refs.panPivot) {
      this.refs.panPivot.rotation.y = panRad;
    }
    if (this.refs.tiltPivot) {
      this.refs.tiltPivot.rotation.x = tiltRad;
    }
  }

  buildMesh() {
    const g = this.group;
    const servoBodyMat = mat('#1e293b', 0.42, 0.35);
    const servoTopMat = mat('#2563eb', 0.35, 0.25);
    const bracketMat = mat('#334155', 0.34, 0.74);
    const brassGearMat = mat('#f59e0b', 0.28, 0.88);
    const hornMat = mat('#f8fafc', 0.45, 0.1);

    // 1. Base Pedestal Flange & Lower MG90S Pan Servo
    const baseFlange = cyl(9.5, 10.5, 2.0, 28, bracketMat, 0, 1.0, 0);
    g.add(baseFlange);

    // Lower Pan Servo Body
    g.add(box(12.2, 11.5, 22.5, servoBodyMat, 0, 7.8, 0));
    g.add(box(12.6, 2.2, 28.0, servoTopMat, 0, 11.0, 0));
    const panSpline = cyl(2.8, 2.8, 3.2, 20, brassGearMat, 0, 14.5, -5.0);
    g.add(panSpline);

    // 2. Articulated Pan Pivot Group (rotates around Y)
    const panPivot = new THREE.Group();
    panPivot.position.set(0, 15.8, -5.0);

    // Servo horn disc
    panPivot.add(cyl(5.5, 5.5, 1.2, 20, hornMat, 0, 0.6, 0));

    // CNC U-Bracket Uprights
    panPivot.add(box(16.0, 1.8, 10.0, bracketMat, 0, 1.8, 0));
    panPivot.add(box(1.8, 14.5, 10.0, bracketMat, -7.2, 9.0, 0));
    panPivot.add(box(1.8, 14.5, 10.0, bracketMat, 7.2, 9.0, 0));

    // 3. Articulated Tilt Pivot Group (rotates around X)
    const tiltPivot = new THREE.Group();
    tiltPivot.position.set(0, 12.5, 0);

    // Upper MG90S Tilt Servo mounted horizontally
    tiltPivot.add(box(12.0, 10.5, 18.0, servoBodyMat, 0, 0, 0));
    const tiltAxle = cyl(2.2, 2.2, 18.4, 16, brassGearMat, 0, 0, 0);
    tiltAxle.rotation.z = Math.PI / 2;
    tiltPivot.add(tiltAxle);

    // Top Camera Mounting Cradle Plate
    tiltPivot.add(box(18.0, 1.8, 14.0, bracketMat, 0, 6.2, 0));
    panPivot.add(tiltPivot);
    g.add(panPivot);

    this.refs.panPivot = panPivot;
    this.refs.tiltPivot = tiltPivot;
    this.refs.hornGroup = panPivot;

    // 4. 4-Pin PWM Control Header (`VCC`, `GND`, `SIGNAL`, `TILT_PWM`)
    const hdr = makeHeaderBlock(4, 2.54);
    hdr.position.set(0, 1.4, 13.5);
    hdr.rotation.y = Math.PI / 2;
    g.add(hdr);

    const pins = [
      { name: 'VCC', x: -3.81, dir: 'IN', role: 'VCC_IN', proto: 'DC' },
      { name: 'GND', x: -1.27, dir: 'IN', role: 'GND_IN', proto: 'DC' },
      { name: 'SIGNAL', x: 1.27, dir: 'IN', role: 'PWM', proto: 'PWM' },
      { name: 'TILT_PWM', x: 3.81, dir: 'IN', role: 'PWM', proto: 'PWM' }
    ];
    for (const p of pins) {
      this.definePin(p.name, new THREE.Vector3(p.x, 3.4, 13.5), {
        direction: p.dir,
        role: p.role,
        protocol: p.proto
      });
    }
  }

  update(dt) {
    if (!this.refs.panPivot) return;
    const targetRad = ((this.state.targetAngleDeg - 90) * Math.PI) / 180;
    const currentRad = this.refs.panPivot.rotation.y;
    const diff = targetRad - currentRad;
    if (Math.abs(diff) > 0.001) {
      this.refs.panPivot.rotation.y += diff * Math.min(1, dt * 8);
    }
  }
}
