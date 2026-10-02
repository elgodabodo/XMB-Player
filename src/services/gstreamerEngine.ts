/**
 * Linux GStreamer Audio Engine & Web Audio DSP Pipeline
 * Models a complete GStreamer 1.0 pipeline with 10-band equalizer,
 * multi-sink routing (PipeWire, PulseAudio, ALSA, JACK), real-time FFT analyzer,
 * MPRIS2 D-Bus session simulation, and high-fidelity synthesizer fallback.
 */

import { AudioSink, EqualizerBands, GstPipelineStatus, GstState, Track } from '../types';

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS: Record<string, EqualizerBands> = {
  Flat: { b32: 0, b64: 0, b125: 0, b250: 0, b500: 0, b1k: 0, b2k: 0, b4k: 0, b8k: 0, b16k: 0 },
  'PS3 Acoustic': { b32: 3, b64: 2, b125: 1, b250: 0, b500: 1, b1k: 2, b2k: 3, b4k: 4, b8k: 3, b16k: 2 },
  'Bass Boost': { b32: 6, b64: 5, b125: 4, b250: 2, b500: 0, b1k: 0, b2k: 0, b4k: 1, b8k: 2, b16k: 2 },
  'Vocal Clarity': { b32: -2, b64: -1, b125: 0, b250: 1, b500: 3, b1k: 4, b2k: 4, b4k: 3, b8k: 2, b16k: 1 },
  Electronic: { b32: 5, b64: 4, b125: 2, b250: -1, b500: -1, b1k: 1, b2k: 3, b4k: 4, b8k: 5, b16k: 4 },
  Rock: { b32: 4, b64: 3, b125: 1, b250: -1, b500: -1, b1k: 0, b2k: 2, b4k: 3, b8k: 4, b16k: 3 },
};

type StateChangeListener = (state: GstState) => void;
type TrackChangeListener = (track: Track | null) => void;
type TimeUpdateListener = (currentTime: number, duration: number) => void;
type PipelineUpdateListener = (status: GstPipelineStatus) => void;

class GStreamerEngine {
  private audioCtx: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private mediaSourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private eqFilters: BiquadFilterNode[] = [];

