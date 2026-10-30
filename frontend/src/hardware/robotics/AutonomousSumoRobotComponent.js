import * as THREE from 'three';
import { BaseRobotAssembly } from '../../core/components/base/BaseRobotAssembly.js';
import { ArduinoUnoBoard } from '../boards/ArduinoUnoBoard.js';
import { UltrasonicSensorComponent } from '../sensors/UltrasonicSensorComponent.js';
import { L298NDualBridgeDriver } from '../drivers/L298NDualBridgeDriver.js';
import { N20GearmotorWheelComponent } from '../motors/N20GearmotorWheelComponent.js';
import { LiPoBatteryPack3S } from '../power/LiPoBatteryPack3S.js';
import { Tcrt5000LineSensorArray } from '../sensors/Tcrt5000LineSensorArray.js';
import { SumoChassisPlateComponent } from './SumoChassisPlateComponent.js';
import { SumoDozerBladeComponent } from './SumoDozerBladeComponent.js';
import { SumoCarbonArmorHoodComponent } from './SumoCarbonArmorHoodComponent.js';

/**
 * Complete Autonomous Sumo Competition Robot Composite Component (`robot.autonomous_sumo`).
 * Extends `BaseRobotAssembly` (`extends HardwareComponent`).
 * Composes 8 distinct registered `HardwareComponent` sub-assemblies (`SumoDozerBladeComponent`,
 * `SumoChassisPlateComponent`, 4x `N20GearmotorWheelComponent`, `L298NDualBridgeDriver`,
 * `ArduinoUnoBoard`, `LiPoBatteryPack3S`, 2x `UltrasonicSensorComponent`, `Tcrt5000LineSensorArray`,
 * and `SumoCarbonArmorHoodComponent`) so it can be exploded in the Landing Showcase AND spawned in the Workbench.
 */
export class AutonomousSumoRobotComponent extends BaseRobotAssembly {
  static typeId = 'robot.autonomous_sumo';
  static category = 'robotics';
  static displayName = 'Autonomous Sumo Competition Robot (Complete)';
  static summary = '8-Layer Composite Autonomous Sumo Robot with Arduino Uno R3, L298N, 4x N20 Gearmotors & Dual HC-SR04';

  constructor(options = {}) {
    super({
      name: options.name || 'Autonomous Sumo Competition Robot',
      description:
        options.description ||
        'Complete competition-grade Autonomous Sumo Robot composed of 8 modular HardwareComponent sub-assemblies with real-time exploded-view kinematics.',
      ...options
    });
    this.setupElectricalModel();
  }

