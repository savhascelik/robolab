import * as THREE from 'three';
import { BaseLesson } from '../../core/lessons/BaseLesson.js';

export class UltrasonicSensorLesson extends BaseLesson {
  constructor() {
    super({
      id: 'sensor',
      number: 6,
      title: {
        en: 'Read a Sensor',
        tr: 'Mesafe Sensörü Oku'
      },
      heading: {
        en: 'HC-SR04 Ultrasonic Distance',
        tr: 'HC-SR04 Ultrasonik Mesafe Ölçümü'
      },
      summary: {
        en: 'The HC-SR04 sends out an ultrasonic 40 kHz ping from its Trigger transducer and measures how many microseconds the Echo takes to bounce back.',
        tr: 'HC-SR04, Trigger (Tetik) vericisinden 40 kHz ultrasonik ses dalgası gönderir ve yankının (Echo) geri dönmesinin kaç mikrosaniye sürdüğünü ölçer.'
      },
      bullets: [
        {
          icon: 'chip',
          text: {
            en: '10 µs HIGH pulse on TRIG Pin 9 launches an ultrasound burst',
            tr: 'TRIG Pin 9 üzerindeki 10 µs HIGH darbesi ultrasonik dalga başlatır'
          }
        },
        {
          icon: 'bulb',
          text: {
            en: 'pulseIn(ECHO, HIGH) measures round-trip time in microseconds',
            tr: 'pulseIn(ECHO, HIGH) gidiş-dönüş süresini mikrosaniye cinsinden ölçer'
          }
        },
        {
          icon: 'gear',
          text: {
            en: 'Distance (cm) = (duration × 0.0343) / 2',
            tr: 'Mesafe (cm) = (süre × 0.0343) / 2 formülüyle hesaplanır'
          }
        }
      ],
      pinout: [
        [
          'Pin 9 (TRIG)',
          {
            en: 'Triggers the ultrasonic transmitter burst',
            tr: 'Ultrasonik verici darbesini tetikler'
          }
        ],
        [
          'Pin 10 (ECHO)',
          {
            en: 'Outputs HIGH pulse proportional to echo travel time',
            tr: 'Yankı uçuş süresine orantılı HIGH darbesi üretir'
          }
        ],
        [
          '5V & GND',
          {
            en: 'Sensor power supply',
            tr: 'Sensör 5V ve GND güç beslemesi'
          }
        ]
      ],
      circuit: {
        en: 'Sound travels at ~343 m/s (0.0343 cm/µs). Dividing the round-trip time by 2 gives the exact distance to the obstacle in centimeters.',
        tr: 'Ses havada ~343 m/s (0.0343 cm/µs) hızla yayılır. Gidiş-dönüş süresini 2\'ye bölmek engele olan tam mesafeyi santimetre olarak verir.'
      },
      specs: [
        [
          { en: 'Operating Voltage', tr: 'Çalışma Gerilimi' },
          '5 V DC'
        ],
        [
          { en: 'Acoustic Frequency', tr: 'Akustik Frekans' },
          '40 kHz'
        ],
        [
          { en: 'Measuring Range', tr: 'Ölçüm Aralığı' },
          '2 cm – 400 cm'
        ],
        [
          { en: 'Measuring Angle', tr: 'Ölçüm Açısı' },
          '15° cone'
        ]
      ],
      code: [
        'const int trigPin = 9;',
        'const int echoPin = 10;',
        '',
        'void setup() {',
        '  pinMode(trigPin, OUTPUT);',
        '  pinMode(echoPin, INPUT);',
        '  Serial.begin(9600);',
        '}',
        '',
        'void loop() {',
        '  digitalWrite(trigPin, HIGH);',
        '  long duration = pulseIn(echoPin, HIGH);',
        '  int distanceCm = duration * 0.034 / 2;',
        '  Serial.println(distanceCm);',
        '  delay(450);',
        '}'
      ],
      circuitLayout: {
        mode: 'breadboard',
        components: [
          {
            key: 'sensor',
            typeId: 'sensor.ultrasonic',
            name: 'HC-SR04 Ultrasonic',
            position: [38, 5.2, 4],
            calloutOffset: [56, -44],
            anchorOffset: [0, 16.8, 0]
          }
        ],
        wires: [
          {
            fromPin: 'PIN9',
            waypoints: [
              [4, 24, -10],
              [36.7, 16, 4],
              [36.7, 5.5, 4]
            ],
            color: '#1aa3a1'
          },
          {
            fromPin: 'PIN10',
            waypoints: [
              [-2, 25, -12],
              [39.3, 16, 4],
              [39.3, 5.5, 4]
            ],
            color: '#ea9a28'
          },
          {
            fromPin: '5V',
            waypoints: [
              [-14, 20, 24],
              [34.2, 15, 4],
              [34.2, 5.5, 4]
            ],
            color: '#e04b3a'
          }
        ]
      }
    });
  }

  startSimulation(sim) {
    const parts = sim.stage.activeParts;
    const step = () => {
      if (!sim.running) return;
      parts.sensor?.setValue(sim.params.distanceCm);
      const d = parts.sensor ? parts.sensor.state.value : sim.params.distanceCm;
      const us = parts.sensor ? parts.sensor.computeEchoMicroseconds() : Math.round((d * 2) / 0.0343);
      sim.onLine(11);
      sim.stage.spawnWave(new THREE.Vector3(38, 12, 8), '#1aa3a1');
      sim.onLog(`Echo: ${us} µs -> Distance: ${d} cm`);
      sim.schedule(step, 550);
    };
    step();
  }
}
