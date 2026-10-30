import * as THREE from 'three';
import { BaseMotor } from '../../core/components/base/BaseMotor.js';
import { box, cyl, makeHeaderBlock, mat } from '../primitives/GeometryFactory.js';

/**
 * High-Torque N20 Micro Metal Gearmotor (1:50 Brass Gearbox) + CNC Aluminum Hub & Silicone Traction Wheel.
 * Extends `BaseMotor` (`extends HardwareComponent`).
 * Used in both the Autonomous Sumo Robot and standalone Spatial Workbench circuit designs.
 */
export class N20GearmotorWheelComponent extends BaseMotor {
  static typeId = 'motor.n20_gearmotor';
  static category = 'motors';
  static displayName = 'N20 600RPM Gearmotor + Silicone Wheel';
  static summary = '1:50 Brass Geartrain Micro DC Motor with CNC Hub & High-Grip Silicone Sumo Tire';

  constructor(options = {}) {
    super({
      name: options.name || 'N20 600RPM Gearmotor + Silicone Wheel',
      description:
        options.description ||
        '12V 600RPM N20 micro metal gearmotor with exposed brass spur gearbox, D-shaft, CNC anodized wheel rim, and high-friction silicone traction tire.',
      ...options
    });
    this.maxRpm = options.maxRpm || 600;
    this.setupElectricalModel({ windingResistance: 18, maxCurrent: 1.2, minVoltage: 3.0 });
  }

  buildMesh() {
    const g = this.group;
    const brassMat = mat('#d97706', 0.28, 0.86);
    const steelMat = mat('#cbd5e1', 0.25, 0.85);
    const tireMat = mat('#0f172a', 0.88, 0.05);
    const rimMat = mat('#e11d48', 0.32, 0.65);
    const bracketMat = mat('#1e293b', 0.45, 0.55);

    // 1. Brushed DC Motor Can (cylindrical rear body along X axis)
    const motorCan = cyl(5.0, 5.0, 15.0, 24, steelMat, -8.5, 6.0, 0);
    motorCan.rotation.z = Math.PI / 2;
    g.add(motorCan);

    // Rear black end-cap + solder tabs
    const endCap = cyl(4.8, 4.8, 2.2, 20, mat('#18181b', 0.6, 0.15), -16.5, 6.0, 0);
    endCap.rotation.z = Math.PI / 2;
    g.add(endCap);
    g.add(box(1.8, 0.6, 1.4, brassMat, -18.0, 7.2, -2.0));
    g.add(box(1.8, 0.6, 1.4, brassMat, -18.0, 7.2, 2.0));

    // 2. Precision 1:50 Brass Gearbox Housing (10x12x9 mm)
    g.add(box(9.5, 10.0, 12.0, brassMat, 3.5, 6.0, 0));
    // Exposed brass intermediate gear shafts
    for (const zOff of [-3.2, 0, 3.2]) {
      const gearPin = cyl(0.9, 0.9, 12.4, 12, steelMat, 3.5, 6.0, zOff);
      gearPin.rotation.x = Math.PI / 2;
      g.add(gearPin);
    }

    // 3. U-Shape Mounting Bracket with M2 bolts
    g.add(box(10.5, 11.2, 1.4, bracketMat, 3.5, 6.0, -6.6));
    g.add(box(10.5, 11.2, 1.4, bracketMat, 3.5, 6.0, 6.6));
    g.add(box(10.5, 1.4, 14.6, bracketMat, 3.5, 0.7, 0));

    // 4. Output D-Shaft + Rotating CNC Wheel Assembly (`wheelPivot` & `propGroup`)
    const shaft = cyl(1.5, 1.5, 8.0, 16, steelMat, 11.5, 6.0, 0);
    shaft.rotation.z = Math.PI / 2;
    g.add(shaft);

    const wheelPivot = new THREE.Group();
    wheelPivot.position.set(15.5, 6.0, 0);

    // Silicone traction tire (radius 11mm, width 9mm)
    const tire = cyl(11.0, 11.0, 9.0, 32, tireMat, 0, 0, 0);
    tire.rotation.z = Math.PI / 2;
    wheelPivot.add(tire);

    // 12 Molded Traction Lugs around circumference
    for (let t = 0; t < 12; t++) {
      const angle = (t / 12) * Math.PI * 2;
      const lug = box(
        9.2,
        1.2,
        1.8,
        mat('#1e293b', 0.78, 0.1),
        0,
        Math.cos(angle) * 11.1,
        Math.sin(angle) * 11.1
      );
      lug.rotation.x = -angle;
      wheelPivot.add(lug);
    }

    // Anodized crimson CNC aluminum hub + 6 lighten spokes
    const hub = cyl(7.2, 7.2, 9.4, 24, rimMat, 0, 0, 0);
    hub.rotation.z = Math.PI / 2;
    wheelPivot.add(hub);

    for (let s = 0; s < 6; s++) {
      const a = (s / 6) * Math.PI * 2;
      const spoke = box(9.7, 1.1, 6.8, steelMat, 0, Math.cos(a) * 3.0, Math.sin(a) * 3.0);
      spoke.rotation.x = a;
      wheelPivot.add(spoke);
    }

    const centerCap = cyl(2.4, 2.4, 10.0, 16, brassMat, 0, 0, 0);
    centerCap.rotation.z = Math.PI / 2;
    wheelPivot.add(centerCap);

    g.add(wheelPivot);
    this.refs.wheelPivot = wheelPivot;
    this.refs.propGroup = wheelPivot;

    // 5. 2-Pin Terminal Header for Workbench Wiring (`VCC`, `GND`)
    const hdr = makeHeaderBlock(2, 2.54);
    hdr.position.set(-14.5, 1.2, 0);
    g.add(hdr);

    this.definePin('VCC', new THREE.Vector3(-14.5, 3.2, -1.27), {
      direction: 'IN',
      role: 'VCC_IN',
      protocol: 'DC'
    });
    this.definePin('GND', new THREE.Vector3(-14.5, 3.2, 1.27), {
      direction: 'IN',
      role: 'GND_IN',
      protocol: 'DC'
    });
  }

  update(dt) {
    if (!this.refs.wheelPivot) return;
    if (!this.state.enabled || this.state.speedNormalized <= 0) return;
    const rps = (this.maxRpm / 60) * this.state.speedNormalized;
    this.refs.wheelPivot.rotation.x += rps * Math.PI * 2 * dt;
  }
}
