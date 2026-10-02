import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ControllerType } from '../types';
import { soundFx } from '../services/soundFx';
import { Trash2, AlertTriangle, Music, Film, Image, Palette, X } from 'lucide-react';
import { ControllerButtonBadge } from './PS3Icons';

export interface PS3ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  countBadge?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  itemType?: 'music' | 'video' | 'photo' | 'artwork' | 'default';
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  controllerType?: ControllerType;
  controllerConnected?: boolean;
}

export const PS3ConfirmModal: React.FC<PS3ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  countBadge,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  itemType = 'default',
  isDestructive = true,
  onConfirm,
  onCancel,
  controllerType = 'ds4_ds5',
  controllerConnected = false,
}) => {
  // 0: Yes (Confirm), 1: No (Cancel). Default to 1 (No) for safe operation
  const [selectedIndex, setSelectedIndex] = useState<number>(1);
  const prevGpButtonsRef = useRef<{ [idx: number]: boolean }>({});
  const prevGpAxesRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(1); // Default to "No"
      soundFx.playOption();
    }
  }, [isOpen]);

  const handleConfirmAction = useCallback(() => {
    soundFx.playSelect();
    onConfirm();
  }, [onConfirm]);

  const handleCancelAction = useCallback(() => {
    soundFx.playCancel();
    onCancel();
  }, [onCancel]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();

      switch (e.key) {
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          if (selectedIndex !== 0) {
            soundFx.playTick();
            setSelectedIndex(0);
          }
          break;

        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          if (selectedIndex !== 1) {
            soundFx.playTick();
            setSelectedIndex(1);
          }
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          if (selectedIndex === 0) {
            handleConfirmAction();
          } else {
            handleCancelAction();
          }
          break;

        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          handleCancelAction();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, selectedIndex, handleConfirmAction, handleCancelAction]);

  // Gamepad polling loop
  useEffect(() => {
    if (!isOpen) return;

    let animId: number;

    const pollGamepad = () => {
      const gamepads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];

      if (gp && gp.connected) {
        const justPressed = (btnIdx: number) => {
          const pressed = Boolean(gp.buttons[btnIdx]?.pressed);
          const wasPressed = prevGpButtonsRef.current[btnIdx] || false;
          prevGpButtonsRef.current[btnIdx] = pressed;
          return pressed && !wasPressed;
        };

        const currX = gp.axes[0] || 0;
        const prevX = prevGpAxesRef.current.x;
        prevGpAxesRef.current = { x: currX, y: gp.axes[1] || 0 };

        const stickLeftJust = currX < -0.55 && prevX >= -0.45;
        const stickRightJust = currX > 0.55 && prevX <= 0.45;

        // D-Pad Left or Stick Left -> Select Yes (0)
        if (justPressed(14) || stickLeftJust) {
          if (selectedIndex !== 0) {
            soundFx.playTick();
            setSelectedIndex(0);
          }
        }
        // D-Pad Right or Stick Right -> Select No (1)
        else if (justPressed(15) || stickRightJust) {
          if (selectedIndex !== 1) {
            soundFx.playTick();
            setSelectedIndex(1);
          }
        }
        // Cross (button 0) -> Select
        else if (justPressed(0)) {
          if (selectedIndex === 0) {
            handleConfirmAction();
          } else {
            handleCancelAction();
          }
        }
        // Circle (button 1) or Triangle (button 3) -> Cancel
        else if (justPressed(1) || justPressed(3)) {
          handleCancelAction();
        }
      }

      animId = requestAnimationFrame(pollGamepad);
    };

    animId = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, selectedIndex, handleConfirmAction, handleCancelAction]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (itemType) {
      case 'music':
        return <Music className="w-6 h-6 text-rose-400" />;
      case 'video':
        return <Film className="w-6 h-6 text-rose-400" />;
      case 'photo':
        return <Image className="w-6 h-6 text-rose-400" />;
      case 'artwork':
        return <Palette className="w-6 h-6 text-amber-400" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-rose-400" />;
    }
  };

  return (
    <div
      onClick={handleCancelAction}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
    >
      <div
        className="relative flex flex-col w-full max-w-md bg-slate-950 border border-white/20 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden text-slate-200 font-sans animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Glow Band */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
              {getIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
                  {title}
                </h3>
                {countBadge && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold">
                    {countBadge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/50 font-mono mt-0.5">
                PS3 System Confirmation Prompt
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCancelAction}
            className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Body */}
        <div className="p-6 space-y-5">
          <p className="text-xs sm:text-sm text-white/80 leading-relaxed font-sans">
            {message}
          </p>

          {isDestructive && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono">
              <Trash2 className="w-4 h-4 shrink-0 text-rose-400" />
              <span>This operation is permanent and cannot be undone.</span>
            </div>
          )}

          {/* Action Buttons: Yes / No */}
          <div className="flex items-center justify-center gap-4 pt-2">
            {/* Yes Button (Index 0) */}
            <button
              type="button"
              onClick={handleConfirmAction}
              onMouseEnter={() => {
                if (selectedIndex !== 0) {
                  soundFx.playTick();
                  setSelectedIndex(0);
                }
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer text-center ${
                selectedIndex === 0
                  ? 'bg-rose-500 text-white border-2 border-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.6)] scale-[1.03]'
                  : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/15'
              }`}
            >
              {confirmLabel}
            </button>

            {/* No Button (Index 1) */}
            <button
              type="button"
              onClick={handleCancelAction}
              onMouseEnter={() => {
                if (selectedIndex !== 1) {
                  soundFx.playTick();
                  setSelectedIndex(1);
                }
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer text-center ${
                selectedIndex === 1
                  ? 'bg-sky-500 text-slate-950 border-2 border-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.6)] scale-[1.03]'
                  : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/15'
              }`}
            >
              {cancelLabel}
            </button>
          </div>
        </div>

        {/* Controller / Keyboard Bottom Help Bar */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-black/50 border-t border-white/10 text-[11px] font-mono text-white/50">
          <div className="flex items-center gap-1.5">
            <ControllerButtonBadge type={controllerType === 'ds4_ds5' ? 'cross' : 'a'} />
            <span>Confirm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ControllerButtonBadge type={controllerType === 'ds4_ds5' ? 'circle' : 'b'} />
            <span>Cancel</span>
          </div>
          <div className="flex items-center gap-1">
            <span>◄ ►</span>
            <span>Switch</span>
          </div>
        </div>
      </div>
    </div>
  );
};
