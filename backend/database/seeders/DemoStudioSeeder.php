<?php

namespace Database\Seeders;

use App\Models\CircuitScenario;
use App\Models\CustomComponent;
use App\Models\DatasheetCache;
use App\Models\StudyGroup;
use App\Models\StudyGroupMember;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoStudioSeeder extends Seeder
{
    public function run(): void
    {
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        // 1. Seed Admin, Judge & Demo Maker users
        $admin = User::query()->updateOrCreate(
            ['email' => 'admin@nebius-hackathon.local'],
            [
                'name' => 'Nebius Studio Admin',
                'password' => Hash::make('admin-nebius-2026'),
                'email_verified_at' => now(),
            ]
        );
        $admin->syncRoles(['admin']);
        $admin->ensureInitialCreditGrant();

        $judge = User::query()->updateOrCreate(
            ['email' => 'judge@nebius-hackathon.local'],
            [
                'name' => 'Hackathon Judge #1',
                'password' => Hash::make('judge-nebius-2026'),
                'email_verified_at' => now(),
            ]
        );
        $judge->syncRoles(['judge']);
        $judge->ensureInitialCreditGrant();

        $maker = User::query()->updateOrCreate(
            ['email' => 'maker@nebius-hackathon.local'],
            [
                'name' => 'Ada Lovelace (Maker)',
                'password' => Hash::make('maker-nebius-2026'),
                'email_verified_at' => now(),
            ]
        );
        $maker->syncRoles(['free']);
        $maker->ensureInitialCreditGrant();

        // 2. Seed sample open study group: "Açık Donanım Atölyesi"
        $group = StudyGroup::query()->updateOrCreate(
            ['slug' => 'acik-donanim-atolyesi'],
            [
                'owner_id' => $judge->id,
                'name' => 'Açık Donanım Atölyesi',
                'description' => 'Arduino Uno, ESP32 ve NVIDIA Jetson Nano üzerinde 3B devre doğrulama, Nemotron AI tanı ve sensör paylaşım atölyesi.',
                'invite_code' => 'LAB-NEBIUS26',
                'is_public' => true,
            ]
        );

        StudyGroupMember::query()->updateOrCreate(
            ['study_group_id' => $group->id, 'user_id' => $judge->id],
            ['member_role' => 'owner', 'joined_at' => now()]
        );

        StudyGroupMember::query()->updateOrCreate(
            ['study_group_id' => $group->id, 'user_id' => $maker->id],
            ['member_role' => 'member', 'joined_at' => now()]
        );

        // 3. Seed 5 pre-cached popular Tavily sensor datasheets + Custom Components
        $sensors = $this->popularSensorDatasheets();

        foreach ($sensors as $sensor) {
            $partKey = DatasheetCache::normalizePartKey($sensor['part_number']);

            DatasheetCache::query()->updateOrCreate(
                ['part_key' => $partKey],
                [
                    'query_text' => "{$partKey} sensor module pinout voltage electrical characteristics datasheet",
                    'tavily_results' => [
                        [
                            'title' => "{$partKey} Technical Datasheet & Pinout Reference",
                            'url' => $sensor['source_url'],
                            'content' => $sensor['tavily_summary'],
                        ],
                    ],
                    'synthesized_schema' => $sensor['schema'],
                    'source_url' => $sensor['source_url'],
                    'hits_count' => 1,
                    'expires_at' => now()->addDays(90),
                ]
            );

            CustomComponent::query()->updateOrCreate(
                ['slug' => 'sensor-' . strtolower($partKey)],
                [
                    'user_id' => $judge->id,
                    'study_group_id' => $group->id,
                    'part_number' => $partKey,
                    'name' => $sensor['schema']['name'],
                    'category' => $sensor['schema']['category'],
                    'visibility' => 'public',
                    'pinout' => $sensor['schema']['pinout'],
                    'electrical_specs' => $sensor['schema']['electrical_specs'],
                    'internal_dipoles' => $sensor['schema']['internal_dipoles'],
                    'mesh_recipe' => $sensor['schema']['mesh_recipe'],
                    'datasheet_url' => $sensor['source_url'],
                ]
            );
        }

        // 4. Seed 3 ready-to-run shared 3D Circuit Scenarios (CircuitScenarioSchema v2)
        $scenarios = $this->demoCircuitScenarios($judge->id, $maker->id, $group->id);

        foreach ($scenarios as $scenarioData) {
            CircuitScenario::query()->updateOrCreate(
                ['slug' => $scenarioData['slug']],
                $scenarioData
            );
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function popularSensorDatasheets(): array
    {
        return [
            [
                'part_number' => 'MPU6050',
                'source_url' => 'https://invensense.tdk.com/products/motion-tracking/6-axis/mpu-6050/',
                'tavily_summary' => 'MPU-6050 6-axis MEMS MotionTracking device combining 3-axis gyroscope and 3-axis accelerometer. Operating voltage 2.375V-3.46V (GY-521 breakout includes 3.3V LDO regulator for 3.3V-5V VCC). I2C address 0x68 (AD0=LOW) or 0x69 (AD0=HIGH). Pins: VCC, GND, SCL, SDA, XDA, XCL, AD0, INT.',
                'schema' => [
                    'part_number' => 'MPU6050',
                    'name' => 'MPU6050 6-Axis IMU (Accelerometer + Gyroscope)',
                    'category' => 'sensor',
                    'description' => 'I2C 6-eksen ivmeölçer ve jiroskop modülü (GY-521).',
                    'pinout' => [
                        ['id' => 'VCC', 'label' => 'VCC', 'type' => 'power', 'voltage_min' => 3.3, 'voltage_max' => 5.0],
                        ['id' => 'GND', 'label' => 'GND', 'type' => 'ground', 'voltage_min' => 0.0, 'voltage_max' => 0.0],
                        ['id' => 'SCL', 'label' => 'SCL', 'type' => 'i2c', 'voltage_min' => 0.0, 'voltage_max' => 3.6],
                        ['id' => 'SDA', 'label' => 'SDA', 'type' => 'i2c', 'voltage_min' => 0.0, 'voltage_max' => 3.6],
                        ['id' => 'AD0', 'label' => 'AD0', 'type' => 'digital', 'voltage_min' => 0.0, 'voltage_max' => 3.6],
                        ['id' => 'INT', 'label' => 'INT', 'type' => 'digital', 'voltage_min' => 0.0, 'voltage_max' => 3.6],
                    ],
                    'electrical_specs' => [
                        'supply_voltage_min_v' => 3.3,
                        'supply_voltage_max_v' => 5.0,
                        'max_current_ma' => 3.9,
                        'interface' => 'I2C (0x68 / 0x69)',
                    ],
                    'internal_dipoles' => [
                        ['pinA' => 'VCC', 'pinB' => 'GND', 'resistance_ohms' => 10000],
                    ],
                    'mesh_recipe' => [
                        'package_type' => 'breakout_pcb',
                        'dimensions_mm' => [20.0, 16.0, 3.0],
                        'primary_color' => '#1d4ed8',
                        'pin_pitch_mm' => 2.54,
                    ],
                ],
            ],
            [
                'part_number' => 'DHT22',
                'source_url' => 'https://www.sparkfun.com/datasheets/Sensors/Temperature/DHT22.pdf',
                'tavily_summary' => 'DHT22 (AM2302) capacitive humidity and thermistor digital temperature sensor. Supply voltage 3.3V to 5.5V DC. Single-wire digital signal output (requires 4.7k-10k pull-up resistor to VCC). Pins: 1-VCC, 2-DATA, 3-NC, 4-GND.',
                'schema' => [
                    'part_number' => 'DHT22',
                    'name' => 'DHT22 Digital Temperature & Humidity Sensor',
                    'category' => 'sensor',
                    'description' => 'Hassas dijital sıcaklık (-40..+80°C) ve bağıl nem (%0..100) sensörü.',
                    'pinout' => [
                        ['id' => 'VCC', 'label' => 'VCC', 'type' => 'power', 'voltage_min' => 3.3, 'voltage_max' => 5.5],
                        ['id' => 'DATA', 'label' => 'DATA', 'type' => 'digital', 'voltage_min' => 0.0, 'voltage_max' => 5.5],
                        ['id' => 'GND', 'label' => 'GND', 'type' => 'ground', 'voltage_min' => 0.0, 'voltage_max' => 0.0],
                    ],
                    'electrical_specs' => [
                        'supply_voltage_min_v' => 3.3,
                        'supply_voltage_max_v' => 5.5,
                        'max_current_ma' => 1.5,
                        'interface' => 'Single-Wire Digital',
                    ],
                    'internal_dipoles' => [
                        ['pinA' => 'VCC', 'pinB' => 'GND', 'resistance_ohms' => 15000],
                    ],
                    'mesh_recipe' => [
                        'package_type' => 'sensor_module',
                        'dimensions_mm' => [15.1, 25.0, 7.7],
                        'primary_color' => '#f8fafc',
                        'pin_pitch_mm' => 2.54,
                    ],
                ],
            ],
            [
                'part_number' => 'BH1750',
                'source_url' => 'https://www.mouser.com/datasheet/2/348/bh1750fvi-e-186247.pdf',
                'tavily_summary' => 'BH1750FVI digital 16-bit ambient light sensor IC with I2C bus interface. Direct lux output (1 - 65535 lx). Supply voltage 2.4V-3.6V (GY-302 module supports 3.3V-5V via onboard LDO). I2C address 0x23 (ADDR=LOW) or 0x5C (ADDR=HIGH). Pins: VCC, GND, SCL, SDA, ADDR.',
                'schema' => [
                    'part_number' => 'BH1750',
                    'name' => 'BH1750 16-Bit Ambient Light Sensor (Lux Meter)',
                    'category' => 'sensor',
                    'description' => 'I2C üzerinden doğrudan Lüks (1-65535 lx) ölçen dijital ortam ışığı sensörü.',
                    'pinout' => [
                        ['id' => 'VCC', 'label' => 'VCC', 'type' => 'power', 'voltage_min' => 3.3, 'voltage_max' => 5.0],
                        ['id' => 'GND', 'label' => 'GND', 'type' => 'ground', 'voltage_min' => 0.0, 'voltage_max' => 0.0],
                        ['id' => 'SCL', 'label' => 'SCL', 'type' => 'i2c', 'voltage_min' => 0.0, 'voltage_max' => 3.6],
                        ['id' => 'SDA', 'label' => 'SDA', 'type' => 'i2c', 'voltage_min' => 0.0, 'voltage_max' => 3.6],
                        ['id' => 'ADDR', 'label' => 'ADDR', 'type' => 'digital', 'voltage_min' => 0.0, 'voltage_max' => 3.6],
                    ],
                    'electrical_specs' => [
                        'supply_voltage_min_v' => 3.3,
                        'supply_voltage_max_v' => 5.0,
                        'max_current_ma' => 0.19,
                        'interface' => 'I2C (0x23 / 0x5C)',
                    ],
                    'internal_dipoles' => [
                        ['pinA' => 'VCC', 'pinB' => 'GND', 'resistance_ohms' => 22000],
                    ],
                    'mesh_recipe' => [
                        'package_type' => 'breakout_pcb',
                        'dimensions_mm' => [13.9, 18.5, 3.2],
                        'primary_color' => '#1e3a8a',
                        'pin_pitch_mm' => 2.54,
                    ],
                ],
            ],
            [
                'part_number' => 'BME280',
                'source_url' => 'https://www.bosch-sensortec.com/products/environmental-sensors/humidity-sensors-bme280/',
                'tavily_summary' => 'Bosch BME280 combined digital humidity, pressure and temperature sensor. I2C (0x76 or 0x77) and SPI interface. Supply voltage 1.71V-3.6V. Pins: VIN, GND, SCL, SDA, CSB, SDO.',
                'schema' => [
                    'part_number' => 'BME280',
                    'name' => 'Bosch BME280 Environmental Sensor (Temp/Humidity/Pressure)',
                    'category' => 'sensor',
                    'description' => 'I2C/SPI barometrik basınç, nem ve sıcaklık çevre sensörü.',
                    'pinout' => [
                        ['id' => 'VIN', 'label' => 'VIN', 'type' => 'power', 'voltage_min' => 1.8, 'voltage_max' => 3.6],
                        ['id' => 'GND', 'label' => 'GND', 'type' => 'ground', 'voltage_min' => 0.0, 'voltage_max' => 0.0],
                        ['id' => 'SCL', 'label' => 'SCL', 'type' => 'i2c', 'voltage_min' => 0.0, 'voltage_max' => 3.6],
                        ['id' => 'SDA', 'label' => 'SDA', 'type' => 'i2c', 'voltage_min' => 0.0, 'voltage_max' => 3.6],
                    ],
                    'electrical_specs' => [
                        'supply_voltage_min_v' => 1.8,
                        'supply_voltage_max_v' => 3.6,
                        'max_current_ma' => 0.71,
                        'interface' => 'I2C (0x76 / 0x77)',
                    ],
                    'internal_dipoles' => [
                        ['pinA' => 'VIN', 'pinB' => 'GND', 'resistance_ohms' => 18000],
                    ],
                    'mesh_recipe' => [
                        'package_type' => 'breakout_pcb',
                        'dimensions_mm' => [15.0, 11.5, 2.5],
                        'primary_color' => '#7c2d12',
                        'pin_pitch_mm' => 2.54,
                    ],
                ],
            ],
            [
                'part_number' => 'INA219',
                'source_url' => 'https://www.ti.com/lit/ds/symlink/ina219.pdf',
                'tavily_summary' => 'Texas Instruments INA219 zero-drift bidirectional current/power monitor with I2C interface. Senses bus voltages from 0V to 26V. Supply voltage 3.0V to 5.5V. Default I2C address 0x40. Pins: VCC, GND, SCL, SDA, VIN+, VIN-.',
                'schema' => [
                    'part_number' => 'INA219',
                    'name' => 'INA219 Bidirectional DC Current & Power Sensor',
                    'category' => 'sensor',
                    'description' => 'I2C üzerinden 26V/3.2A DC akım, gerilim ve güç ölçüm sensörü.',
                    'pinout' => [
                        ['id' => 'VCC', 'label' => 'VCC', 'type' => 'power', 'voltage_min' => 3.0, 'voltage_max' => 5.5],
                        ['id' => 'GND', 'label' => 'GND', 'type' => 'ground', 'voltage_min' => 0.0, 'voltage_max' => 0.0],
                        ['id' => 'SCL', 'label' => 'SCL', 'type' => 'i2c', 'voltage_min' => 0.0, 'voltage_max' => 5.5],
                        ['id' => 'SDA', 'label' => 'SDA', 'type' => 'i2c', 'voltage_min' => 0.0, 'voltage_max' => 5.5],
                        ['id' => 'VIN_PLUS', 'label' => 'VIN+', 'type' => 'analog', 'voltage_min' => 0.0, 'voltage_max' => 26.0],
                        ['id' => 'VIN_MINUS', 'label' => 'VIN-', 'type' => 'analog', 'voltage_min' => 0.0, 'voltage_max' => 26.0],
                    ],
                    'electrical_specs' => [
                        'supply_voltage_min_v' => 3.0,
                        'supply_voltage_max_v' => 5.5,
                        'max_current_ma' => 1.0,
                        'interface' => 'I2C (0x40)',
                    ],
                    'internal_dipoles' => [
                        ['pinA' => 'VCC', 'pinB' => 'GND', 'resistance_ohms' => 20000],
                        ['pinA' => 'VIN_PLUS', 'pinB' => 'VIN_MINUS', 'resistance_ohms' => 0.1],
                    ],
                    'mesh_recipe' => [
                        'package_type' => 'breakout_pcb',
                        'dimensions_mm' => [25.5, 22.3, 3.5],
                        'primary_color' => '#065f46',
                        'pin_pitch_mm' => 2.54,
                    ],
                ],
            ],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function demoCircuitScenarios(int $judgeId, int $makerId, int $groupId): array
    {
        return [
            [
                'user_id' => $judgeId,
                'study_group_id' => $groupId,
                'title' => 'Arduino Uno — LED & 220Ω Akım Sınırlama Laboratuvarı',
                'slug' => 'arduino-uno-led-220ohm-lab',
                'summary' => 'D13 çıkışından 220Ω direnç üzerinden geçen akımı ve kapalı devre topolojisini doğrulayan temel referans devre.',
                'board_type' => 'ARDUINO_UNO',
                'visibility' => 'public',
                'forks_count' => 3,
                'scenario_data' => [
                    'schema_version' => 2,
                    'boards' => [
                        ['id' => 'board_uno_1', 'type' => 'ARDUINO_UNO', 'position' => [0, 0, 0]],
                    ],
                    'components' => [
                        ['id' => 'res_220', 'type' => 'RESISTOR', 'value_ohms' => 220, 'position' => [5, 0, 2]],
                        ['id' => 'led_red', 'type' => 'LED_RED', 'position' => [8, 0, 2]],
                    ],
                    'connections' => [
                        ['from' => 'board_uno_1.D13', 'to' => 'res_220.P1', 'color' => '#ef4444'],
                        ['from' => 'res_220.P2', 'to' => 'led_red.ANODE', 'color' => '#f97316'],
                        ['from' => 'led_red.CATHODE', 'to' => 'board_uno_1.GND_1', 'color' => '#1e293b'],
                    ],
                    'code' => "void setup() {\n  pinMode(13, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(13, HIGH);\n  delay(500);\n  digitalWrite(13, LOW);\n  delay(500);\n}",
                    'custom_components' => [],
                ],
            ],
            [
                'user_id' => $makerId,
                'study_group_id' => $groupId,
                'title' => 'ESP32 — I2C OLED & Ultrasonik Mesafe Telemetrisi',
                'slug' => 'esp32-i2c-oled-ultrasonik-telemetri',
                'summary' => 'ESP32 DevKit V1 üzerinde HC-SR04 ultrasonik mesafe sensörü ve SSD1306 I2C ekran bağlantısı.',
                'board_type' => 'ESP32_DEVKIT_V1',
                'visibility' => 'group',
                'forks_count' => 1,
                'scenario_data' => [
                    'schema_version' => 2,
                    'boards' => [
                        ['id' => 'board_esp32_1', 'type' => 'ESP32_DEVKIT_V1', 'position' => [0, 0, 0]],
                    ],
                    'components' => [
                        ['id' => 'ultrasonic_1', 'type' => 'HC_SR04', 'position' => [6, 0, -2]],
                        ['id' => 'oled_1', 'type' => 'SSD1306_OLED', 'position' => [-6, 0, 2]],
                    ],
                    'connections' => [
                        ['from' => 'board_esp32_1.3V3', 'to' => 'oled_1.VCC', 'color' => '#ef4444'],
                        ['from' => 'board_esp32_1.GND_1', 'to' => 'oled_1.GND', 'color' => '#1e293b'],
                        ['from' => 'board_esp32_1.GPIO22', 'to' => 'oled_1.SCL', 'color' => '#3b82f6'],
                        ['from' => 'board_esp32_1.GPIO21', 'to' => 'oled_1.SDA', 'color' => '#10b981'],
                    ],
                    'code' => "void setup() {\n  Serial.begin(115200);\n}\n\nvoid loop() {\n  delay(250);\n}",
                    'custom_components' => [],
                ],
            ],
            [
                'user_id' => $judgeId,
                'study_group_id' => $groupId,
                'title' => 'NVIDIA Jetson Nano — Edge AI I2C Sensör Füzyonu (MPU6050 + BME280)',
                'slug' => 'jetson-nano-edge-ai-sensor-fuzyonu',
                'summary' => 'Jetson Nano 40-pin GPIO başlığı üzerinde 3.3V I2C Bus-1 (Pin 3 SDA / Pin 5 SCL) ile MPU6050 ve BME280 telemetri devresi.',
                'board_type' => 'NVIDIA_JETSON_NANO',
                'visibility' => 'public',
                'forks_count' => 5,
                'scenario_data' => [
                    'schema_version' => 2,
                    'boards' => [
                        ['id' => 'board_jetson_1', 'type' => 'NVIDIA_JETSON_NANO', 'position' => [0, 0, 0]],
                    ],
                    'components' => [
                        ['id' => 'imu_mpu6050', 'type' => 'MPU6050', 'position' => [7, 0, 3]],
                        ['id' => 'env_bme280', 'type' => 'BME280', 'position' => [11, 0, 3]],
                    ],
                    'connections' => [
                        ['from' => 'board_jetson_1.PIN1_3V3', 'to' => 'imu_mpu6050.VCC', 'color' => '#f97316'],
                        ['from' => 'board_jetson_1.PIN6_GND', 'to' => 'imu_mpu6050.GND', 'color' => '#1e293b'],
                        ['from' => 'board_jetson_1.PIN3_SDA1', 'to' => 'imu_mpu6050.SDA', 'color' => '#10b981'],
                        ['from' => 'board_jetson_1.PIN5_SCL1', 'to' => 'imu_mpu6050.SCL', 'color' => '#3b82f6'],
                    ],
                    'code' => "# Jetson Nano smbus2 I2C telemetry\nimport smbus2\nbus = smbus2.SMBus(1)\nprint('MPU6050 WHO_AM_I:', hex(bus.read_byte_data(0x68, 0x75)))",
                    'custom_components' => ['MPU6050', 'BME280'],
                ],
            ],
        ];
    }
}
