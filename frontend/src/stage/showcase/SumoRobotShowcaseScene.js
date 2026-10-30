import * as THREE from 'three';
import { ComponentRegistry } from '../../core/registry/ComponentRegistry.js';
import { registerAllHardware } from '../../hardware/registerAllHardware.js';
import { PcbMaterialFactory } from '../../hardware/primitives/PcbMaterialFactory.js';
import { box, cyl } from '../../hardware/primitives/GeometryHelpers.js';

export const SUMO_APPROACH_START = Object.freeze({ x: -28, y: 0, z: -115 });
export const SUMO_STAGE_CENTER = Object.freeze({ x: 0, y: 0, z: 0 });

/**
 * 8-Layer CAD Bill of Materials (BOM) for the Autonomous Mini-Sumo Robot.
 * Every sub-assembly maps directly to a registered `HardwareComponent` subclass
 * in `ComponentRegistry` so the exact same 3D components power both the Landing
 * Showcase and the 3D Spatial Hardware Workbench.
 */
export const SUMO_SUB_ASSEMBLIES = Object.freeze([
  {
    id: 'front_wedge',
    code: 'SUB-01 · DOZER-ST37',
    componentTypeId: 'robotics.sumo_dozer_blade',
    name: {
      tr: '22° Sertleştirilmiş Çelik Dozer Bıçağı + TCRT5000 Dizisi',
      en: '22° Hardened Steel Dozer Wedge + TCRT5000 Line Array'
    },
    spec: {
      tr: 'CNC bükümlü 3mm ST-37 çelik rampa, tungsten karbür kesici uç ve 3x TCRT5000 IR sınır sensörü.',
      en: 'CNC-bent 3mm ST-37 steel plow, tungsten carbideground lip, and 3x TCRT5000 IR ring boundary sensors.'
    },
    assembledPos: { x: 0, y: 2.2, z: 16.8 },
    explodedPos: { x: 0, y: -3.5, z: 46.0 }
  },
  {
    id: 'chassis_base',
    code: 'SUB-02 · AL6061-BASE',
    componentTypeId: 'robotics.sumo_chassis_plate',
    name: {
      tr: 'CNC 6061-T6 Eloksallı Alüminyum Ana Şasi Plakası',
      en: 'CNC 6061-T6 Anodized Aluminum Main Chassis Plate'
    },
    spec: {
      tr: '4mm mat siyah eloksallı alüminyum gövde, M3 pirinç yükselticiler ve neodimyum vakum mıknatısları.',
      en: '4mm matte black anodized aluminum deck, M3 brass standoffs, and underbody neodymium downforce magnets.'
    },
    assembledPos: { x: 0, y: 3.0, z: 0 },
    explodedPos: { x: 0, y: -12.0, z: 0 }
  },
  {
    id: 'drive_motors_left',
    code: 'SUB-03 · N20-DRV-L',
    componentTypeId: 'motor.n20_gearmotor',
    name: {
      tr: 'Sol İkiz N20 600RPM Metal Redüktörlü Motor + Silikon Tekerlek',
      en: 'Left Twin N20 600RPM Metal Gearmotors + Silicone Wheels'
    },
    spec: {
      tr: '12V 600RPM tam metal dişli kutusu, pirinç pinyon ve 40 Shore-A yüksek tutuşlu silikon lastikler.',
      en: '12V 600RPM all-metal spur gearbox, brass pinion, and 40 Shore-A high-traction silicone tires.'
    },
    assembledPos: { x: -15.5, y: 4.5, z: 0 },
    explodedPos: { x: -42.0, y: 4.5, z: 0 }
  },
  {
    id: 'drive_motors_right',
    code: 'SUB-04 · N20-DRV-R',
    componentTypeId: 'motor.n20_gearmotor',
    name: {
      tr: 'Sağ İkiz N20 600RPM Metal Redüktörlü Motor + Silikon Tekerlek',
      en: 'Right Twin N20 600RPM Metal Gearmotors + Silicone Wheels'
    },
    spec: {
      tr: 'Bağımsız PWM diferansiyel sürüş ve 7 pinli manyetik enkoder geri beslemesi.',
      en: 'Independent PWM differential tank drive with 7-pin magnetic quadrature encoder feedback.'
    },
    assembledPos: { x: 15.5, y: 4.5, z: 0 },
    explodedPos: { x: 42.0, y: 4.5, z: 0 }
  },
  {
    id: 'motor_driver',
    code: 'SUB-05 · L298N-HBRG',
    componentTypeId: 'driver.l298n_dual',
    name: {
      tr: 'L298N Çift H-Köprü 2A Motor Sürücü ve Soğutucu Katmanı',
      en: 'L298N Dual H-Bridge 2A Motor Driver & Heatsink Stage'
    },
    spec: {
      tr: 'Multiwatt-15 L298N güç katı, eloksallı alüminyum soğutucu, 8x hızlı schottky diyot ve 35V kapasitörler.',
      en: 'Multiwatt-15 L298N power stage, anodized aluminum heatsink, 8x fast schottky diodes, and 35V bulk caps.'
    },
    assembledPos: { x: 0, y: 7.2, z: -2.8 },
    explodedPos: { x: 0, y: 15.5, z: -22.0 }
  },
  {
    id: 'mcu_controller',
    code: 'SUB-06 · UNO-R3-MCU',
    componentTypeId: 'board.arduino_uno',
    name: {
      tr: 'Arduino Uno R3 (ATmega328P) Otonom Karar Denetleyicisi',
      en: 'Arduino Uno R3 (ATmega328P) Autonomous Decision MCU'
    },
    spec: {
      tr: '16MHz ATmega328P gerçek donanım kartı; ultrasonik hedef kilitleme ve sınır kaçış durum makinesi.',
      en: '16MHz ATmega328P real hardware board running ultrasonic target lock and ring-edge evasion state machine.'
    },
    assembledPos: { x: 0, y: 11.4, z: 1.2 },
    explodedPos: { x: 0, y: 31.0, z: 4.0 }
  },
  {
    id: 'lipo_battery',
    code: 'SUB-07 · LIPO-3S-11V1',
    componentTypeId: 'power.lipo_3s_1300mah',
    name: {
      tr: '3S 11.1V 1300mAh 45C Yüksek Deşarjlı LiPo Güç Paketi',
      en: '3S 11.1V 1300mAh 45C High-Discharge LiPo Power Pack'
    },
    spec: {
      tr: 'XT60 yüksek akım konnektörü, JST-XH 4-pin balans portu ve silikon güç kabloları.',
      en: 'XT60 high-current discharge plug, JST-XH 4-pin balance lead, and 14AWG silicone power harness.'
    },
    assembledPos: { x: 0, y: 8.4, z: -11.5 },
    explodedPos: { x: 0, y: 20.0, z: -42.0 }
  },
  {
    id: 'sensor_armor_head',
    code: 'SUB-08 · SONAR-ARMOR',
    componentTypeId: 'robotics.sumo_armor_hood',
    name: {
      tr: 'HC-SR04 Ultrasonik Radar + Karbon-Fiber Üst Zırh Kalkanı',
      en: 'HC-SR04 Ultrasonic Radar + Carbon-Fiber Top Armor Hood'
    },
    spec: {
      tr: '40kHz çift transdüserli HC-SR04 mesafe radarı, CNC karbon-fiber zırh kabuğu ve 5 sn maç başlatma modülü.',
      en: '40kHz dual-transducer HC-SR04 sonar radar, CNC carbon-fiber armor hood, and 5s match start module.'
    },
    assembledPos: { x: 0, y: 14.2, z: 5.5 },
    explodedPos: { x: 0, y: 45.0, z: 14.0 }
  }
]);

