/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // A warm wood-on-wood clack sound for solid piece moves
  playMove() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      console.warn("Audio failure ignored for compliance:", e);
    }
  }

  // A louder clack with a crash effect for captures
  playCapture() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.15);

      osc2.type = "sine";
      osc2.frequency.setValueAtTime(100, this.ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc2.start();
      osc.stop(this.ctx.currentTime + 0.15);
      osc2.stop(this.ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio capture sound failed gracefully:", e);
    }
  }

  // Warning alarm of 2 high pitches for checking generals
  playCheck() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const time = this.ctx.currentTime;
      // Note 1
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.frequency.setValueAtTime(440, time);
      gain1.gain.setValueAtTime(0.2, time);
      gain1.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(time);
      osc1.stop(time + 0.12);

      // Note 2 slightly delayed
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.frequency.setValueAtTime(554.37, time + 0.1);
      gain2.gain.setValueAtTime(0.2, time + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(time + 0.1);
      osc2.stop(time + 0.25);
    } catch (e) {
      console.warn("Audio check sound failed gracefully:", e);
    }
  }

  // Soft ascending warm chord for win / checkmate
  playWin() {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const notes = [261.63, 329.63, 392.00, 523.25]; // C major arpeggio
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        const start = this.ctx!.currentTime + idx * 0.12;

        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.005, start + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch (e) {
      console.warn("Audio victory sound failed gracefully:", e);
    }
  }
}

export const sounds = new SoundEffectsEngine();
