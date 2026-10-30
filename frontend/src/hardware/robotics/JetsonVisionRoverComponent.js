import * as THREE from 'three';
import { BaseRobotAssembly } from '../../core/components/base/BaseRobotAssembly.js';
import { JetsonNanoBoard } from '../boards/JetsonNanoBoard.js';
import { Imx219CsiCameraModule } from '../sensors/Imx219CsiCameraModule.js';
import { PanTiltCameraGimbalComponent } from '../motors/PanTiltCameraGimbalComponent.js';
import { MecanumWheelMotorComponent } from '../motors/MecanumWheelMotorComponent.js';
import { Ina219PowerTelemetryBay } from '../power/Ina219PowerTelemetryBay.js';
import { Vl53l1xLaserTofComponent } from '../sensors/Vl53l1xLaserTofComponent.js';
import { Ssd1306OledDisplayComponent } from '../displays/Ssd1306OledDisplayComponent.js';
import { MecanumRoverChassisDeckComponent } from './MecanumRoverChassisDeckComponent.js';
import { CsiRibbonHarnessComponent } from './CsiRibbonHarnessComponent.js';

/**
 * Complete NVIDIA Jetson Nano Edge AI Vision Rover Composite Component (`robot.jetson_vision_rover`).
 * Extends `BaseRobotAssembly` (`extends HardwareComponent`).
 * Composes 8 registered `HardwareComponent` sub-assemblies (`JetsonNanoBoard`, `Imx219CsiCameraModule`,
 * `PanTiltCameraGimbalComponent`, 4x `MecanumWheelMotorComponent`, `Ina219PowerTelemetryBay`,
 * `Vl53l1xLaserTofComponent`, `Ssd1306OledDisplayComponent`, `MecanumRoverChassisDeckComponent`,
 * and `CsiRibbonHarnessComponent`) for both the Landing Showcase and Spatial Workbench.
 */
export class JetsonVisionRoverComponent extends BaseRobotAssembly {
  static typeId = 'robot.jetson_vision_rover';
  static category = 'robotics';
  static displayName = 'Jetson Nano Edge AI Vision Rover (Complete)';
  static summary = '8-Layer Composite Edge AI Rover with Jetson Nano B01, IMX219 CSI Camera, Gimbal & 4x Mecanum Drive';

  constructor(options = {}) {
    super({
      name: options.name || 'Jetson Nano Edge AI Vision Rover',
      description:
        options.description ||
        'Complete Edge AI Autonomous Vision Rover powered by NVIDIA Jetson Nano B01, Sony IMX219 160° CSI-2 camera, 2-axis Pan/Tilt servo turret, VL53L1X Laser ToF, SSD1306 OLED, and 4x Mecanum omni-wheels.',
      ...options
    });
    this.setupElectricalModel();
  }

