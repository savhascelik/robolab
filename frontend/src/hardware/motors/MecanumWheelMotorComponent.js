import * as THREE from 'three';
import { BaseMotor } from '../../core/components/base/BaseMotor.js';
import { box, cyl, makeHeaderBlock, mat } from '../primitives/GeometryFactory.js';

/**
 * Omni-Directional Mecanum Wheel + Quadrature Hall Encoder DC Gearmotor Component.
 * Extends `BaseMotor` (`extends HardwareComponent`).
 * Features 8 angled (45°) polyurethane rollers, green anodized hub plates, and 4-pin motor/encoder header.
 */
export class MecanumWheelMotorComponent extends BaseMotor {
  static typeId = 'motor.mecanum_wheel';
  static category = 'motors';
  static displayName = 'Mecanum Omni-Wheel + Encoder Gearmotor';
  static summary = '45° 8-Roller Omni-Directional Mecanum Wheel with Hall Quadrature Encoder Gearmotor';

  constructor(options = {}) {
    super({
      name: options.name || 'Mecanum Omni-Wheel + Encoder Gearmotor',
      description:
        options.description ||
        'Omnidirectional 45-degree 8-roller Mecanum wheel coupled to a planetary DC gearmotor with magnetic Hall encoder.',
      ...options
    });
    this.maxRpm = options.maxRpm || 360;
    this.rollerHandedness =
      options.handedness === -1 || options.handedness === 'B' || options.handedness === 'left' ? -1 : 1;
    this.setupElectricalModel({ windingResistance: 14, maxCurrent: 1.6, minVoltage: 3.3 });
  }

  buildMesh(options = {}) {
    const handednessSign =
      options.handedness === -1 || options.handedness === 'B' || options.handedness === 'left' ? -1 : 1;
    this.rollerHandedness = handednessSign;
    const g = this.group;
    const steelMat = mat('#cbd5e1', 0.26, 0.84);
    const darkAlumMat = mat('#1e293b', 0.36, 0.72);
    const hubAccentMat = mat('#76b900', 0.32, 0.52);
    const rollerMat = mat('#334155', 0.72, 0.14);
    const brassMat = mat('#d97706', 0.3, 0.85);

    // 1. Planetary Gearmotor Cylinder + Rear Magnetic Hall Encoder Disc
    const motorBody = cyl(5.6, 5.6, 18.0, 24, darkAlumMat, -10.5, 8.0, 0);
    motorBody.rotation.z = Math.PI / 2;
    g.add(motorBody);

    const gearboxBody = cyl(6.2, 6.2, 10.0, 24, steelMat, -0.5, 8.0, 0);
    gearboxBody.rotation.z = Math.PI / 2;
    g.add(gearboxBody);

    // Rear encoder PCB & magnetic disk
    const encPcb = cyl(5.8, 5.8, 1.4, 20, mat('#0f3d3e', 0.5, 0.15), -20.0, 8.0, 0);
    encPcb.rotation.z = Math.PI / 2;
    g.add(encPcb);

    // 2. Output Shaft + Mecanum Wheel Assembly (`wheelGroup` / `propGroup`)
    const shaft = cyl(2.0, 2.0, 7.5, 16, brassMat, 7.0, 8.0, 0);
    shaft.rotation.z = Math.PI / 2;
    g.add(shaft);

    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(13.0, 8.0, 0);

    // Core wheel barrel + twin anodized green side flanges
    const coreHub = cyl(7.6, 7.6, 10.5, 24, darkAlumMat, 0, 0, 0);
    coreHub.rotation.z = Math.PI / 2;
    wheelGroup.add(coreHub);

    const outerFlange = cyl(8.2, 8.2, 1.2, 24, hubAccentMat, 4.9, 0, 0);
    outerFlange.rotation.z = Math.PI / 2;
    wheelGroup.add(outerFlange);

    const innerFlange = cyl(8.2, 8.2, 1.2, 24, hubAccentMat, -4.9, 0, 0);
    innerFlange.rotation.z = Math.PI / 2;
    wheelGroup.add(innerFlange);

    // 8 Diagonal 45° Polyurethane Rollers around perimeter
    for (let r = 0; r < 8; r++) {
      const angle = (r / 8) * Math.PI * 2;
      const rollerHolder = new THREE.Group();
      rollerHolder.position.set(0, Math.cos(angle) * 9.0, Math.sin(angle) * 9.0);
      rollerHolder.rotation.x = angle;

      const roller = cyl(2.3, 2.3, 9.6, 16, rollerMat, 0, 0, 0);
      roller.rotation.z = (Math.PI / 4) * this.rollerHandedness;
      rollerHolder.add(roller);

      const axlePin = cyl(0.7, 0.7, 10.8, 10, steelMat, 0, 0, 0);
      axlePin.rotation.z = (Math.PI / 4) * this.rollerHandedness;
      rollerHolder.add(axlePin);

      wheelGroup.add(rollerHolder);
    }

    const cap = cyl(2.8, 2.8, 11.4, 16, steelMat, 0, 0, 0);
    cap.rotation.z = Math.PI / 2;
    wheelGroup.add(cap);

    g.add(wheelGroup);
    this.refs.wheelGroup = wheelGroup;
    this.refs.propGroup = wheelGroup;

    // 3. 4-Pin Motor + Quadrature Encoder Header (`VCC`, `GND`, `ENC_A`, `ENC_B`)
    const hdr = makeHeaderBlock(4, 2.54);
    hdr.position.set(-18.0, 2.0, 0);
    g.add(hdr);

    const pinDefs = [
      { name: 'VCC', z: -3.81, dir: 'IN', role: 'VCC_IN', proto: 'DC' },
      { name: 'GND', z: -1.27, dir: 'IN', role: 'GND_IN', proto: 'DC' },
      { name: 'ENC_A', z: 1.27, dir: 'OUT', role: 'GPIO', proto: 'GPIO' },
      { name: 'ENC_B', z: 3.81, dir: 'OUT', role: 'GPIO', proto: 'GPIO' }
    ];
    for (const p of pinDefs) {
      this.definePin(p.name, new THREE.Vector3(-18.0, 4.2, p.z), {
        direction: p.dir,
        role: p.role,
        protocol: p.proto
      });
    }
  }

  update(dt) {
    if (!this.refs.wheelGroup) return;
    if (!this.state.enabled || this.state.speedNormalized <= 0) return;
    const rps = (this.maxRpm / 60) * this.state.speedNormalized;
    this.refs.wheelGroup.rotation.x += rps * Math.PI * 2 * dt;
  }
}
