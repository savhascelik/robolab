import { BaseLesson } from '../../core/lessons/BaseLesson.js';

export class PotentiometerKnobLesson extends BaseLesson {
  constructor() {
    super({
      id: 'knob',
      number: 4,
      title: {
        en: 'Turn a Knob',
        tr: 'Potansiyometre & PWM'
      },
      heading: {
        en: 'Potentiometer & PWM Dimming',
        tr: 'Potansiyometre ve PWM Parlaklık Kontrolü'
      },
      summary: {
        en: 'A potentiometer is a rotary voltage divider. Turning the knob sweeps the voltage on Analog Pin A0 from 0V to 5V, which dims the LED smoothly via PWM.',
        tr: 'Potansiyometre döner bir gerilim bölücüdür. Düğmeyi çevirmek Analog Pin A0 üzerindeki gerilimi 0V ile 5V arasında değiştirir ve LED parlaklığını PWM ile pürüzsüzce kısar.'
      },
      bullets: [
        {
          icon: 'gear',
          text: {
            en: 'analogRead(A0) measures voltage as a number from 0 to 1023',
            tr: 'analogRead(A0) gerilimi 0 ile 1023 arasında sayısal bir değere dönüştürür'
          }
        },
        {
          icon: 'bulb',
          text: {
            en: 'analogWrite(9, pwm) pulses Pin 9 at 490 Hz (0–255 duty cycle)',
            tr: 'analogWrite(9, pwm) Pin 9\'u 490 Hz darbe genişliğiyle (0–255) sürer'
          }
        },
        {
          icon: 'chip',
          text: {
            en: 'Drag the knob slider during simulation to rotate the 3D shaft',
            tr: 'Simülasyon sırasında 3D mili döndürmek için sağ üstteki kaydırıcıyı sürükleyin'
          }
        }
      ],
      pinout: [
        [
          'A0',
          {
            en: 'Potentiometer center wiper pin (0–5V variable)',
            tr: 'Potansiyometre orta silecek (wiper) pini (0–5V değişken)'
          }
        ],
        [
          'Pin ~9',
          {
            en: 'PWM output → 220 Ω resistor → Amber LED',
            tr: 'PWM çıkışı → 220 Ω direnç → Kehribar LED'
          }
        ],
        [
          '5V & GND',
          {
            en: 'Outer terminals of the 10kΩ potentiometer',
            tr: '10kΩ potansiyometrenin dış besleme bacakları'
          }
        ]
      ],
      circuit: {
        en: 'The 10-bit ADC converts the wiper voltage into 0–1023. Dividing by 4 maps it to 0–255 for PWM LED brightness control.',
        tr: 'Yerleşik ADC, silecek gerilimini sayısal değere dönüştürür ve 0–255 aralığına oranlayarak PWM LED parlaklığını kontrol eder.'
      },
      specs: [
        [
          { en: 'Potentiometer Resistance', tr: 'Potansiyometre Direnci' },
          '10 kΩ Linear Taper'
        ],
        [
          { en: 'ADC Resolution', tr: 'ADC Çözünürlüğü' },
          '10-bit (1024 steps)'
        ],
        [
          { en: 'PWM Resolution', tr: 'PWM Çözünürlüğü' },
          '8-bit (256 steps @ 490 Hz)'
        ],
        [
          { en: 'Rotation Angle', tr: 'Dönüş Açısı' },
          '270° mechanical sweep'
        ]
      ],
      code: [
        'void setup() {',
        '  pinMode(9, OUTPUT);',
        '  Serial.begin(9600);',
        '}',
        '',
        'void loop() {',
        '  int sensorVal = analogRead(A0);',
        '  int pwmOutput = map(sensorVal, 0, 1023, 0, 255);',
        '  analogWrite(9, pwmOutput);',
        '  Serial.println(pwmOutput);',
        '  delay(200);',
        '}'
      ],
      circuitLayout: {
        mode: 'breadboard',
        components: [
          {
            key: 'pot',
            typeId: 'sensor.potentiometer',
            name: '10kΩ Potentiometer',
            position: [25, 5.2, 4],
            calloutOffset: [-42, -45],
            anchorOffset: [0, 14.8, 0]
          },
          {
            key: 'led',
            typeId: 'led.single',
            name: 'PWM Amber LED',
            description: 'Driven by analogWrite(9, brightness) from 0 to 255.',
            color: '#f09c2b',
            position: [48, 5.2, 3],
            calloutOffset: [65, -34],
            anchorOffset: [0, 12.8, 0]
          },
          {
            key: 'resistor',
            typeId: 'passive.resistor',
            name: '220 Ω Resistor',
            position: [40, 5.2, 11],
            includeCallout: false
          }
        ],
        wires: [
          {
            fromPin: 'A0',
            waypoints: [
              [4, 21, 22],
              [25, 18, 7.2],
              [25, 5.5, 7.2]
            ],
            color: '#2fa866'
          },
          {
            fromPin: '5V',
            waypoints: [
              [-18, 19, 25],
              [22.5, 16, 7.2],
              [22.5, 5.5, 7.2]
            ],
            color: '#e04b3a'
          },
          {
            fromPin: 'PIN9',
            waypoints: [
              [2, 25, -14],
              [33.5, 19, 11],
              [33.5, 5.5, 11]
            ],
            color: '#ea9a28'
          }
        ]
      }
    });
  }

  startSimulation(sim) {
    const parts = sim.stage.activeParts;
    const step = () => {
      if (!sim.running) return;
      const adc = parts.pot ? parts.pot.readAnalog10Bit() : sim.params.knobValue;
      const pwm = Math.round((adc / 1023) * 255);
      sim.onLine(7);
      parts.led?.setPwm(pwm);
      sim.onLog(`A0 = ${adc} (${((adc / 1023) * 5).toFixed(2)}V) -> PWM Pin 9 = ${pwm}`);
      sim.schedule(step, 450);
    };
    step();
  }
}
