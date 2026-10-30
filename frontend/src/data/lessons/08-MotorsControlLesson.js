import { BaseLesson } from '../../core/lessons/BaseLesson.js';

export class MotorsControlLesson extends BaseLesson {
  constructor() {
    super({
      id: 'motor',
      number: 8,
      title: {
        en: 'Control Motors',
        tr: 'Motor ve Servo Sür'
      },
      heading: {
        en: 'DC Fan & SG90 Micro Servo',
        tr: 'DC Fan Motoru ve SG90 Mikro Servo'
      },
      summary: {
        en: 'Combine continuous rotation and precision angle control: Pin 6 drives the DC fan speed via PWM while Pin 9 sweeps the SG90 micro servo horn from 0° to 180°.',
        tr: 'Sürekli dönüş ve hassas açı kontrolünü birleştirin: Pin 6 PWM ile DC fan hızını sürerken, Pin 9 SG90 mikro servo kolunu 0° ile 180° arasında tarar.'
      },
      bullets: [
        {
          icon: 'gear',
          text: {
            en: 'DC motor propeller spins proportional to PWM voltage',
            tr: 'DC motor pervanesi PWM görev döngüsüyle orantılı hızda döner'
          }
        },
        {
          icon: 'chip',
          text: {
            en: 'SG90 Servo uses 50 Hz pulses (1–2 ms) to hold an exact angle',
            tr: 'SG90 Servo tam açıyı korumak için 50 Hz (1–2 ms) darbeler kullanır'
          }
        },
        {
          icon: 'bulb',
          text: {
            en: 'Adjust the speed & angle slider live while the sketch runs!',
            tr: 'Simülasyon çalışırken sağ üstten PWM hızını canlı değiştirin!'
          }
        }
      ],
      pinout: [
        [
          'Pin ~6',
          {
            en: 'DC Fan Motor PWM speed control',
            tr: 'DC Fan Motoru PWM hız kontrol çıkışı'
          }
        ],
        [
          'Pin ~9',
          {
            en: 'SG90 Servo orange signal wire (50 Hz PWM)',
            tr: 'SG90 Servo turuncu sinyal hattı (50 Hz PWM)'
          }
        ],
        [
          '5V & GND',
          {
            en: 'Actuator power supply',
            tr: 'Motor ve servo güç beslemesi'
          }
        ]
      ],
      circuit: {
        en: 'The servo internal feedback potentiometer compares its shaft angle against the incoming pulse width and drives its gearbox to match.',
        tr: 'Servonun dahili geri besleme potansiyometresi mil açısını gelen darbe genişliğiyle karşılaştırır ve dişli kutusunu hedef açıya kilitler.'
      },
      specs: [
        [
          { en: 'Servo Model', tr: 'Servo Modeli' },
          'SG90 Micro Servo (0° – 180°)'
        ],
        [
          { en: 'DC Motor Speed', tr: 'DC Motor Hızı' },
          'Up to 6,000 RPM @ 5 V'
        ],
        [
          { en: 'Servo Pulse Width', tr: 'Servo Darbe Genişliği' },
          '500 µs – 2400 µs @ 50 Hz'
        ],
        [
          { en: 'Control Pins', tr: 'Kontrol Pinleri' },
          'D6 (PWM) & D9 (Servo)'
        ]
      ],
      code: [
        '#include <Servo.h>',
        'Servo myServo;',
        '',
        'void setup() {',
        '  myServo.attach(9);',
        '  pinMode(6, OUTPUT);',
        '}',
        '',
        'void loop() {',
        '  analogWrite(6, 200);',
        '  myServo.write(25);',
        '  delay(700);',
        '  myServo.write(155);',
        '  delay(700);',
        '}'
      ],
      circuitLayout: {
        mode: 'breadboard',
        components: [
          {
            key: 'servo',
            typeId: 'motor.servo',
            name: 'SG90 Servo',
            position: [20, 5.2, 4],
            calloutOffset: [-48, -44],
            anchorOffset: [-4, 17.8, 0]
          },
          {
            key: 'motor',
            typeId: 'motor.dc',
            name: 'DC Fan Motor',
            position: [42, 5.2, 4],
            calloutOffset: [64, -40],
            anchorOffset: [0, 19.8, 0]
          }
        ],
        wires: [
          {
            fromPin: 'PIN9',
            waypoints: [
              [2, 24, -12],
              [20, 18, 4],
              [20, 5.5, 4]
            ],
            color: '#ea9a28'
          },
          {
            fromPin: 'PIN6',
            waypoints: [
              [12, 25, -10],
              [42, 18, 4],
              [42, 5.5, 4]
            ],
            color: '#1aa3a1'
          }
        ]
      }
    });
  }

  startSimulation(sim) {
    const parts = sim.stage.activeParts;
    let targetAngle = 25;
    parts.motor?.setPwm(sim.params.motorPower);
    const step = () => {
      if (!sim.running) return;
      targetAngle = targetAngle === 25 ? 155 : 25;
      parts.motor?.setPwm(sim.params.motorPower);
      parts.servo?.setTargetAngle(targetAngle);
      sim.onLine(targetAngle === 25 ? 10 : 12);
      sim.onLog(`PWM Pin 6 = ${sim.params.motorPower} | Servo Pin 9 -> ${targetAngle}°`);
      sim.schedule(step, 850);
    };
    step();
  }
}
