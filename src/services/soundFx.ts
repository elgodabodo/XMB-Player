/**
 * Authentic PS3 XMB UI Sound Effects Synthesizer
 * Uses Web Audio API to create authentic, clean PlayStation 3 navigation sounds
 */

class SoundFxService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.45;

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
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
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
   * PlayStation Game Launch Chime
   */
  public playGameBoot() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      // Resonant deep bass sweep + glittering high harmonic
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(110, t);
      subOsc.frequency.exponentialRampToValueAtTime(55, t + 1.2);
      subGain.gain.setValueAtTime(this.volume * 0.6, t);
      subGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(t);
      subOsc.stop(t + 1.5);

      const highOsc = this.ctx.createOscillator();
      const highGain = this.ctx.createGain();
      highOsc.type = 'triangle';
      highOsc.frequency.setValueAtTime(1760, t + 0.1);
      highOsc.frequency.exponentialRampToValueAtTime(2637, t + 0.7);
      highGain.gain.setValueAtTime(this.volume * 0.4, t + 0.1);
      highGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      highOsc.connect(highGain);
      highGain.connect(this.ctx.destination);
      highOsc.start(t + 0.1);
      highOsc.stop(t + 1.3);
    } catch {}
  }

  /**
   * PS3 System Boot chord
   */
  public playBootChord() {
    if (!this.enabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const t = this.ctx.currentTime;
      const frequencies = [220, 329.63, 440, 554.37, 659.25, 880]; // A Major 9th chord

      frequencies.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        const delay = idx * 0.08;
        gain.gain.setValueAtTime(0.001, t + delay);
        gain.gain.linearRampToValueAtTime(this.volume * 0.15, t + delay + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 2.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t + delay);
        osc.stop(t + delay + 2.5);
      });
    } catch {}
  }
}

export const soundFx = new SoundFxService();
