import React from 'react';
import { ControllerType } from '../types';
import { ControllerButtonBadge } from './PS3Icons';

interface PS3ControllerHintsProps {
  canGoBack: boolean;
  hasSelection: boolean;
  isPlaying: boolean;
  controllerType?: ControllerType;
  controllerConnected?: boolean;
  isVisualizerView?: boolean;
}

export const PS3ControllerHints: React.FC<PS3ControllerHintsProps> = ({
  canGoBack,
  hasSelection,
  isPlaying,
  controllerType = 'ds4_ds5',
  controllerConnected = false,
  isVisualizerView = false,
}) => {
  const isPlayStation = controllerType === 'ds4_ds5';

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent border-t border-white/5 select-none text-xs text-white/70 font-sans">
      {/* Left side: Navigation Keys & Status */}
      <div className="flex items-center gap-4 text-white/50 text-[11px] font-mono">
        {isVisualizerView ? (
          <>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/80">
                {controllerConnected ? 'D-Pad / Left Stick' : '◄ ► ▲ ▼'}
              </kbd>
              <span>Cycle Visualizer</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/80">
                {controllerConnected ? (isPlayStation ? 'L2 / R2' : 'LT / RT') : '[ / ]'}
              </kbd>
              <span>Track Skip</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/80">
                {controllerConnected ? (isPlayStation ? '□' : 'X') : 'Space'}
              </kbd>
              <span>Play/Pause</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px] text-white/80">
                {controllerConnected ? (isPlayStation ? '○' : 'B') : 'ESC'}
              </kbd>
              <span>Exit Visualizer</span>
            </span>
          </>
        ) : controllerConnected ? (
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
            <ControllerButtonBadge type={isPlayStation ? 'square' : 'x'} />
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </div>

          {/* Options - Triangle (Green) on PS, Y (Yellow) on Xbox */}
          <div className="flex items-center gap-1.5">
            <ControllerButtonBadge type={isPlayStation ? 'triangle' : 'y'} />
            <span>Options</span>
          </div>

          {/* Back / Cancel - Circle (Red) on PS, B (Red) on Xbox */}
          {canGoBack && (
            <div className="flex items-center gap-1.5">
              <ControllerButtonBadge type={isPlayStation ? 'circle' : 'b'} />
              <span>Back</span>
            </div>
          )}

          {/* Enter / Select - Cross (Sky) on PS, A (Green) on Xbox */}
          <div className="flex items-center gap-1.5">
            <ControllerButtonBadge type={isPlayStation ? 'cross' : 'a'} />
            <span>Select</span>
          </div>
        </div>
      )}
    </footer>
  );
};
