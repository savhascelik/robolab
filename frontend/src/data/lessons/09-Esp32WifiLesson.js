import * as THREE from 'three';
import { BaseLesson } from '../../core/lessons/BaseLesson.js';

export class Esp32WifiLesson extends BaseLesson {
  constructor() {
    super({
      id: 'esp32',
      number: 9,
      title: {
        en: 'ESP32 Wi-Fi MCU',
        tr: 'ESP32 Wi-Fi & BLE'
      },
      heading: {
        en: 'ESP32 DevKit V1 (ESP-WROOM-32)',
        tr: 'ESP32 DevKit V1 (Çift Çekirdek Wi-Fi + BLE)'
      },
      summary: {
        en: 'Step up to a 240 MHz dual-core 32-bit Xtensa LX6 microcontroller with integrated 2.4 GHz Wi-Fi, Bluetooth 4.2 BLE, 12-bit SAR ADC (0–4095), and 3.3V CMOS logic.',
        tr: 'Entegre 2.4 GHz Wi-Fi, Bluetooth 4.2 BLE, 12-bit SAR ADC (0–4095) ve 3.3V CMOS mantık seviyesine sahip 240 MHz çift çekirdekli 32-bit Xtensa LX6 mikrodenetleyiciye geçin.'
      },
      bullets: [
        {
          icon: 'chip',
          text: {
            en: '240 MHz Dual-Core Xtensa LX6 with 520 KB SRAM & RF shield can',
            tr: '520 KB SRAM ve RF metal koruma kalkanlı 240 MHz Çift Çekirdekli Xtensa LX6'
          }
        },
        {
          icon: 'bulb',
          text: {
            en: 'Onboard 2.4 GHz gold meander PCB antenna for Wi-Fi & BLE',
            tr: 'Wi-Fi ve BLE için yerleşik 2.4 GHz altın menderes PCB anteni'
          }
        },
        {
          icon: 'gear',
          text: {
            en: '30-pin header with 12-bit ADC (0–4095) and 16 LEDC PWM channels',
            tr: '12-bit ADC (0–4095) ve 16 LEDC PWM kanallı 30-pin G/Ç dizilimi'
          }
        }
      ],
      pinout: [
        [
          'GPIO 2 (D2)',
          {
            en: 'Onboard Blue Status LED & Digital I/O (3.3V)',
            tr: 'Yerleşik Mavi Durum LED\'i ve Dijital G/Ç (3.3V)'
          }
        ],
        [
          'GPIO 34 (ADC1_6)',
          {
            en: '12-bit SAR Analog Input (0 – 3.3V → 0 – 4095)',
            tr: '12-bit SAR Analog Giriş (0 – 3.3V → 0 – 4095)'
          }
        ],
        [
          'GPIO 21 / 22',
          {
            en: 'Hardware I2C SDA & SCL bus pins',
            tr: 'Donanımsal I2C SDA ve SCL veri yolu pinleri'
          }
        ],
        [
          '3V3 / VIN / GND',
          {
            en: '3.3V LDO output (AMS1117) & 5V USB input',
            tr: '3.3V LDO çıkışı (AMS1117) ve 5V USB besleme girişi'
          }
        ]
      ],
      circuit: {
        en: 'Click any numbered marker on the 3D ESP32 DevKit V1 to inspect the ESP-WROOM-32 RF module, 2.4 GHz antenna, CP2102 bridge, or press Play to run Wi-Fi & 12-bit ADC telemetry.',
        tr: 'ESP-WROOM-32 RF modülünü, 2.4 GHz anteni ve CP2102 köprüsünü incelemek için 3D kart üzerindeki etiketlere tıklayın veya Wi-Fi & 12-bit ADC telemetrisini başlatmak için Oynat\'a basın.'
      },
      specs: [
        [
          { en: 'SoC Module', tr: 'SoC Modülü' },
          'Espressif ESP-WROOM-32 (Dual-Core LX6)'
        ],
        [
          { en: 'Operating Voltage', tr: 'Çalışma Gerilimi' },
          '3.3 V Logic (5V USB via AMS1117-3.3 LDO)'
        ],
        [
          { en: 'Clock / Memory', tr: 'Saat Hızı / Bellek' },
          '240 MHz • 520 KB SRAM • 4 MB SPI Flash'
        ],
        [
          { en: 'ADC / Wireless', tr: 'ADC / Kablosuz' },
          '12-bit (0–4095) • 802.11 b/g/n + BLE 4.2'
        ]
      ],
      code: [
        '#include <WiFi.h>',
        'const int ledPin = 2;    // Onboard Blue LED (GPIO2)',
        'const int adcPin = 34;   // 12-bit ADC1_CH6 (0-4095)',
        '',
        'void setup() {',
        '  Serial.begin(115200);',
        '  pinMode(ledPin, OUTPUT);',
        '  WiFi.begin("Lab_IoT_2.4G", "esp32pass");',
        '}',
        '',
        'void loop() {',
        '  int raw12Bit = analogRead(adcPin);',
        '  digitalWrite(ledPin, HIGH);',
        '  Serial.println(WiFi.localIP());',
        '  delay(650);',
        '}'
      ],
      circuitLayout: {
        mode: 'board-only',
        hostBoardTypeId: 'board.esp32_devkit',
        cameraZoom: 1.32
      }
    });
  }

  startSimulation(sim) {
    let state = false;
    const maxAdc = sim.stage.hostBoard?.getMaxAdcValue?.() || 4095;
    const vRef = sim.stage.hostBoard?.capabilities?.logicVoltage || 3.3;
    const step = () => {
      if (!sim.running) return;
      state = !state;
      const raw12Bit = Math.round(maxAdc * (0.55 + 0.35 * Math.sin(Date.now() * 0.002)));
      const volts = ((raw12Bit / maxAdc) * vRef).toFixed(2);
      sim.onLine(state ? 12 : 13);
      sim.stage.setBoardLed('l', state);
      if (state) {
        sim.stage.spawnWave(new THREE.Vector3(21.7, 4.5, 0), '#2b8cff');
      }
      sim.onLog(
        `WiFi 192.168.1.42 | GPIO34 (12-bit ADC) = ${raw12Bit}/${maxAdc} (${volts}V) | GPIO2 LED=${state ? 'ON' : 'OFF'}`
      );
      sim.schedule(step, 650);
    };
    step();
  }
}
