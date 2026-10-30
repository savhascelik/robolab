import { BaseLesson } from '../../core/lessons/BaseLesson.js';

export class ArduinoBoardLesson extends BaseLesson {
  constructor() {
    super({
      id: 'board',
      number: 1,
      title: {
        en: 'Meet the Board',
        tr: 'Kartı Tanıyalım'
      },
      heading: {
        en: 'Arduino Uno R3',
        tr: 'Arduino Uno R3'
      },
      summary: {
        en: 'The Arduino Uno is a popular microcontroller board based on the ATmega328P. It is easy to use and perfect for learning electronics, programming, and prototyping.',
        tr: 'Arduino Uno, ATmega328P tabanlı en popüler mikrodenetleyici geliştirme kartıdır. Elektronik, gömülü C++ programlama ve hızlı prototipleme öğrenmek için idealdir.'
      },
      bullets: [
        {
          icon: 'chip',
          text: {
            en: 'Open-source hardware architecture (ATmega328P 16 MHz)',
            tr: 'Açık kaynaklı donanım mimarisi (ATmega328P 16 MHz)'
          }
        },
        {
          icon: 'bulb',
          text: {
            en: 'Wide community support & thousands of driver libraries',
            tr: 'Geniş topluluk desteği ve binlerce hazır sensör kütüphanesi'
          }
        },
        {
          icon: 'gear',
          text: {
            en: 'Used in education, robotics, and real-world prototypes',
            tr: 'Eğitim, robotik ve gerçek dünya prototiplerinde standart platform'
          }
        }
      ],
      pinout: [
        [
          'D0 – D13',
          {
            en: '14 Digital Input/Output pins (HIGH 5V / LOW 0V)',
            tr: '14 Dijital Giriş/Çıkış pini (HIGH 5V / LOW 0V)'
          }
        ],
        [
          '~3, ~5, ~6, ~9, ~10, ~11',
          {
            en: '6 PWM analogWrite() output pins (8-bit)',
            tr: '6 PWM analogWrite() çıkış pini (8-bit, 0–255)'
          }
        ],
        [
          'A0 – A5',
          {
            en: '6 Analog input channels (10-bit ADC, 0–1023)',
            tr: '6 Analog giriş kanalı (10-bit ADC, 0–1023)'
          }
        ],
        [
          '5V / 3.3V / GND',
          {
            en: 'Regulated power rails and ground reference',
            tr: 'Regüleli güç hatları ve toprak (GND) referansı'
          }
        ],
        [
          'VIN / Barrel Jack',
          {
            en: '7–12 V DC unregulated external power input',
            tr: '7–12 V DC harici adaptör/pil besleme girişi'
          }
        ]
      ],
      circuit: {
        en: 'No external wiring needed! Pin 13 is wired directly to the built-in amber SMD LED labeled "L" next to the digital header.',
        tr: 'Harici kablo bağlantısına gerek yok! Dijital Pin 13, kart üzerindeki "L" etiketli kehribar rengi yerleşik SMD LED\'e doğrudan bağlıdır.'
      },
      specs: [
        [
          { en: 'Microcontroller', tr: 'Mikrodenetleyici' },
          'ATmega328P (8-bit AVR)'
        ],
        [
          { en: 'Operating Voltage', tr: 'Çalışma Gerilimi' },
          '5 V'
        ],
        [
          { en: 'Input Voltage', tr: 'Giriş Gerilimi' },
          '7 – 12 V'
        ],
        [
          { en: 'Digital I/O Pins', tr: 'Dijital G/Ç Pinleri' },
          '14 (6 PWM)'
        ],
        [
          { en: 'Analog Input Pins', tr: 'Analog Giriş Pinleri' },
          '6 (10-bit ADC)'
        ],
        [
          { en: 'Flash Memory', tr: 'Flash Bellek' },
          '32 KB'
        ],
        [
          { en: 'SRAM / EEPROM', tr: 'SRAM / EEPROM' },
          '2 KB / 1 KB'
        ],
        [
          { en: 'Clock Speed', tr: 'Saat Frekansı' },
          '16 MHz'
        ]
      ],
      code: [
        'void setup() {',
        '  pinMode(LED_BUILTIN, OUTPUT);',
        '  Serial.begin(9600);',
        '}',
        '',
        'void loop() {',
        '  digitalWrite(LED_BUILTIN, HIGH);',
        '  Serial.println("Built-in LED: ON");',
        '  delay(800);',
        '  digitalWrite(LED_BUILTIN, LOW);',
        '  Serial.println("Built-in LED: OFF");',
        '  delay(800);',
        '}'
      ],
      circuitLayout: {
        mode: 'board-only'
      }
    });
  }

  startSimulation(sim) {
    let state = false;
    const step = () => {
      if (!sim.running) return;
      state = !state;
      sim.onLine(state ? 6 : 9);
      sim.stage.setBoardLed('l', state);
      sim.onLog(`Built-in LED (Pin 13): ${state ? 'HIGH (ON)' : 'LOW (OFF)'}`);
      sim.schedule(step, 800);
    };
    step();
  }
}
