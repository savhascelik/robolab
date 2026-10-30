import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

import { EventBus } from '../src/core/events/EventBus.js';
import { HardwareComponent } from '../src/core/components/HardwareComponent.js';
import { BaseButton } from '../src/core/components/base/BaseButton.js';
import { BaseMotor } from '../src/core/components/base/BaseMotor.js';
import { BaseLightEmitter } from '../src/core/components/base/BaseLightEmitter.js';
import { BaseSensor } from '../src/core/components/base/BaseSensor.js';
import { BaseAnalogSensor } from '../src/core/components/base/BaseAnalogSensor.js';
import { BaseDistanceSensor } from '../src/core/components/base/BaseDistanceSensor.js';
import { BaseAudioTransducer } from '../src/core/components/base/BaseAudioTransducer.js';
import { BaseBoard } from '../src/core/components/base/BaseBoard.js';
import { BaseHostBoard } from '../src/core/components/base/BaseHostBoard.js';
import { BaseMCUBoard } from '../src/core/components/base/BaseMCUBoard.js';
import { BaseSBCBoard } from '../src/core/components/base/BaseSBCBoard.js';
import { BasePrototypingBoard } from '../src/core/components/base/BasePrototypingBoard.js';
import { BasePassiveComponent } from '../src/core/components/base/BasePassiveComponent.js';
import { BaseMotorDriver } from '../src/core/components/base/BaseMotorDriver.js';
import { BasePowerModule } from '../src/core/components/base/BasePowerModule.js';
import { BaseVisionSensor } from '../src/core/components/base/BaseVisionSensor.js';
import { BaseDisplayModule } from '../src/core/components/base/BaseDisplayModule.js';
import { BaseChassisPart } from '../src/core/components/base/BaseChassisPart.js';
import { BaseRobotAssembly } from '../src/core/components/base/BaseRobotAssembly.js';
import { ComponentRegistry, hardwareRegistry } from '../src/core/registry/ComponentRegistry.js';
import { LessonRegistry } from '../src/core/registry/LessonRegistry.js';
import { BaseLesson } from '../src/core/lessons/BaseLesson.js';
import { I18nService, i18n } from '../src/core/i18n/I18nService.js';
import { BaseTransport } from '../src/core/transport/BaseTransport.js';
import { VirtualSimTransport } from '../src/core/transport/VirtualSimTransport.js';
import { WebSerialTransport } from '../src/core/transport/WebSerialTransport.js';
import { BaseFlashProtocol } from '../src/core/transport/BaseFlashProtocol.js';
import { AvrStk500Protocol } from '../src/core/transport/protocols/AvrStk500Protocol.js';
import { Esp32EsptoolProtocol } from '../src/core/transport/protocols/Esp32EsptoolProtocol.js';
import { JetsonEdgeProtocol } from '../src/core/transport/protocols/JetsonEdgeProtocol.js';
import { flashProtocolRegistry } from '../src/core/transport/FlashProtocolRegistry.js';

import { TactilePushButton } from '../src/hardware/buttons/TactilePushButton.js';
import { ArcadeCapButton } from '../src/hardware/buttons/ArcadeCapButton.js';
import { DCMotorComponent } from '../src/hardware/motors/DCMotorComponent.js';
import { ServoMotorComponent } from '../src/hardware/motors/ServoMotorComponent.js';
import { SingleLEDComponent } from '../src/hardware/leds/SingleLEDComponent.js';
import { PotentiometerComponent } from '../src/hardware/sensors/PotentiometerComponent.js';
import { UltrasonicSensorComponent } from '../src/hardware/sensors/UltrasonicSensorComponent.js';
import { Imx219CsiCameraModule } from '../src/hardware/sensors/Imx219CsiCameraModule.js';
import { Tcrt5000LineSensorArray } from '../src/hardware/sensors/Tcrt5000LineSensorArray.js';
import { PiezoBuzzerComponent } from '../src/hardware/audio/PiezoBuzzerComponent.js';
import { N20GearmotorWheelComponent } from '../src/hardware/motors/N20GearmotorWheelComponent.js';
import { L298NDualBridgeDriver } from '../src/hardware/drivers/L298NDualBridgeDriver.js';
import { AxialResistorComponent } from '../src/hardware/passives/AxialResistorComponent.js';
import { JumperWireComponent } from '../src/hardware/passives/JumperWireComponent.js';
import { ArduinoUnoBoard } from '../src/hardware/boards/ArduinoUnoBoard.js';
import { ESP32DevKitBoard } from '../src/hardware/boards/ESP32DevKitBoard.js';
import { JetsonNanoBoard } from '../src/hardware/boards/JetsonNanoBoard.js';
import { BreadboardComponent } from '../src/hardware/boards/BreadboardComponent.js';
import { DynamicComponentBuilder, PBR_MATERIAL_PRESETS } from '../src/core/components/DynamicComponentBuilder.js';
import { ComponentPalettePopover, STUDIO_TEMPLATES } from '../src/ui/workbench/ComponentPalettePopover.js';
import { registerAllHardware } from '../src/hardware/registerAllHardware.js';
import { BoardStage } from '../src/stage/boardStage.js';
import { CircuitBuilder } from '../src/stage/CircuitBuilder.js';
import { LESSONS } from '../src/data/lessons.js';
import { highlightCppLine } from '../src/ui/SyntaxHighlighter.js';
import { ElectricalPin } from '../src/core/electrical/ElectricalPin.js';
import { ConductiveDipole } from '../src/core/electrical/ConductiveDipole.js';
import { DisjointNetSet } from '../src/core/electrical/DisjointNetSet.js';
import { CircuitFlowSolver, circuitFlowSolver } from '../src/core/electrical/CircuitFlowSolver.js';
import { ScenarioSerializer } from '../src/core/scenario/ScenarioSerializer.js';
import { ScenarioRegistry, scenarioRegistry, createMultiBoardBridgePreset } from '../src/core/scenario/ScenarioRegistry.js';
import { PinSnapIndex } from '../src/stage/interaction/PinSnapIndex.js';
import { InteractiveWireTool } from '../src/stage/interaction/InteractiveWireTool.js';
import { PinHudOverlay } from '../src/stage/interaction/PinHudOverlay.js';
import { SmartPinMatcher } from '../src/core/electrical/SmartPinMatcher.js';
import { GizmoMath } from '../src/stage/gizmo/GizmoMath.js';
import { TransformGizmo3D } from '../src/stage/gizmo/TransformGizmo3D.js';
import { StageTransformController } from '../src/stage/gizmo/StageTransformController.js';
import { ComponentCatalogModal } from '../src/ui/controllers/ComponentCatalogModal.js';
import { BaseSettingsAdapter } from '../src/core/settings/BaseSettingsAdapter.js';
import { LocalSettingsAdapter } from '../src/core/settings/LocalSettingsAdapter.js';
import { RemoteApiSettingsAdapter } from '../src/core/settings/RemoteApiSettingsAdapter.js';
import {
  UserSettingsService,
  PIN_VISIBILITY_MODES
} from '../src/core/settings/UserSettingsService.js';
import {
  ThemeService,
  themeService,
  STAGE_THEME_TOKENS
} from '../src/core/theme/ThemeService.js';
import {
  TopContextPill,
  SUPPORTED_HOST_BOARDS
} from '../src/ui/workbench/TopContextPill.js';
import { BottomFloatingDock } from '../src/ui/workbench/BottomFloatingDock.js';
import { LiveCodeRuntime } from '../src/sim/LiveCodeRuntime.js';
import { CodeDrawerController } from '../src/ui/workbench/CodeDrawerController.js';
import { BackendApiClient } from '../src/core/ai/BackendApiClient.js';
import { StageAiCommandExecutor } from '../src/core/ai/StageAiCommandExecutor.js';
import { AppRouter } from '../src/core/router/AppRouter.js';
import { DiagnosticHudCard } from '../src/ui/workbench/DiagnosticHudCard.js';
import {
  ProjectsAndGroupsModal,
  REFERENCE_3D_PROJECTS
} from '../src/ui/workbench/ProjectsAndGroupsModal.js';
import { AuthAndSettingsModal } from '../src/ui/workbench/AuthAndSettingsModal.js';
import {
  SumoRobotShowcaseScene,
  SUMO_SUB_ASSEMBLIES,
  SUMO_APPROACH_START,
  SUMO_STAGE_CENTER
} from '../src/stage/showcase/SumoRobotShowcaseScene.js';
import {
  JetsonVisionRobotShowcaseScene,
  JETSON_SUB_ASSEMBLIES
} from '../src/stage/showcase/JetsonVisionRobotShowcaseScene.js';
import {
  LandingShowcaseController,
  SUMO_KEY_HIGHLIGHTS,
  JETSON_KEY_HIGHLIGHTS
} from '../src/ui/landing/LandingShowcaseController.js';
import {
  CORE_TOOLS,
  searchCapabilities,
  getComponentSchema,
  getFunctionSchema,
  inspectCircuitState
} from '../src/core/ai/capabilityIndex.js';
import { CircuitSDK } from '../src/core/ai/CircuitSDK.js';
import { CodeModeExecutor } from '../src/core/ai/CodeModeExecutor.js';
import {
  partitionCalls,
  buildCircuitObservation,
  HardwareSessionMemory,
  SessionMemory,
  DEFAULT_MAX_ROUNDS,
  runHardwareAgentLoop,
  resumeHardwareAgentLoop
} from '../src/core/ai/agentLoop.js';
import {
  MAX_OBSERVATION_BYTES,
  clampToByteBudget,
  snapshotStage,
  formatRoundObservation
} from '../src/core/ai/observationBuilder.js';
import { CalloutManager } from '../src/stage/CalloutManager.js';
import { CreditStoreModal } from '../src/ui/workbench/CreditStoreModal.js';
import { cyl, mat } from '../src/hardware/primitives/GeometryFactory.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

