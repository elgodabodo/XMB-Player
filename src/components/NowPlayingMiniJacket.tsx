import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { ExtractedPalette, LyricLine, Track, XMBTheme } from '../types';
import { soundFx } from '../services/soundFx';
import { lyricsService } from '../services/lyricsService';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  Maximize2,
  Music2,
  Disc3,
  GripHorizontal,
  Mic2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { gstEngine } from '../services/gstreamerEngine';

function getThemeRGB(
  theme?: XMBTheme,
  customPalette?: ExtractedPalette | null,
  dynamicPalette?: ExtractedPalette | null
): { primary: [number, number, number]; secondary: [number, number, number]; accent: [number, number, number] } {
  const hexToRgb = (hex: string): [number, number, number] => {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };

  if (theme === 'custom' && customPalette) {
    return {
      primary: customPalette.ribbon1,
      secondary: customPalette.ribbon2,
      accent: hexToRgb(customPalette.accent),
    };
  }

  if (theme === 'album_art' && dynamicPalette) {
    return {
      primary: dynamicPalette.ribbon1,
      secondary: dynamicPalette.ribbon2,
      accent: hexToRgb(dynamicPalette.accent),
    };
  }

  const palettes: Record<
    string,
    { primary: [number, number, number]; secondary: [number, number, number]; accent: [number, number, number] }
  > = {
    original_silver: { primary: [230, 235, 245], secondary: [170, 180, 195], accent: [255, 255, 255] },
    midnight: { primary: [180, 210, 240], secondary: [120, 150, 180], accent: [100, 180, 255] },
    classic_red: { primary: [255, 90, 100], secondary: [220, 40, 60], accent: [255, 180, 190] },
    ocean_blue: { primary: [100, 200, 255], secondary: [30, 120, 210], accent: [180, 230, 255] },
    emerald: { primary: [90, 230, 160], secondary: [20, 160, 90], accent: [180, 255, 210] },
    sakura: { primary: [255, 140, 230], secondary: [190, 60, 160], accent: [255, 210, 245] },
    amber_gold: { primary: [255, 200, 80], secondary: [210, 140, 30], accent: [255, 235, 160] },
  };

  return palettes[theme || 'ocean_blue'] || palettes.ocean_blue;
}

type LyricsPosition = 'off' | 'below' | 'above';

interface NowPlayingMiniJacketProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime?: number;
  duration?: number;
  onTogglePlay: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onOpenVisualizer: () => void;
  onSeek?: (seconds: number) => void;
  theme?: XMBTheme;
  customThemePalette?: ExtractedPalette | null;
  dynamicPalette?: ExtractedPalette | null;
  isShuffle?: boolean;
  repeatMode?: 'off' | 'all' | 'one';
  onToggleShuffle?: () => void;
  onToggleRepeat?: () => void;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

