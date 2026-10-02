/**
 * Authentic PS3 XMB UI Sound Effects Synthesizer
 * Uses Web Audio API to create authentic, clean PlayStation 3 navigation sounds
 */

class SoundFxService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = (() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('xmb_sound_fx_enabled');
      if (stored !== null) return stored === 'true';
    }
    return true;
  })();

  private volume: number = (() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('xmb_sound_fx_volume');
      if (stored !== null) {
        const val = parseFloat(stored);
        if (!isNaN(val)) return Math.max(0, Math.min(1, val));
      }
    }
    return 0.45;
  })();

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('xmb_sound_fx_enabled', String(enabled));
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('xmb_sound_fx_volume', String(this.volume));
    }
  }

  public increaseVolume(step = 0.1): number {
    this.setVolume(this.volume + step);
    return this.volume;
  }

  public decreaseVolume(step = 0.1): number {
    this.setVolume(this.volume - step);
    return this.volume;
  }

  /**
   * Iconic PS3 XMB Navigation Tick (soft high-frequency wood-like pulse)
   */
  public playTick() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // High gentle pitch with exponential decay
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1480, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.045);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.Q.setValueAtTime(3, t);

      gain.gain.setValueAtTime(this.volume * 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  /**
   * Iconic PS3 Confirm / Select Sound (Pleasant high-pitch double chime)
   */
  public playSelect() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;

      // Note 1
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1318.51, t); // E6
      gain1.gain.setValueAtTime(this.volume * 0.45, t);
      gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(t);
      osc1.stop(t + 0.19);

      // Note 2 slightly delayed
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1760, t + 0.06); // A6
      gain2.gain.setValueAtTime(this.volume * 0.48, t + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t + 0.06);
      osc2.stop(t + 0.3);
    } catch {}
  }

  /**
   * Iconic PS3 Cancel / Back Sound (Descending soft acoustic tone)
   */
  public playCancel() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, t); // B5
      osc.frequency.exponentialRampToValueAtTime(659.25, t + 0.14); // E5

      gain.gain.setValueAtTime(this.volume * 0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    } catch {}
  }

  /**
   * Triangle / Options Menu Sound
   */
  public playOption() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1046.5, t); // C6
      osc.frequency.exponentialRampToValueAtTime(1396.91, t + 0.08); // F6

      gain.gain.setValueAtTime(this.volume * 0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    } catch {}
  }

  /**
   * Distinct PS3 Affirmative Setting Changed Chime (Ascending triad confirmation)
   */
  public playSettingChanged() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const notes = [1046.5, 1318.51, 1567.98]; // C6, E6, G6

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.05);

        gain.gain.setValueAtTime(0.001, t + idx * 0.05);
        gain.gain.linearRampToValueAtTime(this.volume * 0.45, t + idx * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.05 + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t + idx * 0.05);
        osc.stop(t + idx * 0.05 + 0.3);
      });
    } catch {}
  }

  /**
   * PlayStation Game Launch Chime (Ascending 4-note crystal chime + warm bass swell)
   */
  public playGameBoot() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;

      // 1. Ascending 4-Note Crystal Arpeggio Chime
      const notes = [
        { freq: 739.99, delay: 0.00, dur: 0.35, vol: 0.35 },  // F#5
        { freq: 880.00, delay: 0.08, dur: 0.40, vol: 0.40 },  // A5
        { freq: 1108.73, delay: 0.16, dur: 0.50, vol: 0.45 }, // C#6
        { freq: 1479.98, delay: 0.25, dur: 1.20, vol: 0.55 }, // F#6 sparkling bell sustain
      ];

      notes.forEach(({ freq, delay, dur, vol }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + delay);

        gain.gain.setValueAtTime(0.0001, t + delay);
        gain.gain.linearRampToValueAtTime(this.volume * vol, t + delay + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t + delay);
        osc.stop(t + delay + dur + 0.05);
      });

      // 2. Resonant Warm Sub Bass Sweep
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(146.83, t + 0.15); // D3
      subOsc.frequency.exponentialRampToValueAtTime(73.42, t + 1.6); // D2
      subGain.gain.setValueAtTime(0.0001, t + 0.15);
      subGain.gain.linearRampToValueAtTime(this.volume * 0.45, t + 0.3);
      subGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(t + 0.15);
      subOsc.stop(t + 1.85);

      // 3. Shimmering Detuned Chord Body (D Major 9th)
      const chordFreqs = [293.66, 369.99, 440.00, 554.37, 659.25]; // D4, F#4, A4, C#5, E5
      chordFreqs.forEach((freq, i) => {
        if (!this.ctx) return;

        [-6, 6].forEach((detune) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = i % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, t + 0.2 + i * 0.02);
          osc.detune.setValueAtTime(detune, t + 0.2);

          gain.gain.setValueAtTime(0.0001, t + 0.2 + i * 0.02);
          gain.gain.linearRampToValueAtTime(this.volume * 0.08, t + 0.45);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(t + 0.2 + i * 0.02);
          osc.stop(t + 2.25);
        });
      });
    } catch {}
  }

  /**
   * PS3 System Boot chord
   */
  public playBootChord() {
    this.playGameBoot();
  }
}

export const soundFx = new SoundFxService();