/**
 * SumoRobotShowcaseScene — High-Craft 3D Scene for the Autonomous Mini-Sumo Robot.
 *
 * Every sub-assembly is built from registered `HardwareComponent` subclasses in
 * `ComponentRegistry`, ensuring visual parity and 1-to-1 reusability between the
 * Landing Showcase and the 3D Spatial Hardware Workbench.
 */
export class SumoRobotShowcaseScene {
  /**
   * @param {object} [opts]
   * @param {HTMLCanvasElement|null} [opts.canvas]
   * @param {boolean} [opts.autoPlay=true]
   */
  constructor(opts = {}) {
    // Isolate showcase sub-assemblies in their own ComponentRegistry so they never pollute
    // the Workbench stage's singleton hardwareRegistry (preventing ghost pins & off-scene raycast intercepts).
    this.registry = opts.registry || new ComponentRegistry();
    registerAllHardware(this.registry);

    this.canvas = opts.canvas || null;
    this.autoSequenceActive = opts.autoPlay !== undefined ? Boolean(opts.autoPlay) : true;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(34, 16 / 10, 0.5, 600);
    this.camera.position.set(74, 50, 92);
    this.camera.lookAt(0, 8, 0);

    this.renderer = null;

    this.robotGroup = new THREE.Group();
    this.robotGroup.name = 'SumoRobot_MasterAssembly';
    this.scene.add(this.robotGroup);

    /** @type {Map<string, THREE.Group>} */
    this.subAssemblyGroups = new Map();
    /** @type {Map<string, import('../../core/components/HardwareComponent.js').HardwareComponent>} */
    this.componentInstances = new Map();
    /** @type {import('../../hardware/motors/N20GearmotorWheelComponent.js').N20GearmotorWheelComponent[]} */
    this.wheelComponents = [];
    /** @type {Map<string, THREE.Line>} */
    this.explodeGuideLines = new Map();

    // Also instantiate the composite robot component for direct inspection/parity verification
    this.compositeRobotInstance = this.registry.create('robot.autonomous_sumo', 'sumo_composite_ref');

    this.phase = 'approaching';
    this.approachProgress = 0;
    this.explodeProgress = 0;
    this.wheelSpinAngle = 0;
    this.selectedPartId = SUMO_SUB_ASSEMBLIES[0].id;
    this._sequenceElapsed = 0;
    this._sonarPulsePhase = 0;
    this._hoveredPartId = null;
    this._manualExplodeLocked = false;
    this._targetExplode = 0;

    this._setupLightingAndDohyoArena();
    this._buildEightLayerModularSumoRobot();

    // Initialize at start of approach trajectory
    this.setExplodeProgress(0);
    this.setApproachProgress(this.autoSequenceActive ? 0 : 1);

    if (this.canvas) {
      this.attachCanvas(this.canvas);
    }
  }

