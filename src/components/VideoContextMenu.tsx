import React, { useEffect, useMemo, useState } from 'react';
import { ControllerType, VideoItem } from '../types';
import { Play, Trash2, X, Film, Info, Calendar, HardDrive, ExternalLink } from 'lucide-react';
import { soundFx } from '../services/soundFx';
import { openMediaFile } from '../services/nativeBridge';

interface VideoContextMenuProps {
  isOpen: boolean;
  video: VideoItem | null;
  onClose: () => void;
  onPlay: (video: VideoItem) => void;
  onDelete: (videoId: string) => void;
  selectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
  controllerType?: ControllerType;
  controllerConnected?: boolean;
}

export const VideoContextMenu: React.FC<VideoContextMenuProps> = ({
  isOpen,
  video,
  onClose,
  onPlay,
  onDelete,
  selectedIndex,
  onSelectedIndexChange,
  controllerType = 'ds4_ds5',
  controllerConnected = false,
}) => {
  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = selectedIndex !== undefined ? selectedIndex : internalIndex;

  const setActiveIndex = (idx: number) => {
    setInternalIndex(idx);
    onSelectedIndexChange?.(idx);
  };

  const actions = useMemo(() => {
    if (!video) return [];

    return [
      {
        id: 'play',
        label: 'Play Video Fullscreen',
        icon: <Play className="w-4 h-4 text-sky-400" />,
        execute: () => {
          soundFx.playSelect();
          onPlay(video);
          onClose();
        },
      },
      {
        id: 'open-system',
        label: 'Open in Native Linux Player',
        icon: <ExternalLink className="w-4 h-4 text-emerald-400" />,
        execute: () => {
          soundFx.playSelect();
          openMediaFile(video.videoUrl);
          onClose();
        },
      },
      {
        id: 'delete',
        label: 'Delete from Video Library',
        isDestructive: true,
        icon: <Trash2 className="w-4 h-4 text-rose-400" />,
        execute: () => {
          soundFx.playCancel();
          onDelete(video.id);
          onClose();
        },
      },
    ];
  }, [video, onPlay, onDelete, onClose]);

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

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  });

  if (!isOpen || !video) return null;

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
                Video Options
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFx.playCancel();
                onClose();
              }}
              className="p-1 text-white/50 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Video Preview Card */}
          <div className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-2.5">
            <div className="relative aspect-video rounded overflow-hidden border border-white/10 bg-black">
              {video.thumbnailUrl ? (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/30">
                  <Film className="w-8 h-8" />
                </div>
              )}
              <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 border border-white/20 text-[10px] font-mono text-white">
                {video.resolution || '1080p'}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white truncate font-sans">
                {video.title}
              </h4>
              <div className="flex items-center gap-2 text-[11px] font-mono text-sky-400 mt-1">
                <span>{video.format || 'MP4'}</span>
                <span>·</span>
                <span>{video.fileSize || 'Local File'}</span>
                <span>·</span>
                <span>{video.dateAdded}</span>
              </div>
            </div>
          </div>

          {/* Navigable Action List */}
          <div className="space-y-1.5">
            {actions.map((act, idx) => {
              const isFocused = idx === activeIndex;

              return (
                <button
                  key={act.id}
                  type="button"
                  onClick={() => act.execute()}
                  onMouseEnter={() => {
                    if (activeIndex !== idx) {
                      soundFx.playTick();
                      setActiveIndex(idx);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                    isFocused
                      ? 'border-2 border-white bg-white/20 text-white font-bold shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-[1.02]'
                      : 'border border-transparent bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                  } ${act.isDestructive ? 'text-rose-400 hover:text-rose-300' : ''}`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    {act.icon}
                    <span className="truncate">{act.label}</span>
                  </div>

                  {isFocused && (
                    <span className={`w-4 h-4 rounded-full border text-[10px] flex items-center justify-center font-bold shrink-0 ml-2 ${
                      controllerType === 'ds4_ds5'
                        ? 'border-sky-400 text-sky-400'
                        : 'border-emerald-400 text-emerald-400'
                    }`}>
                      {controllerType === 'ds4_ds5' ? '✕' : 'A'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Controller Navigation Hint Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/50">
          <span>{controllerConnected ? 'D-Pad: Navigate' : '▲ ▼ / W S: Navigate'}</span>
          <span>
            {controllerConnected
              ? controllerType === 'ds4_ds5'
                ? '✕: Select · ○: Close'
                : 'A: Select · B: Close'
              : 'Enter: Select · ESC: Close'}
          </span>
        </div>
      </div>
    </div>
  );
};