let passed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✔ PASS: ${name}`);
  } catch (err) {
    console.error(`  ✘ FAIL: ${name}`);
    console.error(`    Reason: ${err.message}`);
    process.exitCode = 1;
    throw err;
  }
}

console.log('\n======================================================');
console.log('🧪 RUNNING ARCHITECTURE, INHERITANCE & REGISTRY TESTS');
console.log('======================================================\n');

await test('1. OOP Inheritance Hierarchy: All specialized hardware classes inherit from Base & Root classes', () => {
  // Abstract classes cannot be instantiated directly
  assert.throws(() => new HardwareComponent(), /abstract/i);
  assert.throws(() => new BaseButton(), /abstract/i);
  assert.throws(() => new BaseMotor(), /abstract/i);
  assert.throws(() => new BaseMCUBoard(), /abstract/i);
  assert.throws(() => new BasePrototypingBoard(), /abstract/i);
  assert.throws(() => new BaseAnalogSensor(), /abstract/i);
  assert.throws(() => new BaseDistanceSensor(), /abstract/i);

  const tactileBtn = new TactilePushButton({ id: 'btn_tactile' });
  const arcadeBtn = new ArcadeCapButton({ id: 'btn_arcade' });
  const dcMotor = new DCMotorComponent({ id: 'mot_dc' });
  const servoMotor = new ServoMotorComponent({ id: 'mot_servo' });
  const led = new SingleLEDComponent({ id: 'led_red' });
  const pot = new PotentiometerComponent({ id: 'pot_1' });
  const sonic = new UltrasonicSensorComponent({ id: 'sonic_1' });
  const buzzer = new PiezoBuzzerComponent({ id: 'buz_1' });
  const resistor = new AxialResistorComponent({ id: 'res_1' });
  const wire = new JumperWireComponent({ id: 'wire_1', points: [[0, 0, 0], [10, 5, 10]] });
  const uno = new ArduinoUnoBoard({ id: 'uno_1' });
  const esp32 = new ESP32DevKitBoard({ id: 'esp32_1' });
  const breadboard = new BreadboardComponent({ id: 'bb_1' });

  // Abstract Host & SBC classes cannot be instantiated directly
  assert.throws(() => new BaseHostBoard(), /abstract/i);
  assert.throws(() => new BaseSBCBoard(), /abstract/i);

  // Buttons inherit from BaseButton AND HardwareComponent
  assert.equal(tactileBtn instanceof BaseButton, true, 'TactilePushButton must extend BaseButton');
  assert.equal(arcadeBtn instanceof BaseButton, true, 'ArcadeCapButton must extend BaseButton');
  assert.equal(tactileBtn instanceof HardwareComponent, true, 'TactilePushButton must extend HardwareComponent');
  assert.equal(arcadeBtn instanceof HardwareComponent, true, 'ArcadeCapButton must extend HardwareComponent');

  // Motors inherit from BaseMotor AND HardwareComponent
  assert.equal(dcMotor instanceof BaseMotor, true, 'DCMotorComponent must extend BaseMotor');
  assert.equal(servoMotor instanceof BaseMotor, true, 'ServoMotorComponent must extend BaseMotor');
  assert.equal(dcMotor instanceof HardwareComponent, true, 'DCMotorComponent must extend HardwareComponent');

  // Host Boards inherit from BaseMCUBoard -> BaseHostBoard -> BaseBoard -> HardwareComponent
  assert.equal(uno instanceof BaseMCUBoard, true, 'ArduinoUnoBoard must extend BaseMCUBoard');
  assert.equal(esp32 instanceof BaseMCUBoard, true, 'ESP32DevKitBoard must extend BaseMCUBoard');
  assert.equal(uno instanceof BaseHostBoard, true, 'ArduinoUnoBoard must extend BaseHostBoard');
  assert.equal(esp32 instanceof BaseHostBoard, true, 'ESP32DevKitBoard must extend BaseHostBoard');
  assert.equal(esp32 instanceof BaseBoard, true, 'ESP32DevKitBoard must extend BaseBoard');
  assert.equal(esp32 instanceof HardwareComponent, true, 'ESP32DevKitBoard must extend HardwareComponent');

  // Breadboard inherits from BasePrototypingBoard -> BaseBoard
  assert.equal(breadboard instanceof BasePrototypingBoard, true, 'BreadboardComponent must extend BasePrototypingBoard');
  assert.equal(breadboard instanceof BaseBoard, true);
  assert.equal(breadboard instanceof BaseHostBoard, false, 'Passive Breadboard must not be a programmable HostBoard');

  // Specialized Sensors inherit from BaseAnalogSensor / BaseDistanceSensor -> BaseSensor
  assert.equal(pot instanceof BaseAnalogSensor, true, 'PotentiometerComponent must extend BaseAnalogSensor');
  assert.equal(pot instanceof BaseSensor, true);
  assert.equal(sonic instanceof BaseDistanceSensor, true, 'UltrasonicSensorComponent must extend BaseDistanceSensor');
  assert.equal(sonic instanceof BaseSensor, true);

  // Other categories inherit from their respective Base classes
  assert.equal(led instanceof BaseLightEmitter, true);
  assert.equal(buzzer instanceof BaseAudioTransducer, true);
  assert.equal(resistor instanceof BasePassiveComponent, true);
  assert.equal(wire instanceof BasePassiveComponent, true);
});

await test('2. Button Inheritance & Specialization: BaseButton shared behavior + Tactile vs Arcade specialization', () => {
  const tactile = new TactilePushButton({ id: 't1' });
  const arcade = new ArcadeCapButton({ id: 'a1' });

  // Specialization: different mechanical plunger strokes & rest heights
  assert.notEqual(
    tactile.state.plungerStroke,
    arcade.state.plungerStroke,
    'Specialized button subclasses must define distinct mechanical plunger strokes'
  );
  assert.equal(tactile.state.plungerStroke, 0.9);
  assert.equal(arcade.state.plungerStroke, 1.6);

  // Shared inherited state & methods from BaseButton (INPUT_PULLUP default: HIGH(1) when released, LOW(0) when pressed)
  assert.equal(tactile.state.pressed, false);
  assert.equal(arcade.state.pressed, false);
  assert.equal(tactile.readDigitalLevel(), 1);
  assert.equal(arcade.readDigitalLevel(), 1);

  const tactileRestY = tactile.refs.plunger.position.y;
  const arcadeRestY = arcade.refs.plunger.position.y;

  tactile.press();
  arcade.press();

  assert.equal(tactile.state.pressed, true, 'TactilePushButton.state.pressed must be true after press()');
  assert.equal(arcade.state.pressed, true, 'ArcadeCapButton.state.pressed must be true after press()');
  assert.equal(tactile.readDigitalLevel(), 0, 'Pressed INPUT_PULLUP button must read digital LOW (0)');
  assert.equal(arcade.readDigitalLevel(), 0, 'Pressed INPUT_PULLUP arcade button must read digital LOW (0)');

  // Plunger 3D mesh Y position must depress by its specialized stroke
  assert.ok(
    Math.abs((tactileRestY - tactile.refs.plunger.position.y) - 0.9) < 1e-5,
    'Tactile plunger should depress by 0.9mm'
  );
  assert.ok(
    Math.abs((arcadeRestY - arcade.refs.plunger.position.y) - 1.6) < 1e-5,
    'Arcade plunger should depress by 1.6mm'
  );

  // Release & toggle inherited from BaseButton
  tactile.release();
  assert.equal(tactile.state.pressed, false, 'TactilePushButton.state.pressed must be false after release()');
  assert.equal(tactile.readDigitalLevel(), 1);

  arcade.toggle();
  assert.equal(arcade.state.pressed, false, 'ArcadeCapButton.toggle() should invert pressed state');
});

await test('3. Motor Inheritance & Specialization: BaseMotor shared PWM/angle + DC vs Servo 3D kinematics', () => {
  const dc = new DCMotorComponent({ id: 'dc_test' });
  const servo = new ServoMotorComponent({ id: 'servo_test' });

  // Shared PWM clamping in BaseMotor (0..255)
  dc.setPwm(300);
  assert.equal(dc.state.pwm, 255, 'BaseMotor.setPwm must clamp upper bound to 255');
  assert.equal(dc.state.speedNormalized, 1, 'speedNormalized must be 1.0 at PWM 255');

  const initialPropRot = dc.refs.propGroup.rotation.z;
  dc.update(0.1);
  assert.notEqual(dc.refs.propGroup.rotation.z, initialPropRot, 'DC motor fan propeller must rotate during update(dt) when PWM > 0');

  // Servo target angle interpolation
  servo.setTargetAngle(180);
  assert.equal(servo.state.targetAngleDeg, 180);
  servo.update(0.25);
  assert.ok(servo.state.currentAngleDeg > 90, 'Servo motor horn must interpolate toward targetAngleDeg');

  // Emergency stop inherited from BaseMotor
  dc.emergencyStop();
  assert.equal(dc.state.pwm, 0, 'emergencyStop() must reset PWM to 0');
  assert.equal(dc.state.speedNormalized, 0, 'emergencyStop() must reset speedNormalized to 0');
});

await test('4. Central ComponentRegistry: Category indexing (motors, buttons, etc.) & bulk invocation', () => {
  const registry = new ComponentRegistry();
  registerAllHardware(registry);

  // Verify class indexing by category
  const motorClasses = registry.getClassesByCategory('motors');
  const buttonClasses = registry.getClassesByCategory('buttons');
  assert.equal(motorClasses.length, 5, 'Registry must index 5 motor classes (DC, Servo, N20, Mecanum, Pan/Tilt Gimbal)');
  assert.equal(buttonClasses.length, 2, 'Registry must index 2 button classes (Tactile & Arcade)');

  // Verify class indexing by BaseClass inheritance
  const baseButtonSubclasses = registry.getClassesByBaseClass(BaseButton);
  const baseMotorSubclasses = registry.getClassesByBaseClass(BaseMotor);
  assert.equal(baseButtonSubclasses.length, 2);
  assert.equal(baseMotorSubclasses.length, 5);

  // Instantiate multiple motors and buttons via central registry
  const m1 = registry.create('motor.dc', { id: 'fan_1' });
  const m2 = registry.create('motor.servo', { id: 'servo_1' });
  const b1 = registry.create('button.tactile', { id: 'btn_1' });
  const b2 = registry.create('button.arcade', { id: 'btn_2' });

  assert.equal(registry.getInstancesByCategory('motors').length, 2);
  assert.equal(registry.getInstancesByCategory('buttons').length, 2);
  assert.equal(registry.getInstancesByBaseClass(BaseMotor).length, 2);
  assert.equal(registry.getInstancesByBaseClass(BaseButton).length, 2);

  // Bulk operation on all motors at once via invokeOnCategory('motors', ...)
  registry.invokeOnCategory('motors', (motor) => motor.setPwm(204));
  assert.equal(m1.state.pwm, 204, 'Bulk invokeOnCategory("motors") must update DC motor PWM');
  assert.equal(m2.state.pwm, 204, 'Bulk invokeOnCategory("motors") must update Servo motor PWM');

  // Bulk emergencyStop on all motors
  registry.invokeOnCategory('motors', (motor) => motor.emergencyStop());
  assert.equal(m1.state.pwm, 0, 'Bulk emergencyStop must stop DC motor');
  assert.equal(m2.state.pwm, 0, 'Bulk emergencyStop must stop Servo motor');

  // Bulk press on all buttons via invokeOnCategory('buttons', ...)
  registry.invokeOnCategory('buttons', (btn) => btn.press());
  assert.equal(b1.state.pressed, true, 'Bulk invokeOnCategory("buttons") must press TactilePushButton');
  assert.equal(b2.state.pressed, true, 'Bulk invokeOnCategory("buttons") must press ArcadeCapButton');

  // Bulk release via BaseClass inheritance query
  registry.invokeOnBaseClass(BaseButton, (btn) => btn.release());
  assert.equal(b1.state.pressed, false);
  assert.equal(b2.state.pressed, false);
});

await test('5. Declarative CircuitBuilder & LessonRegistry: All 9 lessons (including ESP32) build 3D hardware circuits cleanly', () => {
  const registry = new ComponentRegistry();
  registerAllHardware(registry);
  const arduinoBoard = registry.create('board.arduino_uno', { id: 'main.uno' });
  const lessonGroup = new THREE.Group();
  const builder = new CircuitBuilder({ registry, arduinoBoard, lessonGroup });

  const lReg = new LessonRegistry();
  for (const lesson of LESSONS) {
    lReg.register(lesson);
  }
  assert.equal(lReg.getAll().length, 9, 'All 9 interactive lessons (including ESP32) must be registered');

  // Build the 'button' lesson and verify both TactilePushButton and ArcadeCapButton exist in its circuit
  const buttonLesson = lReg.get('button');
  const buttonCircuit = builder.build(buttonLesson);
  assert.equal(buttonCircuit.activeParts.button instanceof TactilePushButton, true);
  assert.equal(buttonCircuit.activeParts.arcadeButton instanceof ArcadeCapButton, true);
  assert.equal(registry.getInstancesByCategory('buttons').length, 2);

  // Build the 'motor' lesson and verify both DCMotorComponent and ServoMotorComponent exist
  const motorLesson = lReg.get('motor');
  const motorCircuit = builder.build(motorLesson);
  assert.equal(motorCircuit.activeParts.motor instanceof DCMotorComponent, true);
  assert.equal(motorCircuit.activeParts.servo instanceof ServoMotorComponent, true);
  assert.equal(registry.getInstancesByCategory('motors').length, 2);

  // Build the 'esp32' lesson and verify CircuitBuilder dynamically switches hostBoard to ESP32DevKitBoard
  const esp32Lesson = lReg.get('esp32');
  const esp32Circuit = builder.build(esp32Lesson);
  assert.equal(esp32Circuit.hostBoard instanceof ESP32DevKitBoard, true, 'ESP32 lesson must mount ESP32DevKitBoard');
  assert.equal(esp32Circuit.callouts.length, 6, 'ESP32DevKitBoard must expose 6 3D subsystem callouts');
});

await test('6. Multi-Host Board Infrastructure: ESP32, Arduino Uno & Jetson Nano SBC pin/voltage/ADC adaptation', () => {
  const uno = new ArduinoUnoBoard({ id: 'host_uno' });
  const esp32 = new ESP32DevKitBoard({ id: 'host_esp32' });

  // Verify ADC bit-depth & voltage domain rules
  assert.equal(uno.getMaxAdcValue(), 1023, 'Arduino Uno 10-bit ADC max value must be 1023');
  assert.equal(esp32.getMaxAdcValue(), 4095, 'ESP32 12-bit SAR ADC max value must be 4095');
  assert.equal(uno.isVoltageCompatible(5.0), true, 'Arduino Uno supports 5.0V GPIO logic');
  assert.equal(esp32.isVoltageCompatible(5.0), false, 'ESP32 3.3V GPIO must flag direct 5.0V signals as incompatible');
  assert.equal(esp32.isVoltageCompatible(3.3), true, 'ESP32 supports 3.3V GPIO logic');

  // Verify Universal Logical Pin Role & Cross-Board Alias resolution
  assert.equal(uno.resolvePinName('@LED_BUILTIN'), 'PIN13');
  assert.equal(esp32.resolvePinName('@LED_BUILTIN'), 'GPIO2');
  assert.equal(esp32.resolvePinName('PIN13'), 'GPIO2', 'ESP32 must map Arduino PIN13 alias to GPIO2');
  assert.equal(esp32.resolvePinName('A0'), 'GPIO34', 'ESP32 must map Arduino A0 alias to 12-bit ADC GPIO34');
  assert.deepEqual(
    esp32.getPinWorldPosition('PIN13'),
    esp32.getPinWorldPosition('GPIO2'),
    'getPinWorldPosition on ESP32 must resolve cross-board aliases to exact 3D GPIO coordinates'
  );

  // Verify BaseSBCBoard readiness for upcoming NVIDIA Jetson Nano integration
  class JetsonNanoPreviewBoard extends BaseSBCBoard {
    static typeId = 'board.jetson_nano_preview';
    buildMesh() {
      this.definePin('GPIO_PIN7', [-10, 12, -20]);
      this.definePin('PWM_PIN32', [14, 12, -20]);
      this.definePin('3V3', [-17.78, 12, -20]);
      this.definePin('GND', [-15.24, 12, -20]);
    }
  }
  const jetson = new JetsonNanoPreviewBoard({ id: 'jetson_1' });
  assert.equal(jetson instanceof BaseSBCBoard, true);
  assert.equal(jetson instanceof BaseHostBoard, true);
  assert.equal(jetson.capabilities.gpuCores, 128);
  assert.equal(jetson.isVoltageCompatible(5.0), false, 'Jetson Nano 3.3V header must reject 5.0V direct signals');
  assert.equal(jetson.resolvePinName('@PWM_1'), 'PWM_PIN32');
  assert.equal(jetson.resolvePinName('PIN9'), 'PWM_PIN32', 'Jetson Nano SBC base maps Servo PIN9 to PWM_PIN32');
});

await test('7. EventBus & No-God-Component Constraint: Legacy monolithic kit.js is removed and modules are isolated', () => {
  const legacyKitPath = path.join(projectRoot, 'src', 'stage', 'kit.js');
  assert.equal(fs.existsSync(legacyKitPath), false, 'Legacy monolithic src/stage/kit.js must not exist');

  // Verify EventBus pub/sub works cleanly
  const bus = new EventBus();
  let received = null;
  const unsub = bus.on('circuit:ready', (payload) => {
    received = payload;
  });
  bus.emit('circuit:ready', { lessonId: 'motor' });
  assert.deepEqual(received, { lessonId: 'motor' });
  unsub();

  // Check that highlightCppLine works as an isolated pure function
  const highlighted = highlightCppLine('void setup() { pinMode(13, OUTPUT); }');
  assert.ok(highlighted.includes('tok-kw'), 'SyntaxHighlighter should highlight C++ keywords');
  assert.ok(highlighted.includes('tok-fn'), 'SyntaxHighlighter should highlight Arduino functions');
});

await test('8. Fine-Grained OOP Decomposition: BaseMCUBoard, BasePrototypingBoard, BaseAnalogSensor & BaseDistanceSensor', () => {
  const uno = new ArduinoUnoBoard({ id: 'mcu_uno' });
  const esp32 = new ESP32DevKitBoard({ id: 'mcu_esp' });
  const breadboard = new BreadboardComponent({ id: 'proto_bb' });
  const pot = new PotentiometerComponent({ id: 'analog_pot' });
  pot.setValue(512);
  const sonic = new UltrasonicSensorComponent({ id: 'dist_sonic' });
  sonic.setValue(34.3);

  // BaseMCUBoard specialization
  assert.equal(uno.getFlashProtocolId(), 'avr.stk500v1');
  assert.equal(esp32.getFlashProtocolId(), 'esp32.esptool');
  assert.ok(uno.getUsbFilters().length >= 2, 'ArduinoUnoBoard must provide WebSerial USB VID/PID filters');
  assert.ok(esp32.getUsbFilters().length >= 2, 'ESP32DevKitBoard must provide WebSerial USB VID/PID filters');

  // BasePrototypingBoard specialization
  assert.equal(breadboard.getTiePointCount(), 400);
  assert.equal(breadboard.state.powered, true);
  assert.equal(breadboard.getRowX(0), -34.5);

  // BaseAnalogSensor specialization
  assert.equal(pot.readAnalog10Bit(), 512);
  assert.equal(pot.readAnalog12Bit(), 2050);
  assert.ok(Math.abs(pot.readVoltage(5.0) - 2.5) < 0.02);
  assert.equal(pot.readAnalogForBoard(uno), 512);
  assert.equal(pot.readAnalogForBoard(esp32), 2050);

  // BaseDistanceSensor specialization
  assert.equal(sonic.computeEchoMicroseconds(), 2000);
  assert.equal(sonic.getDistanceMm(), 343);
  assert.equal(sonic.isWithinThreshold(50), true);
  assert.equal(sonic.isWithinThreshold(20), false);
});

await test('9. Central i18n (TR/EN) Architecture & Modular BaseLesson Hierarchy', () => {
  const localI18n = new I18nService('tr');
  assert.equal(localI18n.getLocale(), 'tr');
  assert.equal(localI18n.t('ui.tabs.overview'), 'Genel Bakış');
  assert.equal(localI18n.t('ui.flyout.allLessons', { count: 9 }), 'Tüm Dersler (9)');

  let notifiedLocale = null;
  const unsub = localI18n.onChange((payload) => {
    notifiedLocale = payload.locale;
  });
  localI18n.setLocale('en');
  assert.equal(notifiedLocale, 'en');
  assert.equal(localI18n.t('ui.tabs.overview'), 'Overview');
  assert.equal(localI18n.t('ui.flyout.allLessons', { count: 9 }), 'All Lessons (9)');
  unsub();

  // Verify all 9 lessons extend BaseLesson and resolve TR / EN reactively
  assert.throws(() => new BaseLesson({ id: 'abstract_lesson' }), /abstract/i);
  assert.equal(LESSONS.length, 9);
  for (const lesson of LESSONS) {
    assert.equal(lesson instanceof BaseLesson, true, `Lesson ${lesson.id} must extend BaseLesson`);
    assert.equal(typeof lesson.startSimulation, 'function', `Lesson ${lesson.id} must implement startSimulation(simulator)`);
  }

  const boardLesson = LESSONS[0];
  i18n.setLocale('tr');
  assert.equal(boardLesson.title, 'Kartı Tanıyalım');
  assert.ok(boardLesson.summary.includes('ATmega328P tabanlı'));

  i18n.setLocale('en');
  assert.equal(boardLesson.title, 'Meet the Board');
  assert.ok(boardLesson.summary.includes('popular microcontroller board'));

  // Restore default Turkish locale
  i18n.setLocale('tr');
});

await test('10. Browser USB (WebSerial) Transport & FlashProtocolRegistry (AVR STK500 / ESP32 Esptool / Jetson Edge)', async () => {
  assert.throws(() => new BaseTransport(), /abstract/i);
  assert.throws(() => new BaseFlashProtocol(), /abstract/i);

  const uno = new ArduinoUnoBoard({ id: 'flash_uno' });
  const esp32 = new ESP32DevKitBoard({ id: 'flash_esp' });

  const avrProto = flashProtocolRegistry.resolveForBoard(uno);
  const espProto = flashProtocolRegistry.resolveForBoard(esp32);
  const jetsonProto = flashProtocolRegistry.get('sbc.jetson_edge');

  assert.equal(avrProto instanceof AvrStk500Protocol, true);
  assert.equal(espProto instanceof Esp32EsptoolProtocol, true);
  assert.equal(jetsonProto instanceof JetsonEdgeProtocol, true);

  // Test virtual compilation & flashing over VirtualSimTransport
  const vTransport = new VirtualSimTransport();
  await vTransport.connect({ baudRate: avrProto.defaultBaudRate });

  const progressSteps = [];
  const flashRes = await avrProto.flash(vTransport, ['void setup() {}', 'void loop() {}'], {
    onProgress: (pct, msg) => progressSteps.push({ pct, msg })
  });

  assert.equal(flashRes.ok, true, 'AvrStk500Protocol.flash() must succeed over transport');
  assert.equal(flashRes.protocol, 'avr.stk500v1');
  assert.ok(flashRes.sizeBytes >= 24, 'Compiled AVR firmware binary must include header and body bytes');
  assert.ok(progressSteps.length >= 3, 'Flash protocol must emit progress stages up to 100%');
  assert.equal(progressSteps[progressSteps.length - 1].pct, 100);

  // Test ESP32 SLIP packet framing & flashing
  const espRes = await espProto.flash(vTransport, ['void setup() {}', 'void loop() {}']);
  assert.equal(espRes.ok, true, 'Esp32EsptoolProtocol.flash() must succeed over transport');
  assert.equal(espRes.protocol, 'esp32.esptool');

  await vTransport.disconnect();
  assert.equal(vTransport.isConnected, false);

  // Verify WebSerialTransport class inherits from BaseTransport
  const wsTransport = new WebSerialTransport();
  assert.equal(wsTransport instanceof BaseTransport, true);
});

await test('11. Smart Translation Key (i18nKey / @i18n:) Architecture: Dynamic TR/EN resolution for Components, Catalog & Faults', () => {
  const reg = new ComponentRegistry();
  registerAllHardware(reg);

  const led = reg.create('led.single', { id: 'i18n_led' });
  const esp = reg.create('board.esp32_devkit', { id: 'i18n_esp' });
  assert.equal(led.i18nKey, 'hw.led.single');
  assert.equal(esp.i18nKey, 'hw.board.esp32_devkit');

  // Turkish locale
  i18n.setLocale('tr');
  assert.equal(led.name, '5mm LED (Işık Yayan Diyot)');
  assert.ok(led.description.includes('Anot'));
  assert.equal(led.getCalloutDescriptor().label, '5mm LED (Işık Yayan Diyot)');

  const trCatalog = reg.getCatalog();
  const trMotor = trCatalog.find((c) => c.typeId === 'motor.dc');
  assert.equal(trMotor.displayName, 'Fırçalı DC Fan Motoru');

  const trFaultMsg = i18n.resolveToken({
    code: 'elec.fault.overcurrent',
    params: {
      component: '@i18n:hw.led.single.name',
      currentMa: '75.0',
      maxMa: '30'
    }
  });
  assert.ok(trFaultMsg.includes('5mm LED (Işık Yayan Diyot)'), 'Recursive @i18n: parameter must resolve component name in TR');
  assert.ok(trFaultMsg.includes('75.0 mA'));

  // English locale
  i18n.setLocale('en');
  assert.equal(led.name, '5mm LED (Light Emitting Diode)');
  assert.ok(led.description.includes('Anode'));
  assert.equal(led.getCalloutDescriptor().label, '5mm LED (Light Emitting Diode)');

  const enCatalog = reg.getCatalog();
  const enMotor = enCatalog.find((c) => c.typeId === 'motor.dc');
  assert.equal(enMotor.displayName, 'Brushed DC Fan Motor');

  const enFaultMsg = i18n.resolveToken({
    code: 'elec.fault.overcurrent',
    params: {
      component: '@i18n:hw.led.single.name',
      currentMa: '75.0',
      maxMa: '30'
    }
  });
  assert.ok(enFaultMsg.includes('5mm LED (Light Emitting Diode)'), 'Recursive @i18n: parameter must resolve component name in EN');
  assert.ok(enFaultMsg.includes('OVERCURRENT'));

  i18n.setLocale('tr');
});

await test('12. Universal Conductivity, DisjointNetSet & Closed-Loop CircuitFlowSolver (Zero Hardcoded Component Rules)', () => {
  const solver = new CircuitFlowSolver();
  const uno = new ArduinoUnoBoard({ id: 'uno_flow' });
  const esp32 = new ESP32DevKitBoard({ id: 'esp32_flow' });
  const bb = new BreadboardComponent({ id: 'bb_flow' });
  const resistor = new AxialResistorComponent({ id: 'res_220', ohms: 220 });
  const led = new SingleLEDComponent({ id: 'led_test' });
  const btn = new TactilePushButton({ id: 'btn_test' });

  // Drive Arduino PIN13 HIGH (5.0V)
  uno.drivePin('PIN13', 5.0);

  // 12a. Open-Loop Test (LED Cathode not connected to GND -> 0mA, LED stays OFF)
  const openRes = solver.solve({
    components: [uno, resistor, led],
    connections: [
      { from: 'uno_flow.PIN13', to: 'res_220.LEAD_A' },
      { from: 'res_220.LEAD_B', to: 'led_test.ANODE' }
    ]
  });
  assert.equal(openRes.loops.length, 0, 'Open loop without GND return must have 0 active current loops');
  assert.equal(openRes.componentReports.led_test.current, 0);
  assert.equal(led.state.brightness, 0, 'LED must remain off when circuit loop is open');

  // 12b. Closed-Loop via Breadboard 5-Hole Strips + 220Ω Series Resistor -> ~11.5mA safe illumination
  // Route: Uno PIN13 -> Breadboard A5; Breadboard B5 -> Resistor LEAD_A; Resistor LEAD_B -> Breadboard B9;
  //        Breadboard D9 -> LED ANODE; LED CATHODE -> Breadboard D12; Breadboard E12 -> Uno GND
  const safeLoopRes = solver.solve({
    components: [uno, bb, resistor, led],
    connections: [
      { from: 'uno_flow.PIN13', to: 'bb_flow.A5' },
      { from: 'bb_flow.B5', to: 'res_220.LEAD_A' },
      { from: 'res_220.LEAD_B', to: 'bb_flow.B9' },
      { from: 'bb_flow.D9', to: 'led_test.ANODE' },
      { from: 'led_test.CATHODE', to: 'bb_flow.D12' },
      { from: 'bb_flow.E12', to: 'uno_flow.GND' }
    ]
  });
  assert.equal(safeLoopRes.loops.length, 1, 'Breadboard 5-hole vertical strips must complete the closed loop');
  assert.ok(
    safeLoopRes.componentReports.led_test.currentMa > 10 && safeLoopRes.componentReports.led_test.currentMa < 20,
    `Expected ~11.5mA LED current with 220Ω resistor, got ${safeLoopRes.componentReports.led_test.currentMa}mA`
  );
  assert.equal(led.state.burnedOut, false, 'LED protected by 220Ω resistor must not burn out');
  assert.ok(led.state.brightness > 0.7, 'LED must illuminate proportionally to closed-loop current');

  // 12c. Overcurrent Burnout Test (Direct 5.0V -> LED -> GND WITHOUT Resistor -> ~75mA > 30mA max -> Burnout!)
  const ledBurn = new SingleLEDComponent({ id: 'led_burn' });
  const burnRes = solver.solve({
    components: [uno, ledBurn],
    connections: [
      { from: 'uno_flow.PIN13', to: 'led_burn.ANODE' },
      { from: 'led_burn.CATHODE', to: 'uno_flow.GND' }
    ]
  });
  assert.ok(burnRes.componentReports.led_burn.currentMa > 50, 'Unprotected LED current should exceed 50mA');
  assert.equal(ledBurn.state.burnedOut, true, 'LED must burn out via inherited ConductiveDipole maxCurrent limit');
  assert.equal(ledBurn.state.brightness, 0, 'Burned-out LED must extinguish');
  assert.ok(
    burnRes.faults.some((f) => f.code === 'elec.fault.overcurrent' && f.componentId === 'led_burn'),
    'Solver must report elec.fault.overcurrent for unprotected LED'
  );

  // 12d. Switch Contact Dipole (BaseButton): Open when released, conducts when pressed
  btn.release();
  const btnOpenRes = solver.solve({
    components: [uno, btn, resistor, led],
    connections: [
      { from: 'uno_flow.PIN13', to: 'btn_test.TERMINAL_A' },
      { from: 'btn_test.TERMINAL_B', to: 'res_220.LEAD_A' },
      { from: 'res_220.LEAD_B', to: 'led_test.ANODE' },
      { from: 'led_test.CATHODE', to: 'uno_flow.GND' }
    ]
  });
  assert.equal(btnOpenRes.loops.length, 0, 'Released button contact dipole must block current flow');
  assert.equal(led.state.brightness, 0);

  btn.press();
  const btnClosedRes = solver.solve({
    components: [uno, btn, resistor, led],
    connections: [
      { from: 'uno_flow.PIN13', to: 'btn_test.TERMINAL_A' },
      { from: 'btn_test.TERMINAL_B', to: 'res_220.LEAD_A' },
      { from: 'res_220.LEAD_B', to: 'led_test.ANODE' },
      { from: 'led_test.CATHODE', to: 'uno_flow.GND' }
    ]
  });
  assert.equal(btnClosedRes.loops.length, 1, 'Pressed button contact dipole must close the loop and conduct');
  assert.ok(led.state.brightness > 0.7);

  // 12e. Multi-Board 5.0V Uno -> 3.3V ESP32 Overvoltage Protection Fault
  const overVoltRes = solver.solve({
    components: [uno, esp32],
    connections: [
      { from: 'uno_flow.GND', to: 'esp32_flow.GND' },
      { from: 'uno_flow.PIN13', to: 'esp32_flow.GPIO4' }
    ]
  });
  assert.ok(
    overVoltRes.faults.some((f) => f.code === 'elec.fault.overvoltage' && f.componentId === 'esp32_flow'),
    'Connecting 5.0V Arduino Uno output directly to 3.3V ESP32 GPIO4 must trigger elec.fault.overvoltage'
  );

  // 12f. AI-Generated Custom Component Compatibility (Works with ZERO solver changes!)
  class AiLaserDiodeComponent extends HardwareComponent {
    static typeId = 'ai.custom_laser';
    static category = 'leds';
    static displayName = 'AI Custom Laser Module';
    buildMesh() {
      this.group.add(cyl(2, 2, 6, 12, mat('#ff0055', 0.3), 0, 3, 0));
      this.definePin('LASER_IN', [-2, 0, 0]);
      this.definePin('LASER_GND', [2, 0, 0]);
    }
    onElectricalFlow(report) {
      this.setState({ active: report.closedLoop && report.current > 0 && !this.state.burnedOut });
    }
  }
  const aiLaser = new AiLaserDiodeComponent({
    id: 'ai_laser_1',
    dipoles: [
      {
        id: 'laser_junction',
        pinA: 'LASER_IN',
        pinB: 'LASER_GND',
        resistance: 120,
        forwardVoltage: 2.2,
        unidirectional: true,
        maxCurrent: 0.04
      }
    ]
  });
  const aiRes = solver.solve({
    components: [uno, aiLaser],
    connections: [
      { from: 'uno_flow.PIN13', to: 'ai_laser_1.LASER_IN' },
      { from: 'ai_laser_1.LASER_GND', to: 'uno_flow.GND' }
    ]
  });
  assert.equal(aiRes.loops.length, 1, 'AI-generated component with declarative dipole must conduct in closed loop');
  assert.equal(aiLaser.state.active, true);
});

await test('13. Bidirectional ScenarioSerializer (CircuitScenarioSchema v2), Multi-Board Sandbox & PinSnapIndex', () => {
  const reg = new ComponentRegistry();
  registerAllHardware(reg);
  const stageGroup = new THREE.Group();

  // 13a. Guided Lesson -> Scenario JSON v2 conversion
  const blinkLesson = LESSONS.find((l) => l.id === 'blink');
  const blinkScenario = ScenarioSerializer.lessonToScenario(blinkLesson);
  const check = ScenarioSerializer.validate(blinkScenario);
  assert.equal(check.valid, true, 'Converted Blink lesson must satisfy CircuitScenarioSchema v2');
  assert.equal(blinkScenario.version, '2.0');
  assert.equal(blinkScenario.boards.length, 1);
  assert.equal(blinkScenario.connections.length, 3);

  // 13b. Multi-Board Preset (Arduino Uno + ESP32 simultaneously on stage)
  const multiPreset = createMultiBoardBridgePreset();
  const built = ScenarioSerializer.deserializeToStage(multiPreset, {
    registry: reg,
    stageGroup
  });
  assert.equal(built.boards.length, 2, 'Multi-board scenario must instantiate both Arduino Uno and ESP32 simultaneously');
  assert.equal(built.boards[0] instanceof ArduinoUnoBoard, true);
  assert.equal(built.boards[1] instanceof ESP32DevKitBoard, true);

  // Drive Uno PIN13 HIGH and verify current flows through resistor & LED into ESP32 shared GND!
  built.boards[0].drivePin('PIN13', 5.0);
  const multiFlow = circuitFlowSolver.solve({
    components: built.allHardware,
    connections: built.connections
  });
  assert.equal(
    multiFlow.loops.length,
    1,
    'Current must flow from Arduino Uno PIN13 through resistor & LED to ESP32 GND via common ground bridge'
  );

  // 13c. PinSnapIndex & InteractiveWireTool point-to-point wiring + Round-Trip JSON Serialization
  const snapIndex = new PinSnapIndex(4.0);
  snapIndex.rebuild(built.allHardware);
  const espGpio2Pos = built.boards[1].getPinWorldPosition('GPIO2');
  const snapped = snapIndex.findNearestPin([espGpio2Pos[0] + 0.8, espGpio2Pos[1], espGpio2Pos[2] - 0.5]);
  assert.ok(snapped, 'PinSnapIndex must magnetically snap to nearby 3D pin');
  assert.equal(snapped.endpointId, 'esp32_aux.GPIO2');

  const wireTool = new InteractiveWireTool({
    registry: reg,
    stageGroup,
    pinSnapIndex: snapIndex
  });
  wireTool.setConnections(built.connections);
  const click1 = wireTool.selectPinEndpoint('esp32_aux.GPIO2');
  assert.equal(click1.status, 'pending');
  const click2 = wireTool.selectPinEndpoint('bb_shared.A1');
  assert.equal(click2.status, 'connected');
  assert.equal(wireTool.getConnections().length, 5);

  // Round-trip serialize back to JSON string and re-import into ScenarioRegistry
  const exported = ScenarioSerializer.serializeStage({
    id: 'scenario.roundtrip_test',
    boards: built.boards,
    components: built.components,
    connections: wireTool.getConnections()
  });
  const jsonString = JSON.stringify(exported);
  const sReg = new ScenarioRegistry();
  const reimported = sReg.importJSON(jsonString);
  assert.equal(reimported.id, 'scenario.roundtrip_test');
  assert.equal(reimported.boards.length, 2);
  assert.equal(reimported.connections.length, 5);
});

await test('14. Categorized Searchable Component Catalog & Unlimited Independent Component Spawning', () => {
  const reg = new ComponentRegistry();
  registerAllHardware(reg);

  // 14a. Search by keyword & filter by category + getCategories() iterable
  const categories = ['all', ...reg.getCategories()];
  assert.ok(categories.includes('boards') && categories.includes('motors') && categories.includes('leds'));

  const catalogModal = new ComponentCatalogModal({ stageEl: null, stage: null, registry: reg });
  assert.equal(catalogModal.dockMode, 'modal');
  assert.equal(catalogModal.cycleDockMode(), 'left');
  assert.equal(catalogModal.cycleDockMode(), 'right');
  assert.equal(catalogModal.cycleDockMode(), 'bottom');
  assert.equal(catalogModal.cycleDockMode(), 'modal');

  const allCatalog = reg.searchCatalog({ query: '', category: 'all' });
  assert.ok(allCatalog.length >= 11, 'Catalog should return all non-wire hardware components');

  const espMatches = reg.searchCatalog({ query: 'esp32', category: 'all' });
  assert.equal(espMatches.length, 1);
  assert.equal(espMatches[0].typeId, 'board.esp32_devkit');

  const motorMatches = reg.searchCatalog({ query: '', category: 'motors' });
  assert.equal(motorMatches.length, 5, 'Motors category should contain 5 motor components (DC, Servo, N20, Mecanum, Gimbal)');

  const grouped = reg.getCatalogGroupedByCategory({ query: 'motor' });
  const motorGroup = grouped.find((g) => g.category === 'motors');
  assert.ok(motorGroup && motorGroup.items.length >= 2);

  // 14b. Spawn 5 independent instances of the same component (e.g. 5 LEDs + 3 PushButtons)
  const spawnedLeds = [];
  for (let i = 1; i <= 5; i++) {
    const inst = reg.create('led.single', {
      id: `stage.led_single_${i}`,
      position: [10 + i * 5.08, 5.2, -10]
    });
    spawnedLeds.push(inst);
  }
  assert.equal(
    reg.getInstancesByTypeId('led.single').length,
    5,
    'Registry must track all 5 independent LED instances'
  );

  const ledCatalogEntry = reg.searchCatalog({ query: 'led.single' })[0];
  assert.equal(
    ledCatalogEntry.instanceCount,
    5,
    'Catalog entry must report live stage instanceCount = 5'
  );
});

await test('15. 3D Transform Gizmo Algorithm (GizmoMath), Rotated Pin World Coordinates & Dynamic Wire Stretching', () => {
  const reg = new ComponentRegistry();
  registerAllHardware(reg);
  const stageGroup = new THREE.Group();
  const scene = new THREE.Scene();
  scene.add(stageGroup);
  const camera = new THREE.OrthographicCamera(-60, 60, 40, -40, -400, 600);

  // 15a. GizmoMath Axis Projection & Planar XZ Dragging + 2.54mm Grid Snapping
  assert.equal(GizmoMath.snapValue(5.0, 2.54), 5.08, 'snapValue must snap 5.0mm to nearest 2.54mm breadboard pitch (5.08mm)');
  assert.equal(GizmoMath.snapAngle(Math.PI / 4 + 0.03, 15), Number((Math.PI / 4).toFixed(4)));

  const startPos = [10.16, 5.2, 0];
  // Vertical downward ray at X = 25.4, Z = 0
  const rayOrigin = [25.4, 100, 0];
  const rayDir = [0, -1, 0];
  const proj = GizmoMath.projectRayOntoAxis(rayOrigin, rayDir, startPos, 'X');
  const draggedAxisPos = GizmoMath.computeAxisDragPosition({
    startPosition: startPos,
    axis: 'X',
    startScalar: 0,
    currentScalar: proj.scalar,
    snapStep: 2.54
  });
  assert.equal(draggedAxisPos[0], 25.4, 'Single-axis X gizmo drag must move component X to 25.4mm');
  assert.equal(draggedAxisPos[1], 5.2, 'Single-axis X gizmo drag must lock Y coordinate');
  assert.equal(draggedAxisPos[2], 0, 'Single-axis X gizmo drag must lock Z coordinate');

  // Planar XZ drag test
  const startPlaneHit = [10.16, 5.2, 0];
  const currentHit = GizmoMath.intersectHorizontalPlane([20.32, 100, -15.24], rayDir, 5.2);
  const draggedXZPos = GizmoMath.computePlanarXZDragPosition({
    startPosition: startPos,
    startHit: startPlaneHit,
    currentHit,
    snapStep: 2.54
  });
  assert.equal(draggedXZPos[0], 20.32);
  assert.equal(draggedXZPos[1], 5.2);
  assert.equal(draggedXZPos[2], -15.24);

  // 15b. Euler-aware getPinWorldPosition when component is rotated 90 degrees around Y
  const led = reg.create('led.single', { id: 'stage.led_gizmo', position: [10, 5, 20] });
  stageGroup.add(led.group);
  // Unrotated ANODE is at local [-1.3, 0.3, 0] -> world [8.7, 5.3, 20]
  const pBefore = led.getPinWorldPosition('ANODE');
  assert.ok(Math.abs(pBefore[0] - 8.7) < 0.02 && Math.abs(pBefore[2] - 20) < 0.02);

  // Rotate 90 degrees (+PI/2) around Y: local [-1.3, 0.3, 0] rotates to [0, 0.3, +1.3] -> world [10, 5.3, 21.3]
  led.setRotationY(Math.PI / 2);
  const pAfter = led.getPinWorldPosition('ANODE');
  assert.ok(
    Math.abs(pAfter[0] - 10) < 0.02 && Math.abs(pAfter[2] - 21.3) < 0.02,
    `Expected rotated ANODE pin world position near [10, 5.3, 21.3], got [${pAfter.join(', ')}]`
  );

  // 15c. StageTransformController + Dynamic Jumper Wire Stretching on Gizmo Move
  const uno = reg.create('board.arduino_uno', { id: 'main.uno', position: [0, 0, 0] });
  stageGroup.add(uno.group);
  const snapIndex = new PinSnapIndex(4.0);
  snapIndex.rebuild([uno, led]);
  const wireTool = new InteractiveWireTool({
    registry: reg,
    stageGroup,
    pinSnapIndex: snapIndex
  });
  const wireInst = wireTool.connectEndpoints('main.uno.PIN13', 'stage.led_gizmo.ANODE', '#ef4444');
  assert.ok(wireInst, 'Jumper wire must be created between Uno PIN13 and LED ANODE');

  const transformCtrl = new StageTransformController({
    scene,
    camera,
    registry: reg,
    onComponentTransformed: (comp) => {
      wireTool.refreshConnectedWires(comp.id);
    }
  });
  transformCtrl.selectComponent(led);
  assert.equal(transformCtrl.gizmo.group.visible, true, 'Tabletop selection ring must become visible when attached to LED');
  assert.equal(transformCtrl.gizmo.axesVisible, false, '3D Gizmo arrows must default to hidden so free tabletop XZ dragging is unobstructed');
  assert.equal(transformCtrl.gizmo.getColliders().length, 0, 'Hidden 3D Gizmo arrows must not intercept pointer raycasts');
  assert.equal(transformCtrl.toggleGizmoAxes(), true, 'toggleGizmoAxes() must enable 3D Gizmo arrows on demand');
  assert.ok(transformCtrl.gizmo.getColliders().length > 0, 'Enabled 3D Gizmo arrows must expose raycast colliders');
  assert.equal(transformCtrl.toggleGizmoAxes(), false, 'toggleGizmoAxes() must return to unobstructed tabletop drag mode');

  transformCtrl.moveSelectedTo(30.48, 5.08, -12.7);
  const updatedEndPoint = wireInst.wireMeta.points[wireInst.wireMeta.points.length - 1];
  const newAnodePos = led.getPinWorldPosition('ANODE');
  assert.ok(
    Math.hypot(updatedEndPoint[0] - newAnodePos[0], updatedEndPoint[2] - newAnodePos[2]) < 0.05,
    'Connected 3D jumper wire endpoint must dynamically stretch and follow component when moved by Gizmo'
  );
});

await test('16. Flownie-3D Hybrid Smart Wiring: SmartPinMatcher, PinHudOverlay, Quick Connect, Disconnect All & Auto-Wire', () => {
  const reg = new ComponentRegistry();
  registerAllHardware(reg);
  const stageGroup = new THREE.Group();
  const scene = new THREE.Scene();
  scene.add(stageGroup);
  const camera = new THREE.OrthographicCamera(-60, 60, 40, -40, -400, 600);
  camera.position.set(0, 80, 80);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();

  const uno = reg.create('board.arduino_uno', { id: 'main.uno', position: [-34, 0, 0] });
  const esp32 = reg.create('board.esp32_devkit', { id: 'aux.esp32', position: [34, 0, 0] });
  const led = reg.create('led.single', { id: 'stage.led1', position: [12, 5.2, -10] });
  const resistor = reg.create('passive.resistor', { id: 'stage.res1', position: [4, 5.2, -10], ohms: 220 });
  const pot = reg.create('sensor.potentiometer', { id: 'stage.pot1', position: [20, 5.2, 8] });
  stageGroup.add(uno.group, esp32.group, led.group, resistor.group, pot.group);

  // 16a. Electrical Safety & Compatibility Validation (No Short Circuits / No Overvoltage)
  const uno5V = uno.electricalPins.get('5V');
  const uno3V3 = uno.electricalPins.get('3V3');
  const unoGnd = uno.electricalPins.get('GND');
  const unoA0 = uno.electricalPins.get('A0');
  const unoPin9 = uno.electricalPins.get('PIN9');
  const unoPin13 = uno.electricalPins.get('PIN13');
  const espGpio2 = esp32.electricalPins.get('GPIO2');
  const ledAnode = led.electricalPins.get('ANODE');
  const ledCathode = led.electricalPins.get('CATHODE');
  const potWiper = pot.electricalPins.get('WIPER');
  const potVcc = pot.electricalPins.get('VCC');
  const resLeadA = resistor.electricalPins.get('LEAD_A');

  const shortCheck = SmartPinMatcher.validatePinCompatibility(uno5V, unoGnd);
  assert.equal(shortCheck.valid, false, 'Direct 5V <-> GND short circuit must be rejected');
  assert.equal(shortCheck.reasonKey, 'elec.wiring.err.short_circuit');
  assert.equal(SmartPinMatcher.scorePinPair(uno5V, unoGnd), 0, 'Short circuit pair must score 0');

  const railConflict = SmartPinMatcher.validatePinCompatibility(uno5V, uno3V3);
  assert.equal(railConflict.valid, false, '5V <-> 3.3V power rail conflict must be rejected');
  assert.equal(railConflict.reasonKey, 'elec.wiring.err.power_conflict');

  const overvoltageCheck = SmartPinMatcher.validatePinCompatibility(uno5V, espGpio2);
  assert.equal(overvoltageCheck.valid, false, '5.0V rail into 3.3V max ESP32 GPIO must be rejected as overvoltage');
  assert.equal(overvoltageCheck.reasonKey, 'elec.wiring.err.overvoltage');

  // 16b. Scored Pin Matching Hierarchy (4 -> 3 -> 2 -> 0)
  assert.equal(SmartPinMatcher.scorePinPair(unoA0, potWiper), 4, 'ADC <-> Potentiometer WIPER must score 4 (exact protocol match)');
  assert.equal(SmartPinMatcher.scorePinPair(uno5V, potVcc), 4, '5V <-> Sensor VCC_IN must score 4');
  assert.equal(SmartPinMatcher.scorePinPair(unoGnd, ledCathode), 4, 'GND <-> LED CATHODE must score 4');
  assert.equal(SmartPinMatcher.scorePinPair(unoPin9, ledAnode), 4, 'PWM Pin 9 <-> LED ANODE must score 4');
  assert.equal(SmartPinMatcher.scorePinPair(unoPin13, ledAnode), 3, 'Standard Digital Pin 13 <-> LED ANODE must score 3');
  assert.equal(SmartPinMatcher.scorePinPair(unoPin13, resLeadA), 2, 'GPIO <-> Passive Resistor LEAD_A must score 2');

  // 16c. PinHudOverlay 3D-to-2D Screen Projection & Pill Badge Formatting
  const pinWorld = uno.getPinWorldPosition('PIN9');
  const screenProj = PinHudOverlay.projectWorldToScreen(pinWorld, camera, 800, 520);
  assert.equal(screenProj.visible, true, 'Projected 3D pin inside camera frustum must be visible in 2D HUD');
  assert.ok(screenProj.x > 0 && screenProj.x < 800 && screenProj.y > 0 && screenProj.y < 520);

  const badgePwm = PinHudOverlay.formatPinBadge(unoPin9);
  assert.equal(badgePwm.label, 'D9 • PWM');
  assert.equal(badgePwm.category.id, 'PWM');

  const badgeAdc = PinHudOverlay.formatPinBadge(unoA0);
  assert.equal(badgeAdc.label, 'A0 • ADC');
  assert.equal(badgeAdc.category.id, 'ANALOG');

  // 16d. StageTransformController Unified Action Dock: Quick Connect & Disconnect All [N]
  const snapIndex = new PinSnapIndex(4.0);
  const wireTool = new InteractiveWireTool({
    registry: reg,
    stageGroup,
    pinSnapIndex: snapIndex
  });
  const pinHud = new PinHudOverlay({
    camera,
    registry: reg,
    wireTool
  });
  const transformCtrl = new StageTransformController({
    scene,
    camera,
    registry: reg,
    wireTool,
    pinHudOverlay: pinHud
  });

  transformCtrl.selectComponent(uno);
  assert.equal(transformCtrl.startQuickConnect(), true, 'Quick Connect mode must activate when a component is selected');
  assert.equal(transformCtrl.isQuickConnectMode, true);

  // First Quick Connect click on Potentiometer: wires highest-scoring signal/power pin
  const qc1 = transformCtrl.quickConnectTo(pot);
  assert.equal(qc1.connected, true, 'First Quick Connect click on Potentiometer must create a wire');
  assert.equal(wireTool.getComponentWireCount(pot.id), 1);

  // Second Quick Connect click on Potentiometer: wires second pin
  const qc2 = transformCtrl.quickConnectTo(pot);
  assert.equal(qc2.connected, true, 'Second Quick Connect click on Potentiometer must wire next free pin');
  assert.equal(wireTool.getComponentWireCount(pot.id), 2);

  // Third Quick Connect click on Potentiometer: wires third pin (GND)
  const qc3 = transformCtrl.quickConnectTo(pot);
  assert.equal(qc3.connected, true, 'Third Quick Connect click on Potentiometer must wire remaining GND pin');
  assert.equal(wireTool.getComponentWireCount(pot.id), 3);

  // Fourth Quick Connect click on Potentiometer: all 3 pins occupied -> returns connected: false
  const qc4 = transformCtrl.quickConnectTo(pot);
  assert.equal(qc4.connected, false, 'Fourth Quick Connect click when all pins are occupied must return connected: false');
  assert.equal(qc4.reasonKey, 'elec.wiring.err.no_free_pins');

  // Verify 3D wire midpoint calculation for the `×` delete badge
  const firstWireId = wireTool.getWiresForComponent(pot.id)[0].id;
  const midWorld = wireTool.getWireMidpointWorld(firstWireId);
  assert.ok(Array.isArray(midWorld) && midWorld.length === 3, 'getWireMidpointWorld must return 3D [x,y,z] apex');

  // Disconnect All Wires (`🔗̸ Kopar [N]`) on Potentiometer
  transformCtrl.selectComponent(pot);
  const removedWires = transformCtrl.disconnectSelectedWires();
  assert.equal(removedWires, 3, 'disconnectSelectedWires must remove all 3 wires from Potentiometer');
  assert.equal(wireTool.getComponentWireCount(pot.id), 0);

  // 16e. Rule-Based Zero-Cost Stage Auto-Wire (`⚡ Akıllı Bağla`) with Series Resistor + LED Protection
  const autoResult = transformCtrl.autoWireStage();
  assert.ok(autoResult.createdCount >= 6, `Expected Auto-Wire to create at least 6 wires, created ${autoResult.createdCount}`);

  // Verify that Resistor and LED were wired in series to protect the LED from burnout!
  for (const [pinName, ePin] of uno.electricalPins.entries()) {
    if (ePin.role === 'GPIO') {
      uno.drivePin(pinName, 5.0);
    }
  }
  const flow = circuitFlowSolver.solve({
    components: [uno, esp32, led, resistor, pot],
    connections: wireTool.getConnections()
  });
  const ledReport = flow.componentReports[led.id];
  assert.ok(ledReport, 'Auto-wired LED must have a solved electrical report');
  assert.ok(ledReport.currentMa > 10 && ledReport.currentMa < 20, `Auto-wired LED through 220Ω series resistor must draw ~11.5mA, got ${ledReport.currentMa}mA`);
  assert.equal(led.state.burnedOut, false, 'Auto-wired LED must be protected by series resistor (burnedOut === false)');
  assert.ok(led.state.brightness > 0.7, 'Auto-wired LED must illuminate in closed loop');

  // 16f. i18n Translation Keys Verification (TR & EN)
  i18n.setLocale('tr');
  assert.equal(i18n.t('stage.wiring.quick_connect'), '🔗 Hızlı Bağla');
  assert.equal(i18n.t('stage.wiring.auto_wire'), '⚡ Akıllı Bağla');
  i18n.setLocale('en');
  assert.equal(i18n.t('stage.wiring.quick_connect'), '🔗 Quick Connect');
  assert.equal(i18n.t('stage.wiring.auto_wire'), '⚡ Auto-Wire');
});

await test('17. Centralized UserSettingsService, Cloud Profile Sync, Pin Visibility Modes & Nearest Same-Class Drag Highlighting', async () => {
  // 17a. OOP Adapter Hierarchy & Default Pin Visibility Mode ('pin_hover')
  const localAdapter = new LocalSettingsAdapter({ storageKey: 'test.arduino3d.settings' });
  const remoteCloudStore = {
    version: 1,
    updatedAt: Date.now() + 5000,
    values: {
      'wiring.pinVisibilityMode': PIN_VISIBILITY_MODES.COMPONENT_HOVER,
      'wiring.highlightNearestClassOnDrag': true,
      'wiring.nearestHighlightCount': 4,
      'ui.catalogDockMode': 'right'
    }
  };
  let savedToCloud = null;
  const remoteAdapter = new RemoteApiSettingsAdapter({
    baseUrl: 'https://api.arduino3d.local/v1/me/settings',
    transport: async ({ method, body }) => {
      if (method === 'GET') {
        return remoteCloudStore;
      }
      savedToCloud = body;
      return { ok: true };
    }
  });

  assert.equal(localAdapter instanceof BaseSettingsAdapter, true, 'LocalSettingsAdapter must inherit from BaseSettingsAdapter');
  assert.equal(remoteAdapter instanceof BaseSettingsAdapter, true, 'RemoteApiSettingsAdapter must inherit from BaseSettingsAdapter');

  const settingsSvc = new UserSettingsService({ localAdapter, remoteAdapter });
  assert.equal(
    settingsSvc.get('wiring.pinVisibilityMode'),
    PIN_VISIBILITY_MODES.PIN_HOVER,
    'Default pin visibility mode must be pin_hover (only show pin label when hovering directly on the pin)'
  );
  assert.equal(
    settingsSvc.get('wiring.highlightNearestClassOnDrag'),
    true,
    'Nearest same-class pin colorization on drag must be enabled by default'
  );

  // 17b. Background Login & Profile Hydration (loginAndHydrate) + Cloud Save
  const hydration = await settingsSvc.loginAndHydrate({
    userId: 'usr_savas_42',
    displayName: 'Savaş',
    token: 'jwt_live_token_123'
  });
  assert.equal(hydration.hydrated, true, 'loginAndHydrate must hydrate user profile settings from remote backend');
  assert.equal(
    settingsSvc.get('wiring.pinVisibilityMode'),
    PIN_VISIBILITY_MODES.COMPONENT_HOVER,
    'Remote user preference (component_hover) must hydrate into active settings on login'
  );
  assert.equal(settingsSvc.get('ui.catalogDockMode'), 'right');

  // Mutating a setting while logged in must sync to both local adapter and remote backend adapter
  settingsSvc.set('wiring.pinVisibilityMode', PIN_VISIBILITY_MODES.PIN_HOVER);
  assert.ok(savedToCloud, 'Changing setting while authenticated must push updated envelope to RemoteApiSettingsAdapter');
  assert.equal(savedToCloud.values['wiring.pinVisibilityMode'], PIN_VISIBILITY_MODES.PIN_HOVER);

  // 17c. Nearest Same-Class Compatible Pin Ranking on Drag (SmartPinMatcher.rankCompatibleTargetPins)
  const reg = new ComponentRegistry();
  registerAllHardware(reg);
  const uno = reg.create('board.arduino_uno', { id: 'main.uno', position: [-30, 0, 0] });
  const ledNear = reg.create('led.single', { id: 'stage.led_near', position: [10, 5.2, 0] });
  const ledFar = reg.create('led.single', { id: 'stage.led_far', position: [45, 5.2, 25] });
  const pot = reg.create('sensor.potentiometer', { id: 'stage.pot', position: [15, 5.2, -10] });

  const sourcePin = uno.electricalPins.get('PIN9'); // PWM GPIO output
  const candidates = [];
  for (const comp of [uno, ledNear, ledFar, pot]) {
    for (const [pinName, ePin] of comp.electricalPins.entries()) {
      const worldPos = comp.getPinWorldPosition(pinName);
      candidates.push({
        pin: ePin,
        x: worldPos[0] * 10,
        y: worldPos[2] * 10,
        worldPos
      });
    }
  }

  // Dragging cursor near ledNear ([100, 0] in screen coords)
  const rankings = SmartPinMatcher.rankCompatibleTargetPins(
    sourcePin,
    candidates,
    { x: 90, y: 0 },
    { nearestCount: 2 }
  );

  const nearAnodeRank = rankings.find((r) => r.endpointId === 'stage.led_near.ANODE');
  const farAnodeRank = rankings.find((r) => r.endpointId === 'stage.led_far.ANODE');
  const unoGndRank = rankings.find((r) => r.endpointId === 'main.uno.GND');

  assert.ok(nearAnodeRank, 'Nearby LED ANODE must be evaluated in drag compatibility rankings');
  assert.equal(nearAnodeRank.compatible, true, 'PWM PIN9 -> LED ANODE must be compatible');
  assert.equal(nearAnodeRank.sameClass, true, 'PWM PIN9 -> LED ANODE must be marked as same connectable class (score >= 3)');
  assert.equal(nearAnodeRank.isNearest, true, 'Closest LED ANODE must be flagged as isNearest');
  assert.equal(nearAnodeRank.nearestRank, 1, 'Closest LED ANODE must be ranked #1 nearest compatible target');
  assert.equal(nearAnodeRank.classColor, '#8b5cf6', 'Dragging PWM pin must colorize compatible targets with PWM class color (#8b5cf6)');

  assert.equal(farAnodeRank.compatible, true);
  assert.equal(farAnodeRank.sameClass, true);
  assert.equal(unoGndRank.compatible, false, 'Same-component Uno GND must not be marked compatible when dragging Uno PIN9');

  // 17d. PinHudOverlay Visibility Modes (pin_hover vs component_hover vs always)
  const camera = new THREE.OrthographicCamera(-60, 60, 40, -40, -400, 600);
  const pinHud = new PinHudOverlay({
    camera,
    registry: reg,
    settings: settingsSvc
  });

  settingsSvc.set('wiring.pinVisibilityMode', PIN_VISIBILITY_MODES.PIN_HOVER);
  assert.equal(pinHud.getPinVisibilityMode(), PIN_VISIBILITY_MODES.PIN_HOVER);
  assert.equal(pinHud.getVisibleComponents().length, 0, 'In pin_hover mode with nothing hovered/selected, 0 components are mounted');

  pinHud.setHoveredComponent(ledNear);
  assert.equal(pinHud.getVisibleComponents().length, 1, 'Hovering a component mounts its port targets so individual pins can detect pointer hover');

  settingsSvc.set('wiring.pinVisibilityMode', PIN_VISIBILITY_MODES.ALWAYS);
  assert.equal(pinHud.getVisibleComponents().length, 4, 'In always mode, all non-wire/non-breadboard stage components are visible');
});

await test('18. Flownie 1-to-1 Sequential Target-Driven Smart Connect: Source A -> Clicked Targets B, C (Unclicked D Untouched)', () => {
  const reg = new ComponentRegistry();
  registerAllHardware(reg);
  const stageGroup = new THREE.Group();
  const scene = new THREE.Scene();
  scene.add(stageGroup);
  const camera = new THREE.OrthographicCamera(-60, 60, 40, -40, -400, 600);

  // Spawn 4 components on stage: A (Arduino Uno), B (LED 1), C (Potentiometer), D (LED 2 - never clicked)
  const compA = reg.create('board.arduino_uno', { id: 'main.uno', position: [-32, 0, 0] });
  const compB = reg.create('led.single', { id: 'stage.led_b', position: [8, 5.2, -12] });
  const compC = reg.create('sensor.potentiometer', { id: 'stage.pot_c', position: [14, 5.2, 6] });
  const compD = reg.create('led.single', { id: 'stage.led_d_unclicked', position: [28, 5.2, -12] });
  stageGroup.add(compA.group, compB.group, compC.group, compD.group);

  const snapIndex = new PinSnapIndex(4.0);
  const wireTool = new InteractiveWireTool({
    registry: reg,
    stageGroup,
    pinSnapIndex: snapIndex
  });
  const pinHud = new PinHudOverlay({
    camera,
    registry: reg,
    wireTool
  });
  const transformCtrl = new StageTransformController({
    scene,
    camera,
    registry: reg,
    wireTool,
    pinHudOverlay: pinHud
  });

  // 18a. Select Component A and activate Smart Connect ("⚡ Akıllı Bağla"):
  // Must NOT auto-wire any component on the stage on button press!
  transformCtrl.selectComponent(compA);
  assert.equal(transformCtrl.toggleQuickConnect(), true, 'Toggling Smart Connect on Component A must activate Quick Connect mode');
  assert.equal(transformCtrl.isQuickConnectMode, true);
  assert.equal(pinHud.quickConnectSourceComponent, compA, 'PinHudOverlay must track Component A as the locked Smart Connect source');
  assert.equal(
    wireTool.getConnections().length,
    0,
    'Activating Smart Connect on Component A must create 0 wires until the user clicks a target component'
  );
  assert.equal(wireTool.getComponentWireCount(compB.id), 0);
  assert.equal(wireTool.getComponentWireCount(compC.id), 0);
  assert.equal(wireTool.getComponentWireCount(compD.id), 0);

  // 18b. Hovering over Component B previews the single best compatible pin match between A and B
  pinHud.setHoveredComponent(compB);
  const previewAB = pinHud.computeQuickConnectPreviewMatch();
  assert.ok(previewAB, 'Hovering Component B while A is in Smart Connect mode must compute a preview pin match');
  assert.equal(previewAB.targetPin.endpointId, 'stage.led_b.ANODE');

  // 18c. Click #1 -> User clicks Component B: connects 1 best compatible pin between A and B, keeps A selected
  const clickB1 = transformCtrl.handleStageComponentClick(compB);
  assert.equal(clickB1.action, 'smart-connected', 'Clicking Component B while A is in Smart Connect mode must smart-connect A and B');
  assert.equal(clickB1.connected, true);
  assert.equal(transformCtrl.selectedComponent, compA, 'Component A must remain the selected source after clicking B');
  assert.equal(transformCtrl.isQuickConnectMode, true, 'Smart Connect mode must stay active on A for subsequent target clicks');
  assert.equal(wireTool.getComponentWireCount(compB.id), 1, 'Component B must have 1 wire connected to A');
  assert.equal(wireTool.getComponentWireCount(compC.id), 0, 'Unclicked Component C must still have 0 wires');
  assert.equal(wireTool.getComponentWireCount(compD.id), 0, 'Unclicked Component D must still have 0 wires');
  assert.deepEqual(transformCtrl.lastSmartConnectedPair, {
    from: clickB1.result.match.sourcePin.endpointId,
    to: 'stage.led_b.ANODE'
  });

  // 18d. Click #2 -> User clicks Component C: connects 1 best compatible pin between A and C, keeps A selected
  const clickC1 = transformCtrl.handleStageComponentClick(compC);
  assert.equal(clickC1.action, 'smart-connected', 'Clicking Component C next must smart-connect A and C');
  assert.equal(clickC1.connected, true);
  assert.equal(transformCtrl.selectedComponent, compA, 'Component A must remain the selected source after clicking C');
  assert.equal(wireTool.getComponentWireCount(compB.id), 1);
  assert.equal(wireTool.getComponentWireCount(compC.id), 1, 'Component C must now have 1 wire connected to A');
  assert.equal(wireTool.getComponentWireCount(compD.id), 0, 'Unclicked Component D on the stage must remain completely untouched (0 wires)');

  // 18e. Click #3 -> User clicks Component B a second time: connects 2nd compatible pin (CATHODE <-> GND) between A and B
  const clickB2 = transformCtrl.handleStageComponentClick(compB);
  assert.equal(clickB2.action, 'smart-connected');
  assert.equal(clickB2.connected, true);
  assert.equal(wireTool.getComponentWireCount(compB.id), 2, 'Second click on Component B must wire its 2nd pin (CATHODE <-> GND) with A');
  assert.equal(wireTool.getComponentWireCount(compD.id), 0, 'Unclicked Component D must still have 0 wires');

  // 18f. Exit Smart Connect mode -> clicking Component C now selects Component C normally
  transformCtrl.cancelQuickConnect();
  assert.equal(transformCtrl.isQuickConnectMode, false);
  assert.equal(pinHud.quickConnectSourceComponent, null);
  const normalSelectC = transformCtrl.handleStageComponentClick(compC);
  assert.equal(normalSelectC.action, 'selected');
  assert.equal(transformCtrl.selectedComponent, compC, 'When Smart Connect mode is off, clicking Component C must select it normally');
});

await test('19. Canvas-First Spatial Workbench Shell, ThemeService (Dark/Light 3D Stage & CSS Tokens) & TR/EN Parity', () => {
  // 19a. Verify legacy UI files are physically removed
  const removedFiles = [
    'src/ui/controllers/FlyoutController.js',
    'src/ui/controllers/StatusBarController.js',
    'src/ui/controllers/InfoPanelController.js',
    'src/stage/MinimapRenderer.js'
  ];
  for (const relPath of removedFiles) {
    assert.equal(
      fs.existsSync(path.join(projectRoot, relPath)),
      false,
      `Legacy clutter file ${relPath} must not exist in the clean workbench`
    );
  }

  // 19b. Verify index.html is Canvas-First with zero legacy clutter (#clock, #minimap, #lesson-list, #tags, #leaders, #inspector)
  const indexHtml = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');
  assert.ok(!indexHtml.includes('id="clock"'), 'index.html must not contain legacy #clock');
  assert.ok(!indexHtml.includes('id="minimap"'), 'index.html must not contain legacy #minimap');
  assert.ok(!indexHtml.includes('id="lesson-list"'), 'index.html must not contain legacy #lesson-list');
  assert.ok(!indexHtml.includes('id="tags"'), 'index.html must not contain legacy callout #tags container');
  assert.ok(!indexHtml.includes('id="leaders"'), 'index.html must not contain legacy #leaders SVG');
  assert.ok(!indexHtml.includes('id="inspector"'), 'index.html must not contain legacy #inspector');
  assert.ok(indexHtml.includes('id="board-canvas"'), 'index.html must include full-bleed #board-canvas');
  assert.ok(indexHtml.includes('id="top-context-root"'), 'index.html must include #top-context-root');
  assert.ok(indexHtml.includes('id="bottom-dock-root"'), 'index.html must include #bottom-dock-root');
  assert.ok(indexHtml.includes('id="drawer-root"'), 'index.html must include on-demand #drawer-root');
  assert.ok(indexHtml.includes('id="popover-root"'), 'index.html must include on-demand #popover-root');
  assert.ok(indexHtml.includes('id="modal-root"'), 'index.html must include on-demand #modal-root');

  // 19c. Verify main.css defines Dark & Light tokens and has zero AI neon gradient clichés
  const mainCss = fs.readFileSync(path.join(projectRoot, 'src/styles/main.css'), 'utf8');
  assert.ok(mainCss.includes('[data-theme="dark"]'), 'main.css must define [data-theme="dark"] token block');
  assert.ok(mainCss.includes('[data-theme="light"]'), 'main.css must define [data-theme="light"] token block');
  assert.ok(mainCss.includes('#0B0C0E'), 'Dark mode canvas token #0B0C0E must be present');
  assert.ok(mainCss.includes('#F3F2EE'), 'Light mode drafting paper token #F3F2EE must be present');

  // 19d. Verify ThemeService state machine & 3D stage token synchronization
  const tSvc = new ThemeService('dark');
  assert.equal(tSvc.getTheme(), 'dark');
  assert.equal(tSvc.getStageTokens().clearColor, '#0B0C0E');
  let observedTheme = null;
  const unsub = tSvc.onChange(({ theme, tokens }) => {
    observedTheme = { theme, clearColor: tokens.clearColor };
  });
  tSvc.toggleTheme();
  assert.equal(tSvc.getTheme(), 'light');
  assert.equal(tSvc.getStageTokens().clearColor, '#F3F2EE');
  assert.deepEqual(observedTheme, { theme: 'light', clearColor: '#F3F2EE' });
  tSvc.setTheme('dark');
  assert.equal(tSvc.getTheme(), 'dark');
  unsub();

  // 19e. Verify TopContextPill & BottomFloatingDock support all 3 host boards & TR/EN workbench i18n keys
  assert.equal(SUPPORTED_HOST_BOARDS.length, 3);
  assert.deepEqual(
    SUPPORTED_HOST_BOARDS.map((b) => b.id),
    ['board.arduino_uno', 'board.esp32_devkit', 'board.jetson_nano']
  );

  i18n.setLocale('tr');
  assert.equal(i18n.t('workbench.dock.codeBtn'), 'Kod');
  assert.equal(i18n.t('workbench.dock.projectsBtn'), 'Çalışma Alanlarım & Şablonlar');
  assert.equal(i18n.t('workbench.top.login_btn'), 'Giriş Yap');
  assert.equal(i18n.t('workbench.top.logout_btn'), 'Çıkış Yap');

  i18n.setLocale('en');
  assert.equal(i18n.t('workbench.dock.codeBtn'), 'Code');
  assert.equal(i18n.t('workbench.dock.projectsBtn'), 'My Workspaces & Templates');
  assert.equal(i18n.t('workbench.top.login_btn'), 'Sign In');
  assert.equal(i18n.t('workbench.top.logout_btn'), 'Log Out');
});

await test('20. On-Demand CodeDrawerController & LiveCodeRuntime <-> CircuitFlowSolver Closed-Loop Coupling', () => {
  const reg = new ComponentRegistry();
  registerAllHardware(reg);

  const uno = reg.create('board.arduino_uno', { id: 'main.uno', position: [-30, 0, 0] });
  const resistor = reg.create('passive.resistor', { id: 'stage.r220', position: [0, 5.2, 0], ohms: 220 });
  const led = reg.create('led.single', { id: 'stage.led1', position: [12, 5.2, 0] });

  let connections = [
    { id: 'w1', from: 'main.uno.PIN13', to: 'stage.r220.LEAD_A' },
    { id: 'w2', from: 'stage.r220.LEAD_B', to: 'stage.led1.ANODE' },
    { id: 'w3', from: 'stage.led1.CATHODE', to: 'main.uno.GND' }
  ];

  const serialMessages = [];
  const runtime = new LiveCodeRuntime({
    getHostBoard: () => uno,
    getComponents: () => [uno, resistor, led],
    getConnections: () => connections,
    onSerialOutput: (entry) => serialMessages.push(entry.text)
  });

  // 20a. CodeDrawerController starts closed by default
  const drawer = new CodeDrawerController({ runtime });
  assert.equal(drawer.isOpen, false, 'CodeDrawerController must start closed by default');
  assert.equal(drawer.open(), true, 'open() must set isOpen = true');
  assert.equal(drawer.close(), false, 'close() must set isOpen = false');

  // 20b. Run digitalWrite(13, HIGH) with a closed physical loop -> LED lights up via CircuitFlowSolver
  const flowHigh = runtime.runImmediate({
    sourceCode: `
      const int ACTIVE_PIN = 13;
      void setup() {
        pinMode(ACTIVE_PIN, OUTPUT);
        Serial.println("Boot OK");
      }
      void loop() {
        digitalWrite(ACTIVE_PIN, HIGH);
        delay(500);
      }
    `
  });

  assert.equal(serialMessages.includes('Boot OK'), true, 'Serial.println must emit to serial monitor');
  assert.equal(flowHigh.loops.length, 1, 'Closed loop from PIN13 -> Resistor -> LED -> GND must be solved');
  assert.ok(led.state.brightness > 0.7, 'LED must light up (brightness > 0.7) when PIN13 is driven HIGH in a closed loop');

  // 20c. Disconnect GND wire while PIN13 is STILL driven HIGH -> LED must immediately turn OFF
  connections = [
    { id: 'w1', from: 'main.uno.PIN13', to: 'stage.r220.LEAD_A' },
    { id: 'w2', from: 'stage.r220.LEAD_B', to: 'stage.led1.ANODE' }
  ];
  const flowOpenGnd = runtime.recomputeFlow();
  assert.equal(
    uno.electricalPins.get('PIN13').drivenVoltage,
    5.0,
    'PIN13 is still driven at 5.0V by the MCU'
  );
  assert.equal(flowOpenGnd.loops.length, 0, 'With GND wire removed, 0 closed loops exist');
  assert.equal(
    led.state.brightness,
    0,
    'LED must immediately turn OFF (brightness === 0) when GND wire is removed (zero fake simulation state)'
  );

  // 20d. Restore GND wire, but change user code from pin 13 to pin 12 -> LED wired to PIN13 turns OFF until rewired to PIN12
  connections.push({ id: 'w3', from: 'stage.led1.CATHODE', to: 'main.uno.GND' });
  runtime.stop({ resetPins: true });
  runtime.runImmediate({
    sourceCode: `
      void loop() {
        digitalWrite(12, HIGH);
        delay(500);
      }
    `
  });
  assert.equal(
    led.state.brightness,
    0,
    'When code drives PIN12 HIGH instead of PIN13, LED wired to PIN13 must remain OFF'
  );

  // Rewire resistor from PIN13 to PIN12 -> LED immediately lights up!
  connections[0] = { id: 'w1', from: 'main.uno.PIN12', to: 'stage.r220.LEAD_A' };
  runtime.recomputeFlow();
  assert.ok(
    led.state.brightness > 0.7,
    'Rewiring resistor lead to PIN12 closes the loop with newly driven PIN12 and lights the LED'
  );
  runtime.stop({ resetPins: true });
  drawer.destroy();
});

await test('21. 3D NVIDIA Jetson Nano Board, DynamicComponentBuilder & Dipole X-Ray Mode', async () => {
  const reg = new ComponentRegistry();
  registerAllHardware(reg);

  // 21a. JetsonNanoBoard inherits BaseSBCBoard -> BaseHostBoard -> BaseBoard -> HardwareComponent
  const jetson = reg.create('board.jetson_nano', { id: 'main.jetson', position: [-32, 0, 0] });
  assert.ok(jetson instanceof JetsonNanoBoard);
  assert.ok(jetson instanceof BaseSBCBoard);
  assert.ok(jetson instanceof BaseHostBoard);
  assert.equal(jetson.logicVoltage, 3.3, 'Jetson Nano J41 GPIO header must operate at 3.3V logic');
  const gpio18 = jetson.electricalPins.get('GPIO_PIN18');
  assert.ok(gpio18, 'Jetson Nano must expose GPIO_PIN18 on the J41 40-pin header');
  assert.equal(gpio18.maxVoltage, 3.6, 'Jetson Nano GPIO pins must enforce maxVoltage = 3.6V (no 5V tolerance)');

  // 21b. Wiring 5V directly into Jetson Nano 3.3V GPIO must trigger an overvoltage fault in CircuitFlowSolver
  const uno = reg.create('board.arduino_uno', { id: 'aux.uno', position: [32, 0, 0] });
  const overvoltageFlow = circuitFlowSolver.solve({
    components: [jetson, uno],
    connections: [
      { id: 'w_5v_fault', from: 'aux.uno.5V', to: 'main.jetson.GPIO_PIN18' },
      { id: 'w_gnd', from: 'aux.uno.GND', to: 'main.jetson.GND' }
    ]
  });
  assert.ok(
    overvoltageFlow.faults.some((f) => f.code === 'elec.fault.overvoltage'),
    'Connecting 5V rail to Jetson Nano 3.3V GPIO18 must raise elec.fault.overvoltage in CircuitFlowSolver'
  );

  // 21c. DynamicComponentBuilder runtime synthesis + closed-loop CircuitFlowSolver flow
  const bmeSpec = DynamicComponentBuilder.synthesizeOfflineDatasheetSpec('BME280');
  const registered = DynamicComponentBuilder.registerFromSpec(bmeSpec, reg);
  assert.equal(registered.typeId, 'sensor.bme280');
  assert.equal(reg.has('sensor.bme280'), true, 'Synthesized BME280 class must be registered in ComponentRegistry');

  const bme = reg.create('sensor.bme280', { id: 'stage.bme280', position: [0, 5.2, 0] });
  assert.ok(bme instanceof HardwareComponent, 'Synthesized component must inherit HardwareComponent');
  assert.ok(bme.electricalPins.has('VCC') && bme.electricalPins.has('GND') && bme.electricalPins.has('SCL') && bme.electricalPins.has('SDA'));
  assert.equal(bme.getInternalDipoles().length, 1, 'Synthesized BME280 must expose an internal ConductiveDipole');

  const bmeFlow = circuitFlowSolver.solve({
    components: [jetson, bme],
    connections: [
      { id: 'w_vcc', from: 'main.jetson.3V3', to: 'stage.bme280.VCC' },
      { id: 'w_gnd', from: 'stage.bme280.GND', to: 'main.jetson.GND' }
    ]
  });
  assert.equal(bmeFlow.faults.length, 0, '3.3V Jetson rail into 3.3V BME280 must produce zero electrical faults');
  assert.equal(bmeFlow.loops.length, 1, 'Closed loop through dynamically synthesized BME280 dipole must be solved');
  assert.equal(bme.state.energized, true, 'Synthesized BME280 must transition to energized = true when current flows');

  // 21d. Dipole X-Ray Mode (setXRayMode(true/false))
  assert.equal(bme.xrayMode, false);
  bme.setXRayMode(true);
  assert.equal(bme.xrayMode, true);
  assert.ok(bme.xrayGroup, 'setXRayMode(true) must construct 3D xrayGroup');
  assert.equal(bme.xrayGroup.visible, true, 'xrayGroup must be visible when X-Ray mode is enabled');
  assert.equal(bme.refs.pcb.material.transparent, true, 'PCB material must become translucent in X-Ray mode');
  assert.ok(bme.refs.pcb.material.opacity <= 0.3, 'PCB opacity must be <= 0.3 in X-Ray mode');

  bme.setXRayMode(false);
  assert.equal(bme.xrayMode, false);
  assert.equal(bme.xrayGroup.visible, false, 'xrayGroup must be hidden when X-Ray mode is disabled');
  assert.equal(bme.refs.pcb.material.opacity, 1, 'PCB material opacity must be restored to 1 when X-Ray mode is disabled');

  // 21e. ComponentPalettePopover starts closed and synthesizes datasheet parts on demand
  let spawnedTypeId = null;
  const popover = new ComponentPalettePopover({
    registry: reg,
    onSpawnComponent: (typeId) => {
      spawnedTypeId = typeId;
      return reg.create(typeId);
    }
  });
  assert.equal(popover.isOpen, false, 'ComponentPalettePopover must be closed by default');
  const synthResult = await popover.synthesizeAndSpawn('MPU6050');
  assert.equal(synthResult.typeId, 'sensor.mpu6050');
  assert.equal(spawnedTypeId, 'sensor.mpu6050');
  popover.destroy();
});

await test('22. StageAiCommandExecutor Atomic Scene Execution, One-Click Undo & DiagnosticHudCard Fault Detection', async () => {
  const reg = new ComponentRegistry();
  registerAllHardware(reg);
  const apiClient = new BackendApiClient({ fetchImpl: null });

  let executor = null;
  const runtime = new LiveCodeRuntime({
    getHostBoard: () => executor?.getHostBoard(),
    getComponents: () => [executor?.getHostBoard(), ...(executor?.getStageComponents() || [])].filter(Boolean),
    getConnections: () => executor?.getConnections() || []
  });

  executor = new StageAiCommandExecutor({
    registry: reg,
    runtime,
    apiClient
  });

  // 22a. Initial stage state has 0 peripheral components, 0 wires, and canUndo() === false
  assert.equal(executor.getStageComponents().length, 0);
  assert.equal(executor.getConnections().length, 0);
  assert.equal(executor.canUndo(), false);

  // 22b. Execute natural-language prompt: "Add a 220 ohm resistor and green LED to pin 9"
  const planRes = await executor.executeNaturalLanguagePrompt(
    'Add a 220 ohm resistor and green LED to pin 9'
  );
  assert.equal(planRes.canUndo, true, 'After executing AI command batch, canUndo() must be true');
  assert.equal(executor.getStageComponents().length, 2, 'AI command must spawn 2 components (resistor + LED)');
  assert.equal(executor.getConnections().length, 3, 'AI command must wire 3 connections (PIN9 -> R -> LED -> GND)');
  assert.equal(planRes.flowResult.loops.length, 1, 'AI circuit must form 1 closed conductive loop');

  const spawnedLed = reg.getInstance('ai.led_indicator');
  assert.ok(spawnedLed, 'ai.led_indicator must exist in registry');
  assert.ok(spawnedLed.state.brightness > 0.7, 'Spawned LED must illuminate immediately from started firmware');

  // 22c. One-Click Undo restores exact pre-command stage state (0 components, 0 wires)
  const undoRes = executor.undoLastTransaction();
  assert.equal(undoRes.restored, true, 'undoLastTransaction() must return restored: true');
  assert.equal(executor.canUndo(), false, 'Undo stack must be empty after reverting the single transaction');
  assert.equal(executor.getStageComponents().length, 0, 'Undo must remove all components spawned by the AI transaction');
  assert.equal(executor.getConnections().length, 0, 'Undo must remove all wires created by the AI transaction');

  // 22d. DiagnosticHudCard starts hidden and automatically surfaces when an electrical fault occurs
  const diagHud = new DiagnosticHudCard({ apiClient });
  assert.equal(diagHud.isVisible, false, 'DiagnosticHudCard must start hidden by default');

  // Trigger an overvoltage fault via StageAiCommandExecutor (5V to Jetson Nano 3.3V GPIO)
  const faultExec = executor.executeCommands([
    { action: 'setHostBoard', typeId: 'board.jetson_nano' },
    { action: 'connectPins', from: 'host.5V', to: 'host.GPIO_PIN18' }
  ]);
  assert.ok(faultExec.flowResult.faults.length > 0, '5V -> Jetson GPIO_PIN18 must produce an overvoltage fault');

  diagHud.updateFromFlowResult(faultExec.flowResult, 'board.jetson_nano');
  assert.equal(diagHud.isVisible, true, 'DiagnosticHudCard must automatically become visible on electrical fault');
  assert.equal(diagHud.severity, 'critical');

  await diagHud.explainCurrentState();
  assert.ok(
    diagHud.message.includes('3.3V') || diagHud.message.includes('5.0V') || diagHud.message.includes('3V3'),
    'Diagnostic explanation must identify the 5V -> 3.3V overvoltage root cause'
  );

  // Undo the faulty wiring -> DiagnosticHudCard automatically clears
  const undoFault = executor.undoLastTransaction();
  diagHud.updateFromFlowResult(undoFault.flowResult, 'board.arduino_uno');
  assert.equal(diagHud.isVisible, false, 'DiagnosticHudCard must hide when critical fault is cleared by Undo');

  runtime.stop({ resetPins: true });
  diagHud.destroy();
});

await test('23. ProjectsAndGroupsModal, AuthAndSettingsModal (Valid Email Auth & Backend-Only AI) & Custom Component Serialization Round-Trip', async () => {
  const apiClient = new BackendApiClient({ fetchImpl: null, storage: null });
  let activeSessionUser = null;

  const authModal = new AuthAndSettingsModal({
    apiClient,
    onSessionChange: (user) => {
      activeSessionUser = user;
    }
  });

  // 23a. AuthAndSettingsModal starts closed, removes Judge Quick Login, and validates email registration/login
  assert.equal(authModal.isOpen, false, 'AuthAndSettingsModal must start closed by default');
  assert.equal(typeof authModal.triggerJudgeQuickLogin, 'undefined', 'Judge Quick Login must be completely removed');
  assert.equal(typeof apiClient.judgeQuickLogin, 'undefined', 'BackendApiClient.judgeQuickLogin must be completely removed');

  const regSession = await authModal.submitRegister({
    name: 'Ada Lovelace',
    email: 'ada@circuitlab3d.dev',
    password: 'password123'
  });
  assert.ok(regSession.token, 'Valid email registration must issue a session token');
  assert.equal(regSession.user.email, 'ada@circuitlab3d.dev');
  assert.equal(activeSessionUser?.email, 'ada@circuitlab3d.dev');

  // 23b. Auth modal strictly shows Login/Register/Account and NEVER exposes a "Backend AI Model" tab or BYOK controls
  assert.equal(apiClient.aiServiceMode, 'backend', 'AI service mode must strictly be backend-only');
  assert.equal(typeof authModal.selectAiModel, 'undefined', 'AuthAndSettingsModal must not expose AI model selection');
  assert.equal(typeof authModal.saveAiModelSettings, 'undefined', 'AuthAndSettingsModal must not expose AI model settings');
  const mockAuthContainer = {
    innerHTML: '',
    classList: { add() {}, remove() {} },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    remove() {}
  };
  authModal._containerEl = mockAuthContainer;
  await authModal.open('ai');
  assert.equal(authModal.activeTab, 'login', 'Attempting to open removed "ai" tab must normalize to "login"');
  assert.equal(
    mockAuthContainer.innerHTML.includes('auth-tab-ai'),
    false,
    'Auth modal must NEVER render a Backend AI Model tab (auth-tab-ai)'
  );
  assert.equal(
    mockAuthContainer.innerHTML.includes('auth-backend-ai-panel'),
    false,
    'Auth modal must NEVER render auth-backend-ai-panel'
  );
  assert.equal(
    mockAuthContainer.innerHTML.includes('Backend AI'),
    false,
    'Auth modal must NEVER contain developer "Backend AI" jargon'
  );

  // 23c. ProjectsAndGroupsModal starts closed and contains 3 pre-seeded 3D reference circuits
  const reg1 = new ComponentRegistry();
  registerAllHardware(reg1);
  let loadedPayload = null;

  const projectsModal = new ProjectsAndGroupsModal({
    registry: reg1,
    apiClient,
    onScenarioLoaded: (payload) => {
      loadedPayload = payload;
    }
  });
  assert.equal(projectsModal.isOpen, false, 'ProjectsAndGroupsModal must start closed by default');
  assert.equal(REFERENCE_3D_PROJECTS.length, 3, 'Must provide 3 pre-seeded 3D reference circuits');

  // 23d. Forking the ESP32 + Custom DHT22 circuit registers sensor.dht22_probe and instantiates all hardware
  const forkRes = await projectsModal.forkProject('esp32-greenhouse-dht22-telemetry');
  assert.equal(forkRes.loaded, true);
  assert.equal(forkRes.boardType, 'board.esp32_devkit');
  assert.equal(forkRes.customComponentsCount, 1);
  assert.ok(reg1.has('sensor.dht22_probe'), 'Forking ESP32 DHT22 project must register custom sensor.dht22_probe');
  assert.ok(loadedPayload?.deserialized?.components?.some((c) => c.typeId === 'sensor.dht22_probe'));

  // 23e. Share active stage to Study Group -> ScenarioSerializer must serialize customComponents[]
  // so a brand-new ComponentRegistry can deserialize the shared project without missing custom parts
  const sharedProj = await projectsModal.shareActiveStageToGroup('Cloned ESP32 Greenhouse Circuit');
  assert.ok(
    Array.isArray(sharedProj.circuit_json.customComponents) &&
      sharedProj.circuit_json.customComponents.some((s) => s.typeId === 'sensor.dht22_probe'),
    'Serialized shared circuit_json must embed customComponents[] specification for sensor.dht22_probe'
  );

  // Deserialize sharedProj into a completely fresh ComponentRegistry that has ONLY built-in hardware
  const freshRegistry = new ComponentRegistry();
  registerAllHardware(freshRegistry);
  assert.equal(
    freshRegistry.has('sensor.dht22_probe'),
    false,
    'Fresh registry must not pre-contain custom sensor.dht22_probe before deserialization'
  );

  const roundTrip = ScenarioSerializer.deserializeToStage(sharedProj.circuit_json, {
    registry: freshRegistry
  });
  assert.equal(
    freshRegistry.has('sensor.dht22_probe'),
    true,
    'ScenarioSerializer.deserializeToStage must register customComponents[] into fresh registry'
  );
  assert.equal(roundTrip.boards.length, 1);
  assert.equal(roundTrip.components.length, 3);
  assert.equal(roundTrip.connections.length, 6);

  // Verify Study Group creation & invite code joining
  const newGroup = await projectsModal.createGroup('ITU Edge AI Lab');
  assert.equal(newGroup.name, 'ITU Edge AI Lab');
  const joinedGroup = await projectsModal.joinGroupByCode('LAB-NEBIUS26');
  assert.equal(joinedGroup.invite_code, 'LAB-NEBIUS26');

  authModal.destroy();
  projectsModal.destroy();
});

await test('24. 3D Robotics Showcase Landing Page: SumoRobotShowcaseScene (Approach & 8-Layer CAD Explode), JetsonVisionRobotShowcaseScene (Pan/Tilt Gimbal + 3D FOV Cone) & Workbench Circuit Handoff', () => {
  // 24a. Scene 01: Autonomous Mini-Sumo Robot — Approach from distance & 8-Layer CAD Exploded View
  const sumoScene = new SumoRobotShowcaseScene({ canvas: null, autoPlay: false });
  assert.equal(SUMO_SUB_ASSEMBLIES.length, 8, 'Sumo Robot must consist of 8 CAD sub-assemblies');
  assert.equal(sumoScene.subAssemblyGroups.size, 8);

  // Start of runway approach (progress = 0 -> z = -115, x = -28)
  sumoScene.setApproachProgress(0);
  assert.equal(sumoScene.robotGroup.position.z, SUMO_APPROACH_START.z);
  assert.equal(sumoScene.robotGroup.position.x, SUMO_APPROACH_START.x);

  // End of runway approach (progress = 1 -> z = 0, x = 0) with proportional wheel rotation
  sumoScene.setApproachProgress(1);
  assert.equal(sumoScene.robotGroup.position.z, SUMO_STAGE_CENTER.z);
  assert.equal(sumoScene.robotGroup.position.x, SUMO_STAGE_CENTER.x);
  assert.ok(
    sumoScene.wheelSpinAngle > 8.0,
    'Sumo N20 gearmotor wheels must rotate proportionally to the runway approach distance'
  );

  // Assembled state (explodeProgress = 0) -> all 8 sub-assemblies at their assembledPos coordinates
  sumoScene.setExplodeProgress(0);
  const dozerGroup = sumoScene.subAssemblyGroups.get('front_wedge');
  const unoGroup = sumoScene.subAssemblyGroups.get('mcu_controller');
  const hoodGroup = sumoScene.subAssemblyGroups.get('sensor_armor_head');
  const leftDriveGroup = sumoScene.subAssemblyGroups.get('drive_motors_left');
  const rightDriveGroup = sumoScene.subAssemblyGroups.get('drive_motors_right');
  assert.equal(dozerGroup.position.z, 16.8);
  assert.equal(unoGroup.position.y, 11.4);
  assert.equal(hoodGroup.position.y, 14.2);

  // Exploded state (explodeProgress = 1) -> 8 CAD layers separate along their 3D explode vectors
  sumoScene.setExplodeProgress(1);
  assert.ok(dozerGroup.position.z > 40, 'Sumo front steel dozer wedge must explode forward (+Z)');
  assert.ok(unoGroup.position.y > 28, 'Sumo Arduino Uno controller layer must explode upward (+Y)');
  assert.ok(hoodGroup.position.y > 40, 'Sumo ultrasonic radar & armor hood must explode to top layer (+Y)');
  assert.ok(leftDriveGroup.position.x < -35, 'Sumo left N20 drive assembly must explode outward (-X)');
  assert.ok(rightDriveGroup.position.x > 35, 'Sumo right N20 drive assembly must explode outward (+X)');

  // 24b. Scene 02: Separate NVIDIA Jetson Nano Vision Camera Robot Scene (Pan/Tilt Gimbal + 3D FOV Cone)
  const jetsonScene = new JetsonVisionRobotShowcaseScene({ canvas: null, autoTrack: false });
  assert.notEqual(
    jetsonScene.scene,
    sumoScene.scene,
    'Jetson Vision Robot must be staged in a completely separate Three.js Scene from the Sumo Robot'
  );
  assert.equal(JETSON_SUB_ASSEMBLIES.length, 8, 'Jetson Vision Robot must consist of 8 CAD sub-assemblies');
  assert.ok(
    jetsonScene.jetsonBoardInstance instanceof JetsonNanoBoard,
    'Jetson Vision Robot must embed a real 3D JetsonNanoBoard (board.jetson_nano)'
  );
  assert.equal(jetsonScene.visionFrustumVisible, true);
  assert.equal(jetsonScene.fovFrustumGroup.visible, true);

  // Pan/Tilt Servo Gimbal kinematics
  jetsonScene.setCameraPanTilt(42, 18);
  assert.ok(
    Math.abs(jetsonScene.panAngleDeg - 42) < 0.5,
    `Jetson camera gimbal pan angle must equal +42 deg (got ${jetsonScene.panAngleDeg})`
  );
  assert.ok(
    Math.abs(jetsonScene.panPivot.rotation.y - THREE.MathUtils.degToRad(42)) < 0.02,
    'panPivot.rotation.y must match camera pan angle in radians'
  );
  assert.ok(
    Math.abs(jetsonScene.tiltAngleDeg - 18) < 0.5,
    `Jetson camera gimbal tilt angle must equal +18 deg (got ${jetsonScene.tiltAngleDeg})`
  );

  // Toggle 3D Vision Frustum Cone
  jetsonScene.setVisionFrustumVisible(false);
  assert.equal(jetsonScene.fovFrustumGroup.visible, false);
  jetsonScene.setVisionFrustumVisible(true);
  assert.equal(jetsonScene.fovFrustumGroup.visible, true);

  // Explode Jetson Vision Robot CAD layers
  jetsonScene.setExplodeProgress(1);
  const jetsonModuleGroup = jetsonScene.subAssemblyGroups.get('jetson_nano_sbc');
  const gimbalGroup = jetsonScene.subAssemblyGroups.get('camera_gimbal_mast');
  assert.ok(jetsonModuleGroup.position.y > 14, 'Jetson Nano carrier & heatsink must explode upward (+Y)');
  assert.ok(gimbalGroup.position.y > 26, '2-Axis Pan/Tilt Gimbal + IMX219 camera must explode to top layer (+Y)');

  // 24b-ii. Transparent floating WebGL backgrounds & Hover Feature Highlighting
  assert.equal(
    sumoScene.scene.background,
    null,
    'SumoRobotShowcaseScene must have null background for transparent floating landing page rendering'
  );
  assert.equal(
    jetsonScene.scene.background,
    null,
    'JetsonVisionRobotShowcaseScene must have null background for transparent floating landing page rendering'
  );
  assert.equal(SUMO_KEY_HIGHLIGHTS.length, 3, 'Sumo showcase must expose 3 curated key highlight cards');
  assert.equal(JETSON_KEY_HIGHLIGHTS.length, 3, 'Jetson showcase must expose 3 curated key highlight cards');

  sumoScene.setHoveredFeature('sensor_armor_head', 0.48);
  assert.equal(sumoScene.selectedPartId, 'sensor_armor_head');
  assert.equal(sumoScene._targetExplode, 0.48);
  sumoScene.clearHoveredFeature();
  assert.equal(sumoScene._targetExplode, 0);

  jetsonScene.setHoveredFeature('jetson_nano_sbc', 0.48);
  assert.equal(jetsonScene.selectedPartId, 'jetson_nano_sbc');
  assert.equal(jetsonScene._targetExplode, 0.48);
  jetsonScene.clearHoveredFeature();
  assert.equal(jetsonScene._targetExplode, 0);

  // 24c. LandingShowcaseController -> 3D Spatial Workbench Circuit Handoff for both robots
  const wbRegistry = new ComponentRegistry();
  registerAllHardware(wbRegistry);
  const projectsModal = new ProjectsAndGroupsModal({ registry: wbRegistry });

  let lastOpenedSceneId = null;
  const landingController = new LandingShowcaseController({
    rootEl: null,
    initialVisible: true,
    onOpenRobotInWorkbench: (project, sceneId) => {
      lastOpenedSceneId = sceneId;
      return projectsModal.loadProjectOntoStage(project);
    }
  });

  assert.equal(landingController.isVisible, true);

  // Handoff 1: Open Autonomous Sumo Robot in 3D Workbench
  const sumoHandoff = landingController.openSumoInWorkbench();
  assert.equal(lastOpenedSceneId, 'sumo');
  assert.equal(landingController.isVisible, false, 'Opening Sumo Robot in Workbench must hide landing overlay');
  assert.equal(sumoHandoff.result.boardType, 'board.arduino_uno');
  assert.equal(sumoHandoff.project.circuit_json.components.length, 5);

  // Return to Showcase & Handoff 2: Open NVIDIA Jetson Nano Camera Robot in 3D Workbench
  landingController.show();
  assert.equal(landingController.isVisible, true);
  const jetsonHandoff = landingController.openJetsonInWorkbench();
  assert.equal(lastOpenedSceneId, 'jetson');
  assert.equal(landingController.isVisible, false);
  assert.equal(jetsonHandoff.result.boardType, 'board.jetson_nano');
  assert.ok(
    wbRegistry.has('sensor.imx219_csi_camera'),
    'Jetson handoff must register custom Sony IMX219 8MP CSI-2 camera module'
  );

  sumoScene.destroy();
  jetsonScene.destroy();
  landingController.destroy();
  projectsModal.destroy();
});

await test('25. High-Craft Modular Robotics & Vision Component Library, Abstract Base Classes, Material/Mesh Integrity & Showcase-Workbench Component Sharing', () => {
  // 25a. All 6 new intermediate abstract Base* classes must throw TypeError when instantiated directly
  const newAbstractBaseClasses = [
    BaseMotorDriver,
    BasePowerModule,
    BaseVisionSensor,
    BaseDisplayModule,
    BaseChassisPart,
    BaseRobotAssembly
  ];

  for (const AbstractCls of newAbstractBaseClasses) {
    assert.throws(
      () => new AbstractCls('illegal_direct_base'),
      /abstract/i,
      `${AbstractCls.name} must be abstract and forbid direct instantiation`
    );
  }

  // 25b. Register all 31 concrete hardware & robotics classes and verify strict OOP inheritance
  const reg = new ComponentRegistry();
  registerAllHardware(reg);

  const requiredFaz7Types = [
    { typeId: 'motor.n20_gearmotor', base: BaseMotor },
    { typeId: 'motor.mecanum_wheel', base: BaseMotor },
    { typeId: 'motor.pan_tilt_gimbal', base: BaseMotor },
    { typeId: 'driver.l298n_dual', base: BaseMotorDriver },
    { typeId: 'power.lipo_3s_1300mah', base: BasePowerModule },
    { typeId: 'power.ina219_buck_bay', base: BasePowerModule },
    { typeId: 'sensor.imx219_csi', base: BaseVisionSensor },
    { typeId: 'sensor.vl53l1x_tof', base: BaseDistanceSensor },
    { typeId: 'sensor.tcrt5000_line', base: BaseAnalogSensor },
    { typeId: 'display.ssd1306_oled', base: BaseDisplayModule },
    { typeId: 'robotics.sumo_chassis_plate', base: BaseChassisPart },
    { typeId: 'robotics.sumo_dozer_blade', base: BaseChassisPart },
    { typeId: 'robotics.sumo_armor_hood', base: BaseChassisPart },
    { typeId: 'robotics.jetson_rover_chassis', base: BaseChassisPart },
    { typeId: 'robotics.csi_ribbon_harness', base: BaseChassisPart },
    { typeId: 'robot.autonomous_sumo', base: BaseRobotAssembly },
    { typeId: 'robot.jetson_vision_rover', base: BaseRobotAssembly }
  ];

  for (const { typeId, base } of requiredFaz7Types) {
    assert.equal(reg.has(typeId), true, `ComponentRegistry must register Faz 7 component "${typeId}"`);
    const Cls = reg.getClass(typeId);
    assert.notEqual(
      Object.getPrototypeOf(Cls),
      HardwareComponent,
      `${Cls.name} (${typeId}) must inherit from an intermediate abstract Base* class, never directly from HardwareComponent`
    );

    const inst = reg.create(typeId, `test_${typeId.replace(/\./g, '_')}`);
    assert.equal(
      inst instanceof base,
      true,
      `${Cls.name} instance must be instanceof ${base.name}`
    );
    assert.equal(
      inst instanceof HardwareComponent,
      true,
      `${Cls.name} instance must be instanceof HardwareComponent`
    );

    // Every component must produce high-craft 3D geometry with valid materials (zero broken cyl() calls)
    let meshCount = 0;
    inst.group.traverse((node) => {
      if (node.isMesh) {
        meshCount++;
        assert.ok(
          node.material && node.material.isMaterial === true,
          `Mesh in ${typeId} has invalid material (possible cyl() parameter swap)`
        );
        assert.ok(
          node.geometry && node.geometry.attributes?.position?.count > 0,
          `Mesh in ${typeId} has empty geometry`
        );
      }
    });
    assert.ok(
      meshCount >= 4,
      `Faz 7 component ${typeId} must build a detailed multi-part 3D CAD mesh (found ${meshCount} meshes)`
    );

    const compBox = new THREE.Box3().setFromObject(inst.group);
    assert.ok(
      Number.isFinite(compBox.min.x) &&
        Number.isFinite(compBox.min.y) &&
        Number.isFinite(compBox.min.z) &&
        Number.isFinite(compBox.max.x) &&
        Number.isFinite(compBox.max.y) &&
        Number.isFinite(compBox.max.z),
      `Faz 7 component ${typeId} has NaN/non-finite world matrix or bounding box`
    );
  }

  // 25c. Verify Composite Robot Assemblies (`AutonomousSumoRobotComponent` & `JetsonVisionRoverComponent`)
  const sumoRobotComp = reg.create('robot.autonomous_sumo', 'workbench_sumo_bot');
  const jetsonRoverComp = reg.create('robot.jetson_vision_rover', 'workbench_jetson_rover');
  assert.equal(sumoRobotComp.getSubAssemblyKeys().length, 8);
  assert.equal(jetsonRoverComp.getSubAssemblyKeys().length, 8);

  sumoRobotComp.setExplodeFactor(1);
  assert.equal(sumoRobotComp.explodeFactor, 1);
  jetsonRoverComp.setExplodeFactor(1);
  assert.equal(jetsonRoverComp.explodeFactor, 1);

  // 25d. Verify Showcase Scenes use real registered HardwareComponent instances and have zero broken meshes
  const sumoScene = new SumoRobotShowcaseScene({ canvas: null, autoPlay: false });
  const jetsonScene = new JetsonVisionRobotShowcaseScene({ canvas: null, autoTrack: false });

  assert.ok(
    sumoScene.componentInstances.size >= 8,
    'SumoRobotShowcaseScene must instantiate its sub-assemblies from registered HardwareComponent classes'
  );
  for (const [key, compInst] of sumoScene.componentInstances.entries()) {
    assert.equal(
      compInst instanceof HardwareComponent,
      true,
      `SumoRobotShowcaseScene sub-assembly "${key}" must be an instance of HardwareComponent`
    );
  }

  assert.ok(
    jetsonScene.componentInstances.size >= 8,
    'JetsonVisionRobotShowcaseScene must instantiate its sub-assemblies from registered HardwareComponent classes'
  );
  for (const [key, compInst] of jetsonScene.componentInstances.entries()) {
    assert.equal(
      compInst instanceof HardwareComponent,
      true,
      `JetsonVisionRobotShowcaseScene sub-assembly "${key}" must be an instance of HardwareComponent`
    );
  }

  // Traverse every single mesh in both Showcase Three.js scenes to prove 0 numeric/broken materials
  let sumoSceneMeshes = 0;
  sumoScene.scene.traverse((obj) => {
    if (obj.isMesh) {
      sumoSceneMeshes++;
      assert.equal(
        obj.material?.isMaterial,
        true,
        `SumoRobotShowcaseScene mesh "${obj.name}" has broken material (${typeof obj.material})`
      );
    }
  });
  assert.ok(sumoSceneMeshes > 80, `SumoRobotShowcaseScene should contain rich 3D CAD geometry (got ${sumoSceneMeshes} meshes)`);

  let jetsonSceneMeshes = 0;
  jetsonScene.scene.traverse((obj) => {
    if (obj.isMesh) {
      jetsonSceneMeshes++;
      assert.equal(
        obj.material?.isMaterial,
        true,
        `JetsonVisionRobotShowcaseScene mesh "${obj.name}" has broken material (${typeof obj.material})`
      );
    }
  });
  assert.ok(jetsonSceneMeshes > 80, `JetsonVisionRobotShowcaseScene should contain rich 3D CAD geometry (got ${jetsonSceneMeshes} meshes)`);

  // 25e. Verify 3D Stage Frustum Containment & Proportional CAD Bounding Boxes (assembled & 100% exploded)
  const projectBoxToNdc = (targetGroup, camera) => {
    targetGroup.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(targetGroup);
    const size = box.getSize(new THREE.Vector3());
    const corners = [
      new THREE.Vector3(box.min.x, box.min.y, box.min.z),
      new THREE.Vector3(box.min.x, box.min.y, box.max.z),
      new THREE.Vector3(box.min.x, box.max.y, box.min.z),
      new THREE.Vector3(box.min.x, box.max.y, box.max.z),
      new THREE.Vector3(box.max.x, box.min.y, box.min.z),
      new THREE.Vector3(box.max.x, box.min.y, box.max.z),
      new THREE.Vector3(box.max.x, box.max.y, box.min.z),
      new THREE.Vector3(box.max.x, box.max.y, box.max.z)
    ];
    let minNdcX = Infinity;
    let maxNdcX = -Infinity;
    let minNdcY = Infinity;
    let maxNdcY = -Infinity;
    for (const c of corners) {
      const ndc = c.clone().project(camera);
      minNdcX = Math.min(minNdcX, ndc.x);
      maxNdcX = Math.max(maxNdcX, ndc.x);
      minNdcY = Math.min(minNdcY, ndc.y);
      maxNdcY = Math.max(maxNdcY, ndc.y);
    }
    return { size, minNdcX, maxNdcX, minNdcY, maxNdcY };
  };

  // Sumo Robot assembled at stage center (t = 1, e = 0)
  sumoScene.setApproachProgress(1);
  sumoScene.setExplodeProgress(0);
  const sumoAssembledFit = projectBoxToNdc(sumoScene.robotGroup, sumoScene.camera);
  assert.ok(
    sumoAssembledFit.size.x < 55 && sumoAssembledFit.size.y < 35 && sumoAssembledFit.size.z < 65,
    `Assembled Sumo Robot must fit proportionally inside the Dohyo ring (got ${sumoAssembledFit.size.x.toFixed(1)} x ${sumoAssembledFit.size.y.toFixed(1)} x ${sumoAssembledFit.size.z.toFixed(1)})`
  );
  assert.ok(
    sumoAssembledFit.minNdcX > -0.92 &&
      sumoAssembledFit.maxNdcX < 0.92 &&
      sumoAssembledFit.minNdcY > -0.92 &&
      sumoAssembledFit.maxNdcY < 0.92,
    `Assembled Sumo Robot must fit completely inside stage camera frustum (NDC X=[${sumoAssembledFit.minNdcX.toFixed(2)}, ${sumoAssembledFit.maxNdcX.toFixed(2)}], Y=[${sumoAssembledFit.minNdcY.toFixed(2)}, ${sumoAssembledFit.maxNdcY.toFixed(2)}])`
  );

  // Sumo Robot 100% exploded at stage center (t = 1, e = 1)
  sumoScene.setExplodeProgress(1);
  const sumoExplodedFit = projectBoxToNdc(sumoScene.robotGroup, sumoScene.camera);
  assert.ok(
    sumoExplodedFit.minNdcX > -0.95 &&
      sumoExplodedFit.maxNdcX < 0.95 &&
      sumoExplodedFit.minNdcY > -0.95 &&
      sumoExplodedFit.maxNdcY < 0.95,
    `100% Exploded Sumo Robot must fit completely inside stage camera frustum (NDC X=[${sumoExplodedFit.minNdcX.toFixed(2)}, ${sumoExplodedFit.maxNdcX.toFixed(2)}], Y=[${sumoExplodedFit.minNdcY.toFixed(2)}, ${sumoExplodedFit.maxNdcY.toFixed(2)}])`
  );

  // Jetson Vision Rover assembled (e = 0)
  jetsonScene.setExplodeProgress(0);
  const jetsonAssembledFit = projectBoxToNdc(jetsonScene.roverGroup, jetsonScene.camera);
  assert.ok(
    jetsonAssembledFit.size.x < 60 && jetsonAssembledFit.size.y < 42 && jetsonAssembledFit.size.z < 68,
    `Assembled Jetson Vision Rover must fit proportionally on calibration pedestal (got ${jetsonAssembledFit.size.x.toFixed(1)} x ${jetsonAssembledFit.size.y.toFixed(1)} x ${jetsonAssembledFit.size.z.toFixed(1)})`
  );
  assert.ok(
    jetsonAssembledFit.minNdcX > -0.92 &&
      jetsonAssembledFit.maxNdcX < 0.92 &&
      jetsonAssembledFit.minNdcY > -0.92 &&
      jetsonAssembledFit.maxNdcY < 0.92,
    `Assembled Jetson Vision Rover must fit completely inside stage camera frustum (NDC X=[${jetsonAssembledFit.minNdcX.toFixed(2)}, ${jetsonAssembledFit.maxNdcX.toFixed(2)}], Y=[${jetsonAssembledFit.minNdcY.toFixed(2)}, ${jetsonAssembledFit.maxNdcY.toFixed(2)}])`
  );

  // Jetson Vision Rover 100% exploded (e = 1)
  jetsonScene.setExplodeProgress(1);
  const jetsonExplodedFit = projectBoxToNdc(jetsonScene.roverGroup, jetsonScene.camera);
  assert.ok(
    jetsonExplodedFit.minNdcX > -0.95 &&
      jetsonExplodedFit.maxNdcX < 0.95 &&
      jetsonExplodedFit.minNdcY > -0.95 &&
      jetsonExplodedFit.maxNdcY < 0.95,
    `100% Exploded Jetson Vision Rover must fit completely inside stage camera frustum (NDC X=[${jetsonExplodedFit.minNdcX.toFixed(2)}, ${jetsonExplodedFit.maxNdcX.toFixed(2)}], Y=[${jetsonExplodedFit.minNdcY.toFixed(2)}, ${jetsonExplodedFit.maxNdcY.toFixed(2)}])`
  );

  // 25f. Verify all LandingShowcaseController i18n keys exist in both TR and EN locales
  const i18nCheck = new I18nService('tr');
  const requiredLandingKeys = [
    'landing.nav.enterWorkbench',
    'landing.sumoScene.sceneTag',
    'landing.sumoScene.telemetryDistance',
    'landing.sumoScene.telemetryExplode',
    'landing.sumoScene.replayApproachBtn',
    'landing.sumoScene.explodeBtn',
    'landing.sumoScene.assembleBtn',
    'landing.sumoScene.approachLabel',
    'landing.sumoScene.explodeLabel',
    'landing.sumoScene.bomTitle',
    'landing.sumoScene.openInWorkbenchBtn',
    'landing.jetsonScene.sceneTag',
    'landing.jetsonScene.telemetryStream',
    'landing.jetsonScene.telemetryGimbal',
    'landing.jetsonScene.autoScanBtn',
    'landing.jetsonScene.fovToggleBtn',
    'landing.jetsonScene.explodeToggleBtn',
    'landing.jetsonScene.panLabel',
    'landing.jetsonScene.tiltLabel',
    'landing.jetsonScene.explodeLabel',
    'landing.jetsonScene.bomTitle',
    'landing.jetsonScene.openInWorkbenchBtn'
  ];
  for (const locale of ['tr', 'en']) {
    i18nCheck.setLocale(locale);
    for (const key of requiredLandingKeys) {
      assert.equal(
        i18nCheck.hasKey(key),
        true,
        `Missing i18n key "${key}" in locale "${locale}"`
      );
      assert.notEqual(
        i18nCheck.t(key),
        key,
        `Unresolved i18n key "${key}" in locale "${locale}"`
      );
    }
  }

  // 25g. Verify AppRouter URL routing (/ vs /workbench), F5 refresh persistence, and semantic <a href> links
  const pushedHistory = [];
  const mockLocation = { pathname: '/', search: '', hash: '' };
  const mockHistory = {
    pushState(state, _title, url) {
      pushedHistory.push({ state, url });
      const parsed = new URL(url, 'http://localhost');
      mockLocation.pathname = parsed.pathname;
      mockLocation.search = parsed.search;
      mockLocation.hash = parsed.hash;
    },
    replaceState(state, _title, url) {
      pushedHistory.push({ state, url, replace: true });
    }
  };

  const router = new AppRouter({ locationObj: mockLocation, historyObj: mockHistory });
  assert.equal(router.currentRoute.view, 'showcase', 'Default / route must resolve to showcase view');

  // Navigating to /workbench pushes /workbench to browser history
  const wbRoute = router.navigate('/workbench');
  assert.equal(wbRoute.view, 'workbench');
  assert.equal(wbRoute.href, '/workbench');
  assert.equal(pushedHistory.at(-1)?.url, '/workbench');

  // Simulating F5 page refresh while on /workbench must stay in workbench (never reset to showcase!)
  const refreshedRouter = new AppRouter({ locationObj: mockLocation, historyObj: mockHistory });
  assert.equal(
    refreshedRouter.currentRoute.view,
    'workbench',
    'Refreshing browser on /workbench must stay in the 3D Workbench'
  );

  // Navigating to /workbench?preset=sumo and /workbench?preset=jetson resolves preset & persists on refresh
  const sumoRoute = router.navigate('/workbench?preset=sumo');
  assert.equal(sumoRoute.view, 'workbench');
  assert.equal(sumoRoute.preset, 'sumo');
  const refreshedSumoRouter = new AppRouter({ locationObj: mockLocation, historyObj: mockHistory });
  assert.equal(refreshedSumoRouter.currentRoute.view, 'workbench');
  assert.equal(refreshedSumoRouter.currentRoute.preset, 'sumo');

  const jetsonRoute = router.navigate('/workbench?preset=jetson');
  assert.equal(jetsonRoute.view, 'workbench');
  assert.equal(jetsonRoute.preset, 'jetson');

  // Navigating back to / returns to showcase
  const homeRoute = router.navigate('/');
  assert.equal(homeRoute.view, 'showcase');
  assert.equal(homeRoute.href, '/');

  // Verify semantic <a href="..."> links in LandingShowcaseController and TopContextPill
  const landingDomRoot = { innerHTML: '', hidden: false };
  const landingCtrl = new LandingShowcaseController({ rootEl: landingDomRoot, initialVisible: true }).mount();
  assert.ok(
    landingDomRoot.innerHTML.includes('href="/workbench"'),
    'LandingShowcaseController must render semantic <a href="/workbench"> links'
  );
  assert.ok(
    landingDomRoot.innerHTML.includes('href="/workbench?preset=sumo"'),
    'LandingShowcaseController must render semantic <a href="/workbench?preset=sumo"> link'
  );
  assert.ok(
    landingDomRoot.innerHTML.includes('href="/workbench?preset=jetson"'),
    'LandingShowcaseController must render semantic <a href="/workbench?preset=jetson"> link'
  );
  landingCtrl.destroy();

  const pillDomRoot = { innerHTML: '' };
  const pillCtrl = new TopContextPill({ rootEl: pillDomRoot }).mount();
  assert.ok(
    pillDomRoot.innerHTML.includes('href="/"') && pillDomRoot.innerHTML.includes('id="btn-open-showcase"'),
    'TopContextPill must render semantic <a href="/"> link for returning to Landing Showcase'
  );
  pillCtrl.destroy();
  router.destroy();
  refreshedRouter.destroy();
  refreshedSumoRouter.destroy();

  sumoScene.destroy();
  jetsonScene.destroy();
  reg.clearInstances();
});

await test('26. Breadboard ↔ Component Magnetic Snapping, Automatic Tie-Point Strip Conduction & Selected Component Quick Target Strip', () => {
  const bb = new BreadboardComponent({ id: 'bb_mag' });
  bb.setPosition(0, 0, 0);
  const uno = new ArduinoUnoBoard({ id: 'uno_mag' });
  uno.setPosition(-38, 0, 0);
  const res = new AxialResistorComponent({ id: 'res_mag', ohms: 220 });
  const led = new SingleLEDComponent({ id: 'led_mag', color: 0x10b981 });

  // 26a. Magnetic breadboard snap calculation when dragging component over breadboard
  const a5Pin = bb.getPin('A5');
  assert.ok(a5Pin, 'Breadboard must expose tie-point pin A5');
  const a5Coords = bb.getPinWorldPosition('A5');
  const a5World = new THREE.Vector3(a5Coords[0], a5Coords[1], a5Coords[2]);

  const snapResult = GizmoMath.computeBreadboardMagneticSnap(
    led,
    new THREE.Vector3(a5World.x + 1.1, a5World.y + 1.5, a5World.z - 0.8),
    [bb]
  );

  assert.equal(snapResult.snapped, true, 'Component near breadboard tie-points must magnetically snap');
  assert.equal(snapResult.breadboardId, 'bb_mag');
  assert.ok(
    snapResult.pinMappings.length >= 2,
    `Expected both LED leads to snap onto breadboard tie-points (got ${snapResult.pinMappings.length})`
  );
  assert.ok(
    snapResult.summary.includes('•'),
    `Magnetic snap summary should list docked tie-points (got "${snapResult.summary}")`
  );

  // Far away from breadboard -> must not snap
  const farResult = GizmoMath.computeBreadboardMagneticSnap(
    led,
    new THREE.Vector3(85, 5.2, 85),
    [bb]
  );
  assert.equal(farResult.snapped, false, 'Component far outside magnetic radius must not snap to breadboard');

  // 26b. StageTransformController magnetic docking + Quick Target Component Strip in #gizmo-hud
  const stageGroup = new THREE.Group();
  stageGroup.add(uno.group, bb.group, res.group, led.group);
  const stageComponents = [uno, bb, res, led];
  const hudEl = { innerHTML: '', hidden: true };

  let quickConnectedPair = null;
  const gizmoController = new StageTransformController({
    camera: new THREE.PerspectiveCamera(45, 1.6, 0.1, 1000),
    domElement: null,
    scene: stageGroup,
    hudEl,
    getComponents: () => stageComponents,
    onQuickConnectPair: (compA, compB) => {
      quickConnectedPair = [compA.id, compB.id];
    }
  });

  gizmoController.selectComponent(led);
  gizmoController.moveSelectedTo(a5World.x + 0.8, a5World.y, a5World.z - 0.5);

  assert.ok(
    led.snappedBreadboardBinding && led.snappedBreadboardBinding.breadboardId === 'bb_mag',
    'StageTransformController.moveSelectedTo must attach snappedBreadboardBinding when docked on breadboard'
  );
  assert.ok(
    hudEl.innerHTML.includes('gizmo-magnet-badge'),
    '#gizmo-hud must render .gizmo-magnet-badge when selected component is magnetically docked to breadboard'
  );
  assert.ok(
    hudEl.innerHTML.includes('gizmo-target-strip') &&
      hudEl.innerHTML.includes('data-quick-target-id="uno_mag"') &&
      hudEl.innerHTML.includes('data-quick-target-id="res_mag"'),
    '#gizmo-hud must render .gizmo-target-strip chips allowing one-click connection to any stage component'
  );

  // 26c. Automatic CircuitFlowSolver conduction through magnetically snapped breadboard tie-points
  // Dock res_mag across A5 (row 5) and A6 (row 6), and led_mag across E6 (row 6) and GND_BOT_1
  res.snappedBreadboardBinding = {
    breadboardId: 'bb_mag',
    summary: 'A5 • A6',
    pinMappings: [
      { componentPin: 'LEAD_A', breadboardPin: 'A5' },
      { componentPin: 'LEAD_B', breadboardPin: 'A6' }
    ]
  };
  led.snappedBreadboardBinding = {
    breadboardId: 'bb_mag',
    summary: 'E6 • GND_BOT_1',
    pinMappings: [
      { componentPin: 'ANODE', breadboardPin: 'E6' },
      { componentPin: 'CATHODE', breadboardPin: 'GND_BOT_1' }
    ]
  };

  // Only wire the Arduino 5V to breadboard B5 (same 5-hole strip as A5) and breadboard GND_BOT_3 to Arduino GND!
  const solver = new CircuitFlowSolver();
  const solveReport = solver.solve({
    components: [uno, bb, res, led],
    connections: [
      { id: 'bb_pwr', from: 'uno_mag.5V', to: 'bb_mag.B5' },
      { id: 'bb_gnd', from: 'bb_mag.GND_BOT_3', to: 'uno_mag.GND' }
    ]
  });

  assert.equal(solveReport.faults.length, 0, 'Breadboard magnetic circuit must have 0 electrical faults');
  assert.equal(
    solveReport.componentReports.led_mag?.isEnergized,
    true,
    'LED docked onto breadboard strip E6/GND_BOT_1 must conduct closed-loop current via row 6 (A6-E6) and bottom GND bus without direct component wires'
  );
  assert.ok(
    solveReport.componentReports.led_mag?.currentMa > 10,
    `Expected >10mA current through breadboard-docked LED (got ${solveReport.componentReports.led_mag?.currentMa} mA)`
  );

  gizmoController.destroy();
});

await test('27. Color-Coded Pin Hover Categories, Wire-Drag Compatible Input Highlighting & Pin/Gizmo HUD Styling', () => {
  const uno = new ArduinoUnoBoard('uno_cat');
  const l298n = new L298NDualBridgeDriver('l298n_cat');
  const imx = new Imx219CsiCameraModule('imx_cat');
  const line = new Tcrt5000LineSensorArray('line_cat');

  // 27a. Verify all 6 color-coded pin visual categories
  assert.equal(SmartPinMatcher.classifyPinVisualCategory(uno.getPin('5V')).id, 'POWER');
  assert.equal(SmartPinMatcher.classifyPinVisualCategory(l298n.getPin('12V')).id, 'POWER');
  assert.equal(SmartPinMatcher.classifyPinVisualCategory(l298n.getPin('OUT1')).id, 'POWER');
  assert.equal(SmartPinMatcher.classifyPinVisualCategory(uno.getPin('GND')).id, 'GND');
  assert.equal(SmartPinMatcher.classifyPinVisualCategory(l298n.getPin('OUT2')).id, 'GND');
  assert.equal(SmartPinMatcher.classifyPinVisualCategory(l298n.getPin('ENA')).id, 'PWM');
  assert.equal(SmartPinMatcher.classifyPinVisualCategory(line.getPin('WIPER')).id, 'ANALOG');
  assert.equal(SmartPinMatcher.classifyPinVisualCategory(imx.getPin('SDA')).id, 'PROTOCOL');
  assert.equal(SmartPinMatcher.classifyPinVisualCategory(imx.getPin('SCL')).id, 'PROTOCOL');
  assert.equal(SmartPinMatcher.classifyPinVisualCategory(uno.getPin('PIN13')).id, 'DIGITAL_IO');

  // 27b. Wire-drag compatible input ranking
  const motor = new N20GearmotorWheelComponent('motor_cat');
  const allPins = [];
  for (const comp of [uno, l298n, imx, motor]) {
    for (const pin of comp.getAllPins()) {
      allPins.push({
        endpoint: `${comp.id}.${pin.name}`,
        componentId: comp.id,
        pinName: pin.name,
        pin
      });
    }
  }

  const out1Source = allPins.find((p) => p.endpoint === 'l298n_cat.OUT1');
  const rankedForOut1 = SmartPinMatcher.rankCompatibleTargetPins(out1Source, allPins);
  const motorVccRank = rankedForOut1.find((r) => r.endpoint === 'motor_cat.VCC');
  const motorGndRank = rankedForOut1.find((r) => r.endpoint === 'motor_cat.GND');

  assert.equal(
    motorVccRank?.compatible,
    true,
    'Dragging wire from L298N.OUT1 must highlight N20Gearmotor.VCC as compatible target'
  );
  assert.equal(motorVccRank?.score, 4, 'L298N.OUT1 -> N20Gearmotor.VCC must score 4 (optimal match)');
  assert.equal(
    motorGndRank?.compatible,
    false,
    'Dragging wire from L298N.OUT1 must mark N20Gearmotor.GND as incompatible (OUT2 drives GND)'
  );

  // 27c. Verify CSS styling for color-coded pin dots, wire-drag target beacon animations & gizmo HUD
  const cssSource = fs.readFileSync(path.join(projectRoot, 'src/styles/main.css'), 'utf8');
  const requiredCssSelectors = [
    '.gizmo-target-strip',
    '.gizmo-target-chip',
    '.gizmo-magnet-badge',
    '.pin-hud-port',
    '.pin-hud-pill',
    '.pin-hud-port.is-compatible',
    '.pin-hud-port.is-nearest-primary',
    '.pin-hud-port.is-incompatible',
    '@keyframes pinCompatiblePulse',
    '@keyframes wireDragFlow'
  ];
  for (const selector of requiredCssSelectors) {
    assert.ok(
      cssSource.includes(selector),
      `src/styles/main.css must define "${selector}" for interactive pin/gizmo visual feedback`
    );
  }
});

await test('28. SmartPinMatcher Robotics/I2C/H-Bridge Scoring & BaseMotorDriver Closed-Loop Motor Driving in CircuitFlowSolver', () => {
  const uno = new ArduinoUnoBoard({ id: 'uno_hb' });
  const l298n = new L298NDualBridgeDriver({
    id: 'l298n_hb',
    initialState: { enaPwm: 255, enbPwm: 200 }
  });
  const motorLeft = new N20GearmotorWheelComponent({ id: 'motor_left_hb' });
  const motorRight = new N20GearmotorWheelComponent({ id: 'motor_right_hb' });

  // 28a. Verify SmartPinMatcher.matchBestPinPair between L298N and N20 Gearmotor
  const pair1 = SmartPinMatcher.matchBestPinPair(l298n, motorLeft, []);
  assert.ok(pair1, 'SmartPinMatcher must find an optimal H-Bridge connection between L298N and N20 Gearmotor');
  assert.ok(
    (pair1.from === 'l298n_hb.OUT1' && pair1.to === 'motor_left_hb.VCC') ||
      (pair1.from === 'l298n_hb.OUT3' && pair1.to === 'motor_left_hb.VCC'),
    `First smart wire between L298N and N20 motor should connect OUT1/OUT3 -> VCC (got ${pair1.from} -> ${pair1.to})`
  );

  // 28b. Closed-loop H-Bridge solver verification
  const solver = new CircuitFlowSolver();
  const reportActive = solver.solve({
    components: [uno, l298n, motorLeft, motorRight],
    connections: [
      { id: 'hb1', from: 'uno_hb.PIN5', to: 'l298n_hb.ENA' },
      { id: 'hb2', from: 'uno_hb.PIN6', to: 'l298n_hb.ENB' },
      { id: 'hb3', from: 'l298n_hb.GND', to: 'uno_hb.GND' },
      { id: 'hb4', from: 'l298n_hb.OUT1', to: 'motor_left_hb.VCC' },
      { id: 'hb5', from: 'motor_left_hb.GND', to: 'l298n_hb.OUT2' },
      { id: 'hb6', from: 'l298n_hb.OUT3', to: 'motor_right_hb.VCC' },
      { id: 'hb7', from: 'motor_right_hb.GND', to: 'l298n_hb.OUT4' }
    ]
  });

  assert.equal(reportActive.faults.length, 0, 'H-Bridge dual motor circuit must have 0 faults');
  assert.equal(
    reportActive.componentReports.motor_left_hb?.isEnergized,
    true,
    'Left N20 Gearmotor driven by L298N OUT1/OUT2 must be energized in closed loop'
  );
  assert.equal(
    reportActive.componentReports.motor_right_hb?.isEnergized,
    true,
    'Right N20 Gearmotor driven by L298N OUT3/OUT4 must be energized in closed loop'
  );
  assert.ok(
    motorLeft.state.speedNormalized > 0.5,
    `Energized N20 Gearmotor must spin with speedNormalized > 0.5 (got ${motorLeft.state.speedNormalized})`
  );

  // Turning off ENA/ENB PWM must de-energize H-Bridge outputs
  l298n.updateState({ enaPwm: 0, enbPwm: 0 });
  const reportIdle = solver.solve({
    components: [uno, l298n, motorLeft, motorRight],
    connections: [
      { id: 'hb1', from: 'uno_hb.PIN5', to: 'l298n_hb.ENA' },
      { id: 'hb2', from: 'uno_hb.PIN6', to: 'l298n_hb.ENB' },
      { id: 'hb3', from: 'l298n_hb.GND', to: 'uno_hb.GND' },
      { id: 'hb4', from: 'l298n_hb.OUT1', to: 'motor_left_hb.VCC' },
      { id: 'hb5', from: 'motor_left_hb.GND', to: 'l298n_hb.OUT2' },
      { id: 'hb6', from: 'l298n_hb.OUT3', to: 'motor_right_hb.VCC' },
      { id: 'hb7', from: 'motor_right_hb.GND', to: 'l298n_hb.OUT4' }
    ]
  });
  assert.equal(
    reportIdle.componentReports.motor_left_hb?.isEnergized,
    false,
    'Disabling ENA/ENB PWM on L298N must de-energize H-Bridge motor outputs'
  );
});

await test('29. Sumo & Jetson Showcase-to-Workbench Closed-Loop Presets & Live Electrical Verification', () => {
  const reg = new ComponentRegistry();
  registerAllHardware(reg);
  const solver = new CircuitFlowSolver();

  // 29a. Sumo Robot Workbench Preset Closed-Loop Verification
  const sumoScene = new SumoRobotShowcaseScene({ canvas: null, autoPlay: false });
  const sumoProject = sumoScene.getWorkbenchProject();
  assert.ok(
    sumoProject.circuit_json.connections.length >= 14,
    `Sumo Workbench preset must include full power, ground, and H-Bridge connections (got ${sumoProject.circuit_json.connections.length})`
  );

  const sumoDeserialized = ScenarioSerializer.deserializeStage(sumoProject.circuit_json, reg);
  const sumoAllComponents = [...sumoDeserialized.boards, ...sumoDeserialized.components];
  const sumoReport = solver.solve({
    components: sumoAllComponents,
    connections: sumoDeserialized.connections
  });

  assert.equal(sumoReport.faults.length, 0, 'Sumo Robot Workbench circuit must have 0 electrical faults');
  assert.equal(sumoReport.componentReports.sonar_front?.isEnergized, true, 'Sumo sonar_front must be energized');
  assert.equal(sumoReport.componentReports.line_array_front?.isEnergized, true, 'Sumo line_array_front must be energized');
  assert.equal(sumoReport.componentReports.motor_left?.isEnergized, true, 'Sumo motor_left must be energized via L298N OUT1/OUT2');
  assert.equal(sumoReport.componentReports.motor_right?.isEnergized, true, 'Sumo motor_right must be energized via L298N OUT3/OUT4');

  // 29b. Jetson Vision Rover Workbench Preset Closed-Loop Verification
  const jetsonScene = new JetsonVisionRobotShowcaseScene({ canvas: null, autoTrack: false });
  const jetsonProject = jetsonScene.getWorkbenchProject();
  assert.ok(
    jetsonProject.circuit_json.connections.length >= 14,
    `Jetson Workbench preset must include full 3.3V/5V/GND/I2C/PWM closed-loop connections (got ${jetsonProject.circuit_json.connections.length})`
  );

  const jetsonDeserialized = ScenarioSerializer.deserializeStage(jetsonProject.circuit_json, reg);
  const jetsonAllComponents = [...jetsonDeserialized.boards, ...jetsonDeserialized.components];
  const jetsonReport = solver.solve({
    components: jetsonAllComponents,
    connections: jetsonDeserialized.connections
  });

  assert.equal(jetsonReport.faults.length, 0, 'Jetson Vision Rover Workbench circuit must have 0 electrical faults');
  assert.equal(jetsonReport.componentReports.cam_imx219?.isEnergized, true, 'Jetson cam_imx219 must be energized');
  assert.equal(jetsonReport.componentReports.gimbal_turret?.isEnergized, true, 'Jetson gimbal_turret must be energized');
  assert.equal(jetsonReport.componentReports.tof_front?.isEnergized, true, 'Jetson tof_front must be energized');
  assert.equal(jetsonReport.componentReports.oled_hud?.isEnergized, true, 'Jetson oled_hud must be energized');

  sumoScene.destroy();
  jetsonScene.destroy();
  reg.clearInstances();
});

// ============================================================================
// 30. Showcase / Workbench Registry & Scene Isolation + Reference PinHUD Parity
// ============================================================================
await test('30. Showcase scenes use isolated ComponentRegistry & PinHudOverlay/StageTransformController filter by active scene', async () => {
  hardwareRegistry.clearInstances();
  registerAllHardware(hardwareRegistry);

  // Create Workbench scene with only Arduino Uno R3 mounted
  const workbenchScene = new THREE.Scene();
  const workbenchBoard = hardwareRegistry.create(ArduinoUnoBoard.typeId, 'main.host_board');
  workbenchScene.add(workbenchBoard.group);

  // Instantiate both Showcase scenes (as LandingShowcaseController does)
  const sumoShowcase = new SumoRobotShowcaseScene({ canvas: null, autoApproach: false });
  const jetsonShowcase = new JetsonVisionRobotShowcaseScene({ canvas: null, autoTrack: false });

  // 30a. Showcase scenes MUST NOT register instances into singleton hardwareRegistry
  assert.equal(
    hardwareRegistry.instancesById.has('jetson_nano_b01_main'),
    false,
    'JetsonVisionRobotShowcaseScene must not pollute singleton hardwareRegistry with jetson_nano_b01_main'
  );
  assert.equal(
    hardwareRegistry.instancesById.has('sumo_dozer_blade_1'),
    false,
    'SumoRobotShowcaseScene must not pollute singleton hardwareRegistry with sumo_dozer_blade_1'
  );
  assert.equal(
    hardwareRegistry.instancesById.size,
    1,
    'Singleton hardwareRegistry must contain only the 1 Workbench component (main.host_board)'
  );

  // 30b. Even if a stray component is created in hardwareRegistry without being added to workbenchScene,
  // PinHudOverlay and StageTransformController must strictly filter it out via scene graph ancestry
  const offstageGhost = hardwareRegistry.create(JetsonNanoBoard.typeId, 'ghost.offstage_board');
  assert.ok(offstageGhost.group, 'offstageGhost must have a 3D group');
  // Intentionally NOT added to workbenchScene

  const mockHud = new PinHudOverlay({
    container: null,
    camera: new THREE.PerspectiveCamera(),
    scene: workbenchScene,
    registry: hardwareRegistry,
    wireTool: null
  });
  // Simulate active wire drag (which asks for all visible components)
  mockHud.activeDragSourcePin = { component: workbenchBoard, pinId: '5V' };

  const visibleComps = mockHud.getVisibleComponents();
  assert.equal(
    visibleComps.length,
    1,
    'PinHudOverlay.getVisibleComponents() must only return components mounted in workbenchScene'
  );
  assert.equal(visibleComps[0].id, 'main.host_board');

  const transformCtrl = new StageTransformController({
    scene: workbenchScene,
    camera: new THREE.PerspectiveCamera(),
    domElement: null,
    orbitControls: null,
    registry: hardwareRegistry,
    pinHudOverlay: mockHud
  });
  const stageComps = transformCtrl._getStageComponents();
  assert.equal(
    stageComps.length,
    1,
    'StageTransformController._getStageComponents() must exclude off-scene components'
  );
  assert.equal(stageComps[0].id, 'main.host_board');

  // 30c. Reference learn-arduino-3d PinHUD CSS selector parity check
  const cssSrc = fs.readFileSync(path.join(projectRoot, 'src/styles/main.css'), 'utf8');
  assert.ok(
    cssSrc.includes('.pin-hud-ports-layer.mode-pin-hover .pin-hud-port .pin-hud-pill'),
    'main.css must target .pin-hud-ports-layer.mode-pin-hover for pin pill visibility'
  );
  assert.ok(
    !cssSrc.includes('.pin-hud-port.is-compatible .pin-hud-pill {\n  opacity: 1 !important;'),
    'main.css must not force all .is-compatible pin pills visible simultaneously'
  );

  // 30d. Primary Host Board (main.*) must have the Delete action in StageTransformController HUD and be removable
  let removedHostBoardId = null;
  transformCtrl.hudEl = { hidden: true, innerHTML: '' };
  transformCtrl.onRemoveComponent = (comp) => {
    removedHostBoardId = comp.id;
    workbenchScene.remove(comp.group);
    hardwareRegistry.removeInstance(comp.id, true);
    return true;
  };
  transformCtrl.selectComponent(workbenchBoard);
  assert.ok(
    transformCtrl.hudEl.innerHTML.includes('data-gizmo-act="delete"'),
    'Selecting primary host board (main.*) must render the delete button (data-gizmo-act="delete") in Gizmo HUD'
  );
  transformCtrl.deleteSelected();
  assert.equal(
    removedHostBoardId,
    'main.host_board',
    'deleteSelected() must remove the primary host board (main.host_board) when selected'
  );
  assert.equal(transformCtrl.selectedComponent, null);

  // 30e. Wire delete badge (`.pin-hud-wire-delete`) must never transition `transform` from (0,0) or flicker out on wire hover
  const wireDeleteRuleMatch = cssSrc.match(/\.pin-hud-wire-delete\s*\{[^}]*\}/);
  assert.ok(wireDeleteRuleMatch, 'main.css must define .pin-hud-wire-delete');
  assert.ok(
    !wireDeleteRuleMatch[0].includes('transition: transform'),
    '.pin-hud-wire-delete must not transition `transform`, which causes badges to fly in from top-left (0, 0)'
  );
  const wireDeleteHoverMatch = cssSrc.match(/\.pin-hud-wire-delete:hover\s*\{[^}]*\}/);
  assert.ok(wireDeleteHoverMatch, 'main.css must define .pin-hud-wire-delete:hover');
  assert.ok(
    !wireDeleteHoverMatch[0].includes('transform:'),
    '.pin-hud-wire-delete:hover must not override inline `transform: translate3d(x, y, 0)`'
  );
  const pinHudSrc = fs.readFileSync(
    path.join(projectRoot, 'src/stage/interaction/PinHudOverlay.js'),
    'utf8'
  );
  assert.ok(
    pinHudSrc.includes('_syncWireDeleteButtons') && pinHudSrc.includes('setHoveredWireId'),
    'PinHudOverlay must reconcile wire delete buttons in-place via _syncWireDeleteButtons and setHoveredWireId'
  );

  // 30f. ComponentPalettePopover 360° 3D Turntable Preview & Full 30-Component Catalog i18n Parity
  const mockPaletteRoot = {
    hidden: true,
    innerHTML: '',
    setAttribute() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
  const palettePopover = new ComponentPalettePopover({
    rootEl: mockPaletteRoot,
    registry: hardwareRegistry
  });
  palettePopover.open('catalog');
  assert.equal(palettePopover.isOpen, true, 'ComponentPalettePopover.open() must open the catalog');
  assert.ok(
    mockPaletteRoot.innerHTML.includes('data-role="catalog-preview-pane"') &&
      mockPaletteRoot.innerHTML.includes('data-role="catalog-preview-stage"'),
    'ComponentPalettePopover must render the right-side 360° 3D turntable preview pane and stage'
  );
  assert.ok(
    !mockPaletteRoot.innerHTML.includes('workbench.palette.') &&
      !mockPaletteRoot.innerHTML.includes('hw.'),
    'ComponentPalettePopover rendered markup must contain zero raw workbench.palette.* or hw.* i18n keys'
  );

  const angleBefore = palettePopover.turntableAngle;
  const previewComp = palettePopover.setPreviewComponent('sensor.ultrasonic');
  assert.ok(previewComp, 'setPreviewComponent("sensor.ultrasonic") must instantiate the 3D preview component');
  assert.equal(
    hardwareRegistry.instancesById.has('__catalog_preview__'),
    false,
    '3D Turntable Preview must NEVER pollute hardwareRegistry.instancesById with __catalog_preview__'
  );
  const angleAfter = palettePopover.stepPreviewTurntable(0.5);
  assert.ok(
    angleAfter > angleBefore,
    `stepPreviewTurntable(0.5) must advance turntableAngle (${angleBefore} -> ${angleAfter})`
  );
  assert.ok(
    Math.abs(palettePopover._previewPivot.rotation.y - angleAfter) < 1e-6,
    '_previewPivot.rotation.y must track turntableAngle'
  );
  palettePopover.destroy();

  sumoShowcase.destroy();
  jetsonShowcase.destroy();
  hardwareRegistry.clearInstances();
});

await test('31. Backend-Only AI, Valid Email Auth & Session Verification, Landing Page Auth Modals, User Workspace Dashboard, Auto-Save & Guest Prompt', async () => {
  const apiClient = new BackendApiClient({ fetchImpl: null, storage: null });

  // 31a. Email validation & rejection of invalid email addresses
  assert.equal(BackendApiClient.isValidEmail('invalid-email'), false);
  assert.equal(BackendApiClient.isValidEmail('missing@domain'), false);
  assert.equal(BackendApiClient.isValidEmail('engineer@circuitlab.io'), true);

  let rejectedInvalidEmail = false;
  try {
    await apiClient.register({
      name: 'Invalid User',
      email: 'not-an-email',
      password: 'password123'
    });
  } catch (err) {
    rejectedInvalidEmail = err.status === 422;
  }
  assert.equal(rejectedInvalidEmail, true, 'Registering with an invalid email must throw 422 validation error');

  // 31b. Valid email registration, session verification (verifySession), and zero BYOK headers
  const regRes = await apiClient.register({
    name: 'Nikola Tesla',
    email: 'nikola@circuitlab.io',
    password: 'password123'
  });
  assert.equal(apiClient.isAuthenticated(), true);
  assert.equal(regRes.user.email, 'nikola@circuitlab.io');

  const verified = await apiClient.verifySession();
  assert.equal(verified.authenticated, true, 'verifySession() must confirm active authenticated user');
  assert.equal(verified.user.email, 'nikola@circuitlab.io');

  const headers = apiClient._buildHeaders();
  assert.ok(headers.Authorization?.startsWith('Bearer '), 'Auth header must carry Bearer token');
  assert.equal('X-Nebius-Api-Key' in headers, false, 'BYOK X-Nebius-Api-Key header must NEVER be sent');
  assert.equal('X-Tavily-Api-Key' in headers, false, 'BYOK X-Tavily-Api-Key header must NEVER be sent');
  assert.equal('X-User-Ai-Key' in headers, false, 'BYOK X-User-Ai-Key header must NEVER be sent');

  // 31c. User Workspace Dashboard: auto-create workspace on workbench start, create new workspace, auto-save edits
  const reg = new ComponentRegistry();
  registerAllHardware(reg);
  let lastSavedStatus = null;

  const projectsModal = new ProjectsAndGroupsModal({
    registry: reg,
    apiClient,
    getCurrentCode: () => 'void setup() { pinMode(13, OUTPUT); }\nvoid loop() { digitalWrite(13, HIGH); }',
    onWorkspaceStatusChange: (status) => {
      lastSavedStatus = status;
    }
  });

  await projectsModal.setSessionUser(apiClient.user, { autoCreateWorkspaceIfEmpty: false });
  const startSessionRes = await projectsModal.handleWorkbenchSessionStart({ source: 'workbench' });
  assert.equal(startSessionRes.mode, 'authenticated');
  assert.ok(startSessionRes.workspace?.id, 'Authenticated user entering workbench must automatically create/bind an account workspace');
  assert.equal(projectsModal.userWorkspaces.length, 1);
  assert.equal(lastSavedStatus?.state, 'saved');

  // Create a second workspace from the User Dashboard ("Yeni Çalışma Alanı")
  const secondWs = await projectsModal.createNewWorkspace({
    title: 'Jetson Edge AI Deneyi',
    boardType: 'board.jetson_nano',
    seedCurrentStage: false,
    resetStage: true
  });
  assert.equal(secondWs.title, 'Jetson Edge AI Deneyi');
  assert.equal(secondWs.board_type, 'board.jetson_nano');
  assert.equal(projectsModal.activeWorkspace?.id, secondWs.id);
  assert.equal(projectsModal.userWorkspaces.length, 2);

  // Auto-save modifications to the active workspace
  const autoSaveRes = await projectsModal.autoSaveActiveWorkspace({ reason: 'component_spawned' });
  assert.equal(autoSaveRes.saved, true);
  assert.equal(autoSaveRes.workspace.id, secondWs.id);

  // Switch between workspaces and delete one
  const switched = projectsModal.loadUserWorkspace(startSessionRes.workspace.id);
  assert.equal(switched.loaded, true);
  assert.equal(projectsModal.activeWorkspace.id, startSessionRes.workspace.id);

  await projectsModal.deleteUserWorkspace(secondWs.id);
  assert.equal(projectsModal.userWorkspaces.length, 1);

  // 31d. Logout & Guest Mode Prompt (non-blocking: allows continuing without logging in)
  await apiClient.logout();
  assert.equal(apiClient.isAuthenticated(), false);
  await projectsModal.setSessionUser(null);

  const guestStartRes = await projectsModal.handleWorkbenchSessionStart({ source: 'workbench' });
  assert.equal(guestStartRes.mode, 'guest', 'Unauthenticated user entering workbench must enter guest mode');
  assert.equal(guestStartRes.promptShown, true, 'Unauthenticated user must be prompted to sign in');
  assert.equal(projectsModal.isGuestPromptVisible, true);

  const continueRes = projectsModal.continueAsGuest();
  assert.equal(continueRes.continuedAsGuest, true, 'User must be able to dismiss prompt and continue using workbench as guest');
  assert.equal(projectsModal.isGuestPromptVisible, false);
  assert.equal(projectsModal.guestPromptDismissed, true);

  projectsModal.destroy();
});

await test('32. Progressive AI Tool Discovery (capabilityIndex) & Zero Registry Instance Pollution', async () => {
  const reg = new ComponentRegistry();
  registerAllHardware(reg);

  const searchRes = searchCapabilities('ultrasonic distance sensor motor driver', {
    registry: reg,
    limit: 6
  });
  assert.ok(Array.isArray(searchRes.components) && searchRes.components.length > 0);
  assert.ok(
    searchRes.components.some((c) => c.typeId === 'sensor.ultrasonic'),
    'searchCapabilities must discover sensor.ultrasonic for ultrasonic distance query'
  );
  assert.ok(Array.isArray(searchRes.sdkMethods) && searchRes.sdkMethods.length > 0);

  const instanceCountBefore = reg.instancesById.size;
  const schema = getComponentSchema('sensor.ultrasonic', reg);
  assert.equal(schema.found, true, 'getComponentSchema("sensor.ultrasonic") must return found: true');
  assert.equal(
    reg.instancesById.size,
    instanceCountBefore,
    'getComponentSchema must NEVER leave temporary probe instances in registry.instancesById'
  );
  const pinNames = schema.pins.map((p) => p.name);
  assert.ok(
    pinNames.includes('VCC') && pinNames.includes('TRIG') && pinNames.includes('ECHO') && pinNames.includes('GND'),
    `Ultrasonic schema must expose VCC, TRIG, ECHO, GND pins (got ${pinNames.join(', ')})`
  );
});

await test('33. Code Mode Sandbox (CodeModeExecutor & CircuitSDK) Security Guard, Multi-Component Circuit Synthesis & Verification', async () => {
  const reg = new ComponentRegistry();
  registerAllHardware(reg);
  const apiClient = new BackendApiClient({ fetchImpl: null, storage: null });

  let executor = null;
  const runtime = new LiveCodeRuntime({
    getHostBoard: () => executor?.getHostBoard(),
    getComponents: () => [executor?.getHostBoard(), ...(executor?.getStageComponents() || [])].filter(Boolean),
    getConnections: () => executor?.getConnections() || []
  });

  executor = new StageAiCommandExecutor({
    registry: reg,
    runtime,
    apiClient
  });

  // 33a. Security sandbox blocks forbidden global tokens (window, fetch, process, eval)
  const sdk = new CircuitSDK({ executor });
  const codeExecutor = new CodeModeExecutor({ sdk });
  const forbiddenCheck = codeExecutor.validateCode('await fetch("https://evil.example.com");');
  assert.equal(forbiddenCheck.valid, false, 'CodeModeExecutor must reject code containing forbidden fetch() token');

  const blockedExec = await executor.executeCodeModeScript('window.location = "https://evil.example.com";');
  assert.equal(blockedExec.ok, false, 'executeCodeModeScript must block forbidden window access');

  // 33b. Execute multi-component Code Mode script (Arduino Uno + 220R Resistor + Green LED + closed-loop wiring + firmware)
  const validScript = `
    circuit.setHostBoard('board.arduino_uno');
    const r1 = circuit.spawnComponent('passive.resistor', { id: 'cm_r1', position: [-6, 5.2, 6], config: { resistanceOhms: 220 } });
    const led1 = circuit.spawnComponent('led.single', { id: 'cm_led1', position: [6, 5.2, 6], config: { color: 'green' } });
    circuit.connectPins('host.PIN9', r1.id + '.LEAD_A', { color: '#38bdf8' });
    circuit.connectPins(r1.id + '.LEAD_B', led1.id + '.ANODE', { color: '#22c55e' });
    circuit.connectPins(led1.id + '.CATHODE', 'host.GND', { color: '#1e293b' });
    circuit.writeFirmware([
      'void setup() { pinMode(9, OUTPUT); }',
      'void loop() { digitalWrite(9, HIGH); delay(250); }'
    ].join('\\n'));
    return circuit.verifyCircuit();
  `;
  const execRes = await executor.executeCodeModeScript(validScript);
  assert.equal(execRes.ok, true, 'Valid CircuitSDK Code Mode script must execute cleanly');
  assert.equal(execRes.verification.closedLoopCount, 1, 'Synthesized Code Mode circuit must form 1 closed Kirchhoff loop');
  assert.equal(execRes.verification.faultCount, 0, 'Synthesized Code Mode circuit must have 0 electrical faults');
  assert.equal(executor.canUndo(), true, 'Code Mode execution must push an atomic snapshot onto the undo stack');

  // Undo restores stage cleanly
  const undoRes = executor.undoLastTransaction();
  assert.equal(undoRes.restored, true);
  assert.equal(executor.getStageComponents().length, 0);
  runtime.stop({ resetPins: true });
});

await test('34. Security & Multi-Round Agent Loop — Guest Zero-Credit Isolation, 401 Auth Gate, Strict Client Surface, 402 Credit Guard & Customer Storefront', async () => {
  const reg = new ComponentRegistry();
  registerAllHardware(reg);
  const apiClient = new BackendApiClient({ fetchImpl: null, storage: null });

  // 34a. Security Audit: Client API surface must never expose client-side credit mutations or admin mutations
  assert.equal(typeof apiClient.simulateWhopTopup, 'undefined', 'Client-side credit fulfillment method must not exist');
  assert.equal(typeof apiClient.simulateWhopOrder, 'undefined', 'Client-side order fulfillment method must not exist');
  assert.equal(typeof apiClient.fetchAdminOverview, 'undefined', 'fetchAdminOverview must not exist on frontend client');
  assert.equal(typeof apiClient.upsertAdminRoleLimit, 'undefined', 'upsertAdminRoleLimit must not exist on frontend client');
  assert.equal(typeof apiClient.adjustUserCredits, 'undefined', 'adjustUserCredits must not exist on frontend client');
  assert.equal(typeof apiClient._deductOfflineCredits, 'undefined', '_deductOfflineCredits must not exist');

  // 34b. Unauthenticated Guest Isolation: Guest has null credits, no top credit pill, and 401 on AI/Store actions
  assert.equal(apiClient.isAuthenticated(), false, 'Fresh client must be unauthenticated guest');
  assert.equal(apiClient.getCredits(), null, 'Unauthenticated guest must have null credits (never 250)');

  const mockTopRoot = {
    innerHTML: '',
    querySelector() {
      return null;
    }
  };
  const topPill = new TopContextPill({ rootEl: mockTopRoot }).mount();
  assert.equal(
    mockTopRoot.innerHTML.includes('id="btn-open-credits"'),
    false,
    'Guest TopContextPill must NOT render #btn-open-credits credit badge'
  );

  let authRedirectTab = null;
  const mockModalRoot = {
    innerHTML: '',
    hidden: true,
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    appendChild() {}
  };
  const creditModal = new CreditStoreModal({
    rootEl: mockModalRoot,
    apiClient,
    onRequireAuth: (tab) => {
      authRedirectTab = tab;
    }
  });
  creditModal.containerEl = mockModalRoot;
  const guestStoreOpened = await creditModal.open('packages');
  assert.equal(guestStoreOpened, false, 'Guest attempting to open CreditStoreModal must be blocked');
  assert.equal(authRedirectTab, 'login', 'Guest attempting to open CreditStoreModal must trigger onRequireAuth("login")');

  let executor = null;
  const runtime = new LiveCodeRuntime({
    getHostBoard: () => executor?.getHostBoard(),
    getComponents: () => [executor?.getHostBoard(), ...(executor?.getStageComponents() || [])].filter(Boolean),
    getConnections: () => executor?.getConnections() || []
  });

  const progressPhases = [];
  executor = new StageAiCommandExecutor({
    registry: reg,
    runtime,
    apiClient,
    onAgentProgress: (evt) => {
      if (evt?.phase) progressPhases.push(evt.phase);
    }
  });

  const guestAgentRes = await executor.executePrompt('Add green LED to pin 9');
  assert.equal(guestAgentRes.ok, false, 'Guest AI prompt execution must be rejected');
  assert.equal(guestAgentRes.status, 401, 'Guest AI prompt execution must return HTTP 401 unauthenticated');
  assert.equal(guestAgentRes.error, 'unauthenticated');

  // 34c. Authenticated User (`free` role): Login grants role-based credits and unlocks Flownie Agent Loop
  await apiClient.login({
    email: 'maker@circuitlab.io',
    password: 'password123'
  });
  assert.equal(apiClient.isAuthenticated(), true);
  const initialCredits = apiClient.getCredits().available_credits;
  assert.equal(initialCredits, 250, 'Authenticated user initial role credit balance in test mode must be 250.0');

  const agentRes = await executor.executePrompt(
    'HC-SR04 ultrasonik mesafe sensörü ve buzzer alarm devresi kur ve kodunu yaz'
  );
  assert.equal(agentRes.ok, true, 'Authenticated multi-round Flownie Agent Loop must succeed');
  assert.ok(
    progressPhases.includes('search_mode') && progressPhases.includes('code_mode') && progressPhases.includes('completed'),
    `Agent loop must progress through search_mode -> code_mode -> completed (got ${progressPhases.join(' -> ')})`
  );
  assert.ok(
    executor.getStageComponents().some((c) => c.typeId === 'sensor.ultrasonic'),
    'Agent loop must spawn sensor.ultrasonic on the 3D stage'
  );
  assert.ok(
    apiClient.getCredits().available_credits < initialCredits,
    'Multi-round agent execution must deduct AI credits from authenticated user balance'
  );

  // 34d. Drain credits to 0 -> verify 402 insufficient_credits blocks agent loop
  apiClient.setCredits({
    promotional_credits: 0,
    purchased_credits: 0,
    available_credits: 0
  });
  const blockedRes = await executor.executePrompt('Add green LED to pin 9');
  assert.equal(blockedRes.ok, false, 'Agent execution must be blocked when available_credits is 0');
  assert.equal(blockedRes.status, 402, 'Insufficient credits must return HTTP 402 status');
  assert.equal(blockedRes.error, 'insufficient_credits');

  // 34e. Authenticated user creates Checkout session (pending order, no client-side self-fulfillment)
  const checkoutRes = await apiClient.createCreditCheckout('maker-2000');
  assert.equal(checkoutRes.ok, true);
  assert.ok(checkoutRes.order.order_number.startsWith('ORD-'));
  assert.equal(checkoutRes.order.status, 'pending');

  // Simulate backend webhook credit sync (e.g. after real payment webhook updates user balance)
  apiClient.setCredits({
    promotional_credits: 0,
    purchased_credits: 2300,
    available_credits: 2300
  });
  topPill.setSessionUser(apiClient.user);
  topPill.setCredits(apiClient.getCredits());
  assert.ok(
    mockTopRoot.innerHTML.includes('2300.0'),
    'Authenticated TopContextPill must display the 2300.0 AI credit balance badge'
  );
  assert.equal(
    mockTopRoot.innerHTML.toLowerCase().includes('whop'),
    false,
    'TopContextPill must not expose internal payment gateway name (Whop) in customer UI'
  );

  const authStoreOpened = await creditModal.open('packages');
  assert.equal(authStoreOpened, true);
  assert.ok(
    mockModalRoot.innerHTML.includes('credit-pkg-maker-2000') && mockModalRoot.innerHTML.includes('2300.0'),
    'CreditStoreModal must render credit packages and live 2300.0 credit balance'
  );
  assert.equal(
    mockModalRoot.innerHTML.toLowerCase().includes('whop'),
    false,
    'CreditStoreModal must NEVER expose internal payment gateway name (Whop) in customer UI'
  );
  assert.equal(
    mockModalRoot.innerHTML.includes('credit-tab-admin'),
    false,
    'CreditStoreModal must NEVER contain an Admin tab (#credit-tab-admin)'
  );
  assert.equal(
    mockModalRoot.innerHTML.includes('whop-simulate-fulfill-btn'),
    false,
    'CreditStoreModal must NEVER contain a sandbox self-topup button (#whop-simulate-fulfill-btn)'
  );

  creditModal.destroy();
  topPill.destroy();
  runtime.stop({ resetPins: true });
});

await test('35. CalloutManager .name i18n, Role Quota UI, CORE_TOOLS CapabilityGate, ObservationBuilder & Multi-Turn Servo Barrier Synthesis', async () => {
  const reg = new ComponentRegistry();
  registerAllHardware(reg);

  // 35a. CalloutManager resolves `hw.<typeId>.label` AND falls back cleanly to `hw.<typeId>.name` (zero raw `.label` strings)
  const mockCamera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
  const calloutMgr = new CalloutManager(mockCamera, null);
  i18n.setLocale('tr');
  const resolvedUltrasonicTr = calloutMgr.resolveLabel({
    id: 'sensor_1',
    labelKey: 'hw.sensor.ultrasonic.label',
    label: 'hw.sensor.ultrasonic.label'
  });
  assert.equal(
    resolvedUltrasonicTr.includes('.label'),
    false,
    `CalloutManager must resolve hw.sensor.ultrasonic.label via .name fallback without raw key (got "${resolvedUltrasonicTr}")`
  );
  assert.ok(
    resolvedUltrasonicTr.toLowerCase().includes('ultrasonik') || resolvedUltrasonicTr.includes('HC-SR04'),
    `CalloutManager TR label must be localized (got "${resolvedUltrasonicTr}")`
  );

  i18n.setLocale('en');
  const resolvedServoEn = calloutMgr.resolveLabel({
    id: 'servo_1',
    labelKey: 'hw.motor.servo.label',
    label: 'hw.motor.servo.label'
  });
  assert.equal(
    resolvedServoEn.includes('.label'),
    false,
    `CalloutManager EN label must not contain raw .label key (got "${resolvedServoEn}")`
  );
  i18n.setLocale('tr');

  // 35b. TopContextPill role badge (`FREE` / `PRO`) and ProjectsAndGroupsModal quota + low-credit warning
  const apiClient = new BackendApiClient({ fetchImpl: null, storage: null });
  await apiClient.login({
    email: 'maker@circuitlab.io',
    password: 'password123'
  });
  // Drain balance to 12.5 (< 20) to trigger low-credit warning badge
  apiClient.setCredits({
    promotional_credits: 12.5,
    purchased_credits: 0,
    available_credits: 12.5
  });

  const mockTopRoot = {
    innerHTML: '',
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
  const topPill = new TopContextPill({
    rootEl: mockTopRoot
  }).mount();
  topPill.setSessionUser(apiClient.user);
  topPill.setCredits(apiClient.getCredits());
  assert.ok(
    mockTopRoot.innerHTML.includes('data-testid="top-role-badge"') &&
      mockTopRoot.innerHTML.includes('FREE'),
    'Authenticated TopContextPill must render data-testid="top-role-badge" with FREE role'
  );

  const mockProjectsRoot = {
    innerHTML: '',
    hidden: true,
    classList: {
      add() {},
      remove() {}
    },
    setAttribute() {},
    removeAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    remove() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };
  const projectsModal = new ProjectsAndGroupsModal({
    rootEl: mockProjectsRoot,
    apiClient
  });
  projectsModal._containerEl = mockProjectsRoot;
  await projectsModal.open('workspaces');
  assert.ok(
    mockProjectsRoot.innerHTML.includes('data-testid="workspace-quota-badge"'),
    'ProjectsAndGroupsModal must display workspace quota badge from /api/v1/limits/overview'
  );
  assert.ok(
    mockProjectsRoot.innerHTML.includes('data-testid="low-credit-warning"'),
    'ProjectsAndGroupsModal must display low-credit warning when available_credits < 20'
  );

  // 35c. CORE_TOOLS progressive disclosure, CapabilityGate (`partitionCalls`), and `SessionMemory` deduplication
  assert.equal(CORE_TOOLS.length, 14, 'CORE_TOOLS must expose all 14 progressive disclosure + Flownie circuit tools');
  const fnSchema = getFunctionSchema('sdk.connectPins');
  assert.equal(fnSchema.found, true, 'getFunctionSchema("sdk.connectPins") must return full function schema');

  const partition = partitionCalls([
    { name: 'searchCapabilities', arguments: { query: 'servo' } },
    { name: 'executeCode', arguments: { code: 'sdk.addComponent("motor.servo_sg90")' } },
    { name: 'unknownDangerTool', arguments: {} }
  ]);
  assert.equal(partition.readOnly.length, 1, 'searchCapabilities must be partitioned as readOnly');
  assert.equal(partition.mutating.length, 1, 'executeCode must be partitioned as mutating');
  assert.equal(partition.rejected.length, 1, 'Unregistered tool must be rejected by CapabilityGate');

  const sessionMem = new HardwareSessionMemory();
  sessionMem.recordSchema('sensor.ultrasonic');
  assert.equal(sessionMem.hasLoadedSchema('sensor.ultrasonic'), true);

  // 35d. Multi-round Flownie Agent Loop for Ultrasonic + SG90 Servo Barrier circuit
  apiClient.setCredits({
    promotional_credits: 250,
    purchased_credits: 0,
    available_credits: 250
  });
  let executor = null;
  const runtime = new LiveCodeRuntime({
    getHostBoard: () => executor?.getHostBoard(),
    getComponents: () => [executor?.getHostBoard(), ...(executor?.getStageComponents() || [])].filter(Boolean),
    getConnections: () => executor?.getConnections() || []
  });
  executor = new StageAiCommandExecutor({
    registry: reg,
    runtime,
    apiClient
  });

  const barrierRes = await executor.executePrompt(
    'Arduino Uno, HC-SR04 ultrasonik sensör ve SG90 Servo kullanarak mesafe duyarlı bariyer devresi kur ve kodunu yaz'
  );
  assert.equal(barrierRes.ok, true, 'Multi-round servo + ultrasonic barrier circuit synthesis must succeed');
  const stageTypes = executor.getStageComponents().map((c) => c.typeId);
  assert.ok(
    stageTypes.includes('sensor.ultrasonic') && stageTypes.includes('motor.servo'),
    `Stage must contain both sensor.ultrasonic and motor.servo (got: ${stageTypes.join(', ')})`
  );
  assert.ok(
    executor.getConnections().length >= 6,
    `Ultrasonic + Servo barrier circuit must wire at least 6 pins (got ${executor.getConnections().length})`
  );

  const obs = buildCircuitObservation(executor);
  assert.equal(obs.hostBoard, 'board.arduino_uno');
  assert.ok(obs.componentCount >= 2);
  assert.ok(obs.connectionCount >= 6);

  const inspectRes = inspectCircuitState(obs);
  assert.equal(inspectRes.ok, true);
  assert.equal(inspectRes.hostBoard, 'board.arduino_uno');

  projectsModal.destroy();
  topPill.destroy();
  runtime.stop({ resetPins: true });
});

await test('36. Dedicated /workspace Full-Page Portal URL, Study Groups & Account/Password Management', async () => {
  // 36a. AppRouter resolves /workspace and tab query/subpaths
  const wsDefault = AppRouter.resolveRoute('/workspace');
  assert.equal(wsDefault.view, 'workspace');
  assert.equal(wsDefault.tab, 'workspaces');

  const wsGroups = AppRouter.resolveRoute('/workspace?tab=groups');
  assert.equal(wsGroups.view, 'workspace');
  assert.equal(wsGroups.tab, 'groups');

  const wsAccount = AppRouter.resolveRoute('/workspace?tab=account');
  assert.equal(wsAccount.view, 'workspace');
  assert.equal(wsAccount.tab, 'account');

  const wsAccountSubpath = AppRouter.resolveRoute('/workspace/account');
  assert.equal(wsAccountSubpath.view, 'workspace');
  assert.equal(wsAccountSubpath.tab, 'account');

  // 36b. Full-Page Portal syncs URL and renders Workspaces, Study Groups, and Account & Security tabs
  const apiClient = new BackendApiClient({ fetchImpl: null, storage: null });
  await apiClient.login({
    email: 'maker@circuitlab.io',
    password: 'password123'
  });

  const syncedTabs = [];
  let closedToWorkbenchCount = 0;
  let updatedProfileUser = null;

  const mockPortalRoot = {
    innerHTML: '',
    hidden: true,
    classList: {
      add() {},
      remove() {}
    },
    setAttribute() {},
    removeAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    remove() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    }
  };

  const portal = new ProjectsAndGroupsModal({
    rootEl: mockPortalRoot,
    apiClient,
    onRouteSync: (tab) => syncedTabs.push(tab),
    onCloseToWorkbench: () => {
      closedToWorkbenchCount += 1;
    },
    onProfileUpdated: (u) => {
      updatedProfileUser = u;
    }
  });
  portal._containerEl = mockPortalRoot;

  await portal.open('account');
  assert.equal(syncedTabs.at(-1), 'account', 'Opening account tab must trigger onRouteSync("account")');
  assert.ok(
    mockPortalRoot.innerHTML.includes('data-testid="user-account-panel"') &&
      mockPortalRoot.innerHTML.includes('data-testid="profile-update-form"') &&
      mockPortalRoot.innerHTML.includes('data-testid="password-change-form"'),
    'Account tab must render profile update form and password change form'
  );
  assert.ok(
    mockPortalRoot.innerHTML.includes('/workspace?tab=account'),
    'Full-page header badge must display the active /workspace?tab=account URL'
  );

  // 36c. Profile update and password change actions
  const profileRes = await portal.updateAccountProfile({
    name: 'Hardware Architect Pro',
    email: 'architect@circuitlab.io'
  });
  assert.equal(profileRes.ok, true, 'updateAccountProfile must succeed');
  assert.equal(updatedProfileUser?.name, 'Hardware Architect Pro');
  assert.equal(apiClient.user?.email, 'architect@circuitlab.io');

  const mismatchPwdRes = await portal.updateAccountPassword({
    current_password: 'password123',
    password: 'newpassword123',
    password_confirmation: 'wrongconfirmation'
  });
  assert.equal(mismatchPwdRes.ok, false, 'Mismatched password confirmation must fail');

  const validPwdRes = await portal.updateAccountPassword({
    current_password: 'password123',
    password: 'newpassword123',
    password_confirmation: 'newpassword123'
  });
  assert.equal(validPwdRes.ok, true, 'Valid password change must succeed');

  portal.close();
  assert.equal(closedToWorkbenchCount, 1, 'Closing full-page workspace portal must notify onCloseToWorkbench');
  portal.destroy();
});

await test('37. Per-Workspace /workspace/<slug> Routing, BoardStage Auto-Save & Non-Destructive Page Refresh (F5) Hydration', async () => {
  // 37a. AppRouter distinguishes /workspace portal tabs from /workspace/<slug> individual 3D workspaces
  const portalRootRoute = AppRouter.resolveRoute('/workspace');
  assert.equal(portalRootRoute.view, 'workspace');
  assert.equal(portalRootRoute.tab, 'workspaces');
  assert.equal(portalRootRoute.workspaceSlug, null);

  const portalGroupsRoute = AppRouter.resolveRoute('/workspace/groups');
  assert.equal(portalGroupsRoute.view, 'workspace');
  assert.equal(portalGroupsRoute.tab, 'groups');
  assert.equal(portalGroupsRoute.workspaceSlug, null);

  const customWsRoute = AppRouter.resolveRoute('/workspace/akilli-sera-otomasyonu-42');
  assert.equal(customWsRoute.view, 'workbench', '/workspace/<slug> must open the 3D Hardware Workbench view');
  assert.equal(customWsRoute.workspaceSlug, 'akilli-sera-otomasyonu-42');
  assert.equal(customWsRoute.href, '/workspace/akilli-sera-otomasyonu-42');

  // 37b. Build a real 3D circuit on BoardStage, auto-save to backend, and verify full JSON persistence
  const reg = new ComponentRegistry();
  registerAllHardware(reg);
  const apiClient = new BackendApiClient({ fetchImpl: null, storage: null });
  await apiClient.login({
    email: 'maker@circuitlab.io',
    password: 'password123'
  });

  const stage1 = new BoardStage({ canvas: null, stageEl: null });
  stage1.ensureHostBoard('board.arduino_uno');

  let currentCode = 'void setup() { pinMode(9, OUTPUT); }\nvoid loop() { digitalWrite(9, HIGH); }';
  const activeWorkspaceSlugs = [];

  const modal1 = new ProjectsAndGroupsModal({
    stage: stage1,
    registry: reg,
    apiClient,
    getCurrentCode: () => currentCode,
    onActiveWorkspaceChange: (ws) => {
      if (ws?.slug) activeWorkspaceSlugs.push(ws.slug);
    }
  });

  const startRes1 = await modal1.handleWorkbenchSessionStart({ source: 'workbench' });
  assert.equal(startRes1.mode, 'authenticated');
  const ws1Slug = startRes1.workspace.slug;
  assert.ok(ws1Slug, 'First workspace must have a valid slug');
  assert.equal(activeWorkspaceSlugs.at(-1), ws1Slug);

  // Spawn components on stage1 and wire them
  const led1 = stage1.spawnComponent('led.single', {
    id: 'user_led_1',
    position: [12, 5.2, 8],
    state: { color: 0x22c55e }
  });
  const res1 = stage1.spawnComponent('passive.resistor', {
    id: 'user_res_1',
    position: [-4, 5.2, 8],
    state: { resistanceOhms: 330 }
  });
  assert.ok(led1 && res1, 'BoardStage.spawnComponent must create LED and Resistor instances');

  stage1.wireTool.connectEndpoints(
    `${stage1.hostBoard.id}.PIN9`,
    'user_res_1.LEAD_A',
    '#22c55e'
  );
  stage1.wireTool.connectEndpoints(
    'user_res_1.LEAD_B',
    'user_led_1.ANODE',
    '#22c55e'
  );
  stage1.wireTool.connectEndpoints(
    'user_led_1.CATHODE',
    `${stage1.hostBoard.id}.GND`,
    '#1e293b'
  );

  const saveRes1 = await modal1.autoSaveActiveWorkspace({ reason: 'user_edit' });
  assert.equal(saveRes1.saved, true, 'autoSaveActiveWorkspace must persist stage components and wires');
  assert.equal(saveRes1.workspace.circuit_json.components.length, 2, 'Saved circuit_json must contain 2 spawned components');
  assert.equal(saveRes1.workspace.circuit_json.connections.length, 3, 'Saved circuit_json must contain 3 wire connections');

  // Create a second independent workspace (/workspace/<ws2Slug>) with an ESP32 board and ultrasonic sensor
  currentCode = 'void setup() { Serial.begin(115200); }\nvoid loop() {}';
  const ws2 = await modal1.createNewWorkspace({
    title: 'ESP32 Ultrasonik Radar',
    boardType: 'board.esp32_devkit',
    seedCurrentStage: false,
    resetStage: true
  });
  const ws2Slug = ws2.slug;
  assert.notEqual(ws2Slug, ws1Slug, 'Second workspace must have its own distinct /workspace/<slug>');
  assert.equal(stage1.hostBoard.typeId, 'board.esp32_devkit', 'Creating second workspace with resetStage must switch stage board to ESP32');
  assert.equal(stage1.getIndependentComponents().length, 0, 'Reset stage must start with 0 extra components');

  stage1.spawnComponent('sensor.ultrasonic', {
    id: 'esp_sonar_1',
    position: [16, 5.2, -6]
  });
  await modal1.autoSaveActiveWorkspace({ reason: 'ws2_edit' });

  // 37c. Simulate F5 browser refresh directly on /workspace/<ws1Slug> with a brand-new empty BoardStage
  const stageAfterRefresh = new BoardStage({ canvas: null, stageEl: null });
  stageAfterRefresh.ensureHostBoard('board.arduino_uno');
  assert.equal(stageAfterRefresh.getIndependentComponents().length, 0, 'Fresh stage before hydration has 0 components');

  let hydratedCode = '';
  const modalAfterRefresh = new ProjectsAndGroupsModal({
    stage: stageAfterRefresh,
    registry: reg,
    apiClient,
    getCurrentCode: () => hydratedCode,
    onScenarioLoaded: ({ code }) => {
      if (code) hydratedCode = code;
    }
  });

  await modalAfterRefresh.setSessionUser(apiClient.user, {
    autoCreateWorkspaceIfEmpty: true,
    targetWorkspaceSlug: ws1Slug
  });

  assert.equal(
    modalAfterRefresh.activeWorkspace?.slug,
    ws1Slug,
    'Refreshing on /workspace/<ws1Slug> must bind to ws1Slug'
  );
  assert.equal(
    stageAfterRefresh.hostBoard?.typeId,
    'board.arduino_uno',
    'Hydrated stage must restore Arduino Uno host board'
  );
  assert.equal(
    stageAfterRefresh.getIndependentComponents().length,
    2,
    'Refreshing on /workspace/<ws1Slug> must restore all 2 saved 3D components onto BoardStage (never overwrite with empty stage!)'
  );
  assert.equal(
    stageAfterRefresh.wireTool.getConnections().length,
    3,
    'Refreshing on /workspace/<ws1Slug> must restore all 3 saved wire connections onto BoardStage'
  );
  assert.ok(
    hydratedCode.includes('pinMode(9, OUTPUT)'),
    'Refreshing on /workspace/<ws1Slug> must restore saved firmware code'
  );

  // 37d. Switch to /workspace/<ws2Slug> and verify its distinct circuit hydrates cleanly
  await modalAfterRefresh.handleWorkbenchSessionStart({
    source: 'route_change',
    workspaceSlug: ws2Slug
  });
  assert.equal(modalAfterRefresh.activeWorkspace?.slug, ws2Slug);
  assert.equal(stageAfterRefresh.hostBoard?.typeId, 'board.esp32_devkit');
  assert.equal(stageAfterRefresh.getIndependentComponents().length, 1);
  assert.equal(stageAfterRefresh.getIndependentComponents()[0].typeId, 'sensor.ultrasonic');

  modal1.destroy();
  modalAfterRefresh.destroy();
});

await test('38. ObservationBuilder 48KB Clamping, SessionMemory Cache Invalidation, Self-Healing CodeMode & Resumable askUser Round Extension (10 -> 15)', async () => {
  const reg = new ComponentRegistry();
  registerAllHardware(reg);

  const executor = new StageAiCommandExecutor({ registry: reg });
  executor.executeCommands([
    { action: 'setHostBoard', typeId: 'board.arduino_uno' },
    { action: 'spawnComponent', typeId: 'sensor.ultrasonic', id: 'sonar_1', position: [14, 5.2, 0] }
  ]);

  // 38a. ObservationBuilder: 48KB byte clamping, Stage Delta, and SESSION KNOWLEDGE
  assert.equal(MAX_OBSERVATION_BYTES, 48_000, 'MAX_OBSERVATION_BYTES must be 48,000 bytes');
  const hugeString = 'X'.repeat(65_000);
  const clamped = clampToByteBudget(hugeString, MAX_OBSERVATION_BYTES);
  const clampedByteLen = new TextEncoder().encode(clamped).length;
  assert.ok(clampedByteLen <= MAX_OBSERVATION_BYTES, `Clamped string must fit within 48KB (got ${clampedByteLen})`);
  assert.ok(clamped.includes('observation truncated to 48KB budget'));

  const sessionMem = new SessionMemory();
  sessionMem.recordSchema('sensor.ultrasonic', getComponentSchema('sensor.ultrasonic'));
  sessionMem.recordFunctionSchema('sdk.connectWire', getFunctionSchema('sdk.connectWire'));
  sessionMem.recordSearch('ultrasonic', [{ typeId: 'sensor.ultrasonic' }]);
  sessionMem.recordCanvasState('state', { componentCount: 1 });
  assert.equal(sessionMem.hasLoadedSchema('sensor.ultrasonic'), true);
  assert.equal(sessionMem.hasLoadedFunctionSchema('sdk.connectWire'), true);
  assert.equal(sessionMem.hasSearched('ultrasonic'), true);

  const roundObsText = buildCircuitObservation({
    round: 2,
    maxRounds: 10,
    executor,
    results: [
      {
        call: { name: 'getComponentSchema', arguments: { typeId: 'sensor.ultrasonic' } },
        result: { cached: true, typeId: 'sensor.ultrasonic' },
        cached: true
      }
    ],
    previousSnap: { hostBoard: 'board.arduino_uno', componentCount: 0, connectionCount: 0, components: [] },
    currentSnap: snapshotStage(executor),
    sessionMemory: sessionMem
  });

  assert.ok(roundObsText.includes('[ROUND BUDGET: round 2 of 10'), 'Observation must include ROUND BUDGET header');
  assert.ok(roundObsText.includes('[⚡ cached]'), 'Cached tool calls must be marked with [⚡ cached]');
  assert.ok(roundObsText.includes('📊 Stage Delta:'), 'Observation must include Stage Delta');
  assert.ok(roundObsText.includes('## SESSION KNOWLEDGE'), 'Observation must include SESSION KNOWLEDGE section');

  // Canvas mutation invalidates @canvas:* cache while keeping @component:* schema cache intact
  sessionMem.invalidateCanvasCache();
  assert.equal(sessionMem.knowledgeEntries.has('@canvas:state'), false, 'invalidateCanvasCache must clear @canvas:* entries');
  assert.equal(sessionMem.hasLoadedSchema('sensor.ultrasonic'), true, '@component:* schemas must remain cached after canvas mutation');

  // 38b. Self-Healing CodeModeExecutor & CircuitSDK diagnostics (unknown_component & unknown_pin)
  const codeExecutor = new CodeModeExecutor(executor);
  const badCompRes = await codeExecutor.execute({
    code: `
      const bad = sdk.addComponent('sensor.hc_sr04_typo', { id: 'bad_sonar' });
      sdk.connectWire('sonar_1.WRONG_PIN', 'main.host_board.PIN9');
    `,
    description: 'Test self-healing diagnostics'
  });
  assert.equal(badCompRes.ok, true, 'Non-strict SDK execution records structured diagnostics without crashing');
  assert.ok(badCompRes.diagnostics.length >= 2, 'SDK must record diagnostics for both unknown_component and unknown_pin');
  const compDiag = badCompRes.diagnostics.find((d) => d.category === 'unknown_component');
  const pinDiag = badCompRes.diagnostics.find((d) => d.category === 'unknown_pin');
  assert.ok(compDiag, 'Must include unknown_component diagnostic');
  assert.ok(
    Array.isArray(compDiag.suggestedTypes) && compDiag.suggestedTypes.length > 0,
    'unknown_component diagnostic must suggest closest catalog typeIds'
  );
  assert.ok(pinDiag, 'Must include unknown_pin diagnostic');
  assert.ok(
    Array.isArray(pinDiag.availablePins) && pinDiag.availablePins.includes('TRIG') && pinDiag.availablePins.includes('ECHO'),
    `unknown_pin diagnostic must return valid availablePins for sensor.ultrasonic (got: ${JSON.stringify(pinDiag.availablePins)})`
  );

  // 38b-2. CodeModeExecutor: multiline single-quoted C++ firmware string & comment keywords (window/document) must execute cleanly
  const isolatedExec = new StageAiCommandExecutor({ registry: reg });
  const isolatedCodeExec = new CodeModeExecutor(isolatedExec);
  const liveLlmScriptRes = await isolatedCodeExec.execute({
    code:
      "// Build interactive ultrasonic + button + LED circuit in browser window\n" +
      "circuit.setBoard('board.arduino_uno');\n" +
      "circuit.clearAddedComponents();\n" +
      "const us = circuit.addComponent('sensor.ultrasonic', { id: 'us1', position: [30, 0, -10] });\n" +
      "const led = circuit.addComponent('led.single', { id: 'led1', position: [10, 0, -10] });\n" +
      "const res = circuit.addComponent('passive.resistor', { id: 'r1', position: [15, 0, -10], ohms: 220 });\n" +
      "const btn = circuit.addComponent('button.tactile', { id: 'btn1', position: [-10, 0, -10] });\n" +
      "circuit.connectWire('host', '5V', 'us1', 'VCC', { color: '#ef4444' });\n" +
      "circuit.connectWire('host', 'GND', 'us1', 'GND', { color: '#1e293b' });\n" +
      "circuit.connectWire('host', 'PIN9', 'us1', 'TRIG');\n" +
      "circuit.connectWire('host', 'PIN10', 'us1', 'ECHO');\n" +
      "circuit.connectWire('host', 'PIN6', 'r1', 'LEAD_A');\n" +
      "circuit.connectWire('r1', 'LEAD_B', 'led1', 'ANODE');\n" +
      "circuit.connectWire('led1', 'CATHODE', 'host', 'GND');\n" +
      "circuit.connectWire('host', 'PIN2', 'btn1', 'LEAD_A');\n" +
      "circuit.connectWire('btn1', 'LEAD_B', 'host', 'GND');\n" +
      "circuit.setCode('void setup() {\n  // document pin setup\n  pinMode(9, OUTPUT);\n  pinMode(10, INPUT);\n  pinMode(6, OUTPUT);\n}\nvoid loop() {\n  digitalWrite(6, HIGH);\n}');\n" +
      "return circuit.inspectElectricalState();",
    description: 'Live LLM Round 5 script with multiline single-quoted C++ string and button LEAD_A/LEAD_B aliases'
  });
  assert.equal(
    liveLlmScriptRes.ok,
    true,
    `Multiline single-quoted C++ firmware in executeCode must succeed (got error: ${liveLlmScriptRes.error})`
  );
  assert.equal(liveLlmScriptRes.electricalState.componentCount, 4, 'All 4 components (us1, led1, r1, btn1) must be placed on 3D stage');
  assert.equal(liveLlmScriptRes.electricalState.wireCount, 9, 'All 9 jumper wires (including button LEAD_A/LEAD_B -> TERMINAL_A/TERMINAL_B aliases) must connect');

  // 38c. Resumable askUser Round Extension (10 -> 15 rounds)
  let capturedTurnPayloads = [];
  const customApiClient = {
    isAuthenticated: () => true,
    getCredits: () => ({ available_credits: 100 }),
    runAgentTurn: async (payload) => {
      capturedTurnPayloads.push(payload);
      // First call (at round 10 of 10): model requests +5 extra rounds via askUser
      if (capturedTurnPayloads.length === 1) {
        return {
          status: 'ok',
          round: payload.round,
          max_rounds: payload.maxRounds,
          remaining_rounds: 0,
          can_request_extension: true,
          thought: 'Karmaşık robotik sahneyi tamamlamak için 5 ek tura ihtiyacım var.',
          function_calls: [
            {
              name: 'askUser',
              arguments: {
                question: 'Devre kurulumu ve doğrulaması için 5 ek tura ihtiyacım var. Onaylıyor musunuz?',
                options: ['+5 Tur İzni Ver ve Devam Et', 'Mevcut Haliyle Bitir'],
                reason: 'extend_rounds',
                requested_extra_rounds: 5
              }
            }
          ]
        };
      }
      // Second call (after user approves +5 rounds -> round 11 of 15): model synthesizes and finishes
      if (capturedTurnPayloads.length === 2) {
        return {
          status: 'ok',
          round: payload.round,
          max_rounds: payload.maxRounds,
          remaining_rounds: payload.maxRounds - payload.round,
          thought: 'Ek tur onaylandı, bağlantıları tamamlıyorum.',
          function_calls: [
            {
              name: 'executeCode',
              arguments: {
                code: `
                  sdk.connectWire('sonar_1.VCC', 'main.host_board.5V');
                  sdk.connectWire('sonar_1.GND', 'main.host_board.GND');
                  sdk.connectWire('sonar_1.TRIG', 'main.host_board.PIN9');
                  sdk.connectWire('sonar_1.ECHO', 'main.host_board.PIN10');
                `,
                description: 'Connect HC-SR04 pins'
              }
            }
          ]
        };
      }
      return {
        status: 'ok',
        round: payload.round,
        max_rounds: payload.maxRounds,
        remaining_rounds: payload.maxRounds - payload.round,
        thought: 'Tamamlandı.',
        reply: 'Ultrasonik sensör bağlantıları ek tur bütçesiyle tamamlandı.',
        function_calls: []
      };
    }
  };

  // Start loop with maxRounds: 10, starting at round 10 by setting maxRounds=1 for first run or testing askUser directly
  const initialRun = await executor.runFlownieAgentPrompt('Karmaşık ultrasonik sahneyi kur', {
    apiClient: customApiClient,
    maxRounds: 10
  });

  assert.equal(initialRun.status, 'awaiting_user', 'Loop must pause with status="awaiting_user" when askUser is called');
  assert.equal(initialRun.stopReason, 'awaiting_user');
  assert.ok(initialRun.pending, 'Paused run must include pending state for resumption');
  assert.equal(initialRun.pending.reason, 'extend_rounds');
  assert.equal(initialRun.pending.requestedExtraRounds, 5);
  assert.equal(initialRun.pending.maxRounds, 10);

  // Resume with user approval of +5 extra rounds (10 -> 15)
  const resumedRun = await executor.resumeFlownieAgentPrompt({
    approved: true,
    extraRounds: 5,
    answer: '+5 Tur İzni Ver ve Devam Et'
  });

  assert.equal(resumedRun.ok, true, 'Resumed agent run must complete circuit synthesis');
  assert.equal(resumedRun.maxRounds, 15, 'Resumed agent run must increase maxRounds from 10 to 15');
  assert.equal(capturedTurnPayloads[1].maxRounds, 15, 'Second turn payload must send maxRounds=15');
  assert.equal(capturedTurnPayloads[1].userApprovedMaxRounds, 15, 'Second turn payload must send userApprovedMaxRounds=15');
  assert.equal(capturedTurnPayloads[1].roundExtensionGranted, true, 'Second turn payload must set roundExtensionGranted=true');
  assert.ok(
    executor.getConnections().length >= 4,
    `Resumed execution must wire the 4 ultrasonic pins onto the stage (got ${executor.getConnections().length})`
  );
});

await test('39. AiAgentChatPanel Dual-Mode (Dock + Sidebar), 4-Message Opacity Fade, AgentProgress, MiniTable, AnswerModeBanner Round Extension & Zero-Gradient Design System', async () => {
  const { AiAgentChatPanel, DOCK_MESSAGE_OPACITIES } = await import('../src/ui/workbench/AiAgentChatPanel.js');
  const { i18n } = await import('../src/core/i18n/I18nService.js');
  i18n.setLocale('tr');

  assert.deepEqual(
    DOCK_MESSAGE_OPACITIES,
    [0.35, 0.55, 0.8, 1.0],
    'Dock mode must use progressive opacity scale [0.35, 0.55, 0.8, 1.0] for the last 4 messages'
  );

  // Create lightweight mock root element & canvas
  const mockRoot = {
    innerHTML: '',
    querySelectorAll() {
      return [];
    },
    querySelector() {
      return null;
    }
  };
  const mockCanvas = {
    toDataURL(mime) {
      return `data:${mime || 'image/png'};base64,MOCK_WEBGL_SNAPSHOT_BASE64`;
    }
  };

  let undoCount = 0;
  let resumeCalls = [];

  const chatPanel = new AiAgentChatPanel({
    rootEl: mockRoot,
    canvasEl: mockCanvas,
    initialLayoutMode: 'dock',
    onUndoLastCommand: () => {
      undoCount += 1;
    },
    onSubmitPrompt: async (promptText) => {
      if (promptText.includes('ek tur')) {
        return {
          ok: false,
          status: 'awaiting_user',
          round: 10,
          maxRounds: 10,
          pending: {
            reason: 'extend_rounds',
            question: 'Karmaşık 3B sahne kurulumunu tamamlamak için +5 ek tur gerekiyor.',
            options: ['+5 Tur İzni Ver', 'Mevcut Haliyle Tamamla'],
            round: 10,
            maxRounds: 10,
            requestedExtraRounds: 5
          },
          steps: [
            { phase: 'search_mode', label: 'Search Mode: 4 bileşen bulundu', round: 1, status: 'completed', durationMs: 18 }
          ],
          toolTrace: [
            {
              round: 1,
              tool: 'searchCapabilities',
              ok: true,
              durationMs: 14,
              cachedFromSessionMemory: true,
              args: { query: 'hc_sr04' },
              output: { count: 1 }
            }
          ]
        };
      }

      return {
        ok: true,
        status: 'completed',
        round: 2,
        maxRounds: 10,
        summaryText: 'HC-SR04 ve Servo 3B sahneye eklendi ve kapalı çevrim doğrulandı.',
        electricalState: {
          componentCount: 3,
          connectionCount: 7,
          closedLoopCount: 2,
          totalCurrentMa: 28.4,
          hasShortCircuit: false,
          faultCount: 0
        },
        toolTrace: [
          {
            round: 1,
            tool: 'searchCapabilities',
            ok: true,
            durationMs: 9,
            cachedFromSessionMemory: true,
            args: { query: 'servo' },
            output: { count: 2 }
          },
          {
            round: 2,
            tool: 'executeCode',
            ok: true,
            durationMs: 31,
            cachedFromSessionMemory: false,
            args: { description: 'Wire servo & ultrasonic' },
            output: { spawnedCount: 2, wiredCount: 7 }
          }
        ]
      };
    },
    onResumeAgent: async (decision, pending) => {
      resumeCalls.push({ decision, pending });
      return {
        ok: true,
        status: 'completed',
        round: 11,
        maxRounds: 15,
        summaryText: 'Ek tur bütçesiyle (Tur 11/15) tüm bağlantılar tamamlandı.',
        electricalState: {
          componentCount: 4,
          connectionCount: 9,
          closedLoopCount: 3,
          totalCurrentMa: 42.0,
          hasShortCircuit: false,
          faultCount: 0
        }
      };
    }
  }).mount();

  // 1. Verify initial Dock Mode & Tur 1/10 badge
  assert.ok(
    mockRoot.innerHTML.includes('data-testid="ai-dock-stream"'),
    'Initial render must be in Dock Mode (.ai-dock-stream)'
  );
  assert.ok(
    mockRoot.innerHTML.includes('Tur 1/10'),
    'Initial Dock Mode must display "Tur 1/10" round badge'
  );

  // 2. Capture 3D Stage Screenshot & verify preview
  const shotUrl = chatPanel.captureStageScreenshot();
  assert.ok(shotUrl.startsWith('data:image/png;base64,MOCK_WEBGL_SNAPSHOT_BASE64'));
  assert.ok(
    mockRoot.innerHTML.includes('data-testid="ai-screenshot-preview"'),
    'Attached 3D stage screenshot must render preview bar'
  );

  // 3. Submit normal synthesis prompt & verify AgentProgress + [⚡ cached] + MiniTable + 4-message opacity fade
  await chatPanel.submitPrompt('Ultrasonik sensör ve servo bağla');
  await chatPanel.submitPrompt('İkinci kontrol turu');
  chatPanel.setCanUndo(true);

  assert.ok(
    mockRoot.innerHTML.includes('data-testid="ai-agent-progress"'),
    'Completed run must render AgentProgress collapsible step card'
  );
  assert.ok(
    mockRoot.innerHTML.includes('data-testid="ai-step-cached"'),
    'SessionMemory cache hits must display [⚡ cached] badge in AgentProgress'
  );
  assert.ok(
    mockRoot.innerHTML.includes('data-testid="ai-electrical-minitable"'),
    'Completed run with electricalState must render Electrical Verification MiniTable'
  );
  assert.ok(
    mockRoot.innerHTML.includes('28.4 mA') && mockRoot.innerHTML.includes('Doğrulandı'),
    'MiniTable must display current in mA and verified closed-loop status'
  );
  assert.ok(
    mockRoot.innerHTML.includes('data-fade-opacity="0.35"') &&
      mockRoot.innerHTML.includes('data-fade-opacity="0.55"') &&
      mockRoot.innerHTML.includes('data-fade-opacity="0.8"') &&
      mockRoot.innerHTML.includes('data-fade-opacity="1"'),
    'Dock mode with 4 messages must apply [0.35, 0.55, 0.8, 1] progressive opacity fade'
  );
  assert.ok(
    mockRoot.innerHTML.includes('data-testid="ai-undo-btn"'),
    'When canUndo is true, 1-click Undo button must be rendered'
  );

  // 4. Trigger `extend_rounds` pause -> verify AnswerModeBanner & grant +5 rounds (10 -> 15)
  await chatPanel.submitPrompt('Karmaşık sahne için ek tur iste');
  assert.ok(
    mockRoot.innerHTML.includes('data-testid="ai-answer-mode-banner"') &&
      mockRoot.innerHTML.includes('data-reason="extend_rounds"'),
    'Paused extend_rounds state must render AnswerModeBanner with data-reason="extend_rounds"'
  );
  assert.ok(
    mockRoot.innerHTML.includes('data-testid="ai-extend-rounds-5"'),
    'AnswerModeBanner must render +5 rounds approval button'
  );

  await chatPanel.handleExtendRounds(5);
  assert.equal(resumeCalls.length, 1, 'handleExtendRounds(5) must invoke onResumeAgent');
  assert.equal(resumeCalls[0].decision.extraRounds, 5);
  assert.equal(chatPanel.maxRounds, 15, 'Chat panel maxRounds must update from 10 to 15');
  assert.equal(chatPanel.roundExtensionGranted, true);
  assert.ok(
    mockRoot.innerHTML.includes('Tur 11/15 (Uzatıldı)'),
    'Round badge must display "Tur 11/15 (Uzatıldı)" after round extension'
  );

  // 5. Switch to Sidebar Mode (`setLayoutMode('sidebar')`) and verify 380px right sidebar DOM
  chatPanel.setLayoutMode('sidebar');
  assert.ok(
    mockRoot.innerHTML.includes('data-testid="ai-sidebar-panel"') &&
      mockRoot.innerHTML.includes('data-layout-mode="sidebar"'),
    'Switching to sidebar mode must render .ai-sidebar panel'
  );
  assert.ok(
    mockRoot.innerHTML.includes('data-testid="ai-chat-input"') &&
      mockRoot.innerHTML.includes('data-testid="ai-chat-submit"'),
    'Sidebar mode must render dedicated composer input and submit button'
  );

  // 6. Verify strict zero-gradient rule in Dual-Mode AI Chat CSS & AiAgentChatPanel.js
  const fs = await import('node:fs');
  const cssContent = fs.readFileSync(new URL('../src/styles/main.css', import.meta.url), 'utf8');
  const chatCssSection = cssContent.split('13. DUAL-MODE HARDWARE AGENT CHAT')[1] || '';
  assert.ok(chatCssSection.length > 500, 'Section 13 Dual-Mode AI Chat CSS must exist in main.css');
  assert.equal(
    /linear-gradient|radial-gradient/i.test(chatCssSection),
    false,
    'Dual-Mode AI Chat CSS must contain ZERO linear-gradient or radial-gradient declarations'
  );

  const panelJsContent = fs.readFileSync(
    new URL('../src/ui/workbench/AiAgentChatPanel.js', import.meta.url),
    'utf8'
  );
  assert.equal(
    /linear-gradient|radial-gradient/i.test(panelJsContent),
    false,
    'AiAgentChatPanel.js must contain ZERO linear-gradient or radial-gradient declarations'
  );

  // 7. Verify localized error handling (TR & EN) when no AI model / API key is configured — zero silent pre-baked fallback
  const { resolveLocalizedAgentError } = await import('../src/core/ai/agentLoop.js');
  i18n.setLocale('tr');
  const errTr = resolveLocalizedAgentError({
    status: 503,
    data: { error: 'ai_model_not_configured' }
  });
  assert.equal(errTr.errorCode, 'ai_model_not_configured');
  assert.ok(
    errTr.message.includes('aktif bir yapay zeka modeli tanımlı değil'),
    `Expected TR localized error message, got: ${errTr.message}`
  );

  i18n.setLocale('en');
  const errEn = resolveLocalizedAgentError({
    status: 503,
    data: { error: 'ai_model_not_configured' }
  });
  assert.equal(errEn.errorCode, 'ai_model_not_configured');
  assert.ok(
    errEn.message.includes('No active AI model is configured'),
    `Expected EN localized error message, got: ${errEn.message}`
  );
  i18n.setLocale('tr');
});

await test(
  '40. Conditional if/else C++ Firmware Execution, Non-Zero mA Flow Summary, Multi-Board Routing & Single-AskUser Persistence',
  async () => {
    const uno = new ArduinoUnoBoard({ id: 'host' });
    const hc = new UltrasonicSensorComponent({ id: 'us1' });
    const res = new AxialResistorComponent({ id: 'r1', resistanceOhms: 220 });
    const led = new SingleLEDComponent({ id: 'led1', color: 0x22c55e });

    assert.equal(
      hc.state.value,
      15,
      'BaseDistanceSensor default obstacle distance must be 15 cm so < 20 cm threshold triggers immediately'
    );

    const connections = [
      { id: 'w1', from: 'host:5V', to: 'us1:VCC' },
      { id: 'w2', from: 'host:GND', to: 'us1:GND' },
      { id: 'w3', from: 'host:PIN9', to: 'us1:TRIG' },
      { id: 'w4', from: 'host:PIN10', to: 'us1:ECHO' },
      { id: 'w5', from: 'host:PIN13', to: 'r1:LEAD_A' },
      { id: 'w6', from: 'r1:LEAD_B', to: 'led1:ANODE' },
      { id: 'w7', from: 'led1:CATHODE', to: 'host:GND_2' }
    ];

    const runtime = new LiveCodeRuntime({
      getHostBoard: () => uno,
      getComponents: () => [uno, hc, res, led],
      getConnections: () => connections,
      solver: circuitFlowSolver
    });

    const userUltrasonicSketch = `#define TRIG_PIN 9