  _setupLightingAndDohyoArena() {
    const ambient = new THREE.AmbientLight(0xdbeafe, 0.92);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.65);
    keyLight.position.set(55, 85, 65);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.78);
    rimLight.position.set(-60, 40, -55);
    this.scene.add(rimLight);

    const warmFill = new THREE.DirectionalLight(0xf59e0b, 0.52);
    warmFill.position.set(35, 20, -45);
    this.scene.add(warmFill);

    // Transparent Floating Holographic Dohyo Ring Accents (Zero opaque floor slab)
    this.arenaGroup = new THREE.Group();
    this.arenaGroup.name = 'DohyoArena';

    const ringLineMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide
    });
    const innerLineMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide
    });

    const tawaraRingGeo = new THREE.RingGeometry(42.0, 42.65, 72);
    const tawaraRing = new THREE.Mesh(tawaraRingGeo, ringLineMat);
    tawaraRing.rotation.x = -Math.PI / 2;
    tawaraRing.position.y = 0.02;
    this.arenaGroup.add(tawaraRing);

    const innerRingGeo = new THREE.RingGeometry(27.5, 27.9, 64);
    const innerRing = new THREE.Mesh(innerRingGeo, innerLineMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.02;
    this.arenaGroup.add(innerRing);

    // Authentic hollow ultrasonic acoustic wave rings emanating forward from the Sumo Robot
    this.sonarPulseGroup = new THREE.Group();
    this.sonarPulseGroup.position.set(0, 11.2, 18.5);
    const sonarRingMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.42
    });
    for (let i = 0; i < 3; i++) {
      const torusGeo = new THREE.TorusGeometry(2.2 + i * 1.4, 0.14, 12, 36);
      const ring = new THREE.Mesh(torusGeo, sonarRingMat);
      ring.position.set(0, 0, i * 4.8);
      this.sonarPulseGroup.add(ring);
    }
    this.robotGroup.add(this.sonarPulseGroup);

    this.scene.add(this.arenaGroup);
  }

  /**
   * Builds all 8 CAD sub-assemblies using real registered `HardwareComponent` instances
   * from `ComponentRegistry` (`hardwareRegistry`).
   */
  _buildEightLayerModularSumoRobot() {
    const guideLineMat = new THREE.LineBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.42
    });

    for (const sub of SUMO_SUB_ASSEMBLIES) {
      const layerGroup = new THREE.Group();
      layerGroup.name = `SumoSubAssembly_${sub.id}`;
      layerGroup.userData = { subAssemblyId: sub.id, code: sub.code, componentTypeId: sub.componentTypeId };

      if (sub.id === 'front_wedge') {
        const bladeComp = this.registry.create('robotics.sumo_dozer_blade', 'sumo_dozer_blade_1');
        bladeComp.group.scale.setScalar(0.42);
        layerGroup.add(bladeComp.group);

        const lineSensorComp = this.registry.create('sensor.tcrt5000_line', 'sumo_tcrt5000_array_1');
        lineSensorComp.group.scale.setScalar(0.40);
        lineSensorComp.group.position.set(0, -1.2, 2.2);
        layerGroup.add(lineSensorComp.group);

        this.componentInstances.set(sub.id, bladeComp);
        this.componentInstances.set('tcrt5000_line_array', lineSensorComp);
      } else if (sub.id === 'chassis_base') {
        const chassisComp = this.registry.create('robotics.sumo_chassis_plate', 'sumo_chassis_plate_1');
        chassisComp.group.scale.setScalar(0.42);
        layerGroup.add(chassisComp.group);
        this.componentInstances.set(sub.id, chassisComp);
      } else if (sub.id === 'drive_motors_left') {
        const frontLeftWheel = this.registry.create('motor.n20_gearmotor', 'sumo_n20_fl', { side: 'left' });
        frontLeftWheel.group.scale.setScalar(0.42);
        frontLeftWheel.group.rotation.y = Math.PI;
        frontLeftWheel.group.position.set(0, 0, 7.2);
        layerGroup.add(frontLeftWheel.group);

        const rearLeftWheel = this.registry.create('motor.n20_gearmotor', 'sumo_n20_rl', { side: 'left' });
        rearLeftWheel.group.scale.setScalar(0.42);
        rearLeftWheel.group.rotation.y = Math.PI;
        rearLeftWheel.group.position.set(0, 0, -7.2);
        layerGroup.add(rearLeftWheel.group);

        this.wheelComponents.push(frontLeftWheel, rearLeftWheel);
        this.componentInstances.set(sub.id, frontLeftWheel);
      } else if (sub.id === 'drive_motors_right') {
        const frontRightWheel = this.registry.create('motor.n20_gearmotor', 'sumo_n20_fr', { side: 'right' });
        frontRightWheel.group.scale.setScalar(0.42);
        frontRightWheel.group.position.set(0, 0, 7.2);
        layerGroup.add(frontRightWheel.group);

        const rearRightWheel = this.registry.create('motor.n20_gearmotor', 'sumo_n20_rr', { side: 'right' });
        rearRightWheel.group.scale.setScalar(0.42);
        rearRightWheel.group.position.set(0, 0, -7.2);
        layerGroup.add(rearRightWheel.group);

        this.wheelComponents.push(frontRightWheel, rearRightWheel);
        this.componentInstances.set(sub.id, frontRightWheel);
      } else if (sub.id === 'motor_driver') {
        const driverComp = this.registry.create('driver.l298n_dual', 'sumo_l298n_driver_1');
        driverComp.group.scale.setScalar(0.42);
        layerGroup.add(driverComp.group);
        this.componentInstances.set(sub.id, driverComp);
      } else if (sub.id === 'mcu_controller') {
        const unoComp = this.registry.create('board.arduino_uno', 'sumo_arduino_uno_1');
        unoComp.group.scale.setScalar(0.36);
        layerGroup.add(unoComp.group);
        this.componentInstances.set(sub.id, unoComp);
      } else if (sub.id === 'lipo_battery') {
        const lipoComp = this.registry.create('power.lipo_3s_1300mah', 'sumo_lipo_3s_1');
        lipoComp.group.scale.setScalar(0.38);
        lipoComp.group.rotation.y = Math.PI / 2;
        layerGroup.add(lipoComp.group);
        this.componentInstances.set(sub.id, lipoComp);
      } else if (sub.id === 'sensor_armor_head') {
        const hoodComp = this.registry.create('robotics.sumo_armor_hood', 'sumo_armor_hood_1');
        hoodComp.group.scale.setScalar(0.42);
        layerGroup.add(hoodComp.group);

        const sonarComp = this.registry.create('sensor.ultrasonic', 'sumo_hcsr04_1');
        sonarComp.group.scale.setScalar(0.40);
        sonarComp.group.position.set(0, -1.2, 6.2);
        layerGroup.add(sonarComp.group);

        this.componentInstances.set(sub.id, hoodComp);
        this.componentInstances.set('ultrasonic_radar', sonarComp);
      }

      layerGroup.position.set(sub.assembledPos.x, sub.assembledPos.y, sub.assembledPos.z);
      this.subAssemblyGroups.set(sub.id, layerGroup);
      this.robotGroup.add(layerGroup);

      // CAD Explode trajectory guide line
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(sub.assembledPos.x, sub.assembledPos.y, sub.assembledPos.z),
        new THREE.Vector3(sub.assembledPos.x, sub.assembledPos.y, sub.assembledPos.z)
      ]);
      const line = new THREE.Line(lineGeo, guideLineMat);
      line.visible = false;
      this.explodeGuideLines.set(sub.id, line);
      this.robotGroup.add(line);
    }
  }

  /**
   * Sets the normalized approach progress (`0..1`) from `SUMO_APPROACH_START` (`z = -115`)
   * to `SUMO_STAGE_CENTER` (`z = 0`), rotating all 4 N20 gearmotor wheels proportionally.
   * @param {number} progress
   */
  setApproachProgress(progress) {
    const t = Math.max(0, Math.min(1, Number(progress) || 0));
    this.approachProgress = t;

    // Smooth ease-out approach curve for realistic deceleration at ring center
    const worldX = THREE.MathUtils.lerp(SUMO_APPROACH_START.x, SUMO_STAGE_CENTER.x, t);
    const worldZ = THREE.MathUtils.lerp(SUMO_APPROACH_START.z, SUMO_STAGE_CENTER.z, t);
    this.robotGroup.position.set(worldX, SUMO_STAGE_CENTER.y, worldZ);

    // Subtle braking pitch inertia right before stopping (t in [0.78, 0.98])
    let brakePitch = 0;
    if (t > 0.75 && t < 0.98) {
      brakePitch = Math.sin(((t - 0.75) / 0.23) * Math.PI) * 0.055;
    }
    this.robotGroup.rotation.x = brakePitch;

    // Proportional wheel spin angle across the ~118.35 unit approach path
    const distanceTraveled = t * Math.hypot(
      SUMO_STAGE_CENTER.x - SUMO_APPROACH_START.x,
      SUMO_STAGE_CENTER.z - SUMO_APPROACH_START.z
    );
    const wheelRadius = 6.8;
    this.wheelSpinAngle = distanceTraveled / wheelRadius;

    for (const wheelComp of this.wheelComponents) {
      if (wheelComp.refs?.wheelPivot) {
        wheelComp.refs.wheelPivot.rotation.x = this.wheelSpinAngle;
      }
      wheelComp.updateState({ rpm: t < 1 ? 600 : 0, pwm: t < 1 ? 255 : 0 });
    }

    this._syncPhase();
    this._updateCameraFraming();
    this._renderFrame();
    return this.getTelemetry();
  }

  /**
   * Dynamically adjusts the perspective camera position and target so both the
   * runway approach (`z = -115 -> 0`) and the 8-layer CAD exploded state (`0..100%`)
   * stay comfortably framed inside the stage viewport at any aspect ratio.
   */
  _updateCameraFraming() {
    if (!this.camera) return;
    const e = this.explodeProgress || 0;
    const aspect = this.camera.aspect || 1.6;
    const aspectPullback = aspect < 1.55 ? 1.55 / Math.max(0.75, aspect) : 1.0;

    // Pull camera back smoothly as the 8 CAD layers explode outward
    const camX = THREE.MathUtils.lerp(78, 128, e) * aspectPullback;
    const camY = THREE.MathUtils.lerp(54, 86, e) * aspectPullback;
    const camZ = THREE.MathUtils.lerp(98, 160, e) * aspectPullback;

    this.camera.position.set(camX, camY, camZ);

    const robotX = this.robotGroup ? this.robotGroup.position.x : 0;
    const robotZ = this.robotGroup ? this.robotGroup.position.z : 0;
    const lookX = robotX * 0.35;
    const lookY = THREE.MathUtils.lerp(7.5, 8.5, e);
    const lookZ = robotZ * 0.28 + THREE.MathUtils.lerp(2.0, 5.0, e);
    this.camera.lookAt(lookX, lookY, lookZ);
    this.camera.updateMatrixWorld();
  }

  /**
   * Sets the normalized 8-layer CAD Exploded View factor (`0..1`).
   * @param {number} progress
   */
  setExplodeProgress(progress) {
    const e = Math.max(0, Math.min(1, Number(progress) || 0));
    this.explodeProgress = e;

    for (const sub of SUMO_SUB_ASSEMBLIES) {
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

    if (this.compositeRobotInstance) {
      this.compositeRobotInstance.setExplodeFactor(e);
    }

    this._syncPhase();
    this._updateCameraFraming();
    this._renderFrame();
    return this.getTelemetry();
  }

  /**
   * Immediately snaps the Sumo Robot to stage center and sets the requested explode factor (`0` or `1`).
   * @param {number} factor
   */
  snapToExplodeFactor(factor) {
    this.autoSequenceActive = false;
    this._targetExplode = Math.max(0, Math.min(1, Number(factor) || 0));
    this.setApproachProgress(1);
    return this.setExplodeProgress(this._targetExplode);
  }

  /**
   * Replays the autonomous runway approach (`z = -115 -> 0`).
   */
  replayApproachAndExplode() {
    this._sequenceElapsed = 0;
    this._targetExplode = 0;
    this.autoSequenceActive = true;
    this.setExplodeProgress(0);
    return this.setApproachProgress(0);
  }

  /**
   * Highlights a key marketing feature on hover and gently separates the CAD layers
   * so the user can inspect the internal hardware in real time.
   * @param {string} partId
   * @param {number} [explodeTarget=0.45]
   */
  setHoveredFeature(partId, explodeTarget = 0.45) {
    this.autoSequenceActive = false;
    if (this.approachProgress < 1) {
      this.setApproachProgress(1);
    }
    this._targetExplode = Math.max(0, Math.min(1, Number(explodeTarget) || 0.45));
    return this.selectSubAssembly(partId);
  }

  /**
   * Clears feature hover state and smoothly returns the robot to its assembled posture.
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
    const found = SUMO_SUB_ASSEMBLIES.find((p) => p.id === partId) || SUMO_SUB_ASSEMBLIES[0];
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

  _syncPhase() {
    if (this.approachProgress < 0.995) {
      this.phase = 'approaching';
    } else if (this.explodeProgress > 0.05) {
      this.phase = 'exploded';
    } else {
      this.phase = 'assembled';
    }
  }

  getTelemetry() {
    return {
      phase: this.phase,
      approachProgress: this.approachProgress,
      explodeProgress: this.explodeProgress,
      worldZ: this.robotGroup.position.z,
      distanceMm: Math.round(Math.abs(this.robotGroup.position.z)),
      wheelSpinAngle: this.wheelSpinAngle,
      selectedPartId: this.selectedPartId
    };
  }

  /**
   * Advances kinematics, ultrasonic sonar wave pulses, smooth hover explode transitions, and WebGL rendering.
   * @param {number} [dt=0.016]
   */
  tick(dt = 0.016) {
    const safeDt = Math.min(0.1, Math.max(0.001, Number(dt) || 0.016));
    this._sonarPulsePhase += safeDt * 2.8;

    if (this.sonarPulseGroup) {
      this.sonarPulseGroup.children.forEach((ring, idx) => {
        const wave = (this._sonarPulsePhase + idx * 0.33) % 1;
        ring.position.z = wave * 18;
        const s = 0.72 + wave * 0.88;
        ring.scale.set(s, s, 1);
      });
    }

    if (this.autoSequenceActive) {
      this._sequenceElapsed += safeDt;
      const approachDuration = 2.2;

      if (this._sequenceElapsed <= approachDuration) {
        const raw = this._sequenceElapsed / approachDuration;
        const eased = 1 - Math.pow(1 - raw, 3);
        this.setApproachProgress(eased);
      } else {
        this.setApproachProgress(1);
        this.autoSequenceActive = false;
      }
    } else {
      // Gentle showcase orbital presentation when stationed at center
      if (this.approachProgress >= 0.995) {
        this.robotGroup.rotation.y = Math.sin(this._sonarPulsePhase * 0.22) * 0.24;
      }
      if (typeof this._targetExplode === 'number') {
        const diff = this._targetExplode - this.explodeProgress;
        if (Math.abs(diff) > 0.003) {
          this.setExplodeProgress(this.explodeProgress + diff * Math.min(1, safeDt * 7.5));
        } else if (Math.abs(diff) > 0) {
          this.setExplodeProgress(this._targetExplode);
        }
      }
    }

    this._renderFrame();
    return this.getTelemetry();
  }

  /**
   * Exports a complete, runnable 3D Spatial Hardware Workbench project containing the
   * exact registered `HardwareComponent` modules used in this Sumo Robot scene.
   */
  getWorkbenchProject() {
    return {
      id: 'showcase-sumo-robot-v1',
      title: 'Autonomous Mini-Sumo Robot (ATmega328P + L298N + HC-SR04 + N20 + TCRT5000)',
      description:
        '8-katmanlı otonom mini-sumo robot devresi: Arduino Uno R3, L298N H-Köprü sürücü, ikiz N20 redüktörlü motorlar, HC-SR04 ultrasonik radar ve TCRT5000 sınır sensörü.',
      board_type: 'board.arduino_uno',
      circuit_json: {
        version: '2.0',
        id: 'scenario.showcase_sumo_robot',
        mode: 'freeform',
        meta: {
          title: 'Autonomous Mini-Sumo Robot (ATmega328P + L298N + HC-SR04 + N20 + TCRT5000)'
        },
        customComponents: [],
        boards: [
          {
            id: 'uno_sumo',
            typeId: 'board.arduino_uno',
            position: [-36, 0, 0]
          }
        ],
        components: [
          {
            id: 'sonar_front',
            typeId: 'sensor.ultrasonic',
            position: [0, 5.2, -16],
            state: { distanceCm: 18 }
          },
          {
            id: 'l298n_driver',
            typeId: 'driver.l298n_dual',
            position: [0, 5.2, 4],
            state: { enaPwm: 240, enbPwm: 240 }
          },
          {
            id: 'motor_left',
            typeId: 'motor.n20_gearmotor',
            position: [26, 5.2, -12],
            state: { pwm: 240 }
          },
          {
            id: 'motor_right',
            typeId: 'motor.n20_gearmotor',
            position: [26, 5.2, 12],
            state: { pwm: 240 }
          },
          {
            id: 'line_array_front',
            typeId: 'sensor.tcrt5000_line',
            position: [0, 5.2, 24],
            state: { normalized: 0.92 }
          }
        ],
        connections: [
          { id: 'sw1', from: 'uno_sumo.PIN9', to: 'sonar_front.TRIG', color: '#38bdf8' },
          { id: 'sw2', from: 'uno_sumo.PIN10', to: 'sonar_front.ECHO', color: '#22d3ee' },
          { id: 'sw3', from: 'uno_sumo.PIN5', to: 'l298n_driver.ENA', color: '#10b981' },
          { id: 'sw4', from: 'uno_sumo.PIN6', to: 'l298n_driver.ENB', color: '#10b981' },
          { id: 'sw5', from: 'uno_sumo.A0', to: 'line_array_front.WIPER', color: '#f59e0b' },
          { id: 'sw6', from: 'uno_sumo.5V', to: 'sonar_front.VCC', color: '#ef4444' },
          { id: 'sw7', from: 'sonar_front.GND', to: 'uno_sumo.GND', color: '#64748b' },
          { id: 'sw8', from: 'uno_sumo.5V', to: 'line_array_front.VCC', color: '#ef4444' },
          { id: 'sw9', from: 'line_array_front.GND', to: 'uno_sumo.GND', color: '#64748b' },
          { id: 'sw10', from: 'l298n_driver.GND', to: 'uno_sumo.GND', color: '#64748b' },
          { id: 'sw11', from: 'l298n_driver.OUT1', to: 'motor_left.VCC', color: '#ef4444' },
          { id: 'sw12', from: 'motor_left.GND', to: 'l298n_driver.OUT2', color: '#64748b' },
          { id: 'sw13', from: 'l298n_driver.OUT3', to: 'motor_right.VCC', color: '#ef4444' },
          { id: 'sw14', from: 'motor_right.GND', to: 'l298n_driver.OUT4', color: '#64748b' }
        ]
      },
      code: `// Autonomous Mini-Sumo Robot Firmware (ATmega328P + L298N + HC-SR04 + TCRT5000)
const int PIN_TRIG = 9;
const int PIN_ECHO = 10;
const int PIN_ENA  = 5;
const int PIN_ENB  = 6;
const int PIN_LINE = A0;

void setup() {
  Serial.begin(115200);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  pinMode(PIN_ENA, OUTPUT);
  pinMode(PIN_ENB, OUTPUT);
}

void loop() {
  int ringEdge = analogRead(PIN_LINE);
  if (ringEdge > 750) {
    // White Tawara boundary detected -> immediate reverse & spin maneuver
    analogWrite(PIN_ENA, 255);
    analogWrite(PIN_ENB, 180);
    delay(180);
    return;
  }
  // Full-torque forward attack charge
  analogWrite(PIN_ENA, 245);
  analogWrite(PIN_ENB, 245);
  delay(20);
}`
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
