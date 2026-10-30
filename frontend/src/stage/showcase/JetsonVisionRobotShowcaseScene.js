import * as THREE from 'three';
import { ComponentRegistry } from '../../core/registry/ComponentRegistry.js';
import { registerAllHardware } from '../../hardware/registerAllHardware.js';
import { PcbMaterialFactory } from '../../hardware/primitives/PcbMaterialFactory.js';
import { box, cyl } from '../../hardware/primitives/GeometryHelpers.js';

/**
 * 8-Layer CAD Bill of Materials (BOM) for the NVIDIA Jetson Nano Vision Camera Rover.
 * Every sub-assembly maps directly to a registered `HardwareComponent` subclass
 * in `ComponentRegistry` so the exact same 3D components power both the Landing
 * Showcase and the 3D Spatial Hardware Workbench.
 */
export const JETSON_SUB_ASSEMBLIES = Object.freeze([
  {
    id: 'mecanum_wheels_left',
    code: 'JET-01 · MEC-DRV-L',
    componentTypeId: 'motor.mecanum_wheel',
    name: {
      tr: 'Sol Çift 45° Omnidireksiyonel Mecanum Tekerlek ve Enkoder Motor',
      en: 'Left Twin 45° Omnidirectional Mecanum Wheels & Encoder Motors'
    },
    spec: {
      tr: '9x kauçuk 45° diyagonal makaralı holonomik tekerlek, CNC alüminyum göbek ve 12V enkoderli motor.',
      en: '9x rubber 45° diagonal-roller holonomic wheel, CNC aluminum hub, and 12V quadrature encoder motor.'
    },
    assembledPos: { x: -16.5, y: 4.8, z: 0 },
    explodedPos: { x: -42.0, y: 4.8, z: 0 }
  },
  {
    id: 'mecanum_wheels_right',
    code: 'JET-02 · MEC-DRV-R',
    componentTypeId: 'motor.mecanum_wheel',
    name: {
      tr: 'Sağ Çift 45° Omnidireksiyonel Mecanum Tekerlek ve Enkoder Motor',
      en: 'Right Twin 45° Omnidirectional Mecanum Wheels & Encoder Motors'
    },
    spec: {
      tr: '360° yanal kayma (strafe) ve yerinde dönüş sağlayan bağımsız holonomik tahrik grubu.',
      en: 'Independent holonomic vector drive group enabling 360° lateral strafe and zero-radius rotation.'
    },
    assembledPos: { x: 16.5, y: 4.8, z: 0 },
    explodedPos: { x: 42.0, y: 4.8, z: 0 }
  },
  {
    id: 'rover_chassis_deck',
    code: 'JET-03 · ROVER-DECK',
    componentTypeId: 'robotics.jetson_rover_chassis',
    name: {
      tr: 'Çift Katmanlı Karbon-Alüminyum Holonomik Rover Şasi Gövdesi',
      en: 'Twin-Deck Carbon-Aluminum Holonomic Rover Chassis Frame'
    },
    spec: {
      tr: 'CNC işlenmiş alüminyum yan raylar, karbon-fiber üst güverte ve M3 altın eloksallı yükseltici kolonlar.',
      en: 'CNC-milled aluminum side rails, carbon-fiber upper deck, and M3 gold-anodized standoff pillars.'
    },
    assembledPos: { x: 0, y: 5.2, z: 0 },
    explodedPos: { x: 0, y: -11.0, z: 0 }
  },
  {
    id: 'power_buck_bay',
    code: 'JET-04 · INA219-5V4A',
    componentTypeId: 'power.ina219_buck_bay',
    name: {
      tr: '5V 4A Senkron Buck Regülatör + INA219 I²C Güç Telemetri Ünitesi',
      en: '5V 4A Synchronous Buck Regulator + INA219 I²C Power Telemetry Bay'
    },
    spec: {
      tr: 'Toroid bakır sargılı indüktör, 0.1Ω R100 Kelvin akım şöntü, INA219 I²C telemetri ve çift 18650 hücre.',
      en: 'Toroid copper-wound inductor, 0.1Ω R100 Kelvin current shunt, INA219 I²C telemetry, and dual 18650 cells.'
    },
    assembledPos: { x: 0, y: 7.6, z: -8.5 },
    explodedPos: { x: 0, y: 12.0, z: -36.0 }
  },
  {
    id: 'jetson_nano_sbc',
    code: 'JET-05 · JETSON-B01',
    componentTypeId: 'board.jetson_nano',
    name: {
      tr: 'NVIDIA Jetson Nano B01 (128-Core Maxwell GPU + Dev Soğutucu Blok)',
      en: 'NVIDIA Jetson Nano B01 (128-Core Maxwell GPU + Tall Finned Heatsink)'
    },
    spec: {
      tr: '472 GFLOPS AI başarımı, 4GB LPDDR4, 260-pin SO-DIMM SOM, 40-pin J41 GPIO ve çift MIPI CSI-2 kamera portu.',
      en: '472 GFLOPS AI compute, 4GB LPDDR4, 260-pin SO-DIMM SOM, 40-pin J41 GPIO, and dual MIPI CSI-2 camera ports.'
    },
    assembledPos: { x: 0, y: 10.6, z: -1.0 },
    explodedPos: { x: 0, y: 20.5, z: -4.0 }
  },
  {
    id: 'csi_ribbon_harness',
    code: 'JET-06 · MIPI-CSI2',
    componentTypeId: 'robotics.csi_ribbon_harness',
    name: {
      tr: '15-Pin MIPI CSI-2 Yüksek Hızlı Esnek Kamera Şerit Kablosu (FPC)',
      en: '15-Pin MIPI CSI-2 High-Speed Flexible Camera Ribbon Harness (FPC)'
    },
    spec: {
      tr: '2-Lane MIPI CSI-2 diferansiyel hatlar, altın kaplama kontak uçlar ve EMI ekranlı poliimid esnek şerit.',
      en: '2-Lane MIPI CSI-2 differential lanes, gold-plated edge fingers, and EMI-shielded polyimide flex ribbon.'
    },
    assembledPos: { x: -4.2, y: 14.0, z: 3.8 },
    explodedPos: { x: -24.0, y: 24.5, z: 12.0 }
  },
  {
    id: 'camera_gimbal_mast',
    code: 'JET-07 · IMX219-GIMBAL',
    componentTypeId: 'sensor.imx219_csi',
    name: {
      tr: 'Sony IMX219 8MP 160° Kamera + 2 Eksenli Pan/Tilt Servo Gimbal Kulesi',
      en: 'Sony IMX219 8MP 160° Camera + 2-Axis Pan/Tilt Servo Gimbal Mast'
    },
    spec: {
      tr: 'Sony IMX219PQ CMOS sensör, 6 katmanlı M12 geniş açı optik mercek ve çift MG90S Pan/Tilt servo kulesi.',
      en: 'Sony IMX219PQ CMOS sensor, 6-element M12 wide-angle optical lens, and dual MG90S Pan/Tilt servo turret.'
    },
    assembledPos: { x: 0, y: 15.8, z: 6.5 },
    explodedPos: { x: 0, y: 34.0, z: 18.0 }
  },
  {
    id: 'front_tof_oled_bumper',
    code: 'JET-08 · TOF-OLED-HUD',
    componentTypeId: 'sensor.vl53l1x_tof',
    name: {
      tr: 'VL53L1X Lazer ToF Mesafe Radarı + 0.96" SSD1306 I²C OLED Telemetri',
      en: 'VL53L1X Laser ToF Rangefinder + 0.96" SSD1306 I²C OLED Telemetry'
    },
    spec: {
      tr: '940nm VCSEL SPAD lazer mesafe sensörü (400cm) ve canlı FPS/voltaj gösteren 128x64 I²C OLED ekran.',
      en: '940nm VCSEL SPAD laser rangefinder (400cm) and 128x64 I²C OLED display showing live FPS and rail voltage.'
    },
    assembledPos: { x: 0, y: 8.5, z: 14.8 },
    explodedPos: { x: 0, y: 6.0, z: 42.0 }
  }
]);