#define ECHO_PIN 10
#define LED_PIN 13

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  // Trigger ultrasonic sensor
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  // Measure echo
  long duration = pulseIn(ECHO_PIN, HIGH);
  // Calculate distance in cm
  int distance = duration * 0.034 / 2;

  // If obstacle closer than 20 cm, turn LED on
  if (distance > 0 && distance < 20) {
    digitalWrite(LED_PIN, HIGH);
  } else {
    digitalWrite(LED_PIN, LOW);
  }

  delay(100);
}`;

    const flowWhenClose = runtime.runImmediate({ sourceCode: userUltrasonicSketch });
    assert.equal(
      flowWhenClose.closedLoopCount,
      2,
      'Both HC-SR04 power rail and PIN13 -> 220Ω -> LED -> GND must form closed loops when obstacle is at 15 cm'
    );
    assert.ok(
      flowWhenClose.totalCurrentMa >= 12,
      `Expected totalCurrentMa >= 12 mA when LED is HIGH, got ${flowWhenClose.totalCurrentMa} mA`
    );
    assert.ok(
      led.state.brightness > 0.7,
      'Green LED must light up when obstacle distance is 15 cm (< 20 cm)'
    );

    // Verify TopContextPill displays real mA (not 0.0 mA)
    const pillRoot = { innerHTML: '' };
    const pill = new TopContextPill({ rootEl: pillRoot }).mount();
    pill.updateFlowSummary(flowWhenClose);
    assert.ok(
      pill.lastFlowSummary.totalCurrentMa >= 12,
      `TopContextPill must report >= 12 mA, got ${pill.lastFlowSummary.totalCurrentMa}`
    );

    // Move obstacle to 45 cm (>= 20 cm) and verify else branch turns LED OFF
    hc.setValue(45);
    const flowWhenFar = runtime.runImmediate();
    assert.equal(
      led.state.brightness,
      0,
      'Green LED must turn OFF when obstacle distance is 45 cm (>= 20 cm)'
    );
    assert.equal(
      flowWhenFar.closedLoopCount,
      1,
      'Only HC-SR04 5V/GND loop remains active when PIN13 is driven LOW'
    );

    // Verify Multi-Board pin routing (Arduino Uno + ESP32 DevKit in the same workspace)
    const esp32 = new ESP32DevKitBoard({ id: 'esp32_aux' });
    const ledEsp = new SingleLEDComponent({ id: 'led_esp', color: 0x38bdf8 });
    const resEsp = new AxialResistorComponent({ id: 'r_esp', resistanceOhms: 220 });
    const multiConnections = [
      ...connections,
      { id: 'w8', from: 'esp32_aux:GPIO2', to: 'r_esp:LEAD_A' },
      { id: 'w9', from: 'r_esp:LEAD_B', to: 'led_esp:ANODE' },
      { id: 'w10', from: 'led_esp:CATHODE', to: 'esp32_aux:GND' }
    ];
    hc.setValue(12);
    const multiRuntime = new LiveCodeRuntime({
      getHostBoard: () => uno,
      getComponents: () => [uno, esp32, hc, res, led, resEsp, ledEsp],
      getConnections: () => multiConnections,
      solver: circuitFlowSolver
    });
    const multiFlow = multiRuntime.runImmediate({
      sourceCode: `void setup() { pinMode(13, OUTPUT); pinMode(GPIO2, OUTPUT); }\nvoid loop() { digitalWrite(13, HIGH); digitalWrite(GPIO2, HIGH); delay(100); }`
    });
    assert.ok(led.state.brightness > 0.7, 'Uno LED on PIN13 must be lit in multi-board workspace');
    assert.ok(
      ledEsp.state.brightness > 0.3,
      `ESP32 LED on GPIO2 must be lit in multi-board workspace (got brightness=${ledEsp.state.brightness})`
    );
    assert.ok(multiFlow.closedLoopCount >= 3, 'Multi-board workspace must solve all 3 closed loops');

    // Verify resumeHardwareAgentLoop preserves userAnswer across Round 2 -> Round 3 and prevents duplicate askUser clarification
    const { runHardwareAgentLoop, resumeHardwareAgentLoop } = await import(
      '../src/core/ai/agentLoop.js'
    );
    const seenUserAnswers = [];
    const customRunner = async ({ round, userAnswer }) => {
      seenUserAnswers.push({ round, userAnswer });
      if (round === 1) {
        return {
          status: 'awaiting_user',
          tool_calls: [
            {
              name: 'askUser',
              args: {
                reason: 'clarification',
                question: 'Hangi türde bir devre görmek istersiniz?',
                options: ['Ultrasonik mesafe sensörü ile engel tespiti']
              }
            }
          ]
        };
      }
      if (round === 2) {
        return {
          status: 'tool_calls',
          tool_calls: [{ name: 'getComponentSchema', args: { componentId: 'sensor.ultrasonic' } }]
        };
      }
      if (round === 3) {
        // Simulate LLM mistakenly trying to call askUser a second time in Round 3
        return {
          status: 'awaiting_user',
          tool_calls: [
            {
              name: 'askUser',
              args: {
                reason: 'clarification',
                question: 'Hangi türde bir devre görmek istersiniz?'
              }
            }
          ]
        };
      }
      return {
        status: 'completed',
        tool_calls: [],
        final_response: { headline: 'Tamamlandı', summary: 'Devre kuruldu.' }
      };
    };

    const paused = await runHardwareAgentLoop({
      prompt: 'bana güzel bir devre kurar mısın',
      customTurnRunner: customRunner
    });
    assert.equal(paused.status, 'awaiting_user', 'Round 1 must pause for initial askUser');

    const resumed = await resumeHardwareAgentLoop(
      paused.pending,
      'Ultrasonik mesafe sensörü ile engel tespiti'
    );
    assert.equal(
      resumed.status,
      'completed',
      'Resumed loop must NOT pause a second time when LLM emits duplicate clarification askUser in Round 3'
    );
    assert.equal(
      seenUserAnswers.find((x) => x.round === 2)?.userAnswer,
      'Ultrasonik mesafe sensörü ile engel tespiti',
      'Round 2 must receive userAnswer'
    );
    assert.equal(
      seenUserAnswers.find((x) => x.round === 3)?.userAnswer,
      'Ultrasonik mesafe sensörü ile engel tespiti',
      'Round 3 must ALSO retain userAnswer instead of resetting to null'
    );
  }
);

await test(
  '41. Question-Aware askUser Follow-Up, Multi-Wire Single-Pin Parallel Fan-Out & ReactFlow-Style evaluate({ pins, state, dt, stageEnv }) + 3D Stage Props (prop.obstacle_wall & prop.toy_bear)',
  async () => {
    const { runHardwareAgentLoop, resumeHardwareAgentLoop } = await import(
      '../src/core/ai/agentLoop.js'
    );
    const { ObstacleWallProp } = await import('../src/hardware/props/ObstacleWallProp.js');
    const { ToyBearProp } = await import('../src/hardware/props/ToyBearProp.js');
    const { Imx219CsiCameraModule } = await import(
      '../src/hardware/sensors/Imx219CsiCameraModule.js'
    );

    // 1. Question-Aware askUser: A DIFFERENT follow-up question in Round 3 MUST surface to the user!
    const followUpRunner = async ({ round }) => {
      if (round === 1) {
        return {
          status: 'awaiting_user',
          tool_calls: [
            {
              name: 'askUser',
              args: {
                reason: 'clarification',
                question: 'Hangi türde bir devre görmek istersiniz?',
                options: ['Ultrasonik mesafe sensörü ile engel tespiti']
              }
            }
          ]
        };
      }
      if (round === 2) {
        return {
          status: 'tool_calls',
          tool_calls: [{ name: 'getComponentSchema', args: { componentId: 'sensor.ultrasonic' } }]
        };
      }
      if (round === 3) {
        // Different follow-up question!
        return {
          status: 'awaiting_user',
          tool_calls: [
            {
              name: 'askUser',
              args: {
                reason: 'clarification',
                question: 'Engel algılandığında sesli alarm (piezo buzzer) da eklensin mi?',
                options: ['Evet, buzzer ekle', 'Hayır, sadece LED olsun']
              }
            }
          ]
        };
      }
      return {
        status: 'completed',
        tool_calls: [],
        final_response: { headline: 'Devre Hazır', summary: 'Buzzer ve LED ile kuruldu.' }
      };
    };

    const paused1 = await runHardwareAgentLoop({
      prompt: 'bana güzel bir devre kurar mısın',
      customTurnRunner: followUpRunner
    });
    assert.equal(paused1.status, 'awaiting_user');

    const paused2 = await resumeHardwareAgentLoop(
      paused1.pending,
      'Ultrasonik mesafe sensörü ile engel tespiti'
    );
    assert.equal(
      paused2.status,
      'awaiting_user',
      'When the agent asks a DIFFERENT follow-up question in Round 3, it MUST surface to the user'
    );
    assert.equal(
      paused2.question,
      'Engel algılandığında sesli alarm (piezo buzzer) da eklensin mi?'
    );

    const finalResumed = await resumeHardwareAgentLoop(paused2.pending, 'Evet, buzzer ekle');
    assert.equal(finalResumed.status, 'completed');

    // 2. Multi-Wire Single-Pin Fan-Out: Multiple wires sharing the EXACT SAME host pin (PIN13 and GND)
    const uno = new ArduinoUnoBoard({ id: 'uno_fanout' });
    const rA = new AxialResistorComponent({ id: 'r_branch_a', resistanceOhms: 220 });
    const ledA = new SingleLEDComponent({ id: 'led_branch_a', color: 0x22c55e });
    const rB = new AxialResistorComponent({ id: 'r_branch_b', resistanceOhms: 220 });
    const ledB = new SingleLEDComponent({ id: 'led_branch_b', color: 0x3b82f6 });

    uno.drivePin('PIN13', true);

    const fanoutSolver = new CircuitFlowSolver();
    const fanoutResult = fanoutSolver.solve({
      boards: [uno],
      components: [rA, ledA, rB, ledB],
      wires: [
        // Both branches driven from the EXACT SAME uno_fanout:PIN13 pin
        { id: 'wf1', from: 'uno_fanout:PIN13', to: 'r_branch_a:LEAD_A' },
        { id: 'wf2', from: 'r_branch_a:LEAD_B', to: 'led_branch_a:ANODE' },
        { id: 'wf3', from: 'uno_fanout:PIN13', to: 'r_branch_b:LEAD_A' },
        { id: 'wf4', from: 'r_branch_b:LEAD_B', to: 'led_branch_b:ANODE' },
        // Both branches returning to the EXACT SAME uno_fanout:GND pin
        { id: 'wf5', from: 'led_branch_a:CATHODE', to: 'uno_fanout:GND' },
        { id: 'wf6', from: 'led_branch_b:CATHODE', to: 'uno_fanout:GND' }
      ]
    });

    assert.equal(
      fanoutResult.closedLoopCount,
      2,
      'Two parallel branches sharing the exact same PIN13 and GND pin must form 2 closed loops'
    );
    assert.ok(ledA.state.brightness > 0.7, 'Branch A LED must receive full signal from shared PIN13');
    assert.ok(ledB.state.brightness > 0.7, 'Branch B LED must receive full signal from shared PIN13');

    // 3. ReactFlow-Style evaluate({ pins, state, dt, stageEnv }) + 3D Environmental Stage Props
    const us = new UltrasonicSensorComponent({ id: 'us_stage', position: [0, 0, 0] });
    const cam = new Imx219CsiCameraModule({ id: 'cam_stage', position: [0, 0, 0] });
    const bear = new ToyBearProp({ id: 'bear_1', position: [12, 0, 0] });
    const wall = new ObstacleWallProp({ id: 'wall_1', position: [28, 0, 0] });

    assert.equal(bear.isEnvironmentProp, true, 'ToyBearProp must be flagged as an environment prop');
    assert.equal(wall.isEnvironmentProp, true, 'ObstacleWallProp must be flagged as an environment prop');
    assert.equal(Object.keys(bear.pins).length, 0, 'ToyBearProp must require 0 electrical pins');

    const stageWires = [
      { id: 'sw1', from: 'uno_fanout:5V', to: 'us_stage:VCC' },
      { id: 'sw2', from: 'uno_fanout:GND', to: 'us_stage:GND' },
      { id: 'sw3', from: 'uno_fanout:PIN9', to: 'us_stage:TRIG' },
      { id: 'sw4', from: 'uno_fanout:PIN10', to: 'us_stage:ECHO' },
      { id: 'sw5', from: 'uno_fanout:PIN13', to: 'r_branch_a:LEAD_A' },
      { id: 'sw6', from: 'r_branch_a:LEAD_B', to: 'led_branch_a:ANODE' },
      { id: 'sw7', from: 'led_branch_a:CATHODE', to: 'uno_fanout:GND' }
    ];

    const stageComponents = [uno, us, cam, rA, ledA, bear, wall];
    const runtime = new LiveCodeRuntime({
      getHostBoard: () => uno,
      getComponents: () => stageComponents,
      getConnections: () => stageWires
    });

    const sketch = `
      #define TRIG_PIN 9
      #define ECHO_PIN 10
      #define LED_PIN 13
      void setup() {
        pinMode(TRIG_PIN, OUTPUT);
        pinMode(ECHO_PIN, INPUT);
        pinMode(LED_PIN, OUTPUT);
      }
      void loop() {
        long duration = pulseIn(ECHO_PIN, HIGH);
        int distance = duration * 0.034 / 2;
        if (distance > 0 && distance < 20) {
          digitalWrite(LED_PIN, HIGH);
        } else {
          digitalWrite(LED_PIN, LOW);
        }
      }
    `;

    // First solve with ToyBearProp at 12 cm (< 20 cm threshold)
    fanoutSolver.solve({ components: stageComponents, connections: stageWires });
    assert.equal(us.state.value, 12, 'HC-SR04 must sense ToyBearProp at 12 cm');
    assert.equal(us.state.detectedObstacleId, 'bear_1');
    assert.equal(us.state.detectedObstacleClass, 'toy_bear');
    assert.equal(cam.state.targetDetected, true, 'IMX219 camera must detect ToyBearProp');
    assert.equal(cam.state.detectedTarget, 'toy_bear');

    runtime.runImmediate({ sourceCode: sketch });
    assert.ok(
      ledA.state.brightness > 0.7,
      'LED must turn ON when ToyBearProp is at 12 cm (< 20 cm)'
    );

    // Now drag ToyBearProp away to 45 cm and ObstacleWallProp to 32 cm (both > 20 cm threshold)
    bear.setPosition(45, 0, 0);
    wall.setPosition(32, 0, 0);
    fanoutSolver.solve({ components: stageComponents, connections: stageWires });
    assert.equal(
      us.state.value,
      32,
      'HC-SR04 must now sense nearest ObstacleWallProp at 32 cm'
    );
    assert.equal(us.state.detectedObstacleId, 'wall_1');

    const afterMoveFlow = runtime.runImmediate();
    assert.ok(afterMoveFlow);
    assert.equal(
      ledA.state.brightness,
      0,
      'LED must turn OFF when nearest obstacle is moved to 32 cm (> 20 cm)'
    );

    // 4. DynamicComponentBuilder custom ReactFlow-style nodeBehavior & 0-pin custom prop
    const { ComponentClass: CustomLogicNode } = DynamicComponentBuilder.registerFromSpec({
      partCode: 'custom_comparator_node',
      name: 'Threshold Comparator Node',
      category: 'sensor',
      pins: [
        { name: 'IN', direction: 'IN', role: 'SIGNAL' },
        { name: 'OUT', direction: 'OUT', role: 'SIGNAL' },
        { name: 'GND', direction: 'BIDIR', role: 'GND' }
      ],
      nodeBehavior: {
        type: 'threshold',
        inputPin: 'IN',
        outputPin: 'OUT',
        thresholdVoltage: 2.5,
        outputVoltage: 5.0
      }
    });

    const logicNode = new CustomLogicNode({ id: 'logic_1' });
    const inPin = logicNode.electricalPins.get('IN');
    const outPin = logicNode.electricalPins.get('OUT');
    inPin.voltage = 3.3;
    const evalOut = logicNode.runNodeEvaluation();
    assert.equal(evalOut.state.triggered, true);
    assert.equal(outPin.voltage, 5.0);
  }
);

await test(
  '42. Workspace calisma-alani-4-qyycrg (Breadboard + Tactile Button on PIN2 + 3 LEDs on PIN9..11) & Spatial Breadboard Conduction',
  async () => {
    const reg = new ComponentRegistry();
    registerAllHardware(reg);

    const uno = reg.create('board.arduino_uno', { id: 'main.host_board', position: [-30, 0, 0] });
    const bread1 = reg.create('board.breadboard', { id: 'bread1', position: [10, 0, 0] });
    const led1 = reg.create('led.single', { id: 'led1', position: [10, 0, -5], state: { color: 'red' } });
    const led2 = reg.create('led.single', { id: 'led2', position: [15, 0, -5], state: { color: 'green' } });
    const led3 = reg.create('led.single', { id: 'led3', position: [20, 0, -5], state: { color: 'blue' } });
    const r1 = reg.create('passive.resistor', { id: 'r1', position: [10, 0, -10], state: { resistance: 220 } });
    const r2 = reg.create('passive.resistor', { id: 'r2', position: [15, 0, -10], state: { resistance: 220 } });
    const r3 = reg.create('passive.resistor', { id: 'r3', position: [20, 0, -10], state: { resistance: 220 } });
    const btn1 = reg.create('button.tactile', { id: 'btn1', position: [10, 0, 5], state: { pressed: false } });

    const stageComponents = [uno, bread1, led1, led2, led3, r1, r2, r3, btn1];
    const stageWires = [
      { id: 'w1', from: 'main.host_board.5V', to: 'bread1.PLUS_TOP_1' },
      { id: 'w2', from: 'main.host_board.GND', to: 'bread1.MINUS_TOP_1' },
      { id: 'w3', from: 'main.host_board.PIN9', to: 'r1.LEAD_A' },
      { id: 'w4', from: 'r1.LEAD_B', to: 'led1.ANODE' },
      { id: 'w5', from: 'led1.CATHODE', to: 'bread1.MINUS_TOP_1' },
      { id: 'w6', from: 'main.host_board.PIN10', to: 'r2.LEAD_A' },
      { id: 'w7', from: 'r2.LEAD_B', to: 'led2.ANODE' },
      { id: 'w8', from: 'led2.CATHODE', to: 'bread1.MINUS_TOP_1' },
      { id: 'w9', from: 'main.host_board.PIN11', to: 'r3.LEAD_A' },
      { id: 'w10', from: 'r3.LEAD_B', to: 'led3.ANODE' },
      { id: 'w11', from: 'led3.CATHODE', to: 'bread1.MINUS_TOP_1' },
      { id: 'w12', from: 'main.host_board.5V', to: 'btn1.TERMINAL_A' },
      { id: 'w13', from: 'main.host_board.PIN2', to: 'btn1.TERMINAL_B' }
    ];

    const solver = new CircuitFlowSolver();
    const runtime = new LiveCodeRuntime({
      solver,
      getHostBoard: () => uno,
      getComponents: () => stageComponents,
      getConnections: () => stageWires
    });

    const userSketch = `
      void setup() {
        pinMode(9,OUTPUT);
        pinMode(10,OUTPUT);
        pinMode(11,OUTPUT);
        pinMode(2,INPUT);
      }
      void loop() {
        if(digitalRead(2)==HIGH){
          digitalWrite(9,HIGH);
          digitalWrite(10,HIGH);
          digitalWrite(11,HIGH);
        }else{
          digitalWrite(9,LOW);
          digitalWrite(10,LOW);
          digitalWrite(11,LOW);
        }
      }
    `;

    // 1. Initial state: btn1 is released (pressed: false) -> PIN2 is 0V (LOW) -> LEDs are OFF
    const flowReleased = runtime.runImmediate({ sourceCode: userSketch });
    assert.equal(btn1.state.pressed, false);
    assert.equal(uno.getPin('PIN2').voltage, 0, 'PIN2 must be 0V when btn1 is released');
    assert.equal(flowReleased.closedLoopCount, 0, 'No LED loops should conduct when btn1 is released');
    assert.equal(led1.state.brightness, 0);
    assert.equal(led2.state.brightness, 0);
    assert.equal(led3.state.brightness, 0);

    // 2. Press btn1 (simulating 3D stage click or Gizmo HUD "🔘 Bas" button) -> refreshInteractiveState()
    btn1.toggle();
    assert.equal(btn1.state.pressed, true);
    const flowPressed = runtime.refreshInteractiveState();
    assert.equal(uno.getPin('PIN2').voltage, 5.0, '5.0V must propagate across closed btn1 onto PIN2');
    assert.equal(flowPressed.closedLoopCount, 3, 'All 3 LED loops must close through bread1.MINUS_TOP_1 -> GND');
    assert.ok(flowPressed.totalCurrentMa > 30, `Expected >30mA across 3 LEDs, got ${flowPressed.totalCurrentMa}mA`);
    assert.ok(led1.state.brightness > 0.7, 'led1 must illuminate when btn1 is pressed');
    assert.ok(led2.state.brightness > 0.7, 'led2 must illuminate when btn1 is pressed');
    assert.ok(led3.state.brightness > 0.7, 'led3 must illuminate when btn1 is pressed');

    // 3. Release btn1 again -> LEDs turn back OFF immediately
    btn1.toggle();
    assert.equal(btn1.state.pressed, false);
    const flowReleasedAgain = runtime.refreshInteractiveState();
    assert.equal(uno.getPin('PIN2').voltage, 0, 'PIN2 must return to 0V when btn1 is released');
    assert.equal(flowReleasedAgain.closedLoopCount, 0);
    assert.equal(led1.state.brightness, 0);
    assert.equal(led2.state.brightness, 0);
    assert.equal(led3.state.brightness, 0);

    // 4. Spatial Breadboard Conduction without explicit jumper wires on the LED's own pins:
    // Place led_bb so ANODE (local -1.25, 0, 0) sits on bread1.A8 (world 10.0, 0.45, -6.0)
    // and CATHODE (local +1.25, 0, 0) sits on bread1.A9 (world 12.5, 0.45, -6.0) -> center at [11.25, 0.45, -6.0]
    const ledBb = reg.create('led.single', { id: 'led_bb', position: [11.25, 0.45, -6.0] });
    const rBb = reg.create('passive.resistor', { id: 'r_bb', position: [0, 0, -15], state: { resistance: 220 } });
    const bbFlow = solver.solve({
      components: [uno, bread1, ledBb, rBb],
      connections: [
        // Wire 5V -> r_bb -> bread1.E8 (same column 8 strip as A8 where led_bb.ANODE sits!)
        { id: 'bb_w1', from: 'main.host_board.5V', to: 'r_bb.LEAD_A' },
        { id: 'bb_w2', from: 'r_bb.LEAD_B', to: 'bread1.E8' },
        // Wire bread1.E9 (same column 9 strip as A9 where led_bb.CATHODE sits!) -> GND
        { id: 'bb_w3', from: 'bread1.E9', to: 'main.host_board.GND' }
      ]
    });
    assert.equal(
      bbFlow.closedLoopCount,
      1,
      'LED seated on breadboard tie-points A8/A9 must conduct through strips E8 and E9 without direct wires to LED pins'
    );
    assert.ok(ledBb.state.brightness > 0.7, 'led_bb must light up via breadboard strip conduction');
  }
);

await test(
  '43. Faz 13: Custom Component Studio & DynamicComponentBuilder v2 — Declarative parts[], Relative attach, CAD Primitives, Modifiers, PBR Presets, partRole & 2.54mm pinGenerator',
  async () => {
    const reg = new ComponentRegistry();
    registerAllHardware(reg);

    // 1. Verify PBR material presets
    for (const presetKey of [
      'fr4_pcb',
      'ic_epoxy',
      'gold_pin',
      'brushed_aluminum',
      'frosted_led',
      'rubber_tire',
      'copper',
      'ceramic',
      'matte_plastic'
    ]) {
      assert.ok(PBR_MATERIAL_PRESETS[presetKey], `Missing PBR material preset: ${presetKey}`);
    }

    // 2. Register a rich v2 hardware node with parts[], attach, CAD primitives, repeat, mirror, partRole & pinGenerator
    const v2Spec = {
      typeId: 'custom.smart_cooling_hub',
      name: 'Smart Cooling & Telemetry Hub',
      category: 'actuator',
      parts: [
        {
          id: 'pcb_base',
          shape: 'rounded_box',
          size: [12, 1.2, 8],
          radius: 0.25,
          position: [0, 0.6, 0],
          materialPreset: 'fr4_pcb'
        },
        {
          id: 'driver_ic',
          shape: 'box',
          size: [4, 1.0, 3],
          attach: { to: 'pcb_base', side: 'top', gap: 0, offset: [-2, 0, 0] },
          materialPreset: 'ic_epoxy'
        },
        {
          id: 'status_dome',
          shape: 'sphere',
          radius: 0.65,
          attach: { to: 'driver_ic', side: 'top', gap: 0.05 },
          materialPreset: 'frosted_led',
          partRole: 'emissive'
        },
        {
          id: 'fan_rotor',
          shape: 'cylinder',
          radiusTop: 1.8,
          radiusBottom: 1.8,
          height: 0.7,
          attach: { to: 'pcb_base', side: 'top', gap: 0.1, offset: [2.5, 0, 0] },
          materialPreset: 'brushed_aluminum',
          partRole: 'rotor'
        },
        {
          id: 'coolant_tube',
          shape: 'tube',
          outerRadius: 0.6,
          innerRadius: 0.35,
          height: 1.2,
          attach: { to: 'pcb_base', side: 'back', gap: 0.1 },
          materialPreset: 'copper'
        },
        {
          id: 'MountingBumper',
          shape: 'capsule',
          radius: 0.3,
          length: 0.8,
          position: [5.2, 0.6, 3.2],
          materialPreset: 'rubber_tire',
          mirror: { axis: 'x', center: 0 }
        },
        {
          id: 'heatsink_fin',
          shape: 'lathe',
          radius: 0.4,
          height: 1.0,
          position: [-4.5, 1.6, -2.5],
          materialPreset: 'brushed_aluminum',
          repeat: { count: 3, step: [1.2, 0, 0] }
        }
      ],
      pins: [
        { name: 'VCC', direction: 'IN', role: 'POWER', position: [-5.0, 0.5, 3.6] },
        { name: 'GND', direction: 'BIDIR', role: 'GND', position: [-2.46, 0.5, 3.6] },
        { name: 'IN', direction: 'IN', role: 'SIGNAL', position: [0.08, 0.5, 3.6] },
        { name: 'OUT', direction: 'OUT', role: 'SIGNAL', position: [2.62, 0.5, 3.6] }
      ],
      pinGenerator: {
        prefix: 'HDR',
        startIndex: 1,
        count: 4,
        start: [-3.81, 0.5, -3.6],
        axis: 'x',
        pitch: 2.54,
        direction: 'BIDIR',
        role: 'GPIO'
      },
      evaluateScript: `
        const active = Boolean(pins.IN?.high || (pins.IN?.voltage || 0) >= 2.5);
        state.active = active;
        state.brightness = active ? 1.0 : 0.0;
        state.rpm = active ? 720 : 0;
        return {
          outputs: {
            OUT: { voltage: active ? 5.0 : 0.0, role: 'SIGNAL' }
          }
        };
      `
    };

    const { typeId, ComponentClass } = DynamicComponentBuilder.registerFromSpec(v2Spec, reg);
    assert.equal(typeId, 'custom.smart_cooling_hub');
    const hub = reg.create('custom.smart_cooling_hub', { id: 'hub_1' });

    // Verify 2.54mm pinGenerator expansion (4 explicit pins + 4 generated HDR1..HDR4 pins = 8 pins)
    assert.equal(hub.electricalPins.size, 8, 'Must have 4 explicit pins + 4 generated 2.54mm HDR pins');
    const hdr1 = hub.getPin('HDR1');
    const hdr2 = hub.getPin('HDR2');
    assert.ok(hdr1 && hdr2, 'Generated HDR1 and HDR2 pins must exist');
    assert.ok(
      Math.abs(hdr2.localPosition.x - hdr1.localPosition.x - 2.54) < 1e-3,
      'Generated header pins must be spaced by exactly 2.54 units'
    );

    // Verify relative attach positions in built 3D group
    const group = hub.buildMesh();
    let pcbY = null;
    let icY = null;
    let domeY = null;
    group.traverse((obj) => {
      if (obj.name === 'pcb_base' || obj.name === 'part_pcb_base') pcbY = obj.position.y;
      if (obj.name === 'driver_ic' || obj.name === 'part_driver_ic') icY = obj.position.y;
      if (obj.name === 'status_dome' || obj.name === 'part_status_dome') domeY = obj.position.y;
    });
    assert.ok(pcbY !== null && icY !== null && domeY !== null, 'Named parts must exist in 3D group');
    assert.ok(icY > pcbY, `driver_ic (${icY}) attached to top of pcb_base (${pcbY}) must sit higher on Y`);
    assert.ok(domeY > icY, `status_dome (${domeY}) attached to top of driver_ic (${icY}) must sit higher on Y`);

    // Verify reactive partRole ('emissive' and 'rotor') during evaluation + tick(dt)
    hub.getPin('IN').voltage = 5.0;
    hub.runNodeEvaluation({ dt: 0.05 });
    assert.equal(hub.state.active, true);
    assert.equal(hub.getPin('OUT').voltage, 5.0);
    hub.onTick(0.1);
    const rotorEntry = Array.isArray(hub._roleParts)
      ? hub._roleParts.find((entry) => entry.role === 'rotor')
      : hub._roleParts?.rotor?.[0];
    const emissiveEntry = Array.isArray(hub._roleParts)
      ? hub._roleParts.find((entry) => entry.role === 'emissive')
      : hub._roleParts?.emissive?.[0];
    assert.ok(rotorEntry && Math.abs(rotorEntry.mesh.rotation.y) > 0.1, 'Rotor partRole must spin when active');
    assert.ok(
      emissiveEntry && emissiveEntry.mesh.material.emissiveIntensity >= 1.0,
      'Emissive partRole must glow when active'
    );

    // 3. Verify 0-Pin Physical Stage Obstacle Prop creation via Studio template
    const propSpec = STUDIO_TEMPLATES.arena_barrier_prop;
    DynamicComponentBuilder.registerFromSpec(propSpec, reg);
    const barrier = reg.create('custom.arena_barrier_prop', { id: 'barrier_1', position: [16, 0, 0] });
    assert.equal(barrier.isEnvironmentProp, true, '0-Pin Studio prop must have isEnvironmentProp = true');
    assert.equal(barrier.electricalPins.size, 0, '0-Pin Studio prop must have 0 electrical pins');

    // Verify HC-SR04 senses the custom Studio prop on the stage
    const uno = reg.create('board.arduino_uno', { id: 'uno_prop_test', position: [-30, 0, 0] });
    const us = reg.create('sensor.ultrasonic', { id: 'us_prop_test', position: [0, 0, 0] });
    const solver = new CircuitFlowSolver();
    solver.solve({
      components: [uno, us, barrier],
      connections: [
        { id: 'pw1', from: 'uno_prop_test.5V', to: 'us_prop_test.VCC' },
        { id: 'pw2', from: 'uno_prop_test.GND', to: 'us_prop_test.GND' },
        { id: 'pw3', from: 'uno_prop_test.PIN9', to: 'us_prop_test.TRIG' },
        { id: 'pw4', from: 'uno_prop_test.PIN10', to: 'us_prop_test.ECHO' }
      ]
    });
    assert.equal(us.state.value, 11, 'HC-SR04 must detect custom 0-Pin Studio barrier prop at 11 cm (16cm center - 5cm boundingRadiusCm)');
    assert.equal(us.state.detectedObstacleId, 'barrier_1');

    // 4. Verify ComponentPalettePopover Studio tab & saveAndSpawnStudioComponent()
    const spawnedList = [];
    const mockStage = {
      spawnIndependentComponent(tId, opts) {
        const inst = reg.create(tId, opts);
        spawnedList.push(inst);
        return inst;
      }
    };
    const mockRoot = {
      innerHTML: '',
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      }
    };
    const popover = new ComponentPalettePopover({
      rootEl: mockRoot,
      stage: mockStage,
      registry: reg
    }).mount();

    popover.open('studio');
    assert.equal(popover.activeTab, 'studio');
    assert.ok(
      mockRoot.innerHTML.includes('data-role="custom-component-studio"'),
      'Studio tab must render custom-component-studio panel'
    );

    popover.loadStudioPreset('logic_inverter_gate');
    const savedRes = await popover.saveAndSpawnStudioComponent();
    assert.equal(savedRes.ok, true);
    assert.equal(savedRes.typeId, 'custom.logic_inverter_gate');
    assert.equal(spawnedList.length, 1);
    assert.equal(spawnedList[0].typeId, 'custom.logic_inverter_gate');
    popover.destroy();
  }
);

await test(
  '44. Faz 14: 3D ReactFlow Data-Flow Graph Engine, Multi-Hop Cascade Solver & Live Pin/Handle Inspector',
  async () => {
    const reg = new ComponentRegistry();
    registerAllHardware(reg);

    // Register the custom NOT Logic Inverter Gate from Studio templates
    DynamicComponentBuilder.registerFromSpec(STUDIO_TEMPLATES.logic_inverter_gate, reg);

    const uno = reg.create('board.arduino_uno', { id: 'main.host_board', position: [-30, 0, 0] });
    const btn = reg.create('button.tactile', { id: 'btn_gate_in', position: [-10, 0, 0], state: { pressed: false } });
    const notGate = reg.create('custom.logic_inverter_gate', { id: 'not_gate_1', position: [5, 0, 0] });
    const rLed = reg.create('passive.resistor', { id: 'r_gate_led', position: [16, 0, 0], state: { resistance: 220 } });
    const led = reg.create('led.single', { id: 'led_gate_out', position: [24, 0, 0] });

    // Multi-Hop 3D Data-Flow Graph:
    // Hop 1: 5V -> btn_gate_in.TERMINAL_A, btn_gate_in.TERMINAL_B -> not_gate_1.IN
    // Hop 2: not_gate_1.evaluate({ pins, state }) computes OUT = !IN ? 5.0V : 0.0V
    // Hop 3: not_gate_1.OUT drives BOTH main.host_board.PIN2 AND r_gate_led -> led_gate_out -> GND!
    const components = [uno, btn, notGate, rLed, led];
    const connections = [
      { id: 'c1', from: 'main.host_board.5V', to: 'not_gate_1.VCC' },
      { id: 'c2', from: 'main.host_board.GND', to: 'not_gate_1.GND' },
      { id: 'c3', from: 'main.host_board.5V', to: 'btn_gate_in.TERMINAL_A' },
      { id: 'c4', from: 'btn_gate_in.TERMINAL_B', to: 'not_gate_1.IN' },
      { id: 'c5', from: 'not_gate_1.OUT', to: 'main.host_board.PIN2' },
      { id: 'c6', from: 'not_gate_1.OUT', to: 'r_gate_led.LEAD_A' },
      { id: 'c7', from: 'r_gate_led.LEAD_B', to: 'led_gate_out.ANODE' },
      { id: 'c8', from: 'led_gate_out.CATHODE', to: 'main.host_board.GND' }
    ];

    const solver = new CircuitFlowSolver();

    // Case A: Button is unpressed (pressed: false) -> IN is 0V -> NOT gate outputs 5.0V -> PIN2 is 5.0V & LED is ON
    const flowUnpressed = solver.solve({ components, connections });
    assert.ok(flowUnpressed.cascadeHopCount >= 2, 'Multi-hop cascade solver must run at least 2 hops');
    assert.equal(notGate.getPin('IN').voltage, 0, 'not_gate_1.IN must be 0V when button is released');
    assert.equal(notGate.getPin('IN').logicLevel, 0);
    assert.equal(notGate.getPin('OUT').voltage, 5.0, 'not_gate_1.OUT must be 5.0V when IN is 0V');
    assert.equal(notGate.getPin('OUT').logicLevel, 1);
    assert.equal(notGate.getPin('OUT').high, true);
    assert.equal(uno.getPin('PIN2').voltage, 5.0, 'Cascaded NOT gate output must drive Arduino PIN2 to 5.0V');
    assert.ok(led.state.brightness > 0.7, 'Downstream LED driven by NOT gate OUT must illuminate');

    // Case B: Press button (pressed: true) -> 5V flows to not_gate_1.IN -> NOT gate outputs 0V -> PIN2 is 0V & LED turns OFF
    btn.toggle();
    assert.equal(btn.state.pressed, true);
    solver.solve({ components, connections });
    assert.equal(notGate.getPin('IN').voltage, 5.0, 'not_gate_1.IN must be 5.0V when button is pressed');
    assert.equal(notGate.getPin('IN').logicLevel, 1);
    assert.equal(notGate.getPin('OUT').voltage, 0, 'not_gate_1.OUT must invert to 0V when IN is 5.0V');
    assert.equal(uno.getPin('PIN2').voltage, 0, 'Arduino PIN2 must drop to 0V when NOT gate output is 0V');
    assert.equal(led.state.brightness, 0, 'Downstream LED must turn OFF when NOT gate output drops to 0V');

    // Verify Live Handle Inspector snapshot on StageTransformController
    const mockCamera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    const transformCtrl = new StageTransformController({
      scene: new THREE.Scene(),
      camera: mockCamera,
      domElement: null,
      hudElement: null
    });
    const handleSnap = transformCtrl.getHandleInspectorSnapshot(notGate);
    assert.equal(handleSnap.handles.length, 4, 'Handle inspector must report all 4 pins (VCC, GND, IN, OUT)');
    const inSnap = handleSnap.handles.find((h) => h.name === 'IN');
    const outSnap = handleSnap.handles.find((h) => h.name === 'OUT');
    assert.equal(inSnap.voltage, 5.0);
    assert.equal(inSnap.logicLevel, 1);
    assert.equal(inSnap.high, true);
    assert.equal(outSnap.voltage, 0);
    assert.equal(outSnap.logicLevel, 0);
    assert.equal(outSnap.high, false);

    // Verify runtime error isolation in custom evaluateScript
    const { ComponentClass: FaultyNodeClass } = DynamicComponentBuilder.registerFromSpec(
      {
        typeId: 'custom.faulty_script_node',
        name: 'Faulty Script Node',
        pins: [{ name: 'IN', direction: 'IN', role: 'SIGNAL' }],
        evaluateScript: 'throw new Error("Simulated custom evaluate fault");'
      },
      reg
    );
    const faultyNode = new FaultyNodeClass({ id: 'faulty_1' });
    const evalFaultRes = faultyNode.runNodeEvaluation();
    assert.equal(evalFaultRes.error, 'Simulated custom evaluate fault');
    assert.equal(faultyNode.lastEvaluationError, 'Simulated custom evaluate fault');
  }
);

await test(
  '45. Faz 15: Custom Component Backend Persistence, Catalog Hydration & AI Agent Discovery / Code Mode Synthesis',
  async () => {
    const reg = new ComponentRegistry();
    registerAllHardware(reg);

    const apiClient = new BackendApiClient({ fetchImpl: null, storage: null });
    await apiClient.login({
      email: 'maker@circuitlab.io',
      password: 'password123'
    });

    // 1. Save custom components via BackendApiClient
    const saveGate = await apiClient.saveCustomComponent(STUDIO_TEMPLATES.logic_inverter_gate);
    assert.equal(saveGate.ok, true);
    assert.equal(saveGate.component.type_id, 'custom.logic_inverter_gate');

    const saveProp = await apiClient.saveCustomComponent(STUDIO_TEMPLATES.arena_barrier_prop);
    assert.equal(saveProp.ok, true);
    assert.equal(saveProp.component.is_environment_prop, true);

    const listed = await apiClient.listCustomComponents();
    assert.equal(listed.ok, true);
    assert.ok(
      listed.components.some((c) => c.type_id === 'custom.logic_inverter_gate'),
      'Saved custom.logic_inverter_gate must appear in listCustomComponents()'
    );

    // 2. Hydrate saved custom components into a fresh ComponentRegistry
    const hydrateRes = await apiClient.hydrateCustomComponentsIntoRegistry(reg);
    assert.equal(hydrateRes.ok, true);
    assert.ok(hydrateRes.registered.includes('custom.logic_inverter_gate'));
    assert.ok(hydrateRes.registered.includes('custom.arena_barrier_prop'));

    // Verify ComponentRegistry catalog & category filtering ('custom' and 'props')
    const customMatches = reg.searchCatalog('inverter', 'custom');
    assert.equal(customMatches.length, 1);
    assert.equal(customMatches[0].typeId, 'custom.logic_inverter_gate');
    assert.equal(customMatches[0].isCustom, true);

    const propMatches = reg.searchCatalog('bariyer', 'props');
    assert.ok(
      propMatches.some((item) => item.typeId === 'custom.arena_barrier_prop' && item.isEnvironmentProp),
      '0-Pin custom prop must be discoverable under props category'
    );

    // 3. Verify AI Agent progressive discovery (searchCapabilities + getComponentSchema)
    const searchRes = searchCapabilities({ query: 'inverter logic', category: 'all' }, reg);
    assert.ok(
      searchRes.components.some((c) => c.typeId === 'custom.logic_inverter_gate' && c.isCustom === true),
      'searchCapabilities must return custom.logic_inverter_gate with isCustom: true'
    );

    const schemaRes = getComponentSchema({ typeId: 'custom.logic_inverter_gate' }, reg);
    assert.equal(schemaRes.found, true);
    assert.equal(schemaRes.isCustom, true);
    assert.deepEqual(schemaRes.pinNames, ['VCC', 'GND', 'IN', 'OUT']);

    // 4. Verify CodeModeExecutor (`executeCode`) can register/spawn custom components and wire a closed loop
    let executor = null;
    const runtime = new LiveCodeRuntime({
      getHostBoard: () => executor?.getHostBoard(),
      getComponents: () => [executor?.getHostBoard(), ...(executor?.getStageComponents() || [])].filter(Boolean),
      getConnections: () => executor?.getConnections() || []
    });
    executor = new StageAiCommandExecutor({
      registry: reg,
      runtime,
      apiClient
    });

    const codeRes = await executor.executeCodeModeScript(
      `
        circuit.setBoard("board.arduino_uno");
        circuit.clearAddedComponents();
        const gate = circuit.addComponent("custom.logic_inverter_gate", { id: "gate_ai_1", position: [4, 0, 12] });
        const r1 = circuit.addComponent("passive.resistor", { id: "r_ai_1", resistanceOhms: 220, position: [14, 0, 12] });
        const led1 = circuit.addComponent("led.single", { id: "led_ai_1", color: "#22c55e", position: [22, 0, 12] });
        circuit.connectWire("host", "5V", gate, "VCC");
        circuit.connectWire("host", "GND", gate, "GND");
        circuit.connectWire("host", "GND", gate, "IN");
        circuit.connectWire(gate, "OUT", r1, "LEAD_A");
        circuit.connectWire(r1, "LEAD_B", led1, "ANODE");
        circuit.connectWire(led1, "CATHODE", "host", "GND");
        return circuit.inspectElectricalState();
      `,
      'Wire custom.logic_inverter_gate with IN=GND so OUT=5V drives LED'
    );

    assert.equal(codeRes.ok, true, `Code Mode execution failed: ${codeRes.error || ''}`);
    const spawnedLed = reg.getInstance('led_ai_1');
    assert.ok(spawnedLed && spawnedLed.state.brightness > 0.7, 'Custom logic inverter gate wired in Code Mode must light up downstream LED');

    runtime.stop({ resetPins: true });
  }
);

await test(
  '46. Faz 16: 3D FOV Directional Raycast Obstacle Detection & Multi-MCU Pin-to-Pin ReactFlow Data-Flow',
  async () => {
    const reg = new ComponentRegistry();
    registerAllHardware(reg);
    const solver = new CircuitFlowSolver();

    // --- PART 1: Task 16.1 — 3D FOV Cone & Directional Raycast Obstacle Sensing ---
    const usSensor = reg.create('sensor.ultrasonic', { id: 'us_fov_1', position: [0, 0, 0] });
    const camSensor = new Imx219CsiCameraModule({ id: 'cam_fov_1', position: [0, 0, 0] });
    const bearEast = reg.create('prop.toy_bear', { id: 'bear_east', position: [16, 0, 0] }); // +X axis (surfaceDist = 16 - 4 = 12cm)
    const wallNorth = reg.create('prop.obstacle_wall', { id: 'wall_north', position: [0, 0, 22] }); // +Z axis (surfaceDist = 22 - 6 = 16cm)

    const stageComps = [usSensor, camSensor, bearEast, wallNorth];

    // 1A. Default heading ry = 0 -> Forward vector [1, 0, 0] (+X): faces bear_east (0 deg), wall_north is at 90 deg (out of FOV)
    assert.deepEqual(usSensor.getForwardVector(), [1, 0, 0]);
    solver.solve({ components: stageComps, connections: [] });
    assert.equal(usSensor.state.detectedObstacleId, 'bear_east', 'Ultrasonic facing +X must detect bear_east');
    assert.equal(usSensor.state.value, 16, 'Ultrasonic distance to bear_east at [16, 0, 0] must be 16cm');
    assert.equal(usSensor.state.inFov, true);
    assert.equal(usSensor.state.raycastHit, true);
    assert.equal(usSensor.state.obstacleAngleDeg, 0);

    assert.equal(camSensor.state.targetDetected, true, 'Camera facing +X must detect bear_east');
    assert.equal(camSensor.state.detectedObstacleId, 'bear_east');
    assert.equal(camSensor.state.inFov, true);
    assert.equal(camSensor.state.raycastHit, true);

    // 1B. Rotate sensors 180 deg (ry = Math.PI -> Forward [-1, 0, 0] -X): looking into empty space away from both obstacles
    usSensor.setRotation(0, Math.PI, 0);
    camSensor.setRotation(0, Math.PI, 0);
    assert.deepEqual(usSensor.getForwardVector(), [-1, 0, 0]);
    solver.solve({ components: stageComps, connections: [] });
    assert.equal(usSensor.state.detectedObstacleId, null, 'Ultrasonic rotated 180 deg away must not detect obstacles behind it');
    assert.equal(usSensor.state.inFov, false);
    assert.equal(usSensor.state.raycastHit, false);
    assert.equal(usSensor.state.value, 120, 'Ultrasonic aimed into empty space must report maxValue (120cm)');

    assert.equal(camSensor.state.targetDetected, false, 'Camera rotated 180 deg away must report targetDetected: false');
    assert.equal(camSensor.state.detectedObstacleId, null);
    assert.equal(camSensor.state.inFov, false);
    assert.equal(camSensor.state.detectedObjects.length, 0);

    // 1C. Rotate sensors 90 deg (ry = Math.PI / 2 -> Forward [0, 0, 1] +Z): now facing wall_north at [0, 0, 22]
    usSensor.setRotation(0, Math.PI / 2, 0);
    camSensor.setRotation(0, Math.PI / 2, 0);
    assert.deepEqual(usSensor.getForwardVector(), [0, 0, 1]);
    solver.solve({ components: stageComps, connections: [] });
    assert.equal(usSensor.state.detectedObstacleId, 'wall_north', 'Ultrasonic rotated +90 deg (+Z) must detect wall_north');
    assert.equal(usSensor.state.value, 22, 'Ultrasonic distance to wall_north at [0, 0, 22] must be 22cm');
    assert.equal(usSensor.state.inFov, true);
    assert.equal(usSensor.state.raycastHit, true);
    assert.equal(usSensor.state.obstacleAngleDeg, 0);

    assert.equal(camSensor.state.targetDetected, true, 'Camera rotated +90 deg (+Z) must detect wall_north');
    assert.equal(camSensor.state.detectedObstacleId, 'wall_north');
    assert.equal(camSensor.state.targetDistanceCm, 22);

    // --- PART 2: Task 16.2 — Multi-MCU Pin-to-Pin ReactFlow Data-Flow (Arduino Uno -> ESP32 DevKit) ---
    const unoMaster = reg.create('board.arduino_uno', { id: 'uno_master', position: [-20, 0, 0] });
    const espSlave = reg.create('board.esp32_devkit', { id: 'esp_slave', position: [20, 0, 0] });
    const btnMaster = reg.create('button.tactile', {
      id: 'btn_master',
      position: [-30, 0, 10],
      initialState: { pressed: false }
    });
    const rSlave = reg.create('passive.resistor', { id: 'r_slave', resistanceOhms: 220, position: [30, 0, 8] });
    const ledSlave = reg.create('led.single', { id: 'led_slave', color: '#38bdf8', position: [36, 0, 8] });

    const multiComponents = [unoMaster, espSlave, btnMaster, rSlave, ledSlave];
    const multiConnections = [
      // Button on Master Arduino Uno (5V -> btn -> PIN2)
      { id: 'w_m_btn_vcc', from: 'uno_master.5V', to: 'btn_master.TERMINAL_A' },
      { id: 'w_m_btn_sig', from: 'btn_master.TERMINAL_B', to: 'uno_master.PIN2' },
      // Inter-MCU Pin-to-Pin GPIO & UART links + Common Ground
      { id: 'w_mcu_gpio', from: 'uno_master.PIN8', to: 'esp_slave.GPIO4' },
      { id: 'w_mcu_uart', from: 'uno_master.TX0', to: 'esp_slave.RX0' },
      { id: 'w_mcu_gnd', from: 'uno_master.GND', to: 'esp_slave.GND' },
      // Slave ESP32 output (GPIO2 -> Resistor -> LED -> GND)
      { id: 'w_s_led_1', from: 'esp_slave.GPIO2', to: 'r_slave.LEAD_A' },
      { id: 'w_s_led_2', from: 'r_slave.LEAD_B', to: 'led_slave.ANODE' },
      { id: 'w_s_led_3', from: 'led_slave.CATHODE', to: 'esp_slave.GND' }
    ];

    const multiRuntime = new LiveCodeRuntime({
      getHostBoard: () => unoMaster,
      getComponents: () => multiComponents,
      getConnections: () => multiConnections,
      solver
    });

    multiRuntime.setBoardCode(
      'uno_master',
      `
      void setup() {
        pinMode(2, INPUT);
        pinMode(8, OUTPUT);
      }
      void loop() {
        if (digitalRead(2) == HIGH) {
          digitalWrite(8, HIGH);
          Serial.println("MCU_SYNC_HIGH");
        } else {
          digitalWrite(8, LOW);
        }
      }
      `
    );

    multiRuntime.setBoardCode(
      'esp_slave',
      `
      void setup() {
        pinMode(4, INPUT);
        pinMode(2, OUTPUT);
      }
      void loop() {
        if (digitalRead(4) == HIGH) {
          digitalWrite(2, HIGH);
        } else {
          digitalWrite(2, LOW);
        }
      }
      `
    );

    // 2A. Initial state (btn_master unpressed): uno_master.PIN8 is LOW -> esp_slave.GPIO4 is LOW -> led_slave is OFF
    multiRuntime.runImmediate();
    assert.equal(unoMaster.digitalReadPin('PIN2'), 0);
    assert.equal(unoMaster.readPinVoltage('PIN8'), 0);
    assert.equal(espSlave.digitalReadPin('GPIO4'), 0);
    assert.equal(espSlave.readPinVoltage('GPIO2'), 0);
    assert.equal(ledSlave.state.brightness, 0, 'Slave ESP32 LED must be OFF when Master Uno button is unpressed');

    // 2B. Press button on Master Uno -> PIN8 drives HIGH & TX0 sends UART frame -> Slave ESP32 senses GPIO4 HIGH & RX0 frame -> drives GPIO2 HIGH -> LED ON
    btnMaster.toggle();
    assert.equal(btnMaster.state.pressed, true);
    multiRuntime.refreshInteractiveState();

    assert.equal(unoMaster.digitalReadPin('PIN2'), 1, 'uno_master.PIN2 must read HIGH when button is pressed');
    assert.equal(unoMaster.readPinVoltage('PIN8'), 5.0, 'uno_master.PIN8 must drive 5.0V onto inter-MCU wire');
    assert.equal(espSlave.digitalReadPin('GPIO4'), 1, 'esp_slave.GPIO4 must sense HIGH from uno_master.PIN8');
    assert.equal(espSlave.state.lastRxMessage, 'MCU_SYNC_HIGH', 'esp_slave.RX0 must receive UART frame from uno_master.TX0');
    assert.equal(espSlave.state.lastSenderBoardId, 'uno_master');
    assert.equal(espSlave.readPinVoltage('GPIO2'), 3.3, 'esp_slave.GPIO2 must drive 3.3V when GPIO4 is HIGH');
    assert.ok(
      ledSlave.state.brightness > 0.3,
      `Slave ESP32 downstream LED must illuminate (3.3V logic -> ~0.369 brightness, got ${ledSlave.state.brightness}) in response to Master Uno signal`
    );

    // 2C. Release button on Master Uno -> PIN8 drops LOW -> Slave ESP32 senses GPIO4 LOW -> drives GPIO2 LOW -> LED turns OFF
    btnMaster.toggle();
    assert.equal(btnMaster.state.pressed, false);
    multiRuntime.refreshInteractiveState();

    assert.equal(unoMaster.readPinVoltage('PIN8'), 0);
    assert.equal(espSlave.digitalReadPin('GPIO4'), 0);
    assert.equal(espSlave.readPinVoltage('GPIO2'), 0);
    assert.equal(ledSlave.state.brightness, 0, 'Slave ESP32 LED must turn OFF when Master Uno button is released');

    multiRuntime.stop({ resetPins: true });
  }
);

await test(
  '47. Faz 17 — Full-Screen 3D Custom Component Studio (/studio), StudioModelingSDK Granular 3D CAD/Attach/PinRow/SelfTest Tools & Live Test Bench',
  async () => {
    const { AppRouter } = await import('../src/core/router/AppRouter.js');
    const { StudioModelingSDK, STUDIO_MODELING_TOOL_DEFINITIONS } = await import(
      '../src/core/ai/StudioModelingSDK.js'
    );
    const { CustomComponentStudioPage } = await import(
      '../src/ui/studio/CustomComponentStudioPage.js'
    );
    const { ComponentRegistry } = await import('../src/core/registry/ComponentRegistry.js');
    const { registerAllHardware } = await import('../src/hardware/registerAllHardware.js');

    // 1. Verify /studio route resolution in AppRouter (Task 17.1)
    const studioRoute1 = AppRouter.resolveRoute('/studio');
    assert.equal(studioRoute1.view, 'studio', '/studio must resolve to view="studio"');
    assert.equal(studioRoute1.href, '/studio');

    const studioRoute2 = AppRouter.resolveRoute('/component-studio');
    assert.equal(studioRoute2.view, 'studio', '/component-studio must resolve to view="studio"');

    const studioRoute3 = AppRouter.resolveRoute('/?view=studio');
    assert.equal(studioRoute3.view, 'studio', '/?view=studio must resolve to view="studio"');

    // 2. Verify StudioModelingSDK granular tool catalog (Task 17.3)
    assert.ok(
      Array.isArray(STUDIO_MODELING_TOOL_DEFINITIONS) &&
        STUDIO_MODELING_TOOL_DEFINITIONS.length >= 19,
      `STUDIO_MODELING_TOOL_DEFINITIONS must expose >= 19 granular CAD & Pin tools (got ${STUDIO_MODELING_TOOL_DEFINITIONS?.length})`
    );
    const toolNames = new Set(STUDIO_MODELING_TOOL_DEFINITIONS.map((t) => t.name));
    for (const requiredTool of [
      'getComponentSnapshot',
      'getPartBounds',
      'listMaterialPresets',
      'setComponentMeta',
      'addPart',
      'updatePart',
      'removePart',
      'attachPart',
      'setPartMaterial',
      'setPartModifier',
      'addPin',
      'addPinRow',
      'setEvaluateScript',
      'testComponentBehavior',
      'setCameraView',
      'setXRayMode'
    ]) {
      assert.ok(toolNames.has(requiredTool), `StudioModelingSDK must define tool "${requiredTool}"`);
    }

    // 3. Programmatically build & self-test a custom 3D sensor + rotor component via StudioModelingSDK
    const sdk = new StudioModelingSDK();
    sdk.clearParts();
    sdk.setComponentMeta({
      typeId: 'custom.laser_turret_node',
      name: 'Laser Distance & Rotor Turret',
      category: 'sensor',
      archetype: 'node',
      width: 2.8,
      height: 1.4,
      depth: 2.4
    });

    const addShroudRes = sdk.addPart({
      id: 'laser_tube',
      primitive: 'tube',
      size: [0.8, 0.6, 0.8],
      materialPreset: 'brushed_aluminum',
      color: '#cbd5e1',
      attach: { to: 'pcb_base', side: 'top', gap: 0, offset: [-0.5, 0, 0] }
    });
    assert.equal(addShroudRes.ok, true);
    assert.ok(
      addShroudRes.bounds.center[1] > 0.2,
      'laser_tube attached to pcb_base.top must resolve positive Y center above PCB'
    );

    sdk.addPart({
      id: 'alarm_led',
      primitive: 'sphere',
      size: [0.3, 0.3, 0.3],
      materialPreset: 'frosted_led',
      color: '#ef4444',
      partRole: 'emissive',
      attach: { to: 'pcb_base', side: 'top', gap: 0, offset: [0.7, 0, 0] }
    });

    sdk.addPart({
      id: 'cooling_rotor',
      primitive: 'cylinder',
      size: [0.6, 0.25, 0.6],
      materialPreset: 'dark_steel',
      color: '#38bdf8',
      partRole: 'rotor',
      attach: { to: 'laser_tube', side: 'top', gap: 0.02, offset: [0, 0, 0] }
    });

    // Generate 1x4 2.54mm header row
    const pinRowRes = sdk.addPinRow({
      prefix: 'J',
      count: 4,
      edge: 'front',
      pitchMm: 2.54,
      labels: ['VCC', 'TRIG', 'OUT', 'GND'],
      types: ['power', 'digital', 'digital', 'ground'],
      directions: ['input', 'input', 'output', 'ground']
    });
    assert.equal(pinRowRes.ok, true);
    assert.equal(pinRowRes.pins.length, 4, 'addPinRow must generate 4 pins at 2.54mm pitch');

    // Set reactive evaluate() script that triggers OUT=5.0V and active=true when distanceCm <= 25
    sdk.setEvaluateScript(`
      const powered = (pins.VCC || 0) >= 3.0;
      const d = Number(stageEnv?.nearestObstacleCm ?? state.distanceCm ?? 100);
      const alert = powered && d <= 25;
      state.active = alert;
      state.energized = alert;
      return {
        OUT: alert ? 5.0 : 0.0
      };
    `);

    // 3A. Self-test with obstacle at 12cm (<= 25cm) -> OUT must be 5.0V, emissiveLit=true, rotorSpinning=true
    const closeTest = sdk.testComponentBehavior({
      pinVoltages: { VCC: 5.0, TRIG: 5.0, GND: 0.0 },
      distanceCm: 12,
      dt: 0.2
    });
    assert.equal(closeTest.ok, true, 'Self-test at 12cm must succeed');
    assert.equal(closeTest.outputVoltages.OUT, 5.0, 'OUT pin must drive 5.0V when obstacle is at 12cm');
    assert.equal(
      closeTest.partAnimations.emissiveLit,
      true,
      'Emissive LED partRole must light up when active'
    );
    assert.equal(
      closeTest.partAnimations.rotorSpinning,
      true,
      'Rotor partRole must spin when active'
    );

    // 3B. Self-test with obstacle at 80cm (> 25cm) -> OUT must drop to 0.0V
    const farTest = sdk.testComponentBehavior({
      pinVoltages: { VCC: 5.0, TRIG: 5.0, GND: 0.0 },
      distanceCm: 80,
      dt: 0.2
    });
    assert.equal(farTest.ok, true);
    assert.equal(farTest.outputVoltages.OUT, 0.0, 'OUT pin must drop to 0.0V when obstacle is at 80cm');

    // 4. Verify CustomComponentStudioPage full-screen controller, Architect prompt execution & Save/Spawn (Task 17.2 & 17.4)
    const reg = new ComponentRegistry();
    registerAllHardware(reg);

    let spawnedSchema = null;
    const mockContainer = {
      hidden: true,
      innerHTML: '',
      classList: {
        add() {},
        remove() {}
      },
      addEventListener() {},
      querySelector() {
        return null;
      }
    };

    const studioPage = new CustomComponentStudioPage({
      container: mockContainer,
      registry: reg,
      onSpawnToWorkbench: (schema) => {
        spawnedSchema = schema;
      }
    });

    studioPage.open({ draft: sdk.getDraft() });
    assert.equal(studioPage.isOpen, true);
    assert.ok(
      mockContainer.innerHTML.includes('data-view="studio"'),
      'CustomComponentStudioPage must render full-screen studio shell'
    );
    assert.ok(
      mockContainer.innerHTML.includes('LIVE PIN') ||
        mockContainer.innerHTML.includes('CANLI PİN'),
      'CustomComponentStudioPage must render the Live Pin & Physics Test Bench'
    );

    // Execute a Studio Architect command and verify automatic self-test
    const archRes = await studioPage.executeArchitectPrompt(
      `studio.addPart({ id: 'extra_cap', primitive: 'cylinder', size: [0.25, 0.35, 0.25], materialPreset: 'brushed_aluminum', attach: { to: 'pcb_base', side: 'top' } });`
    );
    assert.equal(archRes.ok, true, 'Studio Architect code execution must succeed');
    assert.equal(archRes.selfTest.ok, true, 'Studio Architect must automatically run self-test');
    assert.ok(
      studioPage.getDraft().geometry.parts.some((p) => p.id === 'extra_cap'),
      'extra_cap part must be added to draft parts[]'
    );

    // Save & Spawn to Workbench
    const saveRes = await studioPage.saveStudioComponent({ spawnToWorkbench: true });
    assert.equal(saveRes.ok, true, 'saveStudioComponent must validate and register the component');
    assert.ok(
      reg.has('custom.laser_turret_node'),
      'Saved Studio component must be registered in ComponentRegistry'
    );
    assert.equal(
      spawnedSchema?.typeId,
      'custom.laser_turret_node',
      'onSpawnToWorkbench callback must receive the saved component schema'
    );

    // 5. Verify Backend LLM Network Integration (requestStudioModeling -> studio_code -> 6-part Fire-Truck Strobe Lightbar)
    let studioModelingNetworkCalls = 0;
    let capturedStudioPrompt = '';
    const mockBackendForStudio = {
      async requestStudioModeling({ prompt, currentDraft, snapshot }) {
        studioModelingNetworkCalls += 1;
        capturedStudioPrompt = prompt;
        assert.ok(currentDraft && snapshot, 'requestStudioModeling must send currentDraft and snapshot');
        return {
          ok: true,
          model_used: 'qwen2.5-coder:7b',
          thought: 'Sinyal tetiklemeli kırmızı-mavi çakar kubbeli ve döner reflektörlü itfaiye ışığı sentezleniyor.',
          reply: 'Sinyal tetiklemeli İtfaiye Çakar Lambası (custom.fire_truck_beacon) 6 parça ve 4 pin ile oluşturuldu.',
          studio_code: [
            "studio.setComponentMeta({ typeId: 'custom.fire_truck_beacon', name: 'İtfaiye Çakar Lambası (Sinyal Tetiklemeli)', category: 'ACTUATORS', isSceneProp: false });",
            "studio.clearParts({ keepBase: false });",
            "studio.addPart({ id: 'pcb_base', kind: 'rounded_box', size: [3.2, 0.22, 1.5], bevel: 0.08, materialPreset: 'fr4_pcb', color: '#7f1d1d', position: [0, 0, 0] });",
            "studio.addPart({ id: 'lightbar_chassis', kind: 'rounded_box', size: [2.8, 0.24, 1.05], bevel: 0.06, materialPreset: 'brushed_aluminum', color: '#cbd5e1', attach: { to: 'pcb_base', side: 'top', gap: 0, offset: [0, 0, 0] } });",
            "studio.addPart({ id: 'strobe_dome_red', kind: 'capsule', size: [0.68, 0.56, 0.68], materialPreset: 'frosted_led', color: '#ef4444', partRole: 'emissive', attach: { to: 'lightbar_chassis', side: 'top', gap: 0, offset: [-0.82, 0, 0] } });",
            "studio.addPart({ id: 'strobe_dome_blue', kind: 'capsule', size: [0.68, 0.56, 0.68], materialPreset: 'frosted_led', color: '#3b82f6', partRole: 'emissive', attach: { to: 'lightbar_chassis', side: 'top', gap: 0, offset: [0.82, 0, 0] } });",
            "studio.addPart({ id: 'beacon_rotor_reflector', kind: 'cylinder', size: [0.52, 0.36, 0.52], materialPreset: 'gold_pin', color: '#facc15', partRole: 'rotor', attach: { to: 'lightbar_chassis', side: 'top', gap: 0.02, offset: [0, 0, 0] } });",
            "studio.addPart({ id: 'strobe_driver_ic', kind: 'box', size: [0.55, 0.14, 0.42], materialPreset: 'ic_epoxy', color: '#18181b', attach: { to: 'pcb_base', side: 'top', gap: 0, offset: [0, 0, 0.54] } });",
            "studio.addPinRow({ prefix: 'J', count: 4, edge: 'front', pitchMm: 2.54, labels: ['VCC', 'IN', 'OUT', 'GND'], types: ['power', 'digital', 'digital', 'ground'], directions: ['input', 'input', 'output', 'ground'] });",
            "studio.setEvaluateScript(`const vcc = Number(pins.VCC ?? 5.0); const sig = Number(pins.IN ?? 0.0); const active = vcc >= 3.0 && sig >= 2.0; state.active = active; state.energized = active; state.rpm = active ? 360 : 0; return { OUT: active ? 5.0 : 0.0 };`);",
            "studio.testComponentBehavior({ pinVoltages: { VCC: 5.0, IN: 5.0, GND: 0.0 }, distanceCm: 20, dt: 0.25 });"
          ].join('\n')
        };
      }
    };

    const networkedStudioPage = new CustomComponentStudioPage({
      container: mockContainer,
      registry: reg,
      backendClient: mockBackendForStudio
    });
    networkedStudioPage.open();

    const fireRes = await networkedStudioPage.executeArchitectPrompt(
      'bana kendisine gelen sinyalle bir itfaiye ışığı yapar mısın'
    );
    assert.equal(
      studioModelingNetworkCalls,
      1,
      'executeArchitectPrompt must call backendClient.requestStudioModeling over the network when natural language prompt is entered'
    );
    assert.equal(capturedStudioPrompt, 'bana kendisine gelen sinyalle bir itfaiye ışığı yapar mısın');
    assert.equal(fireRes.ok, true);
    assert.equal(fireRes.selfTest.ok, true);
    assert.equal(
      fireRes.selfTest.partAnimations.emissiveLit,
      true,
      'Fire-truck strobe domes must light up during self-test when IN=5V signal is applied'
    );
    assert.equal(
      fireRes.selfTest.partAnimations.rotorSpinning,
      true,
      'Fire-truck central beacon reflector must spin during self-test when IN=5V signal is applied'
    );

    const fireDraft = networkedStudioPage.getDraft();
    assert.equal(fireDraft.typeId, 'custom.fire_truck_beacon');
    assert.equal(fireDraft.geometry.parts.length, 6, 'Fire-truck lightbar must have 6 3D CAD parts');

    const lastMsg = networkedStudioPage.architectMessages[networkedStudioPage.architectMessages.length - 1];
    const fireToolNames = (lastMsg.tools || []).map((t) => t.tool);
    assert.equal(
      fireToolNames.filter((t) => t === 'getPartBounds').length,
      0,
      'Viewport _rebuildStudioMesh must not pollute toolHistory with studio.getPartBounds() calls'
    );
    assert.equal(
      fireToolNames.filter((t) => t === 'testComponentBehavior').length,
      1,
      'testComponentBehavior must appear only once per turn in toolHistory'
    );
  }
);

// ============================================================================
// TEST 48: Faz 18 — Full-Spectrum Custom Component Synthesis, Context-Aware
//          Test Bench, Backend Persistence & Workbench Closed-Loop Interop
// ============================================================================
await test(
  '48. Faz 18: Context-Aware Test Bench (No irrelevant distance slider on signal components), Backend Save & Full Workbench Closed-Loop Interoperability (Task 18.1 - 18.4)',
  async () => {
    const { CustomComponentStudioPage } = await import('../src/ui/studio/CustomComponentStudioPage.js');
    const { searchCapabilities } = await import('../src/core/ai/CapabilityIndex.js');

    const studioRegistry = new ComponentRegistry();
    registerAllHardware(studioRegistry);

    let savedPayloads = [];
    let spawnedTypeId = null;
    let saveCallbackCount = 0;

    const mockStudioBackend = {
      async requestStudioModeling({ prompt }) {
        return {
          ok: true,
          model_used: 'Qwen/Qwen2.5-Coder-32B-Instruct',
          thought: 'İtfaiye çakar tepe lambası için IN sinyaline duyarlı 3B CAD ve iç dipol modeli sentezleniyor.',
          summary: 'İtfaiye Çakar Tepe Lambası (`custom.fire_truck_beacon`) oluşturuldu.',
          studio_code: `
            studio.setComponentMeta({
              typeId: 'custom.fire_truck_beacon',
              name: 'İtfaiye Çakar Tepe Lambası (Dual Strobe Lightbar)',
              category: 'actuators',
              isEnvironmentProp: false,
              summary: 'IN pinine gelen dijital/PWM sinyali (>= 2.0V) ile aktifleşen kırmızı/mavi çift kubbeli ve döner reflektörlü 3B itfaiye çakar modülü.',
              dimensions: [20, 2.0, 12]
            });
            studio.clearParts();
            studio.addPart({ id: 'pcb_base', primitive: 'rounded_box', size: [20, 2.0, 12], radius: 0.6, materialPreset: 'fr4_pcb_red' });
            studio.addPart({ id: 'lightbar_chassis', primitive: 'rounded_box', size: [16.4, 1.4, 7.6], radius: 0.4, attach: { to: 'pcb_base', side: 'top', gap: 0, offset: [0, 0, -0.6] }, materialPreset: 'brushed_aluminum' });
            studio.addPart({ id: 'red_strobe_dome', primitive: 'capsule', size: [4.2, 4.4, 4.2], attach: { to: 'lightbar_chassis', side: 'top', gap: 0, offset: [-4.6, 0, 0] }, materialPreset: 'frosted_led', color: '#EF4444', partRole: 'emissive' });
            studio.addPart({ id: 'blue_strobe_dome', primitive: 'capsule', size: [4.2, 4.4, 4.2], attach: { to: 'lightbar_chassis', side: 'top', gap: 0, offset: [4.6, 0, 0] }, materialPreset: 'frosted_led', color: '#3B82F6', partRole: 'emissive' });
            studio.addPart({ id: 'center_siren_rotor', primitive: 'cylinder', size: [3.2, 3.0, 3.2], attach: { to: 'lightbar_chassis', side: 'top', gap: 0, offset: [0, 0, 0] }, materialPreset: 'gold_pin', partRole: 'rotor', spinAxis: 'y' });
            studio.addPart({ id: 'driver_ic', primitive: 'rounded_box', size: [5.2, 1.2, 3.0], radius: 0.2, attach: { to: 'pcb_base', side: 'top', gap: 0, offset: [0, 0, 4.2] }, materialPreset: 'ic_epoxy' });
            studio.addPinRow({ prefix: 'P', count: 4, pitch: 2.54, edge: 'bottom', names: ['VCC', 'GND', 'IN', 'OUT'], directions: ['power', 'ground', 'input', 'output'] });
            studio.setInternalDipoles([
              { pinA: 'VCC', pinB: 'GND', resistance: 1000 },
              { pinA: 'IN', pinB: 'GND', resistance: 1000 }
            ]);
            studio.setTestControls([]);
            studio.setEvaluateScript(\`const vcc = Number(pins.VCC?.voltage ?? 5.0);
const inV = Math.max(Number(pins.IN?.voltage ?? 0), Number(pins.TRIG?.voltage ?? 0));
const isTriggered = vcc >= 2.5 && inV >= 2.0;
state.phase = ((Number(state.phase) || 0) + (Number(dt) || 0.05) * 10) % (Math.PI * 2);
state.active = isTriggered;
state.rpm = isTriggered ? 960 : 0;
const outV = isTriggered ? 5.0 : 0.0;
return {
  outputs: { OUT: { voltage: outV, logicLevel: isTriggered ? 1 : 0 } },
  state: { active: isTriggered, rpm: state.rpm }
};\`);
            studio.testComponentBehavior({ pinVoltages: { VCC: 5.0, GND: 0.0, IN: 5.0 }, dt: 0.05 });
          `
        };
      },
      async saveCustomComponent(schemaPayload) {
        savedPayloads.push(schemaPayload);
        return {
          id: 88,
          part_number: 'FIRE_TRUCK_BEACON',
          name: schemaPayload.name,
          category: schemaPayload.category,
          pinout: schemaPayload.pins,
          internal_dipoles: schemaPayload.dipoles,
          electrical_specs: {
            typeId: schemaPayload.typeId,
            isEnvironmentProp: schemaPayload.isEnvironmentProp,
            evaluateScript: schemaPayload.evaluateScript,
            testControls: schemaPayload.testControls || []
          },
          mesh_recipe: {
            v2_spec: schemaPayload
          }
        };
      }
    };

    const mockDom = {
      hidden: true,
      innerHTML: '',
      classList: { add: () => {}, remove: () => {} },
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {}
    };

    const studioPage = new CustomComponentStudioPage({
      container: mockDom,
      registry: studioRegistry,
      backendClient: mockStudioBackend,
      onSaveComponent: () => {
        saveCallbackCount += 1;
      },
      onSpawnToWorkbench: (savedSchema) => {
        spawnedTypeId = savedSchema.typeId;
      }
    });
    studioPage.open();

    // 1. Task 18.1: Distance slider MUST be shown on threshold_sensor_node (uses stageEnv.nearestObstacleCm), and hidden on logic_inverter_gate
    studioPage.loadTemplate('threshold_sensor_node');
    assert.equal(
      studioPage._getActiveTestControls().some((c) => c.key === 'nearestObstacleCm'),
      true,
      'Threshold sensor preset must expose nearestObstacleCm slider in Test Bench'
    );
    assert.equal(
      mockDom.innerHTML.includes('data-field="test-distance-cm"'),
      true,
      'Test Bench HTML must render distance slider when component script reads stageEnv.nearestObstacleCm'
    );
    studioPage.loadTemplate('logic_inverter_gate');
    assert.equal(
      studioPage._getActiveTestControls().length,
      0,
      'logic_inverter_gate template must NOT expose irrelevant distance slider'
    );
    assert.equal(
      mockDom.innerHTML.includes('data-field="test-distance-cm"'),
      false,
      'Test Bench HTML must NOT render distance slider for logic_inverter_gate'
    );

    // 2. Task 18.1: Synthesize Fire-Truck Lightbar -> Distance slider MUST disappear automatically!
    await studioPage.executeArchitectPrompt('bana kendisine gelen sinyalle bir itfaiye ışığı yapar mısın');
    assert.equal(
      studioPage._getActiveTestControls().length,
      0,
      'Signal-driven Fire-Truck Lightbar must have 0 environmental sliders in Test Bench'
    );
    assert.equal(
      mockDom.innerHTML.includes('data-field="test-distance-cm"'),
      false,
      'Test Bench HTML must NOT render irrelevant Sanal Engel Mesafesi slider for signal-driven lightbar'
    );

    // 3. Task 18.1: Dynamic environmental control detection for temperature sensor (stageEnv.temperatureC)
    studioPage.sdk.setTestControls([
      { key: 'temperatureC', label: 'Sıcaklık (°C)', min: -20, max: 100, step: 1, defaultValue: 25, unit: '°C' }
    ]);
    studioPage.render();
    assert.equal(
      mockDom.innerHTML.includes('data-test-env-key="temperatureC"'),
      true,
      'Test Bench HTML must dynamically render temperatureC slider when configured via studio.setTestControls'
    );
    studioPage.sdk.setTestControls([]);
    studioPage.render();

    // 4. Task 18.3 & 18.4: Save to Backend + Register + Spawn to Workbench + AI Capability Discovery
    await studioPage.saveStudioComponent({ spawnToWorkbench: true });
    assert.equal(savedPayloads.length, 1, 'saveCustomComponent must be called on backendClient');
    assert.equal(saveCallbackCount, 1, 'onSaveComponent callback must fire');
    assert.equal(spawnedTypeId, 'custom.fire_truck_beacon', 'onSpawnToWorkbench must pass custom.fire_truck_beacon');
    assert.equal(
      studioRegistry.has('custom.fire_truck_beacon'),
      true,
      'ComponentRegistry must immediately contain custom.fire_truck_beacon'
    );

    const searchRes = searchCapabilities({ query: 'itfaiye', category: 'all' }, studioRegistry);
    assert.equal(
      searchRes.components.some((m) => m.typeId === 'custom.fire_truck_beacon'),
      true,
      'AI CapabilityIndex searchCapabilities must discover custom.fire_truck_beacon for Workbench AI wiring'
    );

    // 5. Task 18.2 & 18.4: Full Workbench Closed-Loop Interoperability
    //    Arduino UNO -> custom.fire_truck_beacon -> Resistor -> LED
    const uno = studioRegistry.create('board.arduino_uno', { id: 'uno_main' });
    const beacon = studioRegistry.create('custom.fire_truck_beacon', { id: 'beacon_1' });
    const resistor = studioRegistry.create('passive.resistor', { id: 'r_load', resistanceOhms: 220 });
    const statusLed = studioRegistry.create('led.single', { id: 'led_status' });

    // Verify internal dipoles on beacon include both VCC-GND and IN-GND
    const dipolePairs = beacon.internalDipoles.map((d) => `${d.pinA}-${d.pinB}`);
    assert.equal(
      dipolePairs.includes('VCC-GND') && dipolePairs.includes('IN-GND'),
      true,
      `DynamicHardwareComponent must register internal ConductiveDipoles for both VCC-GND and IN-GND (got ${JSON.stringify(dipolePairs)})`
    );

    const components = [uno, beacon, resistor, statusLed];
    const connections = [
      { id: 'w_vcc', from: 'uno_main.5V', to: 'beacon_1.VCC' },
      { id: 'w_gnd', from: 'uno_main.GND', to: 'beacon_1.GND' },
      { id: 'w_sig', from: 'uno_main.PIN9', to: 'beacon_1.IN' },
      { id: 'w_out', from: 'beacon_1.OUT', to: 'r_load.LEAD_A' },
      { id: 'w_res_led', from: 'r_load.LEAD_B', to: 'led_status.ANODE' },
      { id: 'w_led_gnd', from: 'led_status.CATHODE', to: 'uno_main.GND' }
    ];

    const solver = new CircuitFlowSolver();

    // State A: Arduino UNO PIN9 is LOW (0V), while 5V->VCC and GND->GND are connected
    uno.drivePin('PIN9', false);
    solver.solve({ components, connections, dt: 0.05 });
    beacon.onTick(0.1);

    assert.equal(
      beacon.state.active,
      false,
      'When Arduino PIN9 is LOW (0V), beacon.state.active must be false even though VCC/GND power loop is energized'
    );
    assert.equal(
      beacon.state.rpm,
      0,
      'When Arduino PIN9 is LOW (0V), beacon rotor rpm must be 0'
    );
    assert.equal(
      beacon.getPin('OUT').voltage,
      0,
      'When Arduino PIN9 is LOW (0V), beacon OUT pin must be 0V'
    );
    assert.equal(
      statusLed.state.brightness,
      0,
      'Downstream LED connected to beacon OUT must remain off when PIN9 is LOW'
    );

    const redDomeOff =
      beacon._roleParts?.emissive?.[0]?.mesh || beacon.group.getObjectByName('part_red_strobe_dome');
    assert.equal(
      redDomeOff.material.emissiveIntensity,
      0,
      'Emissive strobe dome must NOT glow when IN=0V'
    );

    // State B: Arduino UNO PIN9 is driven HIGH (5.0V)
    uno.drivePin('PIN9', true);
    solver.solve({ components, connections, dt: 0.05 });
    beacon.onTick(0.1);

    assert.equal(
      beacon.state.active,
      true,
      'When Arduino PIN9 is HIGH (5.0V), beacon.state.active must become true'
    );
    assert.equal(
      beacon.state.rpm,
      960,
      'When Arduino PIN9 is HIGH (5.0V), beacon rotor rpm must become 960'
    );
    assert.equal(
      beacon.getPin('OUT').voltage,
      5.0,
      'When Arduino PIN9 is HIGH (5.0V), beacon OUT pin must drive 5.0V'
    );
    assert.equal(
      redDomeOff.material.emissiveIntensity >= 1.0,
      true,
      'Emissive strobe dome must glow brightly (emissiveIntensity >= 1.0) when IN=5.0V'
    );
    const sirenRotor =
      beacon._roleParts?.rotor?.[0]?.mesh || beacon.group.getObjectByName('part_center_siren_rotor');
    assert.equal(
      Math.abs(sirenRotor.rotation.y) > 0.1,
      true,
      'Central rotor reflector must physically spin on 3D mesh when IN=5.0V'
    );
    assert.equal(
      statusLed.state.brightness > 0.7,
      true,
      `Downstream LED driven by beacon OUT pin must light up (got brightness=${statusLed.state.brightness})`
    );

    // State C: 2-wire Workbench connection (only PIN9 -> IN and GND -> GND, VCC left unconnected)
    const beacon2Wire = studioRegistry.create('custom.fire_truck_beacon', { id: 'beacon_2wire' });
    const connections2Wire = [
      { id: 'w2_sig', from: 'uno_main.PIN9', to: 'beacon_2wire.IN' },
      { id: 'w2_gnd', from: 'uno_main.GND', to: 'beacon_2wire.GND' }
    ];
    uno.drivePin('PIN9', true);
    solver.solve({ components: [uno, beacon2Wire], connections: connections2Wire, dt: 0.05 });
    beacon2Wire.onTick(0.1);
    assert.equal(
      beacon2Wire.state.active,
      true,
      'Beacon must also activate in 2-wire Workbench mode (PIN9 -> IN, GND -> GND) via default logic rail fallback'
    );
  }
);

