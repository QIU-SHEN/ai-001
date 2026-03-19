// ============================================
// Sound System
// ============================================
export class SoundSystem {
  constructor() {
    this.ctx = null;
    this.speedPitch = 1;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, duration, vol = 0.3) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.value = freq * this.speedPitch;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playJump() { this.playTone(440, 0.1); }
  playDoubleJump() { this.playTone(660, 0.12); }
  playHit() { this.playTone(150, 0.3, 0.5); }
}