// Live 5-Bar Dynamic Spectrum Visualizer
const Mini5BarVisualizer: React.FC<{
  isPlaying: boolean;
  colors: { primary: [number, number, number]; secondary: [number, number, number]; accent: [number, number, number] };
}> = ({ isPlaying, colors }) => {
  const [heights, setHeights] = useState<number[]>([25, 25, 25, 25, 25]);

  useEffect(() => {
    if (!isPlaying) {
      setHeights([15, 15, 15, 15, 15]);
      return;
    }

    let animId: number;
    const update = () => {
      const freq = gstEngine.getFrequencyData();
      if (freq && freq.length >= 16) {
        const b1 = Math.min(100, Math.max(18, ((freq[1] || 0) / 255) * 100));
        const b2 = Math.min(100, Math.max(18, ((freq[4] || 0) / 255) * 100));
        const b3 = Math.min(100, Math.max(18, ((freq[8] || 0) / 255) * 100));
        const b4 = Math.min(100, Math.max(18, ((freq[12] || 0) / 255) * 100));
        const b5 = Math.min(100, Math.max(18, ((freq[15] || 0) / 255) * 100));
        setHeights([b1, b2, b3, b4, b5]);
      } else {
        setHeights([
          25 + Math.random() * 55,
          35 + Math.random() * 60,
          45 + Math.random() * 50,
          30 + Math.random() * 55,
          20 + Math.random() * 45,
        ]);
      }
      animId = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying]);

  const [sR, sG, sB] = colors.secondary;
  const [pR, pG, pB] = colors.primary;
  const [aR, aG, aB] = colors.accent;

  const barColors = [
    `rgb(${sR}, ${sG}, ${sB})`,
    `rgb(${pR}, ${pG}, ${pB})`,
    `rgb(${aR}, ${aG}, ${aB})`,
    `rgb(${pR}, ${pG}, ${pB})`,
    `rgb(${sR}, ${sG}, ${sB})`,
  ];

  return (
    <div
      className="flex items-end gap-0.5 h-5 w-6 px-0.5 justify-center shrink-0"
      title="Live 5-Band Audio Spectrum"
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-0.5 rounded-full transition-all duration-75"
          style={{
            height: `${h}%`,
            backgroundColor: barColors[i],
            boxShadow: `0 0 5px ${barColors[i]}`,
          }}
        />
      ))}
    </div>
  );
};

