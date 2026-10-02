import React, { useState } from 'react';
import { AudioSink, EqualizerBands, GstPipelineStatus, Track } from '../types';
import { EQ_FREQUENCIES, EQ_PRESETS, gstEngine } from '../services/gstreamerEngine';
import { X, Activity, Sliders, Cpu, Terminal, RefreshCw, CheckCircle2 } from 'lucide-react';
import { soundFx } from '../services/soundFx';

interface GStreamerInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: GstPipelineStatus;
  currentTrack: Track | null;
}

export const GStreamerInspectorModal: React.FC<GStreamerInspectorModalProps> = ({
  isOpen,
  onClose,
  status,
  currentTrack,
}) => {
  const [bands, setBands] = useState<EqualizerBands>(gstEngine.getEqualizerBands());
  const [selectedPreset, setSelectedPreset] = useState<string>('Flat');
  const [activeTab, setActiveTab] = useState<'pipeline' | 'equalizer' | 'mpris'>('equalizer');

  if (!isOpen) return null;

  const handleBandChange = (key: keyof EqualizerBands, val: number) => {
    gstEngine.setEqualizerBand(key, val);
    setBands({ ...gstEngine.getEqualizerBands() });
    setSelectedPreset('Custom');
  };

  const handlePresetSelect = (presetName: string) => {
    soundFx.playTick();
    setSelectedPreset(presetName);
    gstEngine.applyPreset(presetName as keyof typeof EQ_PRESETS);
    setBands({ ...gstEngine.getEqualizerBands() });
  };

  const handleSinkChange = (sink: AudioSink) => {
    soundFx.playSelect();
    gstEngine.setSink(sink);
  };

  const bandKeys: (keyof EqualizerBands)[] = [
    'b32', 'b64', 'b125', 'b250', 'b500', 'b1k', 'b2k', 'b4k', 'b8k', 'b16k',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] bg-slate-950 border border-white/15 rounded-xl shadow-2xl overflow-hidden text-slate-200 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <Sliders className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold text-white tracking-wide font-display uppercase">
                GStreamer 1.0 DSP & Audio Pipeline
              </h2>
              <p className="text-xs text-white/50 font-mono">
                Linux Native Multimedia Subsystem · org.freedesktop.GStreamer
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playCancel();
              onClose();
            }}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-white/10 bg-slate-900/50">
          <button
            onClick={() => {
              soundFx.playTick();
              setActiveTab('equalizer');
            }}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'equalizer'
                ? 'border-sky-400 text-white'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            10-Band Graphic Equalizer
          </button>
          <button
            onClick={() => {
              soundFx.playTick();
              setActiveTab('pipeline');
            }}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'pipeline'
                ? 'border-sky-400 text-white'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            Pipeline Graph & Sinks
          </button>
          <button
            onClick={() => {
              soundFx.playTick();
              setActiveTab('mpris');
            }}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'mpris'
                ? 'border-sky-400 text-white'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            MPRIS2 D-Bus & Telemetry
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'equalizer' && (
            <div className="space-y-6">
              {/* Presets Row */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-medium text-white/80">
                  Acoustic Profiles:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(EQ_PRESETS).map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePresetSelect(p)}
                      className={`px-3 py-1 text-xs rounded transition-colors ${
                        selectedPreset === p
                          ? 'bg-sky-500 text-white font-medium shadow-sm'
                          : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* 10 Slider Bands */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 p-5 rounded-lg bg-black/40 border border-white/10">
                {bandKeys.map((key, idx) => {
                  const freqLabel = EQ_FREQUENCIES[idx] >= 1000 ? `${EQ_FREQUENCIES[idx] / 1000}k` : `${EQ_FREQUENCIES[idx]}`;
                  const val = bands[key] || 0;

                  return (
                    <div key={key} className="flex flex-col items-center gap-2">
                      <span className="text-[11px] font-mono text-white/70">
                        {val > 0 ? `+${val}` : val}dB
                      </span>
                      <div className="relative h-44 flex items-center justify-center">
                        <input
                          type="range"
                          min="-12"
                          max="12"
                          step="0.5"
                          value={val}
                          onChange={(e) => handleBandChange(key, parseFloat(e.target.value))}
                          className="h-36 w-2 appearance-none bg-white/20 rounded-full cursor-pointer accent-sky-400 rotate-270"
                        />
                      </div>
                      <span className="text-xs font-mono font-medium text-white/90">
                        {freqLabel}Hz
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-white/50 font-mono">
                <span>Element: gst-plugins-good / equalizer-10bands</span>
                <span>Range: -12.0 dB to +12.0 dB</span>
              </div>
            </div>
          )}

          {activeTab === 'pipeline' && (
            <div className="space-y-6">
              {/* Pipeline Visual Block Diagram */}
              <div>
                <label className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                  Active GStreamer Pipeline String
                </label>
                <div className="mt-2 p-3 bg-black/60 rounded border border-white/10 font-mono text-xs text-emerald-400 break-all select-all">
                  gst-launch-1.0 -v {status.pipelineString}
                </div>
              </div>

              {/* Interactive Audio Sink Selector */}
              <div>
                <label className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                  Linux Audio Sink Routing
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {[
                    {
                      id: 'pipewiresink' as AudioSink,
                      name: 'PipeWire Audio Sink',
                      desc: 'Modern low-latency Linux multimedia router (Default)',
                      latency: '5.3ms',
                    },
                    {
                      id: 'pulsesink' as AudioSink,
                      name: 'PulseAudio Sink',
                      desc: 'Standard desktop session compatibility sink',
                      latency: '14.2ms',
                    },
                    {
                      id: 'alsasink' as AudioSink,
                      name: 'ALSA Direct Hardware Sink',
                      desc: 'Direct Linux kernel sound card abstraction',
                      latency: '8.1ms',
                    },
                    {
                      id: 'jackaudiosink' as AudioSink,
                      name: 'JACK Audio Connection Kit',
                      desc: 'Professional real-time ultra-low latency server',
                      latency: '2.1ms',
                    },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSinkChange(s.id)}
                      className={`flex flex-col text-left p-3.5 rounded-lg border transition-all ${
                        status.sink === s.id
                          ? 'bg-sky-950/40 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-semibold text-white">
                          {s.name}
                        </span>
                        {status.sink === s.id && (
                          <CheckCircle2 className="w-4 h-4 text-sky-400" />
                        )}
                      </div>
                      <span className="text-xs text-white/60 mt-1">{s.desc}</span>
                      <span className="text-[11px] font-mono text-white/40 mt-2">
                        Buffer Latency: {s.latency}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'mpris' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-black/50 border border-white/10 font-mono text-xs space-y-2">
                <div className="text-sky-400 font-semibold">
                  # D-Bus Destination: org.mpris.MediaPlayer2.XMBPlayer
                </div>
                <div className="text-white/80">
                  org.mpris.MediaPlayer2.Identity: "XMBPlayer Linux Native"
                </div>
                <div className="text-white/80">
                  org.mpris.MediaPlayer2.Player.PlaybackStatus: "{status.state.replace('GST_STATE_', '')}"
                </div>
                <div className="text-white/80">
                  org.mpris.MediaPlayer2.Player.Volume: {gstEngine.getVolume().toFixed(2)}
                </div>
                <div className="text-white/80">
                  org.mpris.MediaPlayer2.Player.Metadata: {'{'}
                  <div className="pl-4 text-white/70">
                    'xesam:title': '{currentTrack?.title || 'None'}',
                    <br />
                    'xesam:artist': ['{currentTrack?.artist || 'None'}'],
                    <br />
                    'xesam:album': '{currentTrack?.album || 'None'}',
                    <br />
                    'mpris:length': {((currentTrack?.duration || 0) * 1000000).toLocaleString()} µs
                  </div>
                  {'}'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white/5 border border-white/10 rounded">
                  <span className="text-[11px] text-white/50 block">CPU Load</span>
                  <span className="text-base font-mono font-bold text-white">
                    {status.cpuUsagePct}%
                  </span>
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded">
                  <span className="text-[11px] text-white/50 block">Buffer Underruns</span>
                  <span className="text-base font-mono font-bold text-emerald-400">
                    {status.underruns} (0.00%)
                  </span>
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded">
                  <span className="text-[11px] text-white/50 block">Clock Sync</span>
                  <span className="text-base font-mono font-bold text-white">
                    GstSystemClock
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-white/5 text-xs text-white/60">
          <span className="font-mono">GStreamer Core 1.24.1 · libpipewire-0.3</span>
          <button
            onClick={() => {
              soundFx.playCancel();
              onClose();
            }}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