  // Synth musical generator for tracks without direct audio URL
  private synthInterval: number | null = null;
  private synthNotes: number[] = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33];
  private synthStep = 0;
  private synthBassOsc: OscillatorNode | null = null;
  private isSynthesizing = false;

  // State
  private currentTrack: Track | null = null;
  private gstState: GstState = 'GST_STATE_NULL';
  private selectedSink: AudioSink = 'pipewiresink';
  private currentTime = 0;
  private duration = 0;
  private volume = 0.8;
  private isMuted = false;
  private underrunCount = 0;
  private cpuUsage = 1.8;
  private customEq: EqualizerBands = { ...EQ_PRESETS.Flat };
  private crossfadeDuration: number = 3; // in seconds (0 = off)

  // Listeners
  private stateListeners: Set<StateChangeListener> = new Set();
  private trackListeners: Set<TrackChangeListener> = new Set();
  private timeListeners: Set<TimeUpdateListener> = new Set();
  private pipelineListeners: Set<PipelineUpdateListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioElement();
    }
  }

  private initAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtx({ latencyHint: 'interactive', sampleRate: 48000 });
      this.buildDspPipeline();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  private initAudioElement() {
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.preload = 'auto';

    this.audioElement.addEventListener('timeupdate', () => {
      if (this.audioElement) {
        this.currentTime = this.audioElement.currentTime;
        this.duration = this.audioElement.duration || this.currentTrack?.duration || 0;
        this.notifyTime();
      }
    });

    this.audioElement.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    this.audioElement.addEventListener('play', () => {
      this.setGstState('GST_STATE_PLAYING');
    });

    this.audioElement.addEventListener('pause', () => {
      if (!this.isSynthesizing) {
        this.setGstState('GST_STATE_PAUSED');
      }
    });

    this.audioElement.addEventListener('error', () => {
      // If external audio source fails or blocked by CORS, fallback to real synth playback
      if (this.currentTrack && this.gstState === 'GST_STATE_PLAYING') {
        this.startSynthPlayback();
      }
    });
  }

  private buildDspPipeline() {
    if (!this.audioCtx) return;

    // Gain / Volume Node
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);

    // FFT Analyser Node for Visualizers
    this.analyserNode = this.audioCtx.createAnalyser();
    this.analyserNode.fftSize = 512;
    this.analyserNode.smoothingTimeConstant = 0.82;

    // 10-Band Equalizer (GStreamer equalizer-10bands)
    this.eqFilters = EQ_FREQUENCIES.map((freq, index) => {
      if (!this.audioCtx) throw new Error();
      const filter = this.audioCtx.createBiquadFilter();
      if (index === 0) {
        filter.type = 'lowshelf';
      } else if (index === EQ_FREQUENCIES.length - 1) {
        filter.type = 'highshelf';
      } else {
        filter.type = 'peaking';
        filter.Q.value = 1.4;
      }
      filter.frequency.value = freq;
      filter.gain.value = 0;
      return filter;
    });

    // Chain EQ Filters in series
    for (let i = 0; i < this.eqFilters.length - 1; i++) {
      this.eqFilters[i].connect(this.eqFilters[i + 1]);
    }

    // Connect last EQ filter to Gain, then Analyser, then Destination (Audio Sink)
    const lastEq = this.eqFilters[this.eqFilters.length - 1];
    lastEq.connect(this.gainNode);
    this.gainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioCtx.destination);

    // Connect AudioElement source to first EQ filter if available
    if (this.audioElement && !this.mediaSourceNode) {
      try {
        this.mediaSourceNode = this.audioCtx.createMediaElementSource(this.audioElement);
        this.mediaSourceNode.connect(this.eqFilters[0]);
      } catch {
        // Source already connected or restricted
      }
    }
  }

  public setCrossfadeDuration(seconds: number) {
    this.crossfadeDuration = Math.max(0, Math.min(12, seconds));
    if (typeof window !== 'undefined') {
      localStorage.setItem('crossbeat_crossfade', this.crossfadeDuration.toString());
    }
  }

  public getCrossfadeDuration(): number {
    return this.crossfadeDuration;
  }

  public async playTrack(track: Track) {
    this.initAudioContext();
    const wasPlaying = this.gstState === 'GST_STATE_PLAYING';

    // If crossfade enabled and audio was playing, perform smooth crossfade transition
    if (wasPlaying && this.crossfadeDuration > 0 && this.gainNode && this.audioCtx) {
      const now = this.audioCtx.currentTime;
      const targetVol = this.isMuted ? 0 : this.volume;
      this.gainNode.gain.cancelScheduledValues(now);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
      // Quick dip & ramp crossfade
      this.gainNode.gain.linearRampToValueAtTime(0.001, now + this.crossfadeDuration * 0.4);
      this.gainNode.gain.linearRampToValueAtTime(targetVol, now + this.crossfadeDuration);
    }

    this.stopSynthPlayback();
    this.currentTrack = track;
    this.currentTime = 0;
    this.duration = track.duration;

    this.notifyTrack();
    this.setGstState('GST_STATE_READY');

    // Update Linux MPRIS2 / MediaSession
    this.updateMediaSession(track);

    if (track.audioUrl && track.audioUrl.startsWith('http') || track.audioUrl?.startsWith('blob:')) {
      if (this.audioElement) {
        try {
          this.audioElement.src = track.audioUrl;
          await this.audioElement.play();
          this.setGstState('GST_STATE_PLAYING');
          return;
        } catch {
          // Playback failed or stream CORS blocked -> fallback gracefully to real synth music generator
          this.startSynthPlayback();
        }
      }
    } else {
      // Synthesized real music generator with track scale and rhythmic sequence
      this.startSynthPlayback();
    }
  }

  private startSynthPlayback() {
    this.initAudioContext();
    if (!this.audioCtx || !this.eqFilters[0]) return;

    this.isSynthesizing = true;
    this.setGstState('GST_STATE_PLAYING');

    const track = this.currentTrack;
    const baseFreq = track?.synthParams?.bassFreq || (track ? (track.id.charCodeAt(0) % 50) + 110 : 130);
    const scale = track?.synthParams?.scale || 'pentatonic';

    // Harmonic scales
    const scales: Record<string, number[]> = {
      pentatonic: [baseFreq, baseFreq * 1.125, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 1.667, baseFreq * 2],
      major: [baseFreq, baseFreq * 1.125, baseFreq * 1.25, baseFreq * 1.333, baseFreq * 1.5, baseFreq * 1.667, baseFreq * 1.875, baseFreq * 2],
      minor: [baseFreq, baseFreq * 1.125, baseFreq * 1.2, baseFreq * 1.333, baseFreq * 1.5, baseFreq * 1.6, baseFreq * 1.8, baseFreq * 2],
      ambient: [baseFreq * 0.75, baseFreq, baseFreq * 1.333, baseFreq * 1.5, baseFreq * 2, baseFreq * 2.25],
    };

    this.synthNotes = scales[scale] || scales.pentatonic;

    // Steady warm bass drone
    try {
      this.synthBassOsc = this.audioCtx.createOscillator();
      const bassGain = this.audioCtx.createGain();
      this.synthBassOsc.type = 'triangle';
      this.synthBassOsc.frequency.setValueAtTime(baseFreq * 0.5, this.audioCtx.currentTime);

      bassGain.gain.setValueAtTime(0.08 * (this.isMuted ? 0 : this.volume), this.audioCtx.currentTime);
      this.synthBassOsc.connect(bassGain);
      bassGain.connect(this.eqFilters[0]);
      this.synthBassOsc.start();
    } catch {}

    // Melodic arpeggio sequencer
    const bpm = track?.synthParams?.tempo || 108;
    const stepIntervalMs = (60 / bpm / 2) * 1000;

    if (this.synthInterval) {
      window.clearInterval(this.synthInterval);
    }

    this.synthInterval = window.setInterval(() => {
      if (!this.audioCtx || this.gstState !== 'GST_STATE_PLAYING' || !this.isSynthesizing) return;

      const t = this.audioCtx.currentTime;
      this.synthStep++;

      // Melodic note
      if (this.synthStep % 2 === 0 || Math.random() > 0.3) {
        const noteIndex = Math.floor(Math.random() * this.synthNotes.length);
        const freq = this.synthNotes[noteIndex];

        const noteOsc = this.audioCtx.createOscillator();
        const noteGain = this.audioCtx.createGain();

        noteOsc.type = this.currentTrack?.synthParams?.leadType || 'sine';
        noteOsc.frequency.setValueAtTime(freq, t);

        const decay = 0.2 + (Math.random() * 0.25);
        noteGain.gain.setValueAtTime(0.09 * (this.isMuted ? 0 : this.volume), t);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, t + decay);

        noteOsc.connect(noteGain);
        noteGain.connect(this.eqFilters[0]);

        noteOsc.start(t);
        noteOsc.stop(t + decay + 0.05);
      }

      // Track time progress
      this.currentTime += (stepIntervalMs / 1000);
      if (this.currentTrack && this.currentTime >= this.currentTrack.duration) {
        this.handleTrackEnded();
      } else {
        this.notifyTime();
      }
    }, stepIntervalMs);
  }

  private stopSynthPlayback() {
    this.isSynthesizing = false;
    if (this.synthInterval) {
      window.clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    if (this.synthBassOsc) {
      try {
        this.synthBassOsc.stop();
        this.synthBassOsc.disconnect();
      } catch {}
      this.synthBassOsc = null;
    }
  }

  public pause() {
    if (this.isSynthesizing) {
      this.setGstState('GST_STATE_PAUSED');
      return;
    }
    if (this.audioElement && !this.audioElement.paused) {
      this.audioElement.pause();
    }
    this.setGstState('GST_STATE_PAUSED');
  }

  public resume() {
    if (this.isSynthesizing) {
      this.setGstState('GST_STATE_PLAYING');
      return;
    }
    if (this.audioElement && this.audioElement.paused) {
      this.audioElement.play().catch(() => this.startSynthPlayback());
    }
    this.setGstState('GST_STATE_PLAYING');
  }

  public togglePlayPause() {
    if (this.gstState === 'GST_STATE_PLAYING') {
      this.pause();
    } else {
      this.resume();
    }
  }

  public seek(seconds: number) {
    this.currentTime = Math.max(0, Math.min(this.duration, seconds));
    if (this.audioElement && !this.isSynthesizing) {
      this.audioElement.currentTime = this.currentTime;
    }
    this.notifyTime();
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);
    }
    if (this.audioElement) {
      this.audioElement.muted = this.isMuted;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setSink(sink: AudioSink) {
    this.selectedSink = sink;
    // Simulate brief pipeline state transition
    const prevState = this.gstState;
    this.setGstState('GST_STATE_READY');
    setTimeout(() => {
      this.setGstState(prevState);
      this.notifyPipeline();
    }, 250);
  }

  public setEqualizerBand(bandKey: keyof EqualizerBands, dbGain: number) {
    this.customEq[bandKey] = dbGain;
    const bandMap: Record<keyof EqualizerBands, number> = {
      b32: 0,
      b64: 1,
      b125: 2,
      b250: 3,
      b500: 4,
      b1k: 5,
      b2k: 6,
      b4k: 7,
      b8k: 8,
      b16k: 9,
    };
    const filterIdx = bandMap[bandKey];
    if (this.eqFilters[filterIdx] && this.audioCtx) {
      this.eqFilters[filterIdx].gain.setValueAtTime(dbGain, this.audioCtx.currentTime);
    }
  }

  public applyPreset(presetName: keyof typeof EQ_PRESETS) {
    const preset = EQ_PRESETS[presetName] || EQ_PRESETS.Flat;
    this.customEq = { ...preset };
    (Object.keys(preset) as (keyof EqualizerBands)[]).forEach((key) => {
      this.setEqualizerBand(key, preset[key]);
    });
  }

  public getEqualizerBands(): EqualizerBands {
    return { ...this.customEq };
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyserNode) {
      return new Uint8Array(64).fill(0);
    }
    const buffer = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(buffer);
    return buffer;
  }

  public getTimeDomainData(): Uint8Array {
    if (!this.analyserNode) {
      return new Uint8Array(64).fill(128);
    }
    const buffer = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteTimeDomainData(buffer);
    return buffer;
  }

  public getPipelineStatus(): GstPipelineStatus {
    const srcDesc = this.currentTrack?.source === 'youtube'
      ? 'souphttpsrc location="https://music.youtube.com/..."'
      : this.currentTrack?.source === 'spotify'
      ? 'spotifysrc uri="spotify:track:..."'
      : 'filesrc location="/home/user/Music/..."';

    const pipelineString = `${srcDesc} ! decodebin ! audioconvert ! audioresample ! equalizer-10bands ! volume ! ${this.selectedSink}`;

    return {
      state: this.gstState,
      sink: this.selectedSink,
      bufferLatencyMs: this.selectedSink === 'pipewiresink' ? 5.3 : this.selectedSink === 'jackaudiosink' ? 2.1 : 12.5,
      underruns: this.underrunCount,
      cpuUsagePct: this.gstState === 'GST_STATE_PLAYING' ? Number((this.cpuUsage + Math.random() * 0.4).toFixed(1)) : 0.2,
      pipelineString,
      sampleRate: this.currentTrack?.sampleRate || 48000,
      channels: 2,
      bitDepth: this.currentTrack?.bitDepth || 24,
    };
  }

  private setGstState(newState: GstState) {
    this.gstState = newState;
    this.stateListeners.forEach((l) => l(newState));
    this.notifyPipeline();
  }

  private notifyTrack() {
    this.trackListeners.forEach((l) => l(this.currentTrack));
  }

  private notifyTime() {
    this.timeListeners.forEach((l) => l(this.currentTime, this.duration));
  }

  private notifyPipeline() {
    const status = this.getPipelineStatus();
    this.pipelineListeners.forEach((l) => l(status));
  }

  private handleTrackEnded() {
    this.stopSynthPlayback();
    this.currentTime = 0;
    this.setGstState('GST_STATE_READY');
    // Dispatch custom event for playlist auto-next
    window.dispatchEvent(new CustomEvent('xmb:trackEnded'));
  }

  private updateMediaSession(track: Track) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: [
          { src: track.coverUrl, sizes: '512x512', type: 'image/jpeg' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => this.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        window.dispatchEvent(new CustomEvent('xmb:nextTrack'));
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        window.dispatchEvent(new CustomEvent('xmb:prevTrack'));
      });
    }
  }

  // Subscribe methods
  public onStateChange(listener: StateChangeListener) {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  public onTrackChange(listener: TrackChangeListener) {
    this.trackListeners.add(listener);
    return () => this.trackListeners.delete(listener);
  }

  public onTimeUpdate(listener: TimeUpdateListener) {
    this.timeListeners.add(listener);
    return () => this.timeListeners.delete(listener);
  }

  public onPipelineUpdate(listener: PipelineUpdateListener) {
    this.pipelineListeners.add(listener);
    return () => this.pipelineListeners.delete(listener);
  }

  public getCurrentTrack(): Track | null {
    return this.currentTrack;
  }

  public getGstState(): GstState {
    return this.gstState;
  }

  public getAudioContext(): AudioContext | null {
    return this.audioCtx;
  }
}

export const gstEngine = new GStreamerEngine();