// ============================================================================
// TEST 49: Per-Component /studio/<slug> URL Routing, Student-Friendly Terminology
//          (Zero "ReactFlow" Jargon), Full TR/EN Localization & Global Header
//          (Theme / Locale / Account / Credits) Controls
// ============================================================================
await test(
  '49. Studio UX & Routing: /studio/<slug> Per-Component URLs, Multi-Component Switcher, Zero ReactFlow Jargon, Full TR/EN Localization & Header Account/Theme/Locale Controls',
  async () => {
    const { AppRouter } = await import('../src/core/router/AppRouter.js');
    const { CustomComponentStudioPage } = await import('../src/ui/studio/CustomComponentStudioPage.js');
    const { STUDIO_TEMPLATES } = await import('../src/ui/workbench/ComponentPalettePopover.js');
    const { ComponentRegistry } = await import('../src/core/registry/ComponentRegistry.js');
    const { i18n } = await import('../src/core/i18n/I18nService.js');
    const { themeService } = await import('../src/core/theme/ThemeService.js');

    // 1. Verify AppRouter resolves /studio/<slug> and /component-studio/<slug>
    const baseStudioRoute = AppRouter.resolveRoute('/studio');
    assert.equal(baseStudioRoute.view, 'studio');
    assert.equal(baseStudioRoute.componentSlug, null);
    assert.equal(baseStudioRoute.href, '/studio');

    const slugStudioRoute = AppRouter.resolveRoute('/studio/fire-truck-beacon');
    assert.equal(slugStudioRoute.view, 'studio');
    assert.equal(slugStudioRoute.componentSlug, 'fire-truck-beacon');
    assert.equal(slugStudioRoute.href, '/studio/fire-truck-beacon');

    const aliasStudioRoute = AppRouter.resolveRoute('/component-studio/rotor-fan-module');
    assert.equal(aliasStudioRoute.view, 'studio');
    assert.equal(aliasStudioRoute.componentSlug, 'rotor-fan-module');
    assert.equal(aliasStudioRoute.href, '/studio/rotor-fan-module');

    const hashStudioRoute = AppRouter.resolveRoute('/', '', '#/studio/ozel-modul-1');
    assert.equal(hashStudioRoute.view, 'studio');
    assert.equal(hashStudioRoute.componentSlug, 'ozel-modul-1');
    assert.equal(hashStudioRoute.href, '/studio/ozel-modul-1');

    // 2. Verify STUDIO_TEMPLATES has localized TR/EN metadata and zero "ReactFlow" jargon
    for (const [tplKey, tpl] of Object.entries(STUDIO_TEMPLATES)) {
      assert.equal(typeof tpl.nameTr, 'string', `Template ${tplKey} must have nameTr`);
      assert.equal(typeof tpl.nameEn, 'string', `Template ${tplKey} must have nameEn`);
      assert.equal(
        /reactflow/i.test(tpl.nameTr + ' ' + tpl.summaryTr + ' ' + tpl.descriptionTr),
        false,
        `Template ${tplKey} TR copy must not contain internal developer jargon "ReactFlow"`
      );
      assert.equal(
        /reactflow/i.test(tpl.nameEn + ' ' + tpl.summaryEn + ' ' + tpl.descriptionEn),
        false,
        `Template ${tplKey} EN copy must not contain internal developer jargon "ReactFlow"`
      );
    }

    // 3. Verify CustomComponentStudioPage per-component URL routing, multi-component creation & switching
    const prevLocale = i18n.getLocale();
    i18n.setLocale('tr');

    const studioRegistry = new ComponentRegistry();
    const routeHistory = [];
    let authModalOpenedWith = null;
    let dashboardOpened = false;
    let creditStoreOpened = false;
    let logoutCalled = false;

    const mockContainer = {
      hidden: true,
      innerHTML: '',
      classList: { add: () => {}, remove: () => {} },
      querySelector: () => null,
      addEventListener: () => {}
    };

    const studioPage = new CustomComponentStudioPage({
      container: mockContainer,
      registry: studioRegistry,
      themeService,
      sessionUser: null,
      credits: null,
      onRouteChange: (slug) => {
        routeHistory.push(`/studio/${slug}`);
      },
      onOpenAuthModal: (tab) => {
        authModalOpenedWith = tab;
      },
      onOpenDashboard: () => {
        dashboardOpened = true;
      },
      onOpenCreditStore: () => {
        creditStoreOpened = true;
      },
      onLogout: () => {
        logoutCalled = true;
      }
    });

    // Open directly with a componentSlug (/studio/rotor-fan-module)
    studioPage.open({ componentSlug: 'rotor-fan-module' });
    assert.equal(studioPage.getComponentSlug(), 'rotor-fan-module');
    assert.equal(routeHistory[routeHistory.length - 1], '/studio/rotor-fan-module');
    assert.equal(
      mockContainer.innerHTML.includes('/studio/rotor-fan-module'),
      true,
      'Rendered Studio header must display the active component URL /studio/rotor-fan-module'
    );

    // Create a brand new component (+ Yeni Bileşen) and verify unique slug & URL update
    const createdDraft = studioPage.createNewComponent();
    const createdSlug = studioPage.getComponentSlug(createdDraft);
    assert.equal(
      createdSlug.startsWith('ozel-modul-'),
      true,
      `New component in TR mode must get a clean slug starting with ozel-modul- (got ${createdSlug})`
    );
    assert.equal(
      routeHistory[routeHistory.length - 1],
      `/studio/${createdSlug}`,
      'Creating a new component must update the browser route to /studio/<new-slug>'
    );

    // Save the custom component and switch back to a template via openComponentBySlug, then back to saved custom component
    await studioPage.saveStudioComponent();
    studioPage.openComponentBySlug('logic-inverter-gate');
    assert.equal(studioPage.getComponentSlug(), 'logic-inverter-gate');
    assert.equal(routeHistory[routeHistory.length - 1], '/studio/logic-inverter-gate');

    studioPage.openComponentBySlug(createdSlug);
    assert.equal(studioPage.getComponentSlug(), createdSlug);
    assert.equal(routeHistory[routeHistory.length - 1], `/studio/${createdSlug}`);

    // 4. Verify ZERO "ReactFlow" jargon in rendered Studio HTML & Student/Electronics-friendly Turkish labels
    studioPage.openComponentBySlug('threshold-sensor-node');
    const trHtml = mockContainer.innerHTML;
    assert.equal(
      /reactflow/i.test(trHtml),
      false,
      'Studio HTML must NOT contain "ReactFlow" developer jargon anywhere'
    );
    assert.equal(
      trHtml.includes('Pinli Elektronik Modül'),
      true,
      'Studio in TR mode must display student-friendly "Pinli Elektronik Modül"'
    );
    assert.equal(
      trHtml.includes('Pinsiz Sahne Nesnesi'),
      true,
      'Studio in TR mode must display student-friendly "Pinsiz Sahne Nesnesi"'
    );
    assert.equal(
      trHtml.includes('4. BİLEŞEN ÇALIŞMA MANTIĞI (SİNYAL & ÇIKIŞ KODU)'),
      true,
      'Studio in TR mode must display clear Turkish behavior section title'
    );
    assert.equal(
      trHtml.includes('Yuvarlatılmış Kutu (PCB / Gövde)') &&
        trHtml.includes('FR4 Devre Kartı (Yeşil)') &&
        trHtml.includes('Üst Yüzey (+Y)') &&
        trHtml.includes('Işıklı Parça / LED (Emissive)'),
      true,
      'Studio in TR mode must localize CAD primitive, PBR material, attach surface, and partRole options'
    );

    // 5. Verify Global Header Controls (Guest Auth buttons, Authenticated Account & Credit pills, Locale & Theme toggles)
    assert.equal(
      trHtml.includes('id="studio-btn-open-auth"') &&
        trHtml.includes('id="studio-btn-open-register"') &&
        trHtml.includes('id="studio-btn-toggle-locale"') &&
        trHtml.includes('id="studio-btn-toggle-theme"'),
      true,
      'Guest mode in /studio must render Sign In, Register, Language Switcher, and Dark/Light Theme buttons in header'
    );

    // Switch to authenticated user with credits
    studioPage.setSessionUser({ id: 7, name: 'Savaş Çelik', email: 'savas@example.com' });
    studioPage.setCredits({ balance: 42 });
    const authedHtml = mockContainer.innerHTML;
    assert.equal(
      authedHtml.includes('id="studio-btn-open-account"') &&
        authedHtml.includes('Savaş Çelik') &&
        authedHtml.includes('id="studio-btn-open-credits"') &&
        authedHtml.includes('42 Kredi') &&
        authedHtml.includes('id="studio-btn-logout"'),
      true,
      'Authenticated mode in /studio must render user account pill, credit balance badge, and logout button in header'
    );

    // Verify switching locale to EN updates Studio UI to English cleanly
    i18n.setLocale('en');
    const enHtml = mockContainer.innerHTML;
    assert.equal(
      enHtml.includes('Electronic Module (With Pins)') &&
        enHtml.includes('Stage Object (No Pins)') &&
        enHtml.includes('4. COMPONENT BEHAVIOR LOGIC (SIGNAL & OUTPUT CODE)') &&
        enHtml.includes('42 Credits'),
      true,
      'Switching locale to EN must immediately re-render /studio with full English terminology'
    );

    // Verify theme toggle updates theme attribute
    const initialTheme = themeService.getTheme();
    themeService.toggleTheme();
    assert.notEqual(themeService.getTheme(), initialTheme, 'ThemeService must toggle between dark and light');
    themeService.setTheme(initialTheme);

    // 6. Verify executeArchitectPrompt sends full `tools` catalog (`STUDIO_MODELING_TOOL_DEFINITIONS`) + round metadata and synthesizes distinct Police Siren
    let capturedStudioRequest = null;
    studioPage.backendClient = {
      async requestStudioModeling(payload) {
        capturedStudioRequest = payload;
        return {
          ok: true,
          round: payload.round,
          max_rounds: payload.maxRounds,
          thought: 'Polis sireni modülü için korna konisi ve flaşörler tasarlanıyor.',
          summary: 'Polis Siren Modülü oluşturuldu.',
          studio_code: '',
          tool_calls: []
        };
      }
    };
    const sirenTurn = await studioPage.executeArchitectPrompt('bana bir polis siren komponenti yapar mısın');
    assert.equal(sirenTurn.ok, true, 'Police siren architect prompt must succeed');
    assert.ok(
      Array.isArray(capturedStudioRequest?.tools) && capturedStudioRequest.tools.length >= 22,
      'requestStudioModeling payload must include the 22+ StudioModelingSDK tool definitions'
    );
    assert.equal(capturedStudioRequest?.round, 1, 'requestStudioModeling payload must include round metadata');
    assert.equal(
      sirenTurn.draft.typeId,
      'custom.police_siren_module',
      'Police siren prompt must synthesize distinct custom.police_siren_module (not fire_truck_beacon)'
    );

    // Restore locale
    i18n.setLocale(prevLocale);
    studioPage.destroy();
  }
);

console.log(`\n🎉 ALL ${passed} ARCHITECTURE & INHERITANCE TESTS PASSED!\n`);
