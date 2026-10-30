import { BaseLesson } from '../../core/lessons/BaseLesson.js';

export class RgbColorMixLesson extends BaseLesson {
  constructor() {
    super({
      id: 'rgb',
      number: 5,
      title: {
        en: 'Mix Colours',
        tr: 'RGB Renk Karışımı'
      },
      heading: {
        en: 'RGB PWM Color Cycling',
        tr: 'RGB PWM Renk Sentezi'
      },
      summary: {
        en: 'By driving Red (Pin 11), Green (Pin 10), and Blue (Pin 9) channels with independent PWM values, you can blend millions of additive light colors.',
        tr: 'Kırmızı (Pin 11), Yeşil (Pin 10) ve Mavi (Pin 9) kanallarını bağımsız PWM değerleriyle sürerek milyonlarca farklı ışık rengini karıştırabilirsiniz.'
      },
      bullets: [
        {
          icon: 'bulb',
          text: {
            en: 'Three PWM channels control Red, Green, and Blue intensity',
            tr: 'Üç bağımsız PWM kanalı Kırmızı, Yeşil ve Mavi yoğunluğunu kontrol eder'
          }
        },
        {
          icon: 'chip',
          text: {
            en: 'Smoothly cross-fades across the color spectrum',
            tr: 'Renk tayfı boyunca pürüzsüz geçişler oluşturur'
          }
        },
        {
          icon: 'gear',
          text: {
            en: 'Each channel uses 8-bit PWM (0 = off, 255 = full brightness)',
            tr: 'Her kanal 8-bit PWM kullanır (0 = kapalı, 255 = tam parlaklık)'
          }
        }
      ],
      pinout: [
        [
          'Pin ~11',
          {
            en: 'Red LED channel via 220 Ω resistor',
            tr: '220 Ω direnç üzerinden Kırmızı LED kanalı'
          }
        ],
        [
          'Pin ~10',
          {
            en: 'Green LED channel via 220 Ω resistor',
            tr: '220 Ω direnç üzerinden Yeşil LED kanalı'
          }
        ],
        [
          'Pin ~9',
          {
            en: 'Blue LED channel via 220 Ω resistor',
            tr: '220 Ω direnç üzerinden Mavi LED kanalı'
          }
        ]
      ],
      circuit: {
        en: 'Pins 9, 10, and 11 all support hardware timer PWM. Cycling their duty cycles in phase-shifted sine waves produces a continuous rainbow transition.',
        tr: 'Pin 9, 10 ve 11 donanım zamanlayıcı PWM desteğine sahiptir. Görev döngülerini sırayla değiştirmek kesintisiz bir gökkuşağı geçişi üretir.'
      },
      specs: [
        [
          { en: 'Channels', tr: 'Kanallar' },
          'Red (625nm), Green (525nm), Blue (470nm)'
        ],
        [
          { en: 'PWM Pins', tr: 'PWM Pinleri' },
          'D9, D10, D11'
        ],
        [
          { en: 'Color Depth', tr: 'Renk Derinliği' },
          '24-bit (16.7M combinations)'
        ],
        [
          { en: 'Current per Channel', tr: 'Kanal Başına Akım' },
          '~12 mA max'
        ]
      ],
      code: [
        'void setup() {',
        '  pinMode(11, OUTPUT);',
        '  pinMode(10, OUTPUT);',
        '  pinMode(9, OUTPUT);',
        '}',
        '',
        'void loop() {',
        '  analogWrite(11, 255); analogWrite(10, 40);  analogWrite(9, 20);',
        '  delay(550);',
        '  analogWrite(11, 30);  analogWrite(10, 255); analogWrite(9, 60);',
        '  delay(550);',
        '  analogWrite(11, 40);  analogWrite(10, 80);  analogWrite(9, 255);',
        '  delay(550);',
        '}'
      ],
      circuitLayout: {
        mode: 'breadboard',
        components: [
          {
            key: 'ledR',
            typeId: 'led.single',
            name: 'PWM Pin 11 (Red)',
            description: 'Controls red intensity via pulse-width modulation.',
            color: '#e6392e',
            position: [26, 5.2, 0],
            calloutOffset: [-45, -44],
            anchorOffset: [0, 12.8, 0]
          },
          {
            key: 'ledG',
            typeId: 'led.single',
            name: 'PWM Pin 10 (Green)',
            color: '#2fa866',
            position: [38, 5.2, 0],
            includeCallout: false
          },
          {
            key: 'ledB',
            typeId: 'led.single',
            name: 'PWM Pin 9 (Blue)',
            description: 'Controls blue intensity via pulse-width modulation.',
            color: '#2b7de0',
            position: [50, 5.2, 0],
            calloutOffset: [62, -40],
            anchorOffset: [0, 12.8, 0]
          }
        ],
        wires: [
          {
            fromPin: 'PIN11',
            waypoints: [
              [-10, 24, -12],
              [25, 18, 0],
              [25, 5.5, 0]
            ],
            color: '#e04b3a'
          },
          {
            fromPin: 'PIN10',
            waypoints: [
              [-4, 25, -12],
              [37, 18, 0],
              [37, 5.5, 0]
            ],
            color: '#2fa866'
          },
          {
            fromPin: 'PIN9',
            waypoints: [
              [4, 26, -12],
              [49, 18, 0],
              [49, 5.5, 0]
            ],
            color: '#2b7de0'
          }
        ]
      }
    });
  }

  startSimulation(sim) {
    const parts = sim.stage.activeParts;
    let phase = 0;
    const combos = [
      { r: 255, g: 40, b: 20, line: 7, name: 'Crimson Red (255, 40, 20)' },
      { r: 30, g: 255, b: 60, line: 9, name: 'Emerald Green (30, 255, 60)' },
      { r: 40, g: 80, b: 255, line: 11, name: 'Electric Blue (40, 80, 255)' }
    ];
    const step = () => {
      if (!sim.running) return;
      const c = combos[phase % combos.length];
      phase++;
      sim.onLine(c.line);
      parts.ledR?.setPwm(c.r);
      parts.ledG?.setPwm(c.g);
      parts.ledB?.setPwm(c.b);
      sim.onLog(`RGB Mix -> ${c.name}`);
      sim.schedule(step, 600);
    };
    step();
  }
}
