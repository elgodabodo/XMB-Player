import React, { useEffect, useRef, useState } from 'react';
import {
  PS3HomeIcon,
  PS3SettingsIcon,
  PS3PhotoIcon,
  PS3MusicIcon,
  PS3VideoIcon,
  PS3GameIcon,
  PS3NetworkIcon,
  PS3FriendsIcon,
  PS3BulletIcon,
  PS3BulletType,
  PS3FocusCube,
} from './PS3Icons';
import { PictureItem, Track, VideoItem } from '../types';
import { soundFx } from '../services/soundFx';
import { Heart, ChevronLeft } from 'lucide-react';

export interface XMBCategoryDef {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const AUTHENTIC_PS3_CATEGORIES: XMBCategoryDef[] = [
  { id: 'users', name: 'Users', icon: PS3HomeIcon },
  { id: 'settings', name: 'Settings', icon: PS3SettingsIcon },
  { id: 'photo', name: 'Photo', icon: PS3PhotoIcon },
  { id: 'music', name: 'Music', icon: PS3MusicIcon },
  { id: 'video', name: 'Video', icon: PS3VideoIcon },
  { id: 'game', name: 'Game', icon: PS3GameIcon },
  { id: 'network', name: 'Network', icon: PS3NetworkIcon },
  { id: 'friends', name: 'Friends', icon: PS3FriendsIcon },
];

export interface XMBItemDef {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  bulletType?: PS3BulletType;
  track?: Track;
  picture?: PictureItem;
  video?: VideoItem;
  isFolder?: boolean;
  coverUrl?: string;
  action?: () => void;
  folderType?: string;
  folderPayload?: unknown;
}

interface XMBNavigatorProps {
  categoryIndex: number;
  itemIndex: number;
  items: XMBItemDef[];
  onSelectCategory: (index: number) => void;
  onSelectItemIndex: (index: number) => void;
  onExecuteItem: (item: XMBItemDef) => void;
  onOpenContextMenu: (track: Track) => void;
  onOpenPictureContextMenu?: (picture: PictureItem) => void;
  onOpenVideoContextMenu?: (video: VideoItem) => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  subBreadcrumb?: string | null;
  onGoBack?: () => void;
}

export const XMBNavigator: React.FC<XMBNavigatorProps> = ({
  categoryIndex,
  itemIndex,
  items,
  onSelectCategory,
  onSelectItemIndex,
  onExecuteItem,
  onOpenContextMenu,
  onOpenPictureContextMenu,
  onOpenVideoContextMenu,
  currentTrack,
  isPlaying,
  subBreadcrumb,
  onGoBack,
}) => {
  // Spacing between horizontal category icons
  const CAT_SPACING = 100;

  // Active Category Anchor
  const FOCUS_Y = 195;
  const ITEM_HEIGHT = 46;

  // Track previous category and items for lateral fade-off transition
  const prevCatIndexRef = useRef(categoryIndex);
  const prevItemsRef = useRef(items);
  const prevItemIndexRef = useRef(itemIndex);

  const [outgoingGroup, setOutgoingGroup] = useState<{
    items: XMBItemDef[];
    itemIndex: number;
    direction: 'left' | 'right';
  } | null>(null);

  const [slideInDirection, setSlideInDirection] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    if (categoryIndex !== prevCatIndexRef.current) {
      const total = AUTHENTIC_PS3_CATEGORIES.length;
      let dir: 'left' | 'right' = 'right';

      // Determine wrap-around or regular left/right
      if (categoryIndex === 0 && prevCatIndexRef.current === total - 1) {
        dir = 'right';
      } else if (categoryIndex === total - 1 && prevCatIndexRef.current === 0) {
        dir = 'left';
      } else if (categoryIndex > prevCatIndexRef.current) {
        dir = 'right';
      } else {
        dir = 'left';
      }

      setOutgoingGroup({
        items: prevItemsRef.current,
        itemIndex: prevItemIndexRef.current,
        direction: dir,
      });

      setSlideInDirection(dir);
      prevCatIndexRef.current = categoryIndex;

      // Clear outgoing group after animation completes (260ms)
      const timer = setTimeout(() => {
        setOutgoingGroup(null);
        setSlideInDirection(null);
      }, 260);

      return () => clearTimeout(timer);
    }
  }, [categoryIndex]);

  // Keep references updated
  useEffect(() => {
    prevItemsRef.current = items;
    prevItemIndexRef.current = itemIndex;
  }, [items, itemIndex]);

  // Render a vertical stream of options
  const renderVerticalStream = (
    streamItems: XMBItemDef[],
    activeIdx: number,
    isOutgoing: boolean = false
  ) => {
    return (
      <div className="absolute inset-0">
        {streamItems.map((item, idx) => {
          const isSelected = idx === activeIdx;
          const delta = idx - activeIdx;

          let topY = 0;
          let opacity = 0;
          let scale = 1;

          if (delta === 0) {
            topY = FOCUS_Y;
            opacity = isOutgoing ? 0.9 : 1;
            scale = 1;
          } else if (delta > 0) {
            topY = FOCUS_Y + delta * ITEM_HEIGHT;
            opacity = Math.max(0, 0.78 - delta * 0.11);
            scale = Math.max(0.92, 1 - delta * 0.015);
          } else {
            // Above the big icon row (Y <= 54px)
            const stepsAbove = activeIdx - 1 - idx;
            topY = 50 - stepsAbove * 40;
            opacity = Math.max(0, 0.65 - stepsAbove * 0.28);
            scale = Math.max(0.88, 0.96 - stepsAbove * 0.04);
          }

          const isVisible = topY >= -40 && topY <= 700;

          return (
            <div
              key={item.id}
              onClick={() => {
                if (isOutgoing) return;
                if (isSelected) {
                  soundFx.playSelect();
                  onExecuteItem(item);
                } else {
                  soundFx.playTick();
                  onSelectItemIndex(idx);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (!isOutgoing) {
                  if (item.picture) {
                    soundFx.playOption();
                    onOpenPictureContextMenu?.(item.picture);
                  } else if (item.track) {
                    soundFx.playOption();
                    onOpenContextMenu(item.track);
                  }
                }
              }}
              style={{
                top: `${topY}px`,
                opacity: isVisible ? opacity : 0,
                transform: `scale(${scale})`,
                transition: isOutgoing
                  ? 'none'
                  : 'top 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 260ms ease, transform 260ms ease',
                pointerEvents: isVisible && !isOutgoing ? 'auto' : 'none',
              }}
              className="absolute left-10 sm:left-24 right-8 h-[44px] flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-[100px] flex items-center justify-center shrink-0">
                  {item.coverUrl ? (
                    <div
                      className={`relative w-8 h-8 rounded overflow-hidden border shrink-0 transition-transform ${
                        isSelected
                          ? 'border-white shadow-[0_0_12px_rgba(255,255,255,0.75)] scale-110'
                          : 'border-white/20'
                      }`}
                    >
                      <img
                        src={item.coverUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80';
                        }}
                      />
                    </div>
                  ) : isSelected ? (
                    <PS3FocusCube subBadge={item.bulletType || 'wrench'} className="w-9 h-9" />
                  ) : (
                    <PS3BulletIcon
                      type={item.bulletType || 'wrench'}
                      isFocused={false}
                      className="w-5 h-5"
                    />
                  )}
                </div>

                <div className="flex flex-col min-w-0 justify-center">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm tracking-wide truncate font-sans transition-all duration-200 ${
                        isSelected
                          ? 'text-white font-bold drop-shadow-[0_0_12px_rgba(255,255,255,0.95)]'
                          : 'text-white/80 font-normal group-hover:text-white'
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
                      className={`text-[11px] truncate font-sans ${
                        isSelected ? 'text-white/85' : 'text-white/40'
                      }`}
                    >
                      {item.subtitle}
                    </span>
                  )}
                </div>
              </div>

              {/* Right Side: Active Badge / Hint or Track Options */}
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {item.badge && (
                  <span
                    className={`font-mono text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${
                      item.badge === 'ACTIVE'
                        ? 'bg-emerald-950/70 border-emerald-400 text-emerald-300 font-bold shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                        : 'bg-white/10 border-white/20 text-white/80'
                    }`}
                  >
                    {item.badge === 'ACTIVE' && <span>✔</span>}
                    <span>{item.badge}</span>
                  </span>
                )}

                {(item.track || item.picture || item.video) && isSelected && !isOutgoing && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      soundFx.playOption();
                      if (item.picture) {
                        onOpenPictureContextMenu?.(item.picture);
                      } else if (item.video) {
                        onOpenVideoContextMenu?.(item.video);
                      } else if (item.track) {
                        onOpenContextMenu(item.track);
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-emerald-400 border border-emerald-400/50 bg-emerald-950/20 text-xs font-bold shrink-0 hover:bg-emerald-900/40"
                    title="Press △ for Options"
                  >
                    <span>△</span>
                    <span className="text-[10px] hidden sm:inline">Options</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {streamItems.length === 0 && !isOutgoing && (
          <div
            style={{ top: `${FOCUS_Y}px` }}
            className="absolute left-10 sm:left-24 text-xs font-mono text-white/40 flex items-center h-[44px]"
          >
            No entries found.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Sub-Folder Breadcrumb if navigating inside sub-menus */}
      {subBreadcrumb && (
        <div className="absolute top-2 left-10 sm:left-24 z-40 flex items-center gap-2 text-xs font-mono text-white/80">
          <button
            onClick={() => {
              soundFx.playCancel();
              onGoBack?.();
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <span className="text-white/30">/</span>
          <span className="text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
            {subBreadcrumb}
          </span>
        </div>
      )}

      {/* The Big Category Icons Row (Moved higher up, at Y: 88px) */}
      <div className="absolute top-[88px] left-0 right-0 z-30 pointer-events-none">
        <div className="relative w-full h-[76px] flex items-center">
          {/* Horizontal Category Icons Track */}
          <div
            className="flex items-center transition-transform duration-300 ease-out pointer-events-auto pl-10 sm:pl-24"
            style={{
              transform: `translateX(-${categoryIndex * CAT_SPACING}px)`,
            }}
          >
            {AUTHENTIC_PS3_CATEGORIES.map((cat, idx) => {
              const isSelected = idx === categoryIndex;
              const Icon = cat.icon;

              return (
                <div
                  key={cat.id}
                  style={{ width: `${CAT_SPACING}px` }}
                  className="flex flex-col items-center justify-center shrink-0"
                >
                  <button
                    onClick={() => {
                      if (!isSelected) {
                        soundFx.playTick();
                        onSelectCategory(idx);
                      }
                    }}
                    className={`flex flex-col items-center justify-center transition-all duration-300 focus:outline-none ${
                      isSelected
                        ? 'scale-115 opacity-100 z-10'
                        : 'scale-85 opacity-30 hover:opacity-60'
                    }`}
                  >
                    <div
                      className={`transition-all duration-300 ${
                        isSelected
                          ? 'text-white drop-shadow-[0_0_14px_rgba(255,255,255,0.95)]'
                          : 'text-white/70'
                      }`}
                    >
                      <Icon className="w-10 h-10 sm:w-11 sm:h-11" />
                    </div>

                    {/* Category Label directly under the big icon */}
                    <span
                      className={`mt-1 font-sans text-xs tracking-wider font-semibold transition-all duration-300 ${
                        isSelected
                          ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.85)] opacity-100'
                          : 'text-white/30 opacity-0'
                      }`}
                    >
                      {cat.name}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Vertical Small Options Stream with Lateral Fade-Off Transitions:
          - Outgoing group fades off to the side (opposite to switch direction)
          - Incoming group slides in smoothly from the side
          - Preceding items sit ABOVE the big icon
          - Highlighted item sits DIRECTLY UNDER the big icon
          - Succeeding items descend BELOW */}
      <div className="absolute inset-0 z-20 pointer-events-auto overflow-hidden">
        {/* Outgoing Items Group (fades off to the side) */}
        {outgoingGroup && (
          <div
            className={`absolute inset-0 ${
              outgoingGroup.direction === 'right'
                ? 'xmb-slide-out-left'
                : 'xmb-slide-out-right'
            }`}
          >
            {renderVerticalStream(outgoingGroup.items, outgoingGroup.itemIndex, true)}
          </div>
        )}

        {/* Current Active Items Group (slides in smoothly from the side) */}
        <div
          key={`cat-${categoryIndex}`}
          className={`absolute inset-0 ${
            slideInDirection === 'right'
              ? 'xmb-slide-in-right'
              : slideInDirection === 'left'
              ? 'xmb-slide-in-left'
              : ''
          }`}
        >
          {renderVerticalStream(items, itemIndex, false)}
        </div>
      </div>
    </div>
  );
};
