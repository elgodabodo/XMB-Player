import React from 'react';
import { Settings, Cloud, Music, Disc, ListMusic, Terminal } from 'lucide-react';
import { soundFx } from '../services/soundFx';

export interface XMBCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const XMB_CATEGORIES: XMBCategory[] = [
  { id: 'settings', name: 'Settings', icon: Settings },
  { id: 'services', name: 'Services', icon: Cloud },
  { id: 'music', name: 'Music', icon: Music },
  { id: 'now_playing', name: 'Now Playing', icon: Disc },
  { id: 'playlists', name: 'Playlists', icon: ListMusic },
  { id: 'linux', name: 'Linux Subsystem', icon: Terminal },
];

interface XMBHorizontalBarProps {
  selectedIndex: number;
  onSelectCategory: (index: number) => void;
}

export const XMBHorizontalBar: React.FC<XMBHorizontalBarProps> = ({
  selectedIndex,
  onSelectCategory,
}) => {
  return (
    <div className="relative z-10 flex items-center select-none pl-12 sm:pl-28 py-6">
      <div className="flex items-center gap-12 sm:gap-20 transition-transform duration-300 ease-out">
        {XMB_CATEGORIES.map((cat, idx) => {
          const isSelected = idx === selectedIndex;
          const Icon = cat.icon;

          return (
            <button
              key={cat.id}
              onClick={() => {
                if (!isSelected) {
                  soundFx.playTick();
                  onSelectCategory(idx);
                }
              }}
              className={`relative flex flex-col items-center group transition-all duration-300 focus:outline-none ${
                isSelected
                  ? 'scale-125 opacity-100 z-10'
                  : 'scale-90 opacity-40 hover:opacity-70'
              }`}
            >
              {/* Category Icon */}
              <div
                className={`p-2 transition-transform duration-300 ${
                  isSelected ? 'xmb-icon-glow text-white' : 'text-white/80'
                }`}
              >
                <Icon className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.6]" />
              </div>

              {/* Category Name (Centered under icon) */}
              <span
                className={`mt-1 font-display uppercase tracking-widest text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                  isSelected
                    ? 'text-white xmb-glow'
                    : 'text-white/50 opacity-0 group-hover:opacity-60'
                }`}
              >
                {cat.name}
              </span>

              {/* Subtle PS3 glow beacon for active category */}
              {isSelected && (
                <div className="absolute -bottom-2 w-12 h-1 bg-gradient-to-r from-transparent via-sky-400 to-transparent rounded-full shadow-[0_0_12px_rgba(56,189,248,0.9)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
