import React from 'react';
import { Track } from '../types';
import { soundFx } from '../services/soundFx';
import { Play, Pause, Music2, Disc3 } from 'lucide-react';

interface NowPlayingMiniJacketProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onOpenVisualizer: () => void;
}

export const NowPlayingMiniJacket: React.FC<NowPlayingMiniJacketProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onOpenVisualizer,
}) => {
  if (!currentTrack) return null;

  return (
    <aside
      aria-label="Now Playing"
      className="fixed bottom-5 right-7 z-30 flex items-center gap-3 p-2 pr-4 bg-black/75 hover:bg-black/90 backdrop-blur-md border border-white/20 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.8)] transition-all duration-200 select-none group"
    >
      {/* Album Cover Art / Disc Jacket */}
      <button
        type="button"
        onClick={() => {
          soundFx.playSelect();
          onOpenVisualizer();
        }}
        className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/30 shadow-[0_0_12px_rgba(255,255,255,0.25)] shrink-0 transition-transform group-hover:scale-105"
        title="Open Now Playing Visualizer & Lyrics"
      >
        {currentTrack.coverUrl ? (
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
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

      {/* Song Details */}
      <button
        type="button"
        onClick={() => {
          soundFx.playSelect();
          onOpenVisualizer();
        }}
        className="flex flex-col min-w-0 max-w-[170px] sm:max-w-[210px] text-left cursor-pointer"
        title="Open Now Playing Visualizer"
      >
        <span className="text-xs font-bold text-white truncate font-sans tracking-wide drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">
          {currentTrack.title}
        </span>
        <span className="text-[11px] text-white/70 truncate font-sans">
          {currentTrack.artist}
        </span>
        <span className="text-[10px] font-mono text-sky-400/90 truncate mt-0.5">
          {currentTrack.album}
        </span>
      </button>

      {/* Play/Pause Quick Toggle & Audio Wave Bars */}
      <div className="flex items-center gap-2 pl-2 border-l border-white/15">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            soundFx.playTick();
            onTogglePlay();
          }}
          className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-white text-white" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-white text-white translate-x-0.5" />
          )}
        </button>

        {/* Animated Soundwave Indicator */}
        {isPlaying && (
          <div className="flex items-end gap-0.5 h-4 w-4">
            <span className="w-0.5 h-full bg-emerald-400 animate-pulse rounded-full" />
            <span className="w-0.5 h-2/3 bg-emerald-400 animate-pulse rounded-full" style={{ animationDelay: '150ms' }} />
            <span className="w-0.5 h-4/5 bg-emerald-400 animate-pulse rounded-full" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>
    </aside>
  );
};