  buildMesh() {
    const g = this.group;
    this.partEntries = [];
    this.mecanumWheels = [];

    const addLayer = (id, component, assembledPos, explodedPos, scale = 1.0, rotY = 0) => {
      const wrapper = new THREE.Group();
      wrapper.name = `jetson_part_${id}`;
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

    // 1. Mecanum Rover CNC Chassis Deck (`robotics.jetson_rover_chassis`) + 4x Mecanum Omni-Wheels (`motor.mecanum_wheel`)
    const chassisWrapper = new THREE.Group();
    chassisWrapper.name = 'jetson_part_mecanum-chassis';
    chassisWrapper.userData.partId = 'mecanum-chassis';
    chassisWrapper.userData.componentTypeId = MecanumWheelMotorComponent.typeId;

    const deckComp = new MecanumRoverChassisDeckComponent({ id: `${this.id}_deck` });
    chassisWrapper.add(deckComp.group);

    const wheelSpecs = [
      { id: 'fl', x: -34.0, z: 32.0, rotY: Math.PI, hand: 1 },
      { id: 'rl', x: -34.0, z: -32.0, rotY: Math.PI, hand: -1 },
      { id: 'fr', x: 34.0, z: 32.0, rotY: 0, hand: -1 },
      { id: 'rr', x: 34.0, z: -32.0, rotY: 0, hand: 1 }
    ];
    let primaryMecanum = null;
    for (const w of wheelSpecs) {
      const mw = new MecanumWheelMotorComponent({
        id: `${this.id}_mecanum_${w.id}`,
        handedness: w.hand
      });
      mw.setPwm(180);
      mw.group.position.set(w.x, -4.0, w.z);
      mw.group.rotation.y = w.rotY;
      chassisWrapper.add(mw.group);
      this.mecanumWheels.push(mw);
      if (!primaryMecanum) primaryMecanum = mw;
    }

    const chAssembled = new THREE.Vector3(0, 6.0, 0);
    const chExploded = new THREE.Vector3(0, -30.0, 0);
    chassisWrapper.position.copy(chAssembled);
    g.add(chassisWrapper);
    this.partEntries.push({
      id: 'mecanum-chassis',
      component: primaryMecanum,
      wrapper: chassisWrapper,
      assembledPos: chAssembled,
      explodedPos: chExploded
    });

    // 2. INA219 Dual-18650 5V/4A Power Telemetry Bay (`power.ina219_buck_bay`)
    addLayer(
      'power-regulator',
      new Ina219PowerTelemetryBay({ id: `${this.id}_power` }),
      new THREE.Vector3(0, 9.2, -16.0),
      new THREE.Vector3(-54.0, -6.0, -28.0),
      0.92
    );

    // 3. NVIDIA Jetson Nano B01 SBC (`board.jetson_nano`)
    addLayer(
      'jetson-nano-sbc',
      new JetsonNanoBoard({ id: `${this.id}_jetson` }),
      new THREE.Vector3(0, 23.2, -6.0),
      new THREE.Vector3(0, 38.0, -14.0),
      0.92
    );

    // 4. 2-Axis Pan/Tilt Servo Gimbal Turret (`motor.pan_tilt_gimbal`)
    const gimbalEntry = addLayer(
      'pan-tilt-gimbal',
      new PanTiltCameraGimbalComponent({ id: `${this.id}_gimbal` }),
      new THREE.Vector3(0, 23.5, 28.0),
      new THREE.Vector3(0, 34.0, 52.0),
      1.0
    );
    this.gimbalComponent = gimbalEntry.component;

    // 5. Sony IMX219 8MP 160° Wide-Angle CSI-2 Camera + FOV Cone (`sensor.imx219_csi`)
    const camComp = new Imx219CsiCameraModule({ id: `${this.id}_imx219` });
    const fovCone = camComp.createFovFrustumGroup({ length: 30, radius: 13 });
    fovCone.position.set(0, 12.0, 14.0);
    camComp.group.add(fovCone);
    this.fovFrustumGroup = fovCone;

    const camEntry = addLayer(
      'imx219-camera',
      camComp,
      new THREE.Vector3(0, 39.5, 26.0),
      new THREE.Vector3(0, 62.0, 86.0),
      1.0
    );
    this.cameraWrapper = camEntry.wrapper;

    // 6. MIPI CSI-2 15-Pin Ribbon Cable & I2C Bus (`robotics.csi_ribbon_harness`)
    addLayer(
      'csi-ribbon',
      new CsiRibbonHarnessComponent({ id: `${this.id}_csi_ribbon` }),
      new THREE.Vector3(24.0, 24.0, 4.0),
      new THREE.Vector3(56.0, 36.0, 12.0),
      1.0
    );

    // 7. VL53L1X Laser Time-of-Flight Distance Sensor (`sensor.vl53l1x_tof`)
    addLayer(
      'lidar-tof',
      new Vl53l1xLaserTofComponent({ id: `${this.id}_tof` }),
      new THREE.Vector3(0, 10.5, 48.0),
      new THREE.Vector3(0, 4.0, 94.0),
      1.15
    );

    // 8. 0.96" SSD1306 I2C OLED Telemetry Screen (`display.ssd1306_oled`)
    addLayer(
      'oled-telemetry',
      new Ssd1306OledDisplayComponent({ id: `${this.id}_oled` }),
      new THREE.Vector3(0, 25.5, -40.0),
      new THREE.Vector3(48.0, 46.0, -54.0),
      1.05
    );

    this.definePin('VCC', new THREE.Vector3(-18.0, 23.2, -6.0), {
      direction: 'IN',
      role: 'VCC_IN',
      protocol: 'DC'
    });
    this.definePin('GND', new THREE.Vector3(18.0, 23.2, -6.0), {
      direction: 'IN',
      role: 'GND_IN',
      protocol: 'DC'
    });
  }

  /**
   * Articulates the Pan/Tilt gimbal and camera head in radians.
   * @param {number} panRad
   * @param {number} tiltRad
   */
  setCameraPanTilt(panRad, tiltRad) {
    if (this.gimbalComponent) {
      this.gimbalComponent.setPanTiltRadians(panRad, tiltRad);
    }
    if (this.cameraWrapper) {
      this.cameraWrapper.rotation.y = panRad;
      this.cameraWrapper.rotation.x = tiltRad;
    }
  }

  update(dt) {
    for (const mw of this.mecanumWheels) {
      mw.update(dt);
    }
  }
}
