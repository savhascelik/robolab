import { BaseLesson } from '../../core/lessons/BaseLesson.js';

export class PushButtonLesson extends BaseLesson {
  constructor() {
    super({
      id: 'button',
      number: 3,
      title: {
        en: 'Push a Button',
        tr: 'Buton Okuma'
      },
      heading: {
        en: 'Digital Input & Tactile Switch',
        tr: 'Dijital Giriş ve Taktil Anahtar'
      },
      summary: {
        en: 'Inputs let the Arduino sense the physical world. Pressing the momentary push button closes the circuit on Pin 2 and turns on the status LED on Pin 13.',
        tr: 'Giriş pinleri mikrodenetleyicinin fiziksel dünyayı algılamasını sağlar. Anlık butona basıldığında Pin 2 devresi kapanır ve Pin 13 üzerindeki yeşil durum LED\'i yanar.'
      },
      bullets: [
        {
          icon: 'chip',
          text: {
            en: 'pinMode(2, INPUT_PULLUP) uses the internal 20kΩ pull-up',
            tr: 'pinMode(2, INPUT_PULLUP) dahili 20kΩ pull-up direncini etkinleştirir'
          }
        },
        {
          icon: 'bulb',
          text: {
            en: 'digitalRead(2) returns LOW when pressed, HIGH when released',
            tr: 'digitalRead(2) basılıyken LOW (0), bırakıldığında HIGH (1) döndürür'
          }
        },
        {
          icon: 'gear',
          text: {
            en: 'Use the interactive button in the top-right to press it live!',
            tr: 'Simülasyon sırasında sağ üstteki canlı butona basılı tutarak test edin!'
          }
        }
      ],
      pinout: [
        [
          'Pin 2',
          {
            en: 'Tactile push button input terminal',
            tr: 'Taktil buton dijital giriş terminali'
          }
        ],
        [
          'Pin 13',
          {
            en: '220 Ω resistor → Green Status LED',
            tr: '220 Ω direnç → Yeşil Durum LED\'i'
          }
        ],
        [
          'GND',
          {
            en: 'Common ground rail on breadboard',
            tr: 'Breadboard ortak toprak (GND) hattı'
          }
        ]
      ],
      circuit: {
        en: 'When you hold the push button down while the simulation is running, Pin 2 senses the state change and immediately illuminates the green LED.',
        tr: 'Simülasyon çalışırken butona basılı tuttuğunuzda Pin 2 hattı GND\'ye çekilir (LOW) ve yeşil LED anında aydınlanır.'
      },
      specs: [
        [
          { en: 'Switch Type', tr: 'Anahtar Tipi' },
          'SPST Momentary Tactile (6×6 mm)'
        ],
        [
          { en: 'Contact Rating', tr: 'Kontak Akımı' },
          '50 mA @ 12 V DC'
        ],
        [
          { en: 'Bounce Time', tr: 'Sıçrama Süresi' },
          '< 5 ms'
        ],
        [
          { en: 'Input Mode', tr: 'Giriş Modu' },
          'INPUT_PULLUP'
        ]
      ],
      code: [
        'const int buttonPin = 2;',
        'const int ledPin = 13;',
        '',
        'void setup() {',
        '  pinMode(buttonPin, INPUT_PULLUP);',
        '  pinMode(ledPin, OUTPUT);',
        '  Serial.begin(9600);',
        '}',
        '',
        'void loop() {',
        '  int pressed = (digitalRead(buttonPin) == LOW);',
        '  digitalWrite(ledPin, pressed ? HIGH : LOW);',
        '  delay(150);',
        '}'
      ],
      circuitLayout: {
        mode: 'breadboard',
        components: [
          {
            key: 'button',
            typeId: 'button.tactile',
            name: 'Tactile Button',
            position: [23, 5.2, 4],
            calloutOffset: [-45, -42],
            anchorOffset: [0, 9.8, 0]
          },
          {
            key: 'arcadeButton',
            typeId: 'button.arcade',
            name: 'Arcade Cap Button',
            position: [33, 5.2, 4],
            calloutOffset: [0, -52],
            anchorOffset: [0, 11.2, 0]
          },
          {
            key: 'led',
            typeId: 'led.single',
            name: 'Green LED',
            color: '#2fa866',
            position: [46, 5.2, 2],
            calloutOffset: [64, -36],
            anchorOffset: [0, 12.8, 0]
          },
          {
            key: 'resistor',
            typeId: 'passive.resistor',
            name: '220 Ω Resistor',
            position: [40, 5.2, 10],
            includeCallout: false
          }
        ],
        wires: [
          {
            fromPin: 'PIN2',
            waypoints: [
              [10, 24, -14],
              [23, 18, 1],
              [23, 5.5, 1]
            ],
            color: '#2b7de0'
          },
          {
            fromPin: 'PIN13',
            waypoints: [
              [-8, 26, -12],
              [33.5, 20, 10],
              [33.5, 5.5, 10]
            ],
            color: '#e04b3a'
          },
          {
            fromPin: 'GND',
            waypoints: [
              [8, 18, 24],
              [29, 15, 7],
              [29, 5.5, 7]
            ],
            color: '#232836'
          }
        ]
      }
    });
  }

  startSimulation(sim) {
    const parts = sim.stage.activeParts;
    const step = () => {
      if (!sim.running) return;
      const pressed = parts.button ? parts.button.readDigitalLevel() === 0 : sim.params.buttonPressed;
      sim.onLine(pressed ? 10 : 11);
      parts.led?.setBrightness(pressed ? 1 : 0);
      sim.stage.setBoardLed('l', pressed);
      sim.schedule(step, 200);
    };
    sim.onLog('Ready — click "Press & Hold" in top-right to test Pin 2!');
    step();
  }
}
