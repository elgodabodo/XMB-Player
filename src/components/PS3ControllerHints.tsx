import React from 'react';
import { ControllerType } from '../types';

interface PS3ControllerHintsProps {
  canGoBack: boolean;
  hasSelection: boolean;
  isPlaying: boolean;
  controllerType?: ControllerType;
  controllerConnected?: boolean;
}

export const PS3ControllerHints: React.FC<PS3ControllerHintsProps> = ({
  canGoBack,
  hasSelection,
  isPlaying,
  controllerType = 'ds4_ds5',
  controllerConnected = false,
}) => {
  const isPlayStation = controllerType === 'ds4_ds5';

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent border-t border-white/5 select-none text-xs text-white/70 font-sans">
      {/* Left side: Navigation Keys & Status */}
      <div className="flex items-center gap-4 text-white/50 text-[11px] font-mono">
        {controllerConnected ? (
          <>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/80">
                {isPlayStation ? 'L1' : 'LB'}
              </kbd>
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/80">
                {isPlayStation ? 'R1' : 'RB'}
              </kbd>
              <span>Category</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/80">D-Pad / Left Stick</kbd>
              <span>Navigate</span>
            </span>
            <span className="hidden md:inline text-white/30">|</span>
            <span className="hidden md:inline text-sky-400 font-semibold">
              {isPlayStation ? 'DualShock 4 / DualSense Active' : 'Xbox / XInput Controller Active'}
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/80">Q</kbd>
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/80">E</kbd>
              <span>Category</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/80">W</kbd>
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/80">S</kbd>
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/80">▲</kbd>
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/80">▼</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/80">Enter</kbd>
              <span>Select</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/80">Space</kbd>
              <span>Play/Pause</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/80">T / O</kbd>
              <span>Options</span>
            </span>
            {canGoBack && (
              <span className="flex items-center gap-1.5">
                <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/80">ESC</kbd>
                <span>Back</span>
              </span>
            )}
          </>
        )}
      </div>

      {/* Right side: Adaptive Button Prompts (ONLY rendered when controller is connected) */}
      {controllerConnected && (
        <div className="flex items-center gap-5 text-white/90 font-medium animate-in fade-in duration-200">
          {/* Play / Pause - Square (Pink) on PS, X (Blue) on Xbox */}
          <div className="flex items-center gap-1.5">
            <span
              className={`flex items-center justify-center w-5 h-5 rounded-full border text-xs font-bold ${
                isPlayStation
                  ? 'border-pink-400 text-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.4)]'
                  : 'border-blue-400 text-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.4)]'
              }`}
            >
              {isPlayStation ? '□' : 'X'}
            </span>
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </div>

          {/* Options - Triangle (Green) on PS, Y (Yellow) on Xbox */}
          <div className="flex items-center gap-1.5">
            <span
              className={`flex items-center justify-center w-5 h-5 rounded-full border text-xs font-bold ${
                isPlayStation
                  ? 'border-emerald-400 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                  : 'border-amber-400 text-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]'
              }`}
            >
              {isPlayStation ? '△' : 'Y'}
            </span>
            <span>Options</span>
          </div>

          {/* Back / Cancel - Circle (Red) on PS, B (Red) on Xbox */}
          {canGoBack && (
            <div className="flex items-center gap-1.5">
              <span
                className={`flex items-center justify-center w-5 h-5 rounded-full border text-xs font-bold border-rose-500 text-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]`}
              >
                {isPlayStation ? '○' : 'B'}
              </span>
              <span>Back</span>
            </div>
          )}

          {/* Enter / Select - Cross (Sky) on PS, A (Green) on Xbox */}
          <div className="flex items-center gap-1.5">
            <span
              className={`flex items-center justify-center w-5 h-5 rounded-full border text-xs font-bold ${
                isPlayStation
                  ? 'border-sky-400 text-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.4)]'
                  : 'border-emerald-400 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
              }`}
            >
              {isPlayStation ? '✕' : 'A'}
            </span>
            <span>Select</span>
          </div>
        </div>
      )}
    </footer>
  );
};
