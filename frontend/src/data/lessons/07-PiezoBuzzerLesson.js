import * as THREE from 'three';
import { BaseLesson } from '../../core/lessons/BaseLesson.js';

export class PiezoBuzzerLesson extends BaseLesson {
  constructor() {
    super({
      id: 'buzzer',
      number: 7,
      title: {
        en: 'Make a Sound',
        tr: 'Ses ve Melodi Üret'
      },
      heading: {
        en: 'Piezo Buzzer & Tone Synthesis',
        tr: 'Piezo Buzzer ve Frekans Sentezi'
      },
      summary: {
        en: 'A piezoelectric buzzer flexes every time its voltage flips. Driving Pin 8 with tone(8, frequency) vibrates the disc at musical pitches.',
        tr: 'Piezoelektrik buzzer, voltajı her yön değiştirdiğinde esner. Pin 8\'i tone(8, frekans) ile sürmek seramik diski müzikal nota frekanslarında titreştirir.'
      },
      bullets: [
        {
          icon: 'bulb',
          text: {
            en: 'tone(pin, freq, ms) generates a square wave at the given Hz',
            tr: 'tone(pin, frekans, ms) belirtilen Hz değerinde kare dalga üretir'
          }
        },
        {
          icon: 'gear',
          text: {
            en: 'Synthesizes real audio in your browser via Web Audio API!',
            tr: 'Web Audio API ile tarayıcınızda gerçek ses sentezler!'
          }
        },
        {
          icon: 'chip',
          text: {
            en: 'Plays a 4-note arpeggio (C5 – E5 – G5 – C6)',
            tr: '4 notalı bir arpej çalar (Do5 – Mi5 – Sol5 – Do6)'
          }
        }
      ],
      pinout: [
        [
          'Pin 8',
          {
            en: 'Piezo Buzzer positive (+) terminal',
            tr: 'Piezo Buzzer pozitif (+) ucu'
          }
        ],
        [
          'GND',
          {
            en: 'Piezo Buzzer negative (−) terminal',
            tr: 'Piezo Buzzer negatif (−) / GND ucu'
          }
        ]
      ],
      circuit: {
        en: 'Arduino toggles Pin 8 rapidly at the target frequency (e.g., 523 Hz for Note C5), creating audible sound waves.',
        tr: 'Kontrolcü Pin 8\'i hedef frekansta (ör. Do5 notası için saniyede 523 kez) açıp kapatarak duyulabilir ses dalgaları oluşturur.'
      },
      specs: [
        [
          { en: 'Transducer Type', tr: 'Dönüştürücü Tipi' },
          'Piezoelectric Ceramic Disc'
        ],
        [
          { en: 'Frequency Range', tr: 'Frekans Aralığı' },
          '250 Hz – 4.5 kHz'
        ],
        [
          { en: 'Resonant Frequency', tr: 'Rezonans Frekansı' },
          '~2.7 kHz'
        ],
        [
          { en: 'Drive Signal', tr: 'Sürücü Sinyali' },
          '5V Square Wave (tone)'
        ]
      ],
      code: [
        'const int buzzerPin = 8;',
        '',
        'void setup() {',
        '  pinMode(buzzerPin, OUTPUT);',
        '}',
        '',
        'void loop() {',
        '  tone(buzzerPin, 523, 300); // Note C5',
        '  delay(360);',
        '  tone(buzzerPin, 659, 300); // Note E5',
        '  delay(360);',
        '  tone(buzzerPin, 784, 300); // Note G5',
        '  delay(360);',
        '  tone(buzzerPin, 1046, 400); // Note C6',
        '  delay(500);',
        '}'
      ],
      circuitLayout: {
        mode: 'breadboard',
        components: [
          {
            key: 'buzzer',
            typeId: 'audio.piezo',
            name: 'Piezo Buzzer',
            position: [38, 5.2, 4],
            calloutOffset: [58, -42],
            anchorOffset: [0, 12.8, 0]
          }
        ],
        wires: [
          {
            fromPin: 'PIN8',
            waypoints: [
              [4, 24, -12],
              [35.5, 18, 4],
              [35.5, 5.5, 4]
            ],
            color: '#ea9a28'
          },
          {
            fromPin: 'GND',
            waypoints: [
              [6, 18, 24],
              [40.5, 15, 4],
              [40.5, 5.5, 4]
            ],
            color: '#232836'
          }
        ]
      }
    });
  }

  startSimulation(sim) {
    const parts = sim.stage.activeParts;
    const notes = [
      { freq: 523.25, name: 'C5 (523 Hz)', line: 7 },
      { freq: 659.25, name: 'E5 (659 Hz)', line: 9 },
      { freq: 783.99, name: 'G5 (784 Hz)', line: 11 },
      { freq: 1046.5, name: 'C6 (1046 Hz)', line: 13 }
    ];
    let idx = 0;
    const step = () => {
      if (!sim.running) return;
      const n = notes[idx % notes.length];
      idx++;
      sim.onLine(n.line);
      parts.buzzer?.setTone(n.freq);
      sim.audio.playTone(n.freq, 280);
      sim.stage.spawnWave(new THREE.Vector3(38, 14, 4), '#ea9a28');
      sim.onLog(`tone(8, ${Math.round(n.freq)}) -> Playing ${n.name}`);
      sim.schedule(step, 420);
    };
    step();
  }
}
