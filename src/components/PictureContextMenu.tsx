import React, { useEffect, useState } from 'react';
import { ControllerType, PictureItem } from '../types';
import { soundFx } from '../services/soundFx';
import { Maximize2, User, Palette, X, Trash2 } from 'lucide-react';
import { ControllerButtonBadge } from './PS3Icons';

interface PictureContextMenuProps {
  isOpen: boolean;
  picture: PictureItem | null;
  onClose: () => void;
  onViewFullscreen: (picture: PictureItem) => void;
  onSetAsAvatar: (picture: PictureItem) => void;
  onExtractColorway: (picture: PictureItem) => void;
  onDeletePicture?: (picture: PictureItem) => void;
  selectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
  controllerType?: ControllerType;
  controllerConnected?: boolean;
}

export const PictureContextMenu: React.FC<PictureContextMenuProps> = ({
  isOpen,
  picture,
  onClose,
  onViewFullscreen,
  onSetAsAvatar,
  onExtractColorway,
  onDeletePicture,
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

  const actions = [
    {
      id: 'fullscreen',
      label: 'View Fullscreen',
      icon: <Maximize2 className="w-4 h-4 text-sky-400" />,
      execute: () => {
        soundFx.playSelect();
        if (picture) onViewFullscreen(picture);
        onClose();
      },
    },
    {
      id: 'avatar',
      label: 'Set as Profile Avatar',
      icon: <User className="w-4 h-4 text-emerald-400" />,
      execute: () => {
        soundFx.playSettingChanged();
        if (picture) onSetAsAvatar(picture);
        onClose();
      },
    },
    {
      id: 'colorway',
      label: 'Extract Theme Colorway',
      icon: <Palette className="w-4 h-4 text-amber-400" />,
      execute: () => {
        soundFx.playSettingChanged();
        if (picture) onExtractColorway(picture);
        onClose();
      },
    },
    ...(onDeletePicture && picture?.isCustom
      ? [
          {
            id: 'delete',
            label: 'Delete Picture',
            icon: <Trash2 className="w-4 h-4 text-rose-400" />,
            execute: () => {
              soundFx.playCancel();
              if (picture) onDeletePicture(picture);
              onClose();
            },
          },
        ]
      : []),
  ];

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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeIndex, actions, onClose]);

  if (!isOpen || !picture) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-80 h-full bg-slate-950/95 border-l border-white/20 p-6 flex flex-col justify-between shadow-2xl text-slate-200"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <ControllerButtonBadge type={controllerType === 'ds4_ds5' ? 'triangle' : 'y'} />
              <span className="font-sans font-bold text-white tracking-wider text-sm uppercase">
                Photo Options
              </span>
            </div>
            <button
              onClick={() => {
                soundFx.playCancel();
                onClose();
              }}
              className="p-1 text-white/60 hover:text-white rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Picture Thumbnail Preview */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="w-14 h-14 rounded overflow-hidden border border-white/20 shrink-0">
              <img
                src={picture.url}
                alt={picture.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate font-sans">
                {picture.title}
              </span>
              {picture.subtitle && (
                <span className="text-[11px] text-white/60 truncate font-mono mt-0.5">
                  {picture.subtitle}
                </span>
              )}
            </div>
          </div>

          {/* Action List with Controller Focus */}
          <div className="space-y-2">
            {actions.map((act, idx) => {
              const isFocused = idx === activeIndex;

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
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
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

        {/* Footer Hint */}
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
