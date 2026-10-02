import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ControllerType, VideoItem } from '../types';
import { soundFx } from '../services/soundFx';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  RotateCcw,
  FastForward,
  Rewind,
  Film,
  Sparkles,
  Sliders,
  Tv,
} from 'lucide-react';
import { ControllerButtonBadge } from './PS3Icons';

interface VideoPlayerModalProps {
  video: VideoItem | null;
  onClose: () => void;
  controllerType?: ControllerType;
  controllerConnected?: boolean;
}

type AspectRatioMode = 'contain' | 'cover' | 'fill';

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  video,
  onClose,
  controllerType = 'ds4_ds5',
  controllerConnected = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video?.duration || 0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [showOsd, setShowOsd] = useState(true);
  const [aspectMode, setAspectMode] = useState<AspectRatioMode>('contain');
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ label: string; icon?: string } | null>(null);
  const [focusedControlIndex, setFocusedControlIndex] = useState<number>(1); // 1 = Play/Pause button

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const osdTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Gamepad edge-detection refs
  const prevGpButtonsRef = useRef<{ [idx: number]: boolean }>({});
  const prevGpAxesRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const totalSecs = Math.floor(secs);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    const h = Math.floor(m / 60);
    if (h > 0) {
      const remM = m % 60;
      return `${h}:${remM < 10 ? '0' : ''}${remM}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Temporary OSD toast helper
  const showFeedback = useCallback((label: string, icon?: string) => {
    setFeedbackToast({ label, icon });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setFeedbackToast(null), 1800);
  }, []);

  // Reset OSD hide timer
  const resetOsdTimer = useCallback(() => {
    setShowOsd(true);
    if (osdTimerRef.current) window.clearTimeout(osdTimerRef.current);
    osdTimerRef.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowOsd(false);
      }
    }, 4000);
  }, []);

  // Save playback progress to localStorage
  const savePlaybackPosition = useCallback(() => {
    if (videoRef.current && video) {
      const time = videoRef.current.currentTime;
      try {
        localStorage.setItem(`xmb_video_pos_${video.id}`, String(time));
      } catch {}
    }
  }, [video]);

  // Clean Exit Handler
  const handleClose = useCallback(() => {
    savePlaybackPosition();
    if (videoRef.current) {
      videoRef.current.pause();
    }
    soundFx.playCancel();
    onClose();

    // Restore browser and XMB focus
    setTimeout(() => {
      window.focus();
      if (document.body) document.body.focus();
    }, 50);
  }, [savePlaybackPosition, onClose]);

  // Play / Pause Toggle
  const handleTogglePlay = useCallback(() => {
    if (!videoRef.current) return;
    soundFx.playTick();
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      showFeedback('Play', 'play');
      resetOsdTimer();
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      showFeedback('Pause', 'pause');
      setShowOsd(true);
    }
  }, [showFeedback, resetOsdTimer]);

  // Seek Handler
  const handleSeek = useCallback(
    (targetTime: number, showToast = true) => {
      if (!videoRef.current) return;
      const validDuration = isFinite(duration) && duration > 0 ? duration : 3600;
      const clamped = Math.max(0, Math.min(validDuration, targetTime));
      videoRef.current.currentTime = clamped;
      setCurrentTime(clamped);
      savePlaybackPosition();
      resetOsdTimer();
      if (showToast) {
        showFeedback(`${formatTime(clamped)} / ${formatTime(validDuration)}`);
      }
    },
    [duration, savePlaybackPosition, resetOsdTimer, showFeedback]
  );

  // Relative Seek Step (e.g. +10s / -10s)
  const handleStepSeek = useCallback(
    (deltaSec: number) => {
      if (!videoRef.current) return;
      soundFx.playTick();
      const nextTime = videoRef.current.currentTime + deltaSec;
      handleSeek(nextTime, true);
    },
    [handleSeek]
  );

  // Volume Change
  const handleVolumeChange = useCallback(
    (newVol: number) => {
      if (!videoRef.current) return;
      const clamped = Math.max(0, Math.min(1, Math.round(newVol * 100) / 100));
      videoRef.current.volume = clamped;
      setVolume(clamped);
      if (isMuted && clamped > 0) {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
      showFeedback(`Volume: ${Math.round(clamped * 100)}%`, clamped === 0 ? 'mute' : 'volume');
      resetOsdTimer();
    },
    [isMuted, showFeedback, resetOsdTimer]
  );

  // Mute Toggle
  const handleToggleMute = useCallback(() => {
    if (!videoRef.current) return;
    soundFx.playTick();
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    showFeedback(nextMuted ? 'Muted' : `Volume: ${Math.round(volume * 100)}%`, nextMuted ? 'mute' : 'volume');
    resetOsdTimer();
  }, [isMuted, volume, showFeedback, resetOsdTimer]);

  // Cycle Aspect Ratio
  const handleCycleAspect = useCallback(() => {
    soundFx.playSettingChanged();
    setAspectMode((prev) => {
      let next: AspectRatioMode = 'contain';
      if (prev === 'contain') next = 'cover';
      else if (prev === 'cover') next = 'fill';
      else next = 'contain';

      const labels = {
        contain: 'Aspect: Fit to Screen (16:9 Original)',
        cover: 'Aspect: Zoom & Fill',
        fill: 'Aspect: Full Stretch',
      };
      showFeedback(labels[next]);
      resetOsdTimer();
      return next;
    });
  }, [showFeedback, resetOsdTimer]);

  // Restart video from beginning
  const handleRestart = useCallback(() => {
    soundFx.playSelect();
    handleSeek(0, false);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
    showFeedback('Restarted Video', 'restart');
  }, [handleSeek, showFeedback]);

  // Metadata Loaded & Resume logic
  const handleLoadedMetadata = () => {
    if (!videoRef.current || !video) return;
    const dur = isFinite(videoRef.current.duration) ? videoRef.current.duration : (video.duration || 0);
    setDuration(dur);

    const savedKey = `xmb_video_pos_${video.id}`;
    const savedTime = parseFloat(localStorage.getItem(savedKey) || '0');
    if (savedTime > 2 && savedTime < dur - 3) {
      videoRef.current.currentTime = savedTime;
      setCurrentTime(savedTime);
      setResumeNotice(`Resumed playback from ${formatTime(savedTime)}`);
      setTimeout(() => setResumeNotice(null), 4500);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !video) return;
    const curr = videoRef.current.currentTime;
    setCurrentTime(curr);
    if (isFinite(videoRef.current.duration)) {
      setDuration(videoRef.current.duration);
    }
    // Save timestamp occasionally
    if (Math.floor(curr) % 3 === 0) {
      savePlaybackPosition();
    }
  };

  // Initial video start & cleanup
  useEffect(() => {
    if (video) {
      soundFx.playGameBoot();
      setIsPlaying(true);
      resetOsdTimer();
    }

    return () => {
      if (osdTimerRef.current) window.clearTimeout(osdTimerRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      savePlaybackPosition();
    };
  }, [video, resetOsdTimer, savePlaybackPosition]);

  // Floating Control Bar Actions (Indexed 0 to 6)
  const controlButtons = [
    {
      id: 'rewind',
      label: 'Rewind 10s',
      icon: <Rewind className="w-4 h-4" />,
      action: () => handleStepSeek(-10),
    },
    {
      id: 'play-pause',
      label: isPlaying ? 'Pause' : 'Play',
      icon: isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />,
      action: handleTogglePlay,
      isPrimary: true,
    },
    {
      id: 'forward',
      label: 'Forward 10s',
      icon: <FastForward className="w-4 h-4" />,
      action: () => handleStepSeek(10),
    },
    {
      id: 'aspect',
      label: 'Aspect Mode',
      icon: <Tv className="w-4 h-4" />,
      action: handleCycleAspect,
    },
    {
      id: 'volume',
      label: isMuted ? 'Unmute' : 'Mute',
      icon: isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />,
      action: handleToggleMute,
    },
    {
      id: 'restart',
      label: 'Restart',
      icon: <RotateCcw className="w-4 h-4" />,
      action: handleRestart,
    },
    {
      id: 'close',
      label: 'Exit Video',
      icon: <X className="w-4 h-4" />,
      action: handleClose,
    },
  ];

  // Capture ALL keyboard events to guarantee zero pass-through to home screen!
  useEffect(() => {
    if (!video) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      e.stopImmediatePropagation();

      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          handleTogglePlay();
          break;

        case 'Enter':
          e.preventDefault();
          if (showOsd && controlButtons[focusedControlIndex]) {
            controlButtons[focusedControlIndex].action();
          } else {
            handleTogglePlay();
          }
          break;

        case 'ArrowLeft':
        case 'a':
        case 'A':
        case 'j':
        case 'J':
          e.preventDefault();
          if (showOsd) {
            soundFx.playTick();
            setFocusedControlIndex((prev) => (prev - 1 + controlButtons.length) % controlButtons.length);
            resetOsdTimer();
          } else {
            handleStepSeek(-10);
          }
          break;

        case 'ArrowRight':
        case 'd':
        case 'D':
        case 'l':
        case 'L':
          e.preventDefault();
          if (showOsd) {
            soundFx.playTick();
            setFocusedControlIndex((prev) => (prev + 1) % controlButtons.length);
            resetOsdTimer();
          } else {
            handleStepSeek(10);
          }
          break;

        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          handleVolumeChange(volume + 0.05);
          break;

        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          handleVolumeChange(volume - 0.05);
          break;

        case 'm':
        case 'M':
          e.preventDefault();
          handleToggleMute();
          break;

        case 'f':
        case 'F':
          e.preventDefault();
          handleCycleAspect();
          break;

        case 't':
        case 'T':
        case 'o':
        case 'O':
        case 'Tab':
          e.preventDefault();
          soundFx.playOption();
          setShowOsd((prev) => !prev);
          break;

        case '[':
          e.preventDefault();
          handleStepSeek(-30);
          break;

        case ']':
          e.preventDefault();
          handleStepSeek(30);
          break;

        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          handleClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    video,
    showOsd,
    focusedControlIndex,
    volume,
    controlButtons,
    handleTogglePlay,
    handleStepSeek,
    handleVolumeChange,
    handleToggleMute,
    handleCycleAspect,
    handleClose,
    resetOsdTimer,
  ]);

  // Gamepad Polling Loop for full Controller Navigation
  useEffect(() => {
    if (!video) return;

    let animId: number;

    const pollGamepad = () => {
      const gamepads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];

      if (gp && gp.connected) {
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

        // Cross (0) -> Execute focused button if OSD is active, else toggle Play/Pause
        if (justPressed(0)) {
          if (showOsd && controlButtons[focusedControlIndex]) {
            controlButtons[focusedControlIndex].action();
          } else {
            handleTogglePlay();
          }
        }
        // Circle (1) -> Close Player & Save
        else if (justPressed(1)) {
          handleClose();
        }
        // Triangle (3) -> Toggle OSD
        else if (justPressed(3)) {
          soundFx.playOption();
          setShowOsd((prev) => !prev);
        }
        // Square (2) -> Cycle Aspect Mode
        else if (justPressed(2)) {
          handleCycleAspect();
        }
        // D-Pad Left or Stick Left
        else if (justPressed(14) || stickLeftJust) {
          if (showOsd) {
            soundFx.playTick();
            setFocusedControlIndex((prev) => (prev - 1 + controlButtons.length) % controlButtons.length);
            resetOsdTimer();
          } else {
            handleStepSeek(-10);
          }
        }
        // D-Pad Right or Stick Right
        else if (justPressed(15) || stickRightJust) {
          if (showOsd) {
            soundFx.playTick();
            setFocusedControlIndex((prev) => (prev + 1) % controlButtons.length);
            resetOsdTimer();
          } else {
            handleStepSeek(10);
          }
        }
        // D-Pad Up or Stick Up -> Volume Up
        else if (justPressed(12) || stickUpJust) {
          handleVolumeChange(volume + 0.05);
        }
        // D-Pad Down or Stick Down -> Volume Down
        else if (justPressed(13) || stickDownJust) {
          handleVolumeChange(volume - 0.05);
        }
        // L1 (4) -> Jump -30s
        else if (justPressed(4)) {
          handleStepSeek(-30);
        }
        // R1 (5) -> Jump +30s
        else if (justPressed(5)) {
          handleStepSeek(30);
        }
        // Start (9) -> Play/Pause
        else if (justPressed(9)) {
          handleTogglePlay();
        }
      }

      animId = requestAnimationFrame(pollGamepad);
    };

    animId = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(animId);
  }, [
    video,
    showOsd,
    focusedControlIndex,
    volume,
    controlButtons,
    handleTogglePlay,
    handleStepSeek,
    handleVolumeChange,
    handleCycleAspect,
    handleClose,
    resetOsdTimer,
  ]);

  if (!video) return null;

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={resetOsdTimer}
      onClick={resetOsdTimer}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none overflow-hidden animate-in fade-in duration-200"
    >
      {/* HTML5 Video Element */}
      <video
        ref={videoRef}
        src={video.videoUrl}
        autoPlay
        playsInline
        className={`w-full h-full cursor-pointer transition-all duration-300 ${
          aspectMode === 'contain'
            ? 'object-contain'
            : aspectMode === 'cover'
            ? 'object-cover'
            : 'object-fill'
        }`}
        onClick={handleTogglePlay}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => {
          setIsPlaying(false);
          setShowOsd(true);
        }}
      />

      {/* Resume Notice Banner */}
      {resumeNotice && (
        <div className="absolute top-16 z-50 px-4 py-2 rounded-xl bg-sky-500/30 border border-sky-400/50 backdrop-blur-md text-sky-200 text-xs font-mono font-bold shadow-[0_0_20px_rgba(56,189,248,0.5)] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          {resumeNotice}
        </div>
      )}

      {/* Quick Action Feedback Toast */}
      {feedbackToast && (
        <div className="absolute top-28 z-50 px-3.5 py-1.5 rounded-lg bg-black/80 border border-white/20 backdrop-blur-md text-white text-xs font-mono font-semibold shadow-2xl animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
          {feedbackToast.label}
        </div>
      )}

      {/* PS3 Glass On-Screen Display (OSD) Overlay */}
      <div
        className={`absolute inset-0 pointer-events-none flex flex-col justify-between p-6 sm:p-8 bg-gradient-to-t from-black/90 via-transparent to-black/80 transition-opacity duration-300 ${
          showOsd ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top Status Header */}
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-3.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.4)]">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide font-sans drop-shadow-[0_0_10px_rgba(255,255,255,0.7)]">
                {video.title}
              </h2>
              <div className="flex items-center gap-2.5 text-xs font-mono text-white/70 mt-0.5">
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-sky-300 border border-white/15">
                  {video.format || 'MP4'}
                </span>
                <span>{video.resolution || '1080p'}</span>
                <span>·</span>
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                <span>·</span>
                <span>{video.fileSize || 'Local Video'}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/20 shadow-lg cursor-pointer text-xs font-mono font-bold"
            title="Press ○, ESC or Backspace to return"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Player</span>
          </button>
        </div>

        {/* Center Pause Indicator */}
        {!isPlaying && (
          <div
            onClick={handleTogglePlay}
            className="self-center flex items-center justify-center w-20 h-20 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.4)] text-white pointer-events-auto cursor-pointer animate-in zoom-in-90 duration-150"
          >
            <Play className="w-9 h-9 ml-1 fill-white" />
          </div>
        )}

        {/* Bottom PS3 Control Bar & Scrubber */}
        <div className="space-y-4 pointer-events-auto max-w-4xl w-full mx-auto">
          {/* Seek Scrubber Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono font-semibold text-white/80 px-0.5">
              <span>{formatTime(currentTime)}</span>
              <span className="text-white/50">{formatTime(duration)}</span>
            </div>

            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                handleSeek(ratio * duration);
              }}
              className="relative w-full h-3 bg-white/15 hover:h-4 transition-all rounded-full cursor-pointer overflow-hidden border border-white/20 group"
            >
              {/* Buffer / Progress Fill */}
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 shadow-[0_0_15px_rgba(56,189,248,0.8)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Floating PS3 Control Dock */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 bg-slate-950/85 backdrop-blur-md border border-white/20 rounded-2xl p-3 sm:px-4 sm:py-2.5 shadow-2xl overflow-hidden">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center lg:justify-start">
              {controlButtons.map((btn, idx) => {
                const isFocused = showOsd && idx === focusedControlIndex;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => {
                      setFocusedControlIndex(idx);
                      btn.action();
                    }}
                    onMouseEnter={() => {
                      soundFx.playTick();
                      setFocusedControlIndex(idx);
                    }}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-mono font-bold transition-all duration-150 cursor-pointer ${
                      isFocused
                        ? 'bg-sky-500 text-slate-950 border-2 border-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.7)] scale-[1.03]'
                        : 'bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10'
                    }`}
                    title={btn.label}
                  >
                    {btn.icon}
                    <span className="hidden sm:inline">{btn.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Controller Hints Badge - Safely Contained Pill */}
            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] font-mono text-white/70 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 shrink-0">
              <div className="flex items-center gap-1">
                <ControllerButtonBadge type={controllerType === 'ds4_ds5' ? 'cross' : 'a'} />
                <span>Select</span>
              </div>
              <div className="flex items-center gap-1">
                <ControllerButtonBadge type={controllerType === 'ds4_ds5' ? 'circle' : 'b'} />
                <span>Exit</span>
              </div>
              <div className="flex items-center gap-1">
                <ControllerButtonBadge type={controllerType === 'ds4_ds5' ? 'triangle' : 'y'} />
                <span>OSD</span>
              </div>
              <div className="flex items-center gap-1">
                <ControllerButtonBadge type={controllerType === 'ds4_ds5' ? 'square' : 'x'} />
                <span>Aspect</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