/**
 * JetsonVisionRobotShowcaseScene — Dedicated 3D Stage for the NVIDIA Jetson Nano Vision Camera Rover.
 *
 * Every single sub-assembly is instantiated from registered `HardwareComponent` subclasses
 * in `ComponentRegistry` (`JetsonNanoBoard`, `Imx219CsiCameraModule`, `PanTiltCameraGimbalComponent`,
 * `MecanumWheelMotorComponent`, `Ina219PowerTelemetryBay`, `Vl53l1xLaserTofComponent`,
 * `Ssd1306OledDisplayComponent`, `MecanumRoverChassisDeckComponent`, `CsiRibbonHarnessComponent`),
 * ensuring identical 3D craft across the Landing Showcase and the Spatial Hardware Workbench.
 */
export class JetsonVisionRobotShowcaseScene {
  /**
   * @param {object} [opts]
   * @param {HTMLCanvasElement|null} [opts.canvas]
   * @param {boolean} [opts.autoTrack=true]
   */
  constructor(opts = {}) {
    // Isolate showcase sub-assemblies in their own ComponentRegistry so they never pollute
    // the Workbench stage's singleton hardwareRegistry (preventing ghost pins & off-scene raycast intercepts).
    this.registry = opts.registry || new ComponentRegistry();
    registerAllHardware(this.registry);

    this.canvas = opts.canvas || null;
    this.autoTracking = opts.autoTrack !== undefined ? Boolean(opts.autoTrack) : true;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(36, 16 / 10, 0.5, 600);
    this.camera.position.set(74, 52, 92);
    this.camera.lookAt(0, 11, 3);

    this.renderer = null;

    this.roverGroup = new THREE.Group();
    this.roverGroup.name = 'JetsonVisionRover_MasterAssembly';
    this.scene.add(this.roverGroup);

    /** @type {Map<string, THREE.Group>} */
    this.subAssemblyGroups = new Map();
    /** @type {Map<string, import('../../core/components/HardwareComponent.js').HardwareComponent>} */
    this.componentInstances = new Map();
    /** @type {import('../../hardware/motors/MecanumWheelMotorComponent.js').MecanumWheelMotorComponent[]} */
    this.mecanumWheelInstances = [];
    /** @type {Map<string, THREE.Line>} */
    this.explodeGuideLines = new Map();

    // Also instantiate the composite rover component for direct inspection/parity verification
    this.compositeRoverInstance = this.registry.create('robot.jetson_vision_rover', 'jetson_composite_ref');

    this.jetsonBoardInstance = null;
    this.cameraModuleInstance = null;
    this.gimbalInstance = null;
    this.panPivot = new THREE.Group();
    this.panPivot.name = 'JetsonGimbal_PanPivot';
    this.tiltPivot = new THREE.Group();
    this.tiltPivot.name = 'JetsonGimbal_TiltPivot';
    this.fovFrustumGroup = new THREE.Group();
    this.fovFrustumGroup.name = 'JetsonIMX219_OpticalFovFrustum';

    this.visionFrustumVisible = true;
    this.panAngleDeg = 0;
    this.tiltAngleDeg = -6;
    this.explodeProgress = 0;
    this._targetExplode = 0;
    this.selectedPartId = JETSON_SUB_ASSEMBLIES[0].id;
    this._scanPhase = 0;

    this._setupLightingAndCalibrationGrid();
    this._buildEightLayerModularJetsonRover();

    this.setExplodeProgress(0);
    this.setCameraPanTilt(0, -6);
    this.setVisionFrustumVisible(true);

    if (this.canvas) {
      this.attachCanvas(this.canvas);
    }
  }