  buildMesh() {
    const g = this.group;
    this.partEntries = [];
    this.wheelInstances = [];

    const addLayer = (id, component, assembledPos, explodedPos, scale = 1.0, rotY = 0) => {
      const wrapper = new THREE.Group();
      wrapper.name = `sumo_part_${id}`;
      wrapper.userData.partId = id;
      wrapper.userData.componentTypeId = component.constructor.typeId;
      component.group.scale.setScalar(scale);
      component.group.rotation.y = rotY;
      wrapper.add(component.group);
      wrapper.position.copy(assembledPos);
      g.add(wrapper);
      this.partEntries.push({
        id,
        component,
        wrapper,
        assembledPos: assembledPos.clone(),
        explodedPos: explodedPos.clone()
      });
      return { wrapper, component };
    };

    // 1. Front 18° Hardened Steel Dozer Wedge (`robotics.sumo_dozer_blade`)
    addLayer(
      'wedge-blade',
      new SumoDozerBladeComponent({ id: `${this.id}_wedge` }),
      new THREE.Vector3(0, 1.5, 44.0),
      new THREE.Vector3(0, -10.0, 96.0),
      1.0
    );

    // 2. CNC 6061-T6 Lower Chassis Plate (`robotics.sumo_chassis_plate`)
    addLayer(
      'chassis-base',
      new SumoChassisPlateComponent({ id: `${this.id}_chassis` }),
      new THREE.Vector3(0, 2.0, 0),
      new THREE.Vector3(0, -28.0, 0),
      1.0
    );

    // 3. Quad N20 600RPM Gearmotors + Silicone Wheels (`motor.n20_gearmotor` x4)
    const drivetrainWrapper = new THREE.Group();
    drivetrainWrapper.name = 'sumo_part_n20-drivetrain';
    drivetrainWrapper.userData.partId = 'n20-drivetrain';
    drivetrainWrapper.userData.componentTypeId = N20GearmotorWheelComponent.typeId;

    const wheelCorners = [
      { id: 'fl', x: -24.0, z: 20.0, rotY: Math.PI },
      { id: 'rl', x: -24.0, z: -20.0, rotY: Math.PI },
      { id: 'fr', x: 24.0, z: 20.0, rotY: 0 },
      { id: 'rr', x: 24.0, z: -20.0, rotY: 0 }
    ];
    let primaryWheelComp = null;
    for (const c of wheelCorners) {
      const wComp = new N20GearmotorWheelComponent({ id: `${this.id}_wheel_${c.id}` });
      wComp.setPwm(210);
      wComp.group.position.set(c.x, 0, c.z);
      wComp.group.rotation.y = c.rotY;
      drivetrainWrapper.add(wComp.group);
      this.wheelInstances.push(wComp);
      if (!primaryWheelComp) primaryWheelComp = wComp;
    }
    const dtAssembled = new THREE.Vector3(0, 2.5, 0);
    const dtExploded = new THREE.Vector3(-56.0, -8.0, 0);
    drivetrainWrapper.position.copy(dtAssembled);
    g.add(drivetrainWrapper);
    this.partEntries.push({
      id: 'n20-drivetrain',
      component: primaryWheelComp,
      wrapper: drivetrainWrapper,
      assembledPos: dtAssembled,
      explodedPos: dtExploded
    });

    // 4. L298N Dual H-Bridge Motor Driver (`driver.l298n_dual`)
    addLayer(
      'l298n-driver',
      new L298NDualBridgeDriver({ id: `${this.id}_l298n` }),
      new THREE.Vector3(0, 6.2, -14.0),
      new THREE.Vector3(54.0, 12.0, -24.0),
      0.85
    );

    // 5. Arduino Uno R3 Main Controller Board (`board.arduino_uno`)
    addLayer(
      'arduino-uno',
      new ArduinoUnoBoard({ id: `${this.id}_uno` }),
      new THREE.Vector3(0, 15.2, -2.0),
      new THREE.Vector3(0, 32.0, -8.0),
      0.78
    );

    // 6. 3S 11.1V 1300mAh LiPo Battery Pack (`power.lipo_3s_1300mah`)
    addLayer(
      'lipo-pack',
      new LiPoBatteryPack3S({ id: `${this.id}_lipo` }),
      new THREE.Vector3(0, 6.0, 14.0),
      new THREE.Vector3(-48.0, 18.0, -26.0),
      0.82
    );

    // 7. Dual HC-SR04 Ultrasonic Rangefinder Array (`sensor.ultrasonic` x2)
    const sonarWrapper = new THREE.Group();
    sonarWrapper.name = 'sumo_part_ultrasonic-array';
    sonarWrapper.userData.partId = 'ultrasonic-array';
    sonarWrapper.userData.componentTypeId = UltrasonicSensorComponent.typeId;

    const leftSonar = new UltrasonicSensorComponent({ id: `${this.id}_sonar_l` });
    leftSonar.group.position.set(-15.5, 0, 0);
    leftSonar.group.rotation.y = 0.14;
    sonarWrapper.add(leftSonar.group);

    const rightSonar = new UltrasonicSensorComponent({ id: `${this.id}_sonar_r` });
    rightSonar.group.position.set(15.5, 0, 0);
    rightSonar.group.rotation.y = -0.14;
    sonarWrapper.add(rightSonar.group);

    const sonarAssembled = new THREE.Vector3(0, 15.0, 33.0);
    const sonarExploded = new THREE.Vector3(0, 24.0, 78.0);
    sonarWrapper.position.copy(sonarAssembled);
    g.add(sonarWrapper);
    this.partEntries.push({
      id: 'ultrasonic-array',
      component: leftSonar,
      wrapper: sonarWrapper,
      assembledPos: sonarAssembled,
      explodedPos: sonarExploded
    });

    // 8. TCRT5000 Infrared Dohyo Edge Sensor Array + 3K Carbon Armor Hood
    const armorWrapper = new THREE.Group();
    armorWrapper.name = 'sumo_part_line-sensors';
    armorWrapper.userData.partId = 'line-sensors';
    armorWrapper.userData.componentTypeId = Tcrt5000LineSensorArray.typeId;

    const lineSensor = new Tcrt5000LineSensorArray({ id: `${this.id}_tcrt5000` });
    lineSensor.group.position.set(0, -18.5, 32.0);
    armorWrapper.add(lineSensor.group);

    const carbonHood = new SumoCarbonArmorHoodComponent({ id: `${this.id}_hood` });
    carbonHood.group.position.set(0, 0, 0);
    armorWrapper.add(carbonHood.group);

    const armorAssembled = new THREE.Vector3(0, 22.0, 0);
    const armorExploded = new THREE.Vector3(0, 62.0, 0);
    armorWrapper.position.copy(armorAssembled);
    g.add(armorWrapper);
    this.partEntries.push({
      id: 'line-sensors',
      component: lineSensor,
      wrapper: armorWrapper,
      assembledPos: armorAssembled,
      explodedPos: armorExploded
    });

    this.definePin('VCC', new THREE.Vector3(-12.0, 15.2, 10.0), {
      direction: 'IN',
      role: 'VCC_IN',
      protocol: 'DC'
    });
    this.definePin('GND', new THREE.Vector3(12.0, 15.2, 10.0), {
      direction: 'IN',
      role: 'GND_IN',
      protocol: 'DC'
    });
  }

  update(dt) {
    for (const w of this.wheelInstances) {
      w.update(dt);
    }
  }
}
