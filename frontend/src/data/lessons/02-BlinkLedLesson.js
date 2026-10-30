import { BaseLesson } from '../../core/lessons/BaseLesson.js';

export class BlinkLedLesson extends BaseLesson {
  constructor() {
    super({
      id: 'blink',
      number: 2,
      title: {
        en: 'Blink an LED',
        tr: 'LED Yakıp Söndür'
      },
      heading: {
        en: 'External LED & Resistor',
        tr: 'Harici LED ve Akım Sınırlama Direnci'
      },
      summary: {
        en: 'Your first breadboard circuit: a 5mm red LED wired in series with a 220 Ω current-limiting resistor driven by digital pin 13.',
        tr: 'İlk breadboard devreniz: Dijital Pin 13 tarafından sürülen, 220 Ω akım sınırlama direnci ile seri bağlanmış 5mm kırmızı LED.'
      },
      bullets: [
        {
          icon: 'bulb',
          text: {
            en: 'LEDs only allow current to flow from Anode (+) to Cathode (−)',
            tr: 'LED\'ler akımın yalnızca Anot (+) ucundan Katot (−) ucuna akmasına izin verir'
          }
        },
        {
          icon: 'chip',
          text: {
            en: '220 Ω resistor limits current to a safe ~14 mA',
            tr: '220 Ω direnç, LED akımını güvenli ~14 mA seviyesinde sınırlar'
          }
        },
        {
          icon: 'gear',
          text: {
            en: 'digitalWrite(13, HIGH) outputs 5V to light the LED',
            tr: 'digitalWrite(13, HIGH) komutu pine 5V vererek LED\'i yakar'
          }
        }
      ],
      pinout: [
        [
          'Pin 13',
          {
            en: 'Connected to 220 Ω resistor → LED Anode (+)',
            tr: '220 Ω direnç üzerinden LED Anot (+) bacağına bağlı'
          }
        ],
        [
          'GND',
          {
            en: 'Connected to LED short leg / Cathode (−)',
            tr: 'LED kısa bacağına / Katot (−) hattına bağlı'
          }
        ]
      ],
      circuit: {
        en: 'Current flows from Digital Pin 13 through the 220 Ω resistor (Red-Red-Brown-Gold), enters the LED anode, and returns to Arduino GND.',
        tr: 'Akım, Dijital Pin 13\'ten çıkarak 220 Ω dirençten (Kırmızı-Kırmızı-Kahve-Altın) geçer, LED anoduna girer ve GND üzerinden devreyi tamamlar.'
      },
      specs: [
        [
          { en: 'LED Forward Voltage', tr: 'LED İletim Gerilimi' },
          '2.0 V (Red)'
        ],
        [
          { en: 'Series Resistor', tr: 'Seri Direnç' },
          '220 Ω (±5%)'
        ],
        [
          { en: 'Forward Current', tr: 'İletim Akımı' },
          '~13.6 mA'
        ],
        [
          { en: 'Drive Pin', tr: 'Sürücü Pin' },
          'Digital Pin 13'
        ]
      ],
      code: [
        'const int ledPin = 13;',
        '',
        'void setup() {',
        '  pinMode(ledPin, OUTPUT);',
        '}',
        '',
        'void loop() {',
        '  digitalWrite(ledPin, HIGH);',
        '  delay(650);',
        '  digitalWrite(ledPin, LOW);',
        '  delay(650);',
        '}'
      ],
      circuitLayout: {
        mode: 'breadboard',
        components: [
          {
            key: 'led',
            typeId: 'led.single',
            name: 'Red LED',
            color: '#e6392e',
            position: [34, 5.2, 2],
            calloutOffset: [58, -42],
            anchorOffset: [0, 12.8, 0]
          },
          {
            key: 'resistor',
            typeId: 'passive.resistor',
            name: '220 Ω Resistor',
            position: [24, 5.2, 6],
            calloutOffset: [-48, 44],
            anchorOffset: [0, 6.8, 0]
          }
        ],
        wires: [
          {
            fromPin: 'PIN13',
            waypoints: [
              [-12, 24, -12],
              [17.5, 18, 6],
              [17.5, 5.5, 6]
            ],
            color: '#e04b3a'
          },
          {
            fromPin: 'GND',
            waypoints: [
              [4, 20, 26],
              [35.3, 16, 12],
              [35.3, 5.5, 2]
            ],
            color: '#232836'
          }
        ]
      }
    });
  }

  startSimulation(sim) {
    let state = false;
    const parts = sim.stage.activeParts;
    const step = () => {
      if (!sim.running) return;
      state = !state;
      sim.onLine(state ? 7 : 9);
      sim.stage.setBoardLed('l', state);
      parts.led?.setBrightness(state ? 1 : 0);
      sim.onLog(`Pin 13 -> ${state ? '5.0V (LED ON)' : '0.0V (LED OFF)'}`);
      sim.schedule(step, 650);
    };
    step();
  }
}
