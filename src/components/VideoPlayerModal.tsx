import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VideoItem } from '../types';
import { soundFx } from '../services/soundFx';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, X, SkipBack, SkipForward, Film, Info } from 'lucide-react';

interface VideoPlayerModalProps {
  video: VideoItem | null;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ video, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video?.duration || 0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [showOsd, setShowOsd] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const osdTimerRef = useRef<number | null>(null);

  const resetOsdTimer = useCallback(() => {
    setShowOsd(true);
    if (osdTimerRef.current) {
      window.clearTimeout(osdTimerRef.current);
    }
    osdTimerRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowOsd(false);
      }
    }, 3500);
  }, [isPlaying]);

  useEffect(() => {
    if (video) {
      soundFx.playGameBoot();
      setIsPlaying(true);
      resetOsdTimer();
    }
    return () => {
      if (osdTimerRef.current) window.clearTimeout(osdTimerRef.current);
      if (videoRef.current && video) {
        try {
          localStorage.setItem(`xmb_video_pos_${video.id}`, String(videoRef.current.currentTime));
        } catch {}
      }
    };
  }, [video, resetOsdTimer]);

  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    soundFx.playTick();
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      setShowOsd(true);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
      resetOsdTimer();
    }
  };

  const handleSeek = (timeSec: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(duration || 100, timeSec));
    videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
    resetOsdTimer();
    if (video) {
      try {
        localStorage.setItem(`xmb_video_pos_${video.id}`, String(clamped));
      } catch {}
    }
  };

  const handleStepSeek = (delta: number) => {
    soundFx.playTick();
    if (!videoRef.current) return;
    handleSeek(videoRef.current.currentTime + delta);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current || !video) return;
    const dur = videoRef.current.duration || video.duration || 0;
    setDuration(dur);

    const savedKey = `xmb_video_pos_${video.id}`;
    const savedTime = parseFloat(localStorage.getItem(savedKey) || '0');
    if (savedTime > 3 && savedTime < dur - 10) {
      videoRef.current.currentTime = savedTime;
      setCurrentTime(savedTime);
      setResumeNotice(`Resumed playback from ${formatTime(savedTime)}`);
      setTimeout(() => setResumeNotice(null), 4000);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !video) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    setDuration(videoRef.current.duration || video.duration || 0);

    try {
      localStorage.setItem(`xmb_video_pos_${video.id}`, String(curr));
    } catch {}
  };

  // Gamepad Controller Polling Loop
  const prevGpButtonsRef = useRef<{ [idx: number]: boolean }>({});
  const prevGpAxesRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (!video) return;

    let animId: number;
    const pollGamepad = () => {
      const gamepads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];
      if (gp) {
        const justPressed = (btnIdx: number) => {
          const pressed = Boolean(gp.buttons[btnIdx]?.pressed);
          const wasPressed = prevGpButtonsRef.current[btnIdx] || false;
          prevGpButtonsRef.current[btnIdx] = pressed;
          return pressed && !wasPressed;
        };

        const currX = gp.axes[0] || 0;
        const currY = gp.axes[1] || 0;
        const prevX = prevGpAxesRef.current.x;
        const prevY = prevGpAxesRef.current.y;
        prevGpAxesRef.current = { x: currX, y: currY };

        const stickLeftJust = currX < -0.55 && prevX >= -0.45;
        const stickRightJust = currX > 0.55 && prevX <= 0.45;
        const stickUpJust = currY < -0.55 && prevY >= -0.45;
        const stickDownJust = currY > 0.55 && prevY <= 0.45;

        // Cross (0) or Start (9) -> Play/Pause
        if (justPressed(0) || justPressed(9)) {
          handleTogglePlay();
        }
        // Circle (1) or Triangle (3) -> Close
        else if (justPressed(1) || justPressed(3)) {
          soundFx.playCancel();
          if (videoRef.current && video) {
            try {
              localStorage.setItem(`xmb_video_pos_${video.id}`, String(videoRef.current.currentTime));
            } catch {}
          }
          onClose();
        }
        // D-Pad Left (14) or Stick Left -> Rewind 10s
        else if (justPressed(14) || stickLeftJust) {
          handleStepSeek(-10);
        }
        // D-Pad Right (15) or Stick Right -> Forward 10s
        else if (justPressed(15) || stickRightJust) {
          handleStepSeek(10);
        }
        // D-Pad Up (12) or Stick Up -> Volume Up
        else if (justPressed(12) || stickUpJust) {
          handleVolumeChange(volume + 0.05);
        }
        // D-Pad Down (13) or Stick Down -> Volume Down
        else if (justPressed(13) || stickDownJust) {
          handleVolumeChange(volume - 0.05);
        }
        // L1 (4) -> Rewind 30s
        else if (justPressed(4)) {
          handleStepSeek(-30);
        }
        // R1 (5) -> Forward 30s
        else if (justPressed(5)) {
          handleStepSeek(30);
        }
      }
      animId = requestAnimationFrame(pollGamepad);
    };

    animId = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(animId);
  }, [video, volume, onClose]);

  const handleToggleFullscreen = () => {
    soundFx.playSelect();
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleToggleMute = () => {
    soundFx.playTick();
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    resetOsdTimer();
  };

  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(1, newVol));
    videoRef.current.volume = clamped;
    setVolume(clamped);
    if (isMuted && clamped > 0) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
    resetOsdTimer();
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const h = Math.floor(m / 60);
    if (h > 0) {
      const remM = m % 60;
      return `${h}:${remM < 10 ? '0' : ''}${remM}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Keyboard and controller keys handler
  useEffect(() => {
    if (!video) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          handleTogglePlay();
          break;
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          handleStepSeek(-10);
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          handleStepSeek(10);
          break;
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          handleVolumeChange(volume + 0.05);
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          handleVolumeChange(volume - 0.05);
          break;
        case 'KeyM':
          e.preventDefault();
          handleToggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          handleToggleFullscreen();
          break;
        case 'KeyT':
        case 'KeyO':
          e.preventDefault();
          setShowOsd((prev) => !prev);
          break;
        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          soundFx.playCancel();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  if (!video) return null;

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={resetOsdTimer}
      onClick={resetOsdTimer}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none overflow-hidden animate-in fade-in duration-200"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={video.videoUrl}
        autoPlay
        playsInline
        className="w-full h-full object-contain cursor-pointer"
        onClick={handleTogglePlay}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          setIsPlaying(false);
          setShowOsd(true);
        }}
      />

      {/* Resume Notice Toast Banner */}
      {resumeNotice && (
        <div className="absolute top-20 z-50 px-4 py-2 rounded-xl bg-sky-500/30 border border-sky-400/50 backdrop-blur-md text-sky-200 text-xs font-mono font-bold shadow-[0_0_20px_rgba(56,189,248,0.5)] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          {resumeNotice}
        </div>
      )}

      {/* PS3 On-Screen Display (OSD) Overlay */}
      <div
        className={`absolute inset-0 pointer-events-none flex flex-col justify-between p-6 bg-gradient-to-t from-black/85 via-transparent to-black/75 transition-opacity duration-300 ${
          showOsd ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.4)]">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide font-sans drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]">
                {video.title}
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono text-white/60">
                <span className="px-1.5 py-0.2 rounded bg-white/10 text-sky-300 border border-white/15">
                  {video.format || 'MP4'}
                </span>
                <span>{video.resolution || '1080p'}</span>
                <span>·</span>
                <span>{video.fileSize || 'Local Video'}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFx.playCancel();
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20 shadow-lg cursor-pointer text-xs font-mono"
            title="Press ○ or ESC to close"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Close Player</span>
          </button>
        </div>

        {/* Center Play Indicator on Pause */}
        {!isPlaying && (
          <div className="self-center flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/40 shadow-2xl text-white pointer-events-auto cursor-pointer animate-in zoom-in-90" onClick={handleTogglePlay}>
            <Play className="w-10 h-10 ml-1 fill-white" />
          </div>
        )}

        {/* Bottom PS3 Control Bar */}
        <div className="space-y-3 pointer-events-auto">
          {/* Progress Timeline Slider */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-semibold text-white/90 shrink-0 w-12 text-right">
              {formatTime(currentTime)}
            </span>

            <div className="relative flex-1 flex items-center h-4 group cursor-pointer">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full accent-sky-400 h-1.5 bg-white/25 rounded-lg cursor-pointer transition-all"
              />
            </div>

            <span className="text-xs font-mono font-semibold text-white/60 shrink-0 w-12">
              {formatTime(duration)}
            </span>
          </div>

          {/* Controls Deck */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStepSeek(-10)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Rewind 10 seconds (◄)"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleTogglePlay}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all shadow-[0_0_15px_rgba(56,189,248,0.5)] cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-slate-950" /> : <Play className="w-4 h-4 fill-slate-950" />}
                <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleStepSeek(10)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Forward 10 seconds (►)"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Right Quick Controls */}
            <div className="flex items-center gap-4">
              {/* Volume */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className="p-1.5 text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Toggle Mute (M)"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-sky-400" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-20 accent-sky-400 h-1 bg-white/25 rounded-lg cursor-pointer"
                />
              </div>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={handleToggleFullscreen}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Fullscreen Toggle (F)"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* PS3 Controller Key Hints */}
          <div className="flex items-center justify-between text-[11px] font-mono text-white/40 pt-1 border-t border-white/10">
            <span>✕ / Space: Play · ◄ ►: ±10s · ▲ ▼: Vol</span>
            <span>△: Toggle OSD · ○: Close Video</span>
          </div>
        </div>
      </div>
    </div>
  );
};
