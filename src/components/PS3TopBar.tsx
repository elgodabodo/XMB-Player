import React, { useState, useEffect, useRef } from 'react';
import { GstPipelineStatus, Track, UserProfile } from '../types';
import { Sliders, HardDrive, Gamepad2, Volume2, VolumeX, Sparkles, Youtube, Minus, Plus } from 'lucide-react';
import { soundFx } from '../services/soundFx';

interface PS3TopBarProps {
  pipelineStatus: GstPipelineStatus;
  currentTrack: Track | null;
  onOpenGstInspector: () => void;
  onOpenImport: () => void;
  onOpenCloudServices: () => void;
  isMuted: boolean;
  volume: number;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  gamepadConnected: boolean;
  userProfile?: UserProfile;
  onOpenEditProfile?: () => void;
}

export const PS3TopBar: React.FC<PS3TopBarProps> = ({
  pipelineStatus,
  currentTrack,
  onOpenGstInspector,
  onOpenImport,
  onOpenCloudServices,
  isMuted,
  volume,
  onVolumeChange,
  onToggleMute,
  gamepadConnected,
  userProfile,
  onOpenEditProfile,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [isVolumeDropdownOpen, setIsVolumeDropdownOpen] = useState(false);
  const volumeDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      setDateStr(
        now.toLocaleDateString([], { month: 'numeric', day: 'numeric' })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        volumeDropdownRef.current &&
        !volumeDropdownRef.current.contains(e.target as Node)
      ) {
        setIsVolumeDropdownOpen(false);
      }
    };
    if (isVolumeDropdownOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isVolumeDropdownOpen]);

  const handleStepVolume = (deltaPct: number) => {
    soundFx.playTick();
    const currPct = Math.round(volume * 100);
    const nextPct = Math.max(0, Math.min(100, currPct + deltaPct));
    onVolumeChange(nextPct / 100);
  };

  return (
    <header className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-white/10 select-none text-slate-200">
      {/* Zone 1: Wordmark (Version text removed) */}
      <div className="flex items-center gap-3">
        <span className="font-display text-xl tracking-wider text-white uppercase font-bold drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]">
          XMBPlayer
        </span>
      </div>

      {/* Zone 2: Audio & System Telemetry (PipeWire text removed) */}
      <div className="hidden md:flex items-center gap-3 text-xs text-white/60 font-mono">
        <span>
          {pipelineStatus.sampleRate / 1000}kHz / {pipelineStatus.bitDepth}bit
        </span>
        <span aria-hidden="true" className="text-white/30">·</span>
        <span className={pipelineStatus.state === 'GST_STATE_PLAYING' ? 'text-emerald-400' : 'text-amber-400'}>
          {pipelineStatus.state.replace('GST_STATE_', '')}
        </span>
        {currentTrack && (
          <>
            <span aria-hidden="true" className="text-white/30">·</span>
            <span className="text-white/90 truncate max-w-xs">
              {currentTrack.artist} — {currentTrack.title}
            </span>
          </>
        )}
      </div>

      {/* Zone 3: Quick Controls, Volume Dropdown & Clock */}
      <div className="flex items-center gap-4 text-sm">
        {/* Linux / GStreamer Audio Pipeline Button */}
        <button
          type="button"
          onClick={() => {
            soundFx.playSelect();
            onOpenGstInspector();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Open GStreamer Pipeline Inspector & 10-Band EQ"
        >
          <Sliders className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">GStreamer DSP</span>
        </button>

        {/* Cloud Streaming / YouTube / Spotify */}
        <button
          type="button"
          onClick={() => {
            soundFx.playSelect();
            onOpenCloudServices();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="YouTube Music & Spotify Integration"
        >
          <Youtube className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden sm:inline">Cloud Music</span>
        </button>

        {/* Import Local Audio Files */}
        <button
          type="button"
          onClick={() => {
            soundFx.playSelect();
            onOpenImport();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Import Local Audio Files & Paste Directory"
        >
          <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Import</span>
        </button>

        {/* Volume Icon in Top Right with Dropdown Slider (5% steps) */}
        <div className="relative" ref={volumeDropdownRef}>
          <button
            type="button"
            onClick={() => {
              soundFx.playTick();
              setIsVolumeDropdownOpen((prev) => !prev);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all ${
              isVolumeDropdownOpen
                ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                : 'bg-white/5 border-white/15 text-white/80 hover:bg-white/10 hover:text-white'
            }`}
            title="Volume Control & Slider"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-sky-400" />
            )}
            <span className="text-xs font-mono font-semibold">
              {isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}
            </span>
          </button>

          {/* Volume Dropdown Popover */}
          {isVolumeDropdownOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 p-4 rounded-xl bg-slate-950/95 border border-white/20 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 font-sans">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Master Volume
                </span>
                <span className="text-xs font-mono font-bold text-sky-400">
                  {isMuted ? 'MUTED' : `${Math.round(volume * 100)}%`}
                </span>
              </div>

              {/* Slider in steps of 5 */}
              <div className="flex items-center gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => handleStepVolume(-5)}
                  className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Decrease Volume (-5%)"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={isMuted ? 0 : Math.round(volume * 100)}
                  onChange={(e) => {
                    const newVol = parseInt(e.target.value, 10) / 100;
                    if (isMuted && newVol > 0) onToggleMute();
                    onVolumeChange(newVol);
                  }}
                  className="flex-1 accent-sky-400 h-1.5 bg-white/20 rounded-lg cursor-pointer"
                />

                <button
                  type="button"
                  onClick={() => handleStepVolume(5)}
                  className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Increase Volume (+5%)"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bottom Quick Controls */}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playTick();
                    onToggleMute();
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    isMuted
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-white/10 text-white/80 hover:text-white'
                  }`}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>{isMuted ? 'Unmute' : 'Mute'}</span>
                </button>

                <div className="flex gap-1 text-[11px] font-mono text-white/40">
                  <span>Step: 5%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Gamepad Controller Indicator */}
        <div
          className={`flex items-center gap-1 text-xs ${
            gamepadConnected ? 'text-sky-400' : 'text-white/30'
          }`}
          title={gamepadConnected ? 'PS3 / Linux Gamepad Connected' : 'Gamepad Disconnected (Keyboard Active)'}
        >
          <Gamepad2 className="w-4 h-4" />
        </div>

        {/* User Profile Emblem */}
        {userProfile && (
          <button
            type="button"
            onClick={() => {
              soundFx.playSelect();
              onOpenEditProfile?.();
            }}
            className="flex items-center gap-2 pl-2 border-l border-white/15 hover:opacity-80 transition-opacity cursor-pointer"
            title={`Edit Profile: ${userProfile.username}`}
          >
            <div className="w-6 h-6 rounded-full overflow-hidden border border-white/60 shadow-sm shrink-0">
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.username}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="hidden lg:inline text-xs font-semibold text-white/90 truncate max-w-[100px]">
              {userProfile.username}
            </span>
          </button>
        )}

        {/* PS3 Digital Clock */}
        <div className="flex items-center gap-2 pl-2 border-l border-white/15 font-mono text-sm tracking-tight text-white/90">
          <span>{dateStr}</span>
          <span className="text-white font-semibold">{timeStr}</span>
        </div>
      </div>
    </header>
  );
};
