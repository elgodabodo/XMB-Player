import React, { useState, useEffect } from 'react';
import { PictureItem } from '../types';
import { soundFx } from '../services/soundFx';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  User,
  Image as ImageIcon,
  Palette,
  Sparkles,
} from 'lucide-react';

interface PictureViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pictures: PictureItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onSetAsAvatar: (picture: PictureItem) => void;
  onExtractColorway: (picture: PictureItem) => void;
}

export const PictureViewerModal: React.FC<PictureViewerModalProps> = ({
  isOpen,
  onClose,
  pictures,
  currentIndex,
  onIndexChange,
  onSetAsAvatar,
  onExtractColorway,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const currentPicture = pictures[currentIndex] || pictures[0];

  useEffect(() => {
    setZoomLevel(1);
  }, [currentIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'KeyQ':
          soundFx.playTick();
          onIndexChange((currentIndex - 1 + pictures.length) % pictures.length);
          break;
        case 'ArrowRight':
        case 'KeyE':
          soundFx.playTick();
          onIndexChange((currentIndex + 1) % pictures.length);
          break;
        case 'Escape':
        case 'Backspace':
          soundFx.playCancel();
          onClose();
          break;
        case 'Equal':
        case 'NumpadAdd':
          setZoomLevel((prev) => Math.min(3, prev + 0.25));
          break;
        case 'Minus':
        case 'NumpadSubtract':
          setZoomLevel((prev) => Math.max(0.5, prev - 0.25));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, pictures.length, onIndexChange, onClose]);

  if (!isOpen || !currentPicture) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 backdrop-blur-xl animate-in fade-in duration-200 select-none">
      {/* Top Bar: Title & Close */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-sky-400 font-semibold tracking-wider uppercase">
              PlayStation Photo Viewer
            </span>
            <span className="text-white/40 text-xs">·</span>
            <span className="text-xs font-mono text-white/60">
              {currentIndex + 1} / {pictures.length}
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide truncate max-w-xl drop-shadow">
            {currentPicture.title}
          </h2>
          {currentPicture.subtitle && (
            <p className="text-xs text-white/60 font-sans mt-0.5 truncate">
              {currentPicture.subtitle}
            </p>
          )}
        </div>

        <button
          onClick={() => {
            soundFx.playCancel();
            onClose();
          }}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          title="Close (ESC)"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Image Area with Zoom & Centering */}
      <div className="relative flex-1 flex items-center justify-center p-4 overflow-hidden">
        {/* Navigation Arrows */}
        {pictures.length > 1 && (
          <>
            <button
              onClick={() => {
                soundFx.playTick();
                onIndexChange((currentIndex - 1 + pictures.length) % pictures.length);
              }}
              className="absolute left-6 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 text-white/80 hover:text-white transition-all shadow-lg"
              title="Previous Picture (Left Arrow)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => {
                soundFx.playTick();
                onIndexChange((currentIndex + 1) % pictures.length);
              }}
              className="absolute right-6 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 text-white/80 hover:text-white transition-all shadow-lg"
              title="Next Picture (Right Arrow)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* The Fullscreen Picture */}
        <div
          className="relative max-w-full max-h-full transition-transform duration-200 flex items-center justify-center"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <img
            src={currentPicture.url}
            alt={currentPicture.title}
            className="max-h-[78vh] max-w-[88vw] object-contain rounded-lg shadow-2xl border border-white/10"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Bottom Floating Control Bar (PS3 Photo Viewer HUD) */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-gradient-to-t from-black/90 to-transparent">
        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-white/70 min-w-[50px] text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors text-xs font-mono"
            title="Reset Zoom"
          >
            Fit
          </button>
        </div>

        {/* Actions: Set as Avatar / Extract Colorway */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundFx.playSettingChanged();
              onSetAsAvatar(currentPicture);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/40 text-sky-200 text-xs font-medium transition-all shadow-sm"
          >
            <User className="w-4 h-4 text-sky-400" />
            <span>Set as Avatar</span>
          </button>

          <button
            onClick={() => {
              soundFx.playSettingChanged();
              onExtractColorway(currentPicture);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/35 border border-purple-400/40 text-purple-200 text-xs font-medium transition-all shadow-sm"
          >
            <Palette className="w-4 h-4 text-purple-400" />
            <span>Extract Colorway</span>
          </button>
        </div>
      </div>
    </div>
  );
};