  _setupLightingAndCalibrationGrid() {
    const ambient = new THREE.AmbientLight(0xe0f2fe, 0.96);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.65);
    keyLight.position.set(55, 85, 65);
    this.scene.add(keyLight);

    const cyanFill = new THREE.DirectionalLight(0x22d3ee, 0.85);
    cyanFill.position.set(-55, 42, 40);
    this.scene.add(cyanFill);

    const emeraldRim = new THREE.DirectionalLight(0x10b981, 0.62);
    emeraldRim.position.set(25, 35, -60);
    this.scene.add(emeraldRim);

    // Transparent Floating Calibration Halo & Optical Target Beacon (no opaque floor slab)
    this.stageFloorGroup = new THREE.Group();
    const gridAccentMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const targetAccentMat = PcbMaterialFactory.getEmissiveLed(0x10b981, 1.15);

    const outerCalibrationRing = new THREE.Mesh(
      new THREE.RingGeometry(42.0, 42.6, 64),
      gridAccentMat
    );
    outerCalibrationRing.rotation.x = -Math.PI / 2;
    outerCalibrationRing.position.y = 0.04;
    this.stageFloorGroup.add(outerCalibrationRing);

    // 3D Optical Calibration Target Beacon tracked by the Jetson Nano camera
    this.targetBeaconGroup = new THREE.Group();
    this.targetBeaconGroup.position.set(0, 12, 36);
    this.targetBeaconGroup.add(cyl(1.8, 1.8, 0.4, 24, targetAccentMat, 0, 0, 0));
    this.targetBeaconGroup.add(box(5.2, 0.35, 0.35, targetAccentMat, 0, 0, 0));
    this.targetBeaconGroup.add(box(0.35, 5.2, 0.35, targetAccentMat, 0, 0, 0));
    this.stageFloorGroup.add(this.targetBeaconGroup);