export const NowPlayingMiniJacket: React.FC<NowPlayingMiniJacketProps> = ({
  currentTrack,
  isPlaying,
  currentTime = 0,
  duration = 0,
  onTogglePlay,
  onPrev,
  onNext,
  onOpenVisualizer,
  onSeek,
  theme,
  customThemePalette,
  dynamicPalette,
  isShuffle = false,
  repeatMode = 'off',
  onToggleShuffle,
  onToggleRepeat,
  volume = 0.85,
  onVolumeChange,
  isMuted = false,
  onToggleMute,
}) => {
  const containerRef = useRef<HTMLElement | null>(null);
  const lyricsScrollRef = useRef<HTMLDivElement | null>(null);

  // Synced Lyrics State
  const [lyricsLines, setLyricsLines] = useState<LyricLine[]>([]);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [lyricsPosition, setLyricsPosition] = useState<LyricsPosition>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('xmb_mini_lyrics_pos') as LyricsPosition;
      if (['off', 'below', 'above'].includes(saved)) return saved;
    }
    return 'off';
  });

  // Position state (Draggable)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window !== 'undefined') {
      const savedX = localStorage.getItem('xmb_mini_pos_x');
      const savedY = localStorage.getItem('xmb_mini_pos_y');
      if (savedX !== null && savedY !== null) {
        return { x: parseFloat(savedX), y: parseFloat(savedY) };
      }
    }
    return null;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const themeColors = useMemo(() => {
    return getThemeRGB(theme, customThemePalette, dynamicPalette);
  }, [theme, customThemePalette, dynamicPalette]);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Fetch Lyrics when active track changes or lyrics enabled
  useEffect(() => {
    if (!currentTrack || lyricsPosition === 'off') {
      setLyricsLines([]);
      return;
    }

    let isMounted = true;
    setLyricsLoading(true);

    lyricsService
      .getLyricsForTrack(currentTrack)
      .then((data) => {
        if (isMounted) {
          setLyricsLines(data.lines || []);
          setLyricsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setLyricsLines([]);
          setLyricsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentTrack, lyricsPosition]);

  // Find Current Active Lyric Index
  const activeLyricIndex = useMemo(() => {
    if (!lyricsLines || lyricsLines.length === 0) return -1;
    let idx = -1;
    for (let i = 0; i < lyricsLines.length; i++) {
      if (currentTime >= lyricsLines[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }, [lyricsLines, currentTime]);

  // Auto-scroll active lyric line smoothly
  useEffect(() => {
    if (lyricsScrollRef.current && activeLyricIndex >= 0) {
      const container = lyricsScrollRef.current;
      const targetElement = container.children[activeLyricIndex] as HTMLElement;
      if (targetElement) {
        container.scrollTo({
          top: targetElement.offsetTop - container.clientHeight / 2 + targetElement.clientHeight / 2,
          behavior: 'smooth',
        });
      }
    }
  }, [activeLyricIndex]);

  // Toggle Lyrics Position: Off -> Below -> Above -> Off
  const handleToggleLyrics = () => {
    setLyricsPosition((prev) => {
      let next: LyricsPosition = 'off';
      if (prev === 'off') {
        soundFx.playSettingChanged();
        next = 'below';
      } else if (prev === 'below') {
        soundFx.playSettingChanged();
        next = 'above';
      } else {
        soundFx.playCancel();
        next = 'off';
      }

      try {
        localStorage.setItem('xmb_mini_lyrics_pos', next);
      } catch {}
      return next;
    });
  };

  // Drag Handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setIsDragging(true);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!containerRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    dragOffsetRef.current = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const width = containerRef.current?.offsetWidth || 420;
      const height = containerRef.current?.offsetHeight || 90;

      const newX = Math.max(10, Math.min(window.innerWidth - width - 10, e.clientX - dragOffsetRef.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - height - 10, e.clientY - dragOffsetRef.current.y));

      setPosition({ x: newX, y: newY });
      try {
        localStorage.setItem('xmb_mini_pos_x', String(newX));
        localStorage.setItem('xmb_mini_pos_y', String(newY));
      } catch {}
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const width = containerRef.current?.offsetWidth || 420;
      const height = containerRef.current?.offsetHeight || 90;

      const newX = Math.max(10, Math.min(window.innerWidth - width - 10, touch.clientX - dragOffsetRef.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - height - 10, touch.clientY - dragOffsetRef.current.y));

      setPosition({ x: newX, y: newY });
      try {
        localStorage.setItem('xmb_mini_pos_x', String(newX));
        localStorage.setItem('xmb_mini_pos_y', String(newY));
      } catch {}
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  const handleResetPosition = () => {
    soundFx.playOption();
    setPosition(null);
    try {
      localStorage.removeItem('xmb_mini_pos_x');
      localStorage.removeItem('xmb_mini_pos_y');
    } catch {}
  };

  if (!currentTrack) return null;

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const [pR, pG, pB] = themeColors.primary;

  const stylePosition: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'none',
        bottom: 'auto',
      }
    : {
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
      };

  // Synced Lyrics Attached Panel Component
  const renderLyricsPanel = () => {
    if (lyricsPosition === 'off') return null;

    return (
      <div
        className={`w-full max-w-full bg-black/85 backdrop-blur-xl border border-white/20 rounded-2xl p-3 shadow-2xl transition-all duration-200 ${
          lyricsPosition === 'above' ? 'mb-2 order-first' : 'mt-2 order-last'
        }`}
      >
        <div className="flex items-center justify-between px-1 pb-1.5 border-b border-white/10 text-[10px] font-mono text-white/50">
          <span className="flex items-center gap-1 text-sky-400 font-bold">
            <Mic2 className="w-3 h-3" />
            <span>SYNCED LYRICS</span>
          </span>
          <span>{lyricsPosition === 'above' ? '▲ Above Player' : '▼ Below Player'}</span>
        </div>

        <div
          ref={lyricsScrollRef}
          className="h-28 overflow-y-auto overflow-x-hidden scroll-smooth py-2 space-y-1.5 text-center font-sans select-none scrollbar-none"
        >
          {lyricsLoading ? (
            <div className="flex items-center justify-center h-full text-xs font-mono text-white/40 animate-pulse">
              Fetching synced lyrics...
            </div>
          ) : lyricsLines.length > 0 ? (
            lyricsLines.map((line, idx) => {
              const isActive = idx === activeLyricIndex;
              return (
                <div
                  key={`${line.time}-${idx}`}
                  onClick={() => {
                    soundFx.playTick();
                    onSeek?.(line.time);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'font-bold text-white scale-[1.04] bg-white/10 shadow-[0_0_15px_rgba(56,189,248,0.5)] border border-white/20'
                      : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                  }`}
                  style={
                    isActive
                      ? {
                          color: '#ffffff',
                          textShadow: `0 0 10px rgba(${pR}, ${pG}, ${pB}, 0.8)`,
                        }
                      : {}
                  }
                  title={`Click to jump to ${formatTime(line.time)}`}
                >
                  {line.text}
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center h-full text-xs font-mono text-white/40">
              No synced lyrics available for this track
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <aside
      ref={containerRef}
      aria-label="Now Playing Mini Player"
      style={stylePosition}
      className={`z-40 flex flex-col p-2.5 bg-slate-950/90 hover:bg-slate-950/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] transition-shadow duration-200 select-none ${
        isDragging ? 'cursor-grabbing shadow-[0_0_30px_rgba(56,189,248,0.5)] scale-[1.02]' : ''
      }`}
    >
      {/* If Lyrics Above, render before main player bar */}
      {lyricsPosition === 'above' && renderLyricsPanel()}

      {/* Main Player Row */}
      <div className="flex items-center gap-3">
        {/* Drag Handle Indicator */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onDoubleClick={handleResetPosition}
          className="flex items-center justify-center p-1 text-white/40 hover:text-white/80 cursor-grab active:cursor-grabbing shrink-0 transition-colors"
          title="Drag to reposition anywhere (Double-click to reset position)"
        >
          <GripHorizontal className="w-4 h-4" />
        </div>

        {/* Album Art Jacket */}
        <button
          type="button"
          onClick={() => {
            soundFx.playSelect();
            onOpenVisualizer();
          }}
          className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.2)] shrink-0 transition-transform hover:scale-105 cursor-pointer"
          title="Open Full Visualizer & Lyrics"
        >
          {currentTrack.coverUrl ? (
            <img
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white/50">
              <Music2 className="w-6 h-6" />
            </div>
          )}

          {isPlaying && (
            <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
              <Disc3 className="w-6 h-6 text-white/90 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
          )}
        </button>

        {/* Track Info & Scrubber */}
        <div className="flex flex-col min-w-0 w-[180px] sm:w-[230px] text-left">
          <button
            type="button"
            onClick={() => {
              soundFx.playSelect();
              onOpenVisualizer();
            }}
            className="flex flex-col min-w-0 text-left cursor-pointer group/title"
            title="Open Full Visualizer & Lyrics"
          >
            <div className="flex items-center justify-between gap-1 w-full min-w-0">
              <span className="text-xs font-bold text-white truncate font-sans tracking-wide drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] group-hover/title:text-sky-300 transition-colors">
                {currentTrack.title}
              </span>
              {duration > 0 && (
                <span className="text-[10px] font-mono text-white/60 shrink-0">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              )}
            </div>
            <span className="text-[11px] text-white/70 truncate font-sans">
              {currentTrack.artist}
            </span>
          </button>

          {/* Interactive Scrub Bar */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              if (onSeek && duration > 0) {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                onSeek(clickPos * duration);
              }
            }}
            className="relative w-full h-1.5 mt-1.5 bg-white/20 hover:h-2 transition-all rounded-full cursor-pointer overflow-hidden border border-white/10"
            title="Click or drag to seek"
          >
            <div
              className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-150"
              style={{
                width: `${progressPct}%`,
                backgroundColor: `rgb(${pR}, ${pG}, ${pB})`,
                boxShadow: `0 0 10px rgba(${pR}, ${pG}, ${pB}, 0.9)`,
              }}
            />
          </div>
        </div>

        {/* Full Player Control Buttons */}
        <div className="flex items-center gap-1 pl-2 border-l border-white/15">
          {/* Previous Track */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundFx.playTick();
              onPrev?.();
            }}
            className="p-1.5 rounded-full hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Previous Track"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Rewind 10s */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundFx.playTick();
              if (onSeek) onSeek(Math.max(0, currentTime - 10));
            }}
            className="p-1.5 rounded-full hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer hidden sm:flex items-center justify-center"
            title="Rewind 10s"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Main Play / Pause */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundFx.playTick();
              onTogglePlay();
            }}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all shadow-[0_0_12px_rgba(255,255,255,0.3)] hover:scale-105 cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-white text-white" />
            ) : (
              <Play className="w-4 h-4 fill-white text-white translate-x-0.5" />
            )}
          </button>

          {/* Forward 10s */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundFx.playTick();
              if (onSeek) onSeek(Math.min(duration || 1000, currentTime + 10));
            }}
            className="p-1.5 rounded-full hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer hidden sm:flex items-center justify-center"
            title="Forward 10s"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* Next Track */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundFx.playTick();
              onNext?.();
            }}
            className="p-1.5 rounded-full hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Next Track"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Synced Lyrics (Below -> Above -> Off) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleLyrics();
            }}
            className={`p-1.5 rounded-full transition-all cursor-pointer flex items-center gap-0.5 ${
              lyricsPosition !== 'off'
                ? 'bg-amber-400/30 text-amber-300 border border-amber-400/50 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                : 'hover:bg-white/15 text-white/60 hover:text-white'
            }`}
            title={`Toggle Synced Lyrics (Current: ${
              lyricsPosition === 'below' ? 'Attached Below' : lyricsPosition === 'above' ? 'Attached Above' : 'Off'
            })`}
          >
            <Mic2 className="w-3.5 h-3.5" />
            {lyricsPosition === 'below' && <ChevronDown className="w-2.5 h-2.5 -ml-0.5" />}
            {lyricsPosition === 'above' && <ChevronUp className="w-2.5 h-2.5 -ml-0.5" />}
          </button>

          {/* Shuffle Mode */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundFx.playTick();
              onToggleShuffle?.();
            }}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isShuffle
                ? 'bg-sky-400/25 text-sky-300 border border-sky-400/40 shadow-[0_0_6px_rgba(56,189,248,0.5)]'
                : 'hover:bg-white/15 text-white/60 hover:text-white'
            }`}
            title={`Shuffle: ${isShuffle ? 'On' : 'Off'}`}
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>

          {/* Repeat Mode */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundFx.playTick();
              onToggleRepeat?.();
            }}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              repeatMode !== 'off'
                ? 'bg-emerald-400/25 text-emerald-300 border border-emerald-400/40 shadow-[0_0_6px_rgba(52,211,153,0.5)]'
                : 'hover:bg-white/15 text-white/60 hover:text-white'
            }`}
            title={`Repeat: ${repeatMode === 'one' ? 'Repeat Track' : repeatMode === 'all' ? 'Repeat All' : 'Off'}`}
          >
            {repeatMode === 'one' ? (
              <Repeat1 className="w-3.5 h-3.5" />
            ) : (
              <Repeat className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Mute / Volume */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundFx.playTick();
              onToggleMute?.();
            }}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isMuted
                ? 'bg-rose-500/25 text-rose-400 border border-rose-500/40'
                : 'hover:bg-white/15 text-white/70 hover:text-white'
            }`}
            title={isMuted ? 'Unmute' : `Volume: ${Math.round((volume || 0.85) * 100)}%`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Open Visualizer Fullscreen */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundFx.playSelect();
              onOpenVisualizer();
            }}
            className="p-1.5 rounded-full hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
            title="Open Fullscreen Visualizer & Lyrics"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* 5-Bar Dynamic Spectrum */}
          <Mini5BarVisualizer isPlaying={isPlaying} colors={themeColors} />
        </div>
      </div>

      {/* If Lyrics Below, render after main player bar */}
      {lyricsPosition === 'below' && renderLyricsPanel()}
    </aside>
  );
};
