import React, { useEffect, useMemo, useState } from 'react';
import { Playlist, Track } from '../types';
import { Play, ListPlus, Heart, Sliders, Trash2, X, Volume2, VolumeX, Minus, Plus } from 'lucide-react';
import { soundFx } from '../services/soundFx';

interface ContextMenuProps {
  isOpen: boolean;
  track: Track | null;
  playlists: Playlist[];
  onClose: () => void;
  onPlay: (track: Track) => void;
  onToggleFavorite: (trackId: string) => void;
  onAddToPlaylist: (playlistId: string, track: Track) => void;
  onDeleteTrack: (trackId: string) => void;
  onInspectGst: () => void;
  selectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
  volume?: number;
  onVolumeChange?: (volume: number) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  track,
  playlists,
  onClose,
  onPlay,
  onToggleFavorite,
  onAddToPlaylist,
  onDeleteTrack,
  onInspectGst,
  selectedIndex,
  onSelectedIndexChange,
  volume = 0.85,
  onVolumeChange,
  isMuted = false,
  onToggleMute,
}) => {
  const [internalIndex, setInternalIndex] = useState(0);

  const activeIndex = selectedIndex !== undefined ? selectedIndex : internalIndex;

  const setActiveIndex = (idx: number) => {
    setInternalIndex(idx);
    onSelectedIndexChange?.(idx);
  };

  const handleStepVolume = (deltaPct: number) => {
    soundFx.playTick();
    const currPct = Math.round(volume * 100);
    const nextPct = Math.max(0, Math.min(100, currPct + deltaPct));
    onVolumeChange?.(nextPct / 100);
  };

  // Compile list of actionable items for keyboard & controller navigation
  const actions = useMemo(() => {
    if (!track) return [];

    const list: {
      id: string;
      label: string;
      icon: React.ReactNode;
      isVolume?: boolean;
      isDestructive?: boolean;
      execute: () => void;
    }[] = [
      {
        id: 'play',
        label: 'Play Now',
        icon: <Play className="w-4 h-4 text-sky-400" />,
        execute: () => {
          soundFx.playSelect();
          onPlay(track);
          onClose();
        },
      },
      {
        id: 'volume',
        label: `Master Volume: ${isMuted ? 'Muted' : `${Math.round(volume * 100)}%`}`,
        icon: isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />,
        isVolume: true,
        execute: () => {
          soundFx.playTick();
          if (onToggleMute) onToggleMute();
        },
      },
      {
        id: 'fav',
        label: track.isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
        icon: (
          <Heart
            className={`w-4 h-4 ${
              track.isFavorite ? 'text-rose-500 fill-rose-500' : 'text-white/60'
            }`}
          />
        ),
        execute: () => {
          soundFx.playSelect();
          onToggleFavorite(track.id);
          onClose();
        },
      },
    ];

    // Playlists
    playlists
      .filter((p) => !p.isSystem)
      .forEach((pl) => {
        list.push({
          id: `pl-${pl.id}`,
          label: `Add to "${pl.title}"`,
          icon: <ListPlus className="w-4 h-4 text-emerald-400" />,
          execute: () => {
            soundFx.playSelect();
            onAddToPlaylist(pl.id, track);
            onClose();
          },
        });
      });

    // DSP Inspector
    list.push({
      id: 'gst',
      label: 'GStreamer Pipeline Inspector',
      icon: <Sliders className="w-4 h-4 text-sky-400" />,
      execute: () => {
        soundFx.playSelect();
        onInspectGst();
        onClose();
      },
    });

    // Delete
    list.push({
      id: 'delete',
      label: 'Delete from Library',
      isDestructive: true,
      icon: <Trash2 className="w-4 h-4 text-rose-400" />,
      execute: () => {
        soundFx.playCancel();
        onDeleteTrack(track.id);
        onClose();
      },
    });

    return list;
  }, [track, playlists, onPlay, onToggleFavorite, onAddToPlaylist, onInspectGst, onDeleteTrack, onClose, volume, isMuted, onToggleMute]);

  // Keyboard navigation inside Context Menu (including Left/Right for volume)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'KeyW':
          e.preventDefault();
          soundFx.playTick();
          setActiveIndex(Math.max(0, activeIndex - 1));
          break;

        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          soundFx.playTick();
          setActiveIndex(Math.min(actions.length - 1, activeIndex + 1));
          break;

        case 'ArrowLeft':
        case 'KeyA':
          if (actions[activeIndex]?.isVolume) {
            e.preventDefault();
            handleStepVolume(-5);
          }
          break;

        case 'ArrowRight':
        case 'KeyD':
          if (actions[activeIndex]?.isVolume) {
            e.preventDefault();
            handleStepVolume(5);
          }
          break;

        case 'Enter':
          e.preventDefault();
          if (actions[activeIndex]) {
            actions[activeIndex].execute();
          }
          break;

        case 'Escape':
        case 'Backspace':
        case 'KeyO':
        case 'KeyT':
          e.preventDefault();
          soundFx.playCancel();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, actions, onClose, volume]);

  if (!isOpen || !track) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none"
    >
      <div
        className="w-80 h-full bg-slate-950/95 border-l border-white/20 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full border border-emerald-400 text-emerald-400 text-xs font-bold">
                △
              </span>
              <span className="font-display uppercase text-sm tracking-wider text-white font-bold">
                Options Menu
              </span>
            </div>
            <button
              onClick={() => {
                soundFx.playCancel();
                onClose();
              }}
              className="p-1 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Track Summary Card */}
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
            <img
              src={track.coverUrl}
              alt={track.title}
              className="w-12 h-12 rounded object-cover border border-white/10 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-white truncate font-sans">
                {track.title}
              </h4>
              <p className="text-xs text-white/60 truncate font-sans">{track.artist}</p>
              <span className="text-[10px] font-mono text-sky-400">
                {track.format} · {track.sampleRate ? `${track.sampleRate / 1000}kHz` : '48kHz'}
              </span>
            </div>
          </div>

          {/* Controller Navigable Action List */}
          <div className="space-y-1.5 overflow-y-auto max-h-[50vh] pr-1">
            {actions.map((act, idx) => {
              const isFocused = idx === activeIndex;

              if (act.isVolume) {
                return (
                  <div
                    key={act.id}
                    onClick={() => {
                      setActiveIndex(idx);
                      act.execute();
                    }}
                    onMouseEnter={() => {
                      if (activeIndex !== idx) {
                        soundFx.playTick();
                        setActiveIndex(idx);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isFocused
                        ? 'border-2 border-white bg-white/20 text-white font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-[1.02]'
                        : 'border border-transparent bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      {act.icon}
                      <span className="truncate">{act.label}</span>
                    </div>

                    {/* Step buttons for volume in steps of 5 */}
                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleStepVolume(-5)}
                        className="p-1 rounded bg-white/10 hover:bg-white/25 text-white transition-colors"
                        title="Decrease Volume (-5%)"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStepVolume(5)}
                        className="p-1 rounded bg-white/10 hover:bg-white/25 text-white transition-colors"
                        title="Increase Volume (+5%)"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={act.id}
                  onClick={() => act.execute()}
                  onMouseEnter={() => {
                    if (activeIndex !== idx) {
                      soundFx.playTick();
                      setActiveIndex(idx);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
                    isFocused
                      ? 'border-2 border-white bg-white/20 text-white font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-[1.02]'
                      : 'border border-transparent bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                  } ${act.isDestructive ? 'text-rose-400 hover:text-rose-300' : ''}`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {act.icon}
                    <span className="truncate">{act.label}</span>
                  </div>

                  {/* Controller Action Prompt Icon */}
                  {isFocused && (
                    <span className="w-4 h-4 rounded-full border border-sky-400 text-sky-400 text-[10px] flex items-center justify-center font-bold shrink-0 ml-2">
                      ✕
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Controller Navigation Hint Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/50">
          <span>D-Pad: Navigate / ◄ ►: Vol ±5%</span>
          <span>✕: Select · ○: Close</span>
        </div>
      </div>
    </div>
  );
};
