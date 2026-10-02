import React, { useEffect, useRef } from 'react';
import { Album, Artist, Playlist, Track, XMBTheme, AudioSink } from '../types';
import {
  Folder,
  Music,
  Disc,
  Play,
  Pause,
  ChevronRight,
  HardDrive,
  Youtube,
  Radio,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  Plus,
  Terminal,
  Heart,
  ChevronLeft,
} from 'lucide-react';
import { soundFx } from '../services/soundFx';

export interface XMBVerticalItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  icon?: React.ComponentType<{ className?: string }>;
  coverUrl?: string;
  track?: Track;
  isFolder?: boolean;
  action?: () => void;
  folderType?: 'all_tracks' | 'albums' | 'artists' | 'genres' | 'album_detail' | 'artist_detail' | 'playlist_detail' | 'themes' | 'sinks' | 'yt_search';
  folderPayload?: unknown;
}

interface XMBVerticalListProps {
  categoryIndex: number;
  items: XMBVerticalItem[];
  selectedIndex: number;
  onSelectItemIndex: (index: number) => void;
  onExecuteItem: (item: XMBVerticalItem) => void;
  onOpenContextMenu: (track: Track) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  subBreadcrumb?: string | null;
  onGoBack?: () => void;
}

export const XMBVerticalList: React.FC<XMBVerticalListProps> = ({
  categoryIndex,
  items,
  selectedIndex,
  onSelectItemIndex,
  onExecuteItem,
  onOpenContextMenu,
  currentTrack,
  isPlaying,
  subBreadcrumb,
  onGoBack,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll so focused item remains in comfortable visual zone
  useEffect(() => {
    if (!containerRef.current) return;
    const selectedEl = containerRef.current.querySelector(
      `[data-index="${selectedIndex}"]`
    ) as HTMLElement | null;

    if (selectedEl) {
      selectedEl.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [selectedIndex]);

  return (
    <div className="relative z-10 flex flex-col flex-1 pl-12 sm:pl-28 pr-6 overflow-hidden select-none">
      {/* Sub-level Breadcrumb if navigated inside folder */}
      {subBreadcrumb && (
        <div className="flex items-center gap-2 mb-3 text-xs font-mono text-white/70">
          <button
            onClick={() => {
              soundFx.playCancel();
              onGoBack?.();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
          <span className="text-white/30">/</span>
          <span className="text-sky-400 font-semibold">{subBreadcrumb}</span>
        </div>
      )}

      {/* Vertical Column Items */}
      <div
        ref={containerRef}
        className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-270px)] pr-4 py-2 scroll-smooth"
      >
        {items.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          const isCurrentActive = item.track && currentTrack?.id === item.track.id;
          const Icon = item.icon || (item.isFolder ? Folder : Music);

          return (
            <div
              key={item.id}
              data-index={idx}
              onClick={() => {
                soundFx.playSelect();
                onSelectItemIndex(idx);
                onExecuteItem(item);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (item.track) {
                  soundFx.playOption();
                  onOpenContextMenu(item.track);
                }
              }}
              className={`relative flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-200 border ${
                isSelected
                  ? 'bg-white/15 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.15)] translate-x-3 scale-[1.02]'
                  : 'bg-black/30 border-white/5 hover:bg-white/5 hover:border-white/10 text-white/70'
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                {/* Thumbnail or Icon */}
                {item.coverUrl ? (
                  <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-white/20 shrink-0">
                    <img
                      src={item.coverUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {isCurrentActive && isPlaying && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`flex items-center justify-center w-11 h-11 rounded-lg border shrink-0 ${
                      isSelected
                        ? 'bg-sky-500/20 border-sky-400/40 text-white'
                        : 'bg-white/5 border-white/10 text-white/60'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                )}

                {/* Title & Metadata */}
                <div className="min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold truncate ${
                        isSelected ? 'text-white xmb-glow' : 'text-white/90'
                      }`}
                    >
                      {item.title}
                    </span>
                    {item.track?.isFavorite && (
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
                    )}
                  </div>

                  {item.subtitle && (
                    <span
                      className={`text-xs truncate ${
                        isSelected ? 'text-white/80' : 'text-white/50'
                      }`}
                    >
                      {item.subtitle}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Indicators */}
              <div className="flex items-center gap-3 shrink-0 ml-3">
                {item.badge && (
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white/10 text-white/70 border border-white/10">
                    {item.badge}
                  </span>
                )}

                {item.isFolder && (
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${
                      isSelected ? 'text-white translate-x-1' : 'text-white/30'
                    }`}
                  />
                )}

                {item.track && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      soundFx.playOption();
                      onOpenContextMenu(item.track!);
                    }}
                    className="p-1 text-white/40 hover:text-white rounded"
                    title="Press △ for Options"
                  >
                    <span className="text-[10px] font-bold border border-emerald-400/60 text-emerald-400 px-1 py-0.5 rounded">
                      △
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="p-8 text-center text-white/40 font-mono text-xs">
            No items found in this section.
          </div>
        )}
      </div>
    </div>
  );
};
