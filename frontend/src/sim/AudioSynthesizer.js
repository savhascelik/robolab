/**
 * Single-Responsibility Web Audio API Tone Synthesizer for Piezo Buzzer simulations.
 */
export class AudioSynthesizer {
  constructor() {
    this.enabled = true;
    this.audioCtx = null;
  }

  playTone(freq, durationMs = 260) {
    if (!this.enabled || typeof window === 'undefined') return;
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioCtx.currentTime + durationMs / 1000
      );

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + durationMs / 1000);
    } catch {
      // Ignore audio errors if blocked by browser autoplay policy
    }
  }
}
