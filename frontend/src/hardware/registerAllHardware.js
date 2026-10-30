import { hardwareRegistry } from '../core/registry/ComponentRegistry.js';
import { ArduinoUnoBoard } from './boards/ArduinoUnoBoard.js';
import { ESP32DevKitBoard } from './boards/ESP32DevKitBoard.js';
import { JetsonNanoBoard } from './boards/JetsonNanoBoard.js';
import { BreadboardComponent } from './boards/BreadboardComponent.js';
import { SingleLEDComponent } from './leds/SingleLEDComponent.js';
import { AxialResistorComponent } from './passives/AxialResistorComponent.js';
import { JumperWireComponent } from './passives/JumperWireComponent.js';
import { TactilePushButton } from './buttons/TactilePushButton.js';
import { ArcadeCapButton } from './buttons/ArcadeCapButton.js';
import { PotentiometerComponent } from './sensors/PotentiometerComponent.js';
import { UltrasonicSensorComponent } from './sensors/UltrasonicSensorComponent.js';
import { Imx219CsiCameraModule } from './sensors/Imx219CsiCameraModule.js';
import { Vl53l1xLaserTofComponent } from './sensors/Vl53l1xLaserTofComponent.js';
import { Tcrt5000LineSensorArray } from './sensors/Tcrt5000LineSensorArray.js';
import { PiezoBuzzerComponent } from './audio/PiezoBuzzerComponent.js';
import { DCMotorComponent } from './motors/DCMotorComponent.js';
import { ServoMotorComponent } from './motors/ServoMotorComponent.js';
import { N20GearmotorWheelComponent } from './motors/N20GearmotorWheelComponent.js';
import { MecanumWheelMotorComponent } from './motors/MecanumWheelMotorComponent.js';
import { PanTiltCameraGimbalComponent } from './motors/PanTiltCameraGimbalComponent.js';
import { L298NDualBridgeDriver } from './drivers/L298NDualBridgeDriver.js';
import { LiPoBatteryPack3S } from './power/LiPoBatteryPack3S.js';
import { Ina219PowerTelemetryBay } from './power/Ina219PowerTelemetryBay.js';
import { Ssd1306OledDisplayComponent } from './displays/Ssd1306OledDisplayComponent.js';
import { SumoChassisPlateComponent } from './robotics/SumoChassisPlateComponent.js';
import { SumoDozerBladeComponent } from './robotics/SumoDozerBladeComponent.js';
import { SumoCarbonArmorHoodComponent } from './robotics/SumoCarbonArmorHoodComponent.js';
import { MecanumRoverChassisDeckComponent } from './robotics/MecanumRoverChassisDeckComponent.js';
import { CsiRibbonHarnessComponent } from './robotics/CsiRibbonHarnessComponent.js';
import { AutonomousSumoRobotComponent } from './robotics/AutonomousSumoRobotComponent.js';
import { JetsonVisionRoverComponent } from './robotics/JetsonVisionRoverComponent.js';
import { ObstacleWallProp } from './props/ObstacleWallProp.js';
import { ToyBearProp } from './props/ToyBearProp.js';

export const ALL_HARDWARE_CLASSES = [
  ArduinoUnoBoard,
  ESP32DevKitBoard,
  JetsonNanoBoard,
  BreadboardComponent,
  SingleLEDComponent,
  AxialResistorComponent,
  JumperWireComponent,
  TactilePushButton,
  ArcadeCapButton,
  PotentiometerComponent,
  UltrasonicSensorComponent,
  Imx219CsiCameraModule,
  Vl53l1xLaserTofComponent,
  Tcrt5000LineSensorArray,
  PiezoBuzzerComponent,
  DCMotorComponent,
  ServoMotorComponent,
  N20GearmotorWheelComponent,
  MecanumWheelMotorComponent,
  PanTiltCameraGimbalComponent,
  L298NDualBridgeDriver,
  LiPoBatteryPack3S,
  Ina219PowerTelemetryBay,
  Ssd1306OledDisplayComponent,
  SumoChassisPlateComponent,
  SumoDozerBladeComponent,
  SumoCarbonArmorHoodComponent,
  MecanumRoverChassisDeckComponent,
  CsiRibbonHarnessComponent,
  AutonomousSumoRobotComponent,
  JetsonVisionRoverComponent,
  ObstacleWallProp,
  ToyBearProp
];

/**
 * Registers all built-in hardware component classes into the given registry
 * (defaults to the singleton `hardwareRegistry`).
 * Safe to call multiple times (idempotent).
 */
export function registerAllHardware(registry = hardwareRegistry) {
  for (const ComponentClass of ALL_HARDWARE_CLASSES) {
    if (!registry.has(ComponentClass.typeId)) {
      registry.register(ComponentClass);
    }
  }
  return registry;
}

// Auto-register on module import so `hardwareRegistry` is always ready
registerAllHardware(hardwareRegistry);
