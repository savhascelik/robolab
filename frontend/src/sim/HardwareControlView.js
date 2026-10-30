import { i18n } from '../core/i18n/I18nService.js';

/**
 * Single-Responsibility UI View for Live 3D Hardware Controls (#sim-controls).
 * Directly interacts with `BaseButton`, `BaseSensor`, `BaseMotor`, and `BaseLightEmitter`
 * component instances registered in `ComponentRegistry` and updates labels via `i18n`.
 */
export class HardwareControlView {
  constructor({ controlsEl, stage, simulator }) {
    this.controlsEl = controlsEl;
    this.stage = stage;
    this.simulator = simulator;
    this.activeLessonId = null;

    this._unsubscribeI18n = i18n.onChange(() => {
      if (this.activeLessonId) {
        this.render(this.activeLessonId);
      }
    });
  }

  render(lessonId) {
    this.activeLessonId = lessonId;
    if (!this.controlsEl) return;
    this.controlsEl.innerHTML = '';

    const parts = this.stage.activeParts;

    if (lessonId === 'button') {
      this.controlsEl.hidden = false;
      this.controlsEl.innerHTML = `
        <span class="sim-controls-title">${i18n.t('ui.controls.hardwareInput')}</span>
        <div class="sim-ctrl-row">
          <span>${i18n.t('ui.controls.pin2Switch')}</span>
          <button type="button" class="sim-btn-hold" id="sim-btn-toggle">${i18n.t('ui.controls.pressAndHold')}</button>
        </div>
      `;
      const btnEl = this.controlsEl.querySelector('#sim-btn-toggle');
      const setPress = (pressed) => {
        this.simulator.params.buttonPressed = pressed;
        btnEl.classList.toggle('is-pressed', pressed);
        btnEl.textContent = pressed
          ? i18n.t('ui.controls.pressedLow')
          : i18n.t('ui.controls.pressAndHold');

        // Invoke BaseButton OOP methods across all registered button instances in the circuit
        this.stage.registry.invokeOnCategory('buttons', (btnComp) =>
          pressed ? btnComp.press() : btnComp.release()
        );
        parts.led?.setBrightness(pressed ? 1 : 0);
        this.stage.setBoardLed('l', pressed);

        if (this.simulator.running) {
          this.simulator.onLog(
            `Pin 2 = ${pressed ? 'LOW (Pressed) -> LED ON' : 'HIGH (Released) -> LED OFF'}`
          );
        }
      };
      btnEl.addEventListener('pointerdown', () => setPress(true));
      if (typeof window !== 'undefined') {
        window.addEventListener('pointerup', () => {
          if (this.simulator.params.buttonPressed) setPress(false);
        });
      }
    } else if (lessonId === 'knob') {
      this.controlsEl.hidden = false;
      this.controlsEl.innerHTML = `
        <span class="sim-controls-title">${i18n.t('ui.controls.potentiometerTitle')}</span>
        <div class="sim-ctrl-row">
          <input type="range" min="0" max="1023" value="${this.simulator.params.knobValue}" id="sim-knob-range" />
          <span id="sim-knob-val">${this.simulator.params.knobValue}</span>
        </div>
      `;
      const range = this.controlsEl.querySelector('#sim-knob-range');
      const valEl = this.controlsEl.querySelector('#sim-knob-val');
      const updateKnob = (val) => {
        const numeric = Number(val);
        this.simulator.params.knobValue = numeric;
        valEl.textContent = String(numeric);
        parts.pot?.setValue(numeric);
        if (this.simulator.running) {
          parts.led?.setBrightness(numeric / 1023);
        }
      };
      updateKnob(this.simulator.params.knobValue);
      range.addEventListener('input', (e) => updateKnob(e.target.value));
    } else if (lessonId === 'sensor') {
      this.controlsEl.hidden = false;
      this.controlsEl.innerHTML = `
        <span class="sim-controls-title">${i18n.t('ui.controls.targetDistance')}</span>
        <div class="sim-ctrl-row">
          <input type="range" min="4" max="120" value="${this.simulator.params.distanceCm}" id="sim-dist-range" />
          <span id="sim-dist-val">${this.simulator.params.distanceCm} cm</span>
        </div>
      `;
      const range = this.controlsEl.querySelector('#sim-dist-range');
      const valEl = this.controlsEl.querySelector('#sim-dist-val');
      const updateDist = (val) => {
        const numeric = Number(val);
        this.simulator.params.distanceCm = numeric;
        valEl.textContent = `${numeric} cm`;
        parts.sensor?.setValue(numeric);
      };
      updateDist(this.simulator.params.distanceCm);
      range.addEventListener('input', (e) => updateDist(e.target.value));
    } else if (lessonId === 'motor') {
      this.controlsEl.hidden = false;
      this.controlsEl.innerHTML = `
        <span class="sim-controls-title">${i18n.t('ui.controls.pwmSpeed')}</span>
        <div class="sim-ctrl-row">
          <input type="range" min="0" max="255" value="${this.simulator.params.motorPower}" id="sim-motor-range" />
          <span id="sim-motor-val">${this.simulator.params.motorPower}</span>
        </div>
      `;
      const range = this.controlsEl.querySelector('#sim-motor-range');
      const valEl = this.controlsEl.querySelector('#sim-motor-val');
      range.addEventListener('input', (e) => {
        const numeric = Number(e.target.value);
        this.simulator.params.motorPower = numeric;
        valEl.textContent = String(numeric);
        if (this.simulator.running) {
          parts.motor?.setPwm(numeric);
        }
      });
    } else {
      this.controlsEl.hidden = true;
    }
  }
}
