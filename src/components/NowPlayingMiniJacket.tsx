import React, { useEffect, useState, useMemo } from 'react';
import { ExtractedPalette, Track, XMBTheme } from '../types';
import { soundFx } from '../services/soundFx';
import { Play, Pause, Music2, Disc3, Shuffle, Repeat, Repeat1 } from 'lucide-react';
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

  const palettes: Record<string, { primary: [number, number, number]; secondary: [number, number, number]; accent: [number, number, number] }> = {
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

interface NowPlayingMiniJacketProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime?: number;
  duration?: number;
  onTogglePlay: () => void;
  onOpenVisualizer: () => void;
  onSeek?: (seconds: number) => void;
  theme?: XMBTheme;
  customThemePalette?: ExtractedPalette | null;
  dynamicPalette?: ExtractedPalette | null;
  isShuffle?: boolean;
  repeatMode?: 'off' | 'all' | 'one';
  onToggleShuffle?: () => void;
  onToggleRepeat?: () => void;
}

// Live 5-Bar Mini Spectrum Equalizer
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
      className="flex items-end gap-0.5 h-5 w-7 px-0.5 justify-center shrink-0"
      title="Live 5-Band Audio Spectrum"
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-1 rounded-full transition-all duration-75"
          style={{
            height: `${h}%`,
            backgroundColor: barColors[i],
            boxShadow: `0 0 6px ${barColors[i]}`,
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
  onOpenVisualizer,
  onSeek,
  theme,
  customThemePalette,
  dynamicPalette,
  isShuffle = false,
  repeatMode = 'off',
  onToggleShuffle,
  onToggleRepeat,
}) => {
  const themeColors = useMemo(() => {
    return getThemeRGB(theme, customThemePalette, dynamicPalette);
  }, [theme, customThemePalette, dynamicPalette]);

  if (!currentTrack) return null;

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const [pR, pG, pB] = themeColors.primary;

  return (
    <aside
      aria-label="Now Playing"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3.5 p-2 pr-4 bg-black/75 hover:bg-black/85 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.7)] transition-all duration-200 select-none group"
    >
      {/* Album Cover Art / Disc Jacket */}
      <button
        type="button"
        onClick={() => {
          soundFx.playSelect();
          onOpenVisualizer();
        }}
        className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/30 shadow-[0_0_12px_rgba(255,255,255,0.25)] shrink-0 transition-transform group-hover:scale-105 cursor-pointer"
        title="Open Full Visualizer & Lyrics"
      >
        {currentTrack.coverUrl ? (
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white/50">
            <Music2 className="w-6 h-6" />
          </div>
        )}

        {/* Spinning Disc Accent Overlay when Playing */}
        {isPlaying && (
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
            <Disc3 className="w-6 h-6 text-white/80 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
        )}
      </button>

      {/* Song Details & Mini Progress Bar */}
      <div className="flex flex-col min-w-0 w-[180px] sm:w-[220px] text-left">
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
              <span className="text-[10px] font-mono text-white/50 shrink-0">
                {formatTime(currentTime)}
              </span>
            )}
          </div>
          <span className="text-[11px] text-white/70 truncate font-sans">
            {currentTrack.artist}
          </span>
        </button>

        {/* Small Progress Bar */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (onSeek && duration > 0) {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              onSeek(clickPos * duration);
            }
          }}
          className="relative w-full h-1 mt-1 bg-white/20 hover:bg-white/35 rounded-full cursor-pointer overflow-hidden transition-colors"
          title={duration > 0 ? `${formatTime(currentTime)} / ${formatTime(duration)}` : 'Seeking'}
        >
          <div
            className="absolute left-0 top-0 bottom-0 rounded-full transition-all duration-150"
            style={{
              width: `${progressPct}%`,
              backgroundColor: `rgb(${pR}, ${pG}, ${pB})`,
              boxShadow: `0 0 8px rgba(${pR}, ${pG}, ${pB}, 0.9)`,
            }}
          />
        </div>
      </div>

      {/* Controls & 5-Bar Mini Visualizer */}
      <div className="flex items-center gap-1.5 pl-2 border-l border-white/15">
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
              : 'bg-white/10 hover:bg-white/20 text-white/60 hover:text-white'
          }`}
          title={`Shuffle: ${isShuffle ? 'On' : 'Off'}`}
        >
          <Shuffle className="w-3 h-3" />
        </button>

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
              : 'bg-white/10 hover:bg-white/20 text-white/60 hover:text-white'
          }`}
          title={`Repeat: ${repeatMode === 'one' ? 'Repeat Track' : repeatMode === 'all' ? 'Repeat All' : 'Off'}`}
        >
          {repeatMode === 'one' ? (
            <Repeat1 className="w-3 h-3" />
          ) : (
            <Repeat className="w-3 h-3" />
          )}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            soundFx.playTick();
            onTogglePlay();
          }}
          className="p-1.5 rounded-full bg-white/15 hover:bg-white/30 text-white transition-colors cursor-pointer"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-white text-white" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-white text-white translate-x-0.5" />
          )}
        </button>

        {/* 5-Bar Dynamic Equalizer */}
        <Mini5BarVisualizer isPlaying={isPlaying} colors={themeColors} />
      </div>
    </aside>
  );
};