    this.scene.add(this.stageFloorGroup);
  }

  /**
   * Builds all 8 CAD sub-assemblies using real registered `HardwareComponent` instances
   * from `ComponentRegistry` (`hardwareRegistry`).
   */
  _buildEightLayerModularJetsonRover() {
    const guideLineMat = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.42
    });

    for (const sub of JETSON_SUB_ASSEMBLIES) {
      const layerGroup = new THREE.Group();
      layerGroup.name = `JetsonSubAssembly_${sub.id}`;
      layerGroup.userData = {
        subAssemblyId: sub.id,
        code: sub.code,
        componentTypeId: sub.componentTypeId
      };

      if (sub.id === 'mecanum_wheels_left') {
        const flWheel = this.registry.create('motor.mecanum_wheel', 'jetson_mecanum_fl', {
          side: 'left',
          handedness: 'A'
        });
        flWheel.group.scale.setScalar(0.42);
        flWheel.group.rotation.y = Math.PI;
        flWheel.group.position.set(0, 0, 8.2);
        layerGroup.add(flWheel.group);

        const rlWheel = this.registry.create('motor.mecanum_wheel', 'jetson_mecanum_rl', {
          side: 'left',
          handedness: 'B'
        });
        rlWheel.group.scale.setScalar(0.42);
        rlWheel.group.rotation.y = Math.PI;
        rlWheel.group.position.set(0, 0, -8.2);
        layerGroup.add(rlWheel.group);

        this.mecanumWheelInstances.push(flWheel, rlWheel);
        this.componentInstances.set(sub.id, flWheel);
      } else if (sub.id === 'mecanum_wheels_right') {
        const frWheel = this.registry.create('motor.mecanum_wheel', 'jetson_mecanum_fr', {
          side: 'right',
          handedness: 'B'
        });
        frWheel.group.scale.setScalar(0.42);
        frWheel.group.position.set(0, 0, 8.2);
        layerGroup.add(frWheel.group);

        const rrWheel = this.registry.create('motor.mecanum_wheel', 'jetson_mecanum_rr', {
          side: 'right',
          handedness: 'A'
        });
        rrWheel.group.scale.setScalar(0.42);
        rrWheel.group.position.set(0, 0, -8.2);
        layerGroup.add(rrWheel.group);

        this.mecanumWheelInstances.push(frWheel, rrWheel);
        this.componentInstances.set(sub.id, frWheel);
      } else if (sub.id === 'rover_chassis_deck') {
        const deckComp = this.registry.create('robotics.jetson_rover_chassis', 'jetson_rover_deck_1');
        deckComp.group.scale.setScalar(0.36);
        layerGroup.add(deckComp.group);
        this.componentInstances.set(sub.id, deckComp);
      } else if (sub.id === 'power_buck_bay') {
        const powerComp = this.registry.create('power.ina219_buck_bay', 'jetson_ina219_power_1');
        powerComp.group.scale.setScalar(0.38);
        layerGroup.add(powerComp.group);
        this.componentInstances.set(sub.id, powerComp);
      } else if (sub.id === 'jetson_nano_sbc') {
        const jetsonComp = this.registry.create('board.jetson_nano', 'jetson_nano_b01_main');
        jetsonComp.group.scale.setScalar(0.28);
        layerGroup.add(jetsonComp.group);
        this.jetsonBoardInstance = jetsonComp;
        this.componentInstances.set(sub.id, jetsonComp);
      } else if (sub.id === 'csi_ribbon_harness') {
        const ribbonComp = this.registry.create('robotics.csi_ribbon_harness', 'jetson_csi_ribbon_1');
        ribbonComp.group.scale.setScalar(0.36);
        layerGroup.add(ribbonComp.group);
        this.componentInstances.set(sub.id, ribbonComp);
      } else if (sub.id === 'camera_gimbal_mast') {
        const gimbalComp = this.registry.create('motor.pan_tilt_gimbal', 'jetson_pantilt_gimbal_1');
        gimbalComp.group.scale.setScalar(0.42);
        layerGroup.add(gimbalComp.group);
        this.gimbalInstance = gimbalComp;

        const imx219Comp = this.registry.create('sensor.imx219_csi', 'jetson_imx219_cam_1');
        imx219Comp.group.scale.setScalar(0.40);
        imx219Comp.group.position.set(0, 3.2, 1.4);
        this.cameraModuleInstance = imx219Comp;

        // Mount camera & 3D FOV frustum inside panPivot -> tiltPivot hierarchy
        this.panPivot.position.set(0, 2.2, 0);
        this.tiltPivot.position.set(0, 2.0, 0);
        this.tiltPivot.add(imx219Comp.group);

        // Build high-visibility 3D Optical FOV Frustum Cone & AI Detection Reticle
        this._buildOpticalFovFrustum();
        this.tiltPivot.add(this.fovFrustumGroup);
        this.panPivot.add(this.tiltPivot);
        layerGroup.add(this.panPivot);

        this.componentInstances.set(sub.id, imx219Comp);
        this.componentInstances.set('pan_tilt_gimbal', gimbalComp);
      } else if (sub.id === 'front_tof_oled_bumper') {
        const tofComp = this.registry.create('sensor.vl53l1x_tof', 'jetson_vl53l1x_tof_1');
        tofComp.group.scale.setScalar(0.42);
        tofComp.group.position.set(-4.6, 0, 0);
        layerGroup.add(tofComp.group);

        const oledComp = this.registry.create('display.ssd1306_oled', 'jetson_ssd1306_oled_1');
        oledComp.group.scale.setScalar(0.42);
        oledComp.group.position.set(4.6, 0.8, -0.8);
        layerGroup.add(oledComp.group);

        this.componentInstances.set(sub.id, tofComp);
        this.componentInstances.set('ssd1306_oled_hud', oledComp);
      }

      layerGroup.position.set(sub.assembledPos.x, sub.assembledPos.y, sub.assembledPos.z);
      this.subAssemblyGroups.set(sub.id, layerGroup);
      this.roverGroup.add(layerGroup);

      // CAD Explode trajectory guide line
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(sub.assembledPos.x, sub.assembledPos.y, sub.assembledPos.z),
        new THREE.Vector3(sub.assembledPos.x, sub.assembledPos.y, sub.assembledPos.z)
      ]);
      const line = new THREE.Line(lineGeo, guideLineMat);
      line.visible = false;
      this.explodeGuideLines.set(sub.id, line);
      this.roverGroup.add(line);
    }
  }

  _buildOpticalFovFrustum() {
    const frustumMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // 160° Wide-angle optical cone projecting forward (+Z) from the IMX219 M12 lens
    const coneLength = 20;
    const coneRadius = 8.4;
    const coneGeo = new THREE.ConeGeometry(coneRadius, coneLength, 32, 1, true);
    const coneMesh = new THREE.Mesh(coneGeo, frustumMat);
    coneMesh.rotation.x = -Math.PI / 2;
    coneMesh.position.set(0, 3.2, 2.0 + coneLength / 2);
    this.fovFrustumGroup.add(coneMesh);

    // TensorRT Object Detection Bounding Box Reticle at far end of frustum
    const reticleMat = PcbMaterialFactory.getEmissiveLed(0x10b981, 1.3);
    const rW = 9.6;
    const rH = 6.8;
    const rZ = 2.0 + coneLength;
    const rY = 3.2;
    this.fovFrustumGroup.add(box(rW, 0.25, 0.25, reticleMat, 0, rY + rH / 2, rZ));
    this.fovFrustumGroup.add(box(rW, 0.25, 0.25, reticleMat, 0, rY - rH / 2, rZ));
    this.fovFrustumGroup.add(box(0.25, rH, 0.25, reticleMat, -rW / 2, rY, rZ));
    this.fovFrustumGroup.add(box(0.25, rH, 0.25, reticleMat, rW / 2, rY, rZ));
  }

  /**
   * Sets the 2-Axis Pan/Tilt Servo Gimbal angles in degrees (`panDeg` in `[-60, 60]`, `tiltDeg` in `[-25, 30]`).
   * @param {number} panDeg
   * @param {number} tiltDeg
   */
  setCameraPanTilt(panDeg, tiltDeg) {
    this.panAngleDeg = Math.max(-60, Math.min(60, Number(panDeg) || 0));
    this.tiltAngleDeg = Math.max(-25, Math.min(30, Number(tiltDeg) || 0));

    this.panPivot.rotation.y = THREE.MathUtils.degToRad(this.panAngleDeg);
    this.tiltPivot.rotation.x = THREE.MathUtils.degToRad(this.tiltAngleDeg);

    if (this.gimbalInstance) {
      this.gimbalInstance.updateState({
        panAngle: this.panAngleDeg,
        tiltAngle: this.tiltAngleDeg
      });
    }

    this._renderFrame();
    return this.getTelemetry();
  }

  /**
   * Toggles the visibility of the 3D Optical FOV Vision Frustum Cone.
   * @param {boolean} visible
   */
  setVisionFrustumVisible(visible) {
    this.visionFrustumVisible = Boolean(visible);
    this.fovFrustumGroup.visible = this.visionFrustumVisible;
    if (this.cameraModuleInstance) {
      this.cameraModuleInstance.updateState({ fovVisible: this.visionFrustumVisible });
    }
    this._renderFrame();
    return this.getTelemetry();
  }

  /**
   * Enables or disables automatic target-tracking gimbal scan.
   * @param {boolean} enabled
   */
  setAutoTracking(enabled) {
    this.autoTracking = Boolean(enabled);
    return this.getTelemetry();
  }

  /**
   * Sets the normalized 8-layer CAD Exploded View factor (`0..1`).
   * @param {number} progress
   */
  setExplodeProgress(progress) {
    const e = Math.max(0, Math.min(1, Number(progress) || 0));
    this.explodeProgress = e;

    for (const sub of JETSON_SUB_ASSEMBLIES) {
      const grp = this.subAssemblyGroups.get(sub.id);
      if (!grp) continue;

      const x = THREE.MathUtils.lerp(sub.assembledPos.x, sub.explodedPos.x, e);
      const y = THREE.MathUtils.lerp(sub.assembledPos.y, sub.explodedPos.y, e);
      const z = THREE.MathUtils.lerp(sub.assembledPos.z, sub.explodedPos.z, e);
      grp.position.set(x, y, z);

      const line = this.explodeGuideLines.get(sub.id);
      if (line) {
        line.visible = e > 0.02;
        const posAttr = line.geometry.attributes.position;
        if (posAttr) {
          posAttr.setXYZ(0, sub.assembledPos.x, sub.assembledPos.y, sub.assembledPos.z);
          posAttr.setXYZ(1, x, y, z);
          posAttr.needsUpdate = true;
        }
      }
    }

    if (this.compositeRoverInstance) {
      this.compositeRoverInstance.setExplodeFactor(e);
    }

    this._updateCameraFraming();
    this._renderFrame();
    return this.getTelemetry();
  }

  /**
   * Dynamically adjusts the perspective camera position and target so both the
   * assembled Jetson Vision Rover (+ 3D optical FOV cone) and the 8-layer CAD
   * exploded state (`0..100%`) fit cleanly inside the stage viewport.
   */
  _updateCameraFraming() {
    if (!this.camera) return;
    const e = this.explodeProgress || 0;
    const aspect = this.camera.aspect || 1.6;
    const aspectPullback = aspect < 1.55 ? 1.55 / Math.max(0.75, aspect) : 1.0;

    const camX = THREE.MathUtils.lerp(76, 124, e) * aspectPullback;
    const camY = THREE.MathUtils.lerp(52, 84, e) * aspectPullback;
    const camZ = THREE.MathUtils.lerp(94, 154, e) * aspectPullback;

    this.camera.position.set(camX, camY, camZ);

    const lookY = THREE.MathUtils.lerp(9.5, 10.0, e);
    const lookZ = THREE.MathUtils.lerp(4.0, 5.0, e);
    this.camera.lookAt(0, lookY, lookZ);
    this.camera.updateMatrixWorld();
  }

  /**
   * Highlights a key marketing feature on hover and gently separates the CAD layers
   * so the user can inspect the internal hardware in real time.
   * @param {string} partId
   * @param {number} [explodeTarget=0.45]
   */
  setHoveredFeature(partId, explodeTarget = 0.45) {
    this._targetExplode = Math.max(0, Math.min(1, Number(explodeTarget) || 0.45));
    return this.selectSubAssembly(partId);
  }

  /**
   * Clears feature hover state and smoothly returns the rover to its assembled posture.
   */
  clearHoveredFeature() {
    this._targetExplode = 0;
    for (const [id, grp] of this.subAssemblyGroups.entries()) {
      const comp = this.componentInstances.get(id);
      if (comp && typeof comp.setHovered === 'function') {
        comp.setHovered(false);
      }
      grp.scale.setScalar(1.0);
    }
    this._renderFrame();
  }

  /**
   * Selects one of the 8 CAD sub-assemblies and highlights its 3D layer.
   * @param {string} partId
   */
  selectSubAssembly(partId) {
    const found = JETSON_SUB_ASSEMBLIES.find((p) => p.id === partId) || JETSON_SUB_ASSEMBLIES[0];
    this.selectedPartId = found.id;

    for (const [id, grp] of this.subAssemblyGroups.entries()) {
      const isSelected = id === found.id;
      const comp = this.componentInstances.get(id);
      if (comp && typeof comp.setHovered === 'function') {
        comp.setHovered(isSelected);
      }
      grp.scale.setScalar(isSelected ? 1.05 : 1.0);
    }

    this._renderFrame();
    return found;
  }

  getTelemetry() {
    return {
      explodeProgress: this.explodeProgress,
      panAngleDeg: this.panAngleDeg,
      tiltAngleDeg: this.tiltAngleDeg,
      visionFrustumVisible: this.visionFrustumVisible,
      autoTracking: this.autoTracking,
      selectedPartId: this.selectedPartId
    };
  }

  /**
   * Advances autonomous pan/tilt target tracking, Mecanum roller rotation, smooth hover explode transitions, and WebGL rendering.
   * @param {number} [dt=0.016]
   */
  tick(dt = 0.016) {
    const safeDt = Math.min(0.1, Math.max(0.001, Number(dt) || 0.016));
    this._scanPhase += safeDt * 1.45;

    // Gentle orbital showcase sway
    this.roverGroup.rotation.y = Math.sin(this._scanPhase * 0.28) * 0.22;

    if (typeof this._targetExplode === 'number') {
      const diff = this._targetExplode - this.explodeProgress;
      if (Math.abs(diff) > 0.003) {
        this.setExplodeProgress(this.explodeProgress + diff * Math.min(1, safeDt * 7.5));
      } else if (Math.abs(diff) > 0) {
        this.setExplodeProgress(this._targetExplode);
      }
    }

    if (this.autoTracking) {
      const nextPan = Math.sin(this._scanPhase) * 34;
      const nextTilt = -6 + Math.cos(this._scanPhase * 1.3) * 11;
      this.setCameraPanTilt(nextPan, nextTilt);

      if (this.targetBeaconGroup) {
        this.targetBeaconGroup.position.x = Math.sin(this._scanPhase) * 18;
        this.targetBeaconGroup.position.y = 12 + Math.cos(this._scanPhase * 1.3) * 4.5;
      }
    }

    for (const wheel of this.mecanumWheelInstances) {
      wheel.updateState({ rpm: 90, direction: 1 });
      wheel.tick(safeDt);
    }

    this._renderFrame();
    return this.getTelemetry();
  }

  /**
   * Exports a complete, runnable 3D Spatial Hardware Workbench project containing the
   * exact registered `HardwareComponent` modules used in this Jetson Nano Vision Rover scene.
   */
  getWorkbenchProject() {
    return {
      id: 'showcase-jetson-vision-rover-v1',
      title: 'NVIDIA Jetson Nano AI Camera Rover (IMX219 CSI-2 + 2-Axis Gimbal + VL53L1X ToF)',
      description:
        'NVIDIA Jetson Nano B01 (128-Core Maxwell GPU), Sony IMX219 8MP 160° MIPI CSI-2 kamera, 2 eksenli Pan/Tilt servo gimbal, VL53L1X lazer ToF ve SSD1306 I²C OLED telemetri devresi.',
      board_type: 'board.jetson_nano',
      circuit_json: {
        version: '2.0',
        id: 'scenario.showcase_jetson_rover',
        mode: 'freeform',
        meta: {
          title: 'NVIDIA Jetson Nano AI Camera Rover (IMX219 CSI-2 + 2-Axis Gimbal + VL53L1X ToF)'
        },
        customComponents: [
          {
            typeId: 'sensor.imx219_csi_camera',
            name: 'Sony IMX219 8MP 160° MIPI CSI-2 Camera Module',
            category: 'sensors',
            packageType: 'breakout',
            bodyColor: 0x0f766e,
            dimensions: [25, 16, 24],
            pins: [
              { name: 'VCC', type: 'power', offset: [-4, -2, 6] },
              { name: 'SDA', type: 'digital', offset: [0, -2, 6] },
              { name: 'GND', type: 'ground', offset: [4, -2, 6] }
            ],
            internalDipoles: [
              { id: 'IMX219_LOAD', pinA: 'VCC', pinB: 'GND', resistanceOhms: 680 }
            ]
          }
        ],
        boards: [
          {
            id: 'jetson_main',
            typeId: 'board.jetson_nano',
            position: [-38, 0, 0]
          }
        ],
        components: [
          {
            id: 'cam_imx219',
            typeId: 'sensor.imx219_csi',
            position: [8, 5.2, -16],
            state: { streaming: true, fovVisible: true, fps: 60 }
          },
          {
            id: 'gimbal_turret',
            typeId: 'motor.pan_tilt_gimbal',
            position: [8, 5.2, 4],
            state: { panAngle: 25, tiltAngle: -8 }
          },
          {
            id: 'tof_front',
            typeId: 'sensor.vl53l1x_tof',
            position: [32, 5.2, -14],
            state: { distanceMm: 420 }
          },
          {
            id: 'oled_hud',
            typeId: 'display.ssd1306_oled',
            position: [32, 5.2, 6],
            state: { fps: 60, targetLocked: true }
          },
          {
            id: 'power_ina219',
            typeId: 'power.ina219_buck_bay',
            position: [32, 5.2, 22],
            state: { voltageV: 5.08, currentA: 2.45 }
          }
        ],
        connections: [
          { id: 'jw1', from: 'jetson_main.I2C1_SDA_PIN3', to: 'cam_imx219.SDA', color: '#22d3ee' },
          { id: 'jw2', from: 'jetson_main.PWM_PIN32', to: 'gimbal_turret.SIGNAL', color: '#f59e0b' },
          { id: 'jw3', from: 'jetson_main.PWM_PIN33', to: 'gimbal_turret.TILT_PWM', color: '#f59e0b' },
          { id: 'jw4', from: 'jetson_main.I2C1_SDA_PIN3', to: 'tof_front.SDA', color: '#10b981' },
          { id: 'jw5', from: 'jetson_main.I2C1_SCL_PIN5', to: 'oled_hud.SCL', color: '#38bdf8' },
          { id: 'jw6', from: 'jetson_main.3V3', to: 'cam_imx219.VCC', color: '#ef4444' },
          { id: 'jw7', from: 'cam_imx219.GND', to: 'jetson_main.GND', color: '#64748b' },
          { id: 'jw8', from: 'jetson_main.5V', to: 'gimbal_turret.VCC', color: '#ef4444' },
          { id: 'jw9', from: 'gimbal_turret.GND', to: 'jetson_main.GND', color: '#64748b' },
          { id: 'jw10', from: 'jetson_main.3V3', to: 'tof_front.VCC', color: '#ef4444' },
          { id: 'jw11', from: 'tof_front.GND', to: 'jetson_main.GND', color: '#64748b' },
          { id: 'jw12', from: 'jetson_main.3V3', to: 'oled_hud.VCC', color: '#ef4444' },
          { id: 'jw13', from: 'oled_hud.GND', to: 'jetson_main.GND', color: '#64748b' },
          { id: 'jw14', from: 'power_ina219.GND', to: 'jetson_main.GND', color: '#64748b' }
        ]
      },
      code: `# NVIDIA Jetson Nano B01 — TensorRT + GStreamer IMX219 CSI-2 Vision Tracker
import time

CSI_PIPELINE = (
    "nvarguscamerasrc sensor-id=0 ! "
    "video/x-raw(memory:NVMM), width=1280, height=720, framerate=60/1 ! "
    "nvvidconv ! video/x-raw, format=BGRx ! videoconvert ! appsink"
)

def track_horizon_beacon(pan_deg: float, tilt_deg: float):
    print(f"[TensorRT FP16] IMX219 60FPS lock -> Pan={pan_deg:+.1f} deg, Tilt={tilt_deg:+.1f} deg")

if __name__ == "__main__":
    track_horizon_beacon(24.0, -6.0)
`
    };
  }

  attachCanvas(canvasEl) {
    this.canvas = canvasEl;
    if (!this.canvas || typeof window === 'undefined') return;
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.resize();
      this._renderFrame();
    } catch {
      this.renderer = null;
    }
  }

  resize() {
    if (!this.canvas || !this.renderer) return;
    const width = this.canvas.clientWidth || this.canvas.parentElement?.clientWidth || 720;
    const height = this.canvas.clientHeight || this.canvas.parentElement?.clientHeight || 460;
    this.camera.aspect = Math.max(0.5, width / Math.max(1, height));
    this.camera.updateProjectionMatrix();
    this._updateCameraFraming();
    this.renderer.setSize(width, height, false);
    this._renderFrame();
  }

  _renderFrame() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  destroy() {
    if (this.registry && typeof this.registry.clearInstances === 'function') {
      this.registry.clearInstances(true);
    }
    if (this.scene) {
      this.scene.clear();
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
