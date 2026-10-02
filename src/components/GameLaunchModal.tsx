import React, { useEffect, useState } from 'react';
import { CustomGameApp } from '../types';
import { soundFx } from '../services/soundFx';
import { Gamepad2, X, Terminal, Cpu, Play, Square, Activity } from 'lucide-react';

interface GameLaunchModalProps {
  game: CustomGameApp | null;
  onClose: () => void;
}

export const GameLaunchModal: React.FC<GameLaunchModalProps> = ({ game, onClose }) => {
  const [stage, setStage] = useState<'boot' | 'running'>('boot');
  const [pid] = useState(() => Math.floor(Math.random() * 8000) + 2000);
  const [fps, setFps] = useState(60);

  useEffect(() => {
    if (game) {
      soundFx.playGameBoot();
      setStage('boot');
      const timer = setTimeout(() => {
        setStage('running');
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [game]);

  useEffect(() => {
    if (stage === 'running') {
      const interval = setInterval(() => {
        setFps(Math.floor(59 + Math.random() * 2));
      }, 800);
      return () => clearInterval(interval);
    }
  }, [stage]);

  if (!game) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-xl bg-slate-950 border border-white/20 rounded-xl shadow-2xl overflow-hidden text-slate-200 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <Gamepad2 className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold text-white tracking-wide font-sans uppercase">
                {game.title}
              </h2>
              <p className="text-xs text-white/50 font-mono">
                PID: {pid} · Linux Native Subsystem Process
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playCancel();
              onClose();
            }}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {stage === 'boot' ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              <div className="text-center">
                <h3 className="text-lg font-bold text-white tracking-widest font-sans uppercase drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]">
                  PlayStation®3
                </h3>
                <p className="text-xs text-white/60 mt-1 font-mono">
                  Dispatching execvp("{game.execPath}")...
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Game Banner */}
              <div className="relative h-32 rounded-lg overflow-hidden border border-white/15 shadow-md">
                <img
                  src={game.coverUrl}
                  alt={game.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-end p-3">
                  <div>
                    <span className="text-xs font-semibold text-white uppercase drop-shadow">
                      {game.category.toUpperCase()} PROCESS ACTIVE
                    </span>
                    <p className="text-[11px] text-white/70 font-mono">
                      Target: {game.execPath} {game.args || ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Telemetry */}
              <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                <div className="p-3 rounded bg-white/5 border border-white/10">
                  <span className="text-white/40 block text-[10px]">Process State</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    RUNNING
                  </span>
                </div>
                <div className="p-3 rounded bg-white/5 border border-white/10">
                  <span className="text-white/40 block text-[10px]">Frame Rate</span>
                  <span className="text-white font-bold mt-0.5 block">
                    {fps} FPS (V-Sync)
                  </span>
                </div>
                <div className="p-3 rounded bg-white/5 border border-white/10">
                  <span className="text-white/40 block text-[10px]">Audio Graph</span>
                  <span className="text-sky-400 font-bold mt-0.5 block truncate">
                    PipeWire 48kHz
                  </span>
                </div>
              </div>

              {/* Shell output log */}
              <div className="p-3 bg-black/60 rounded border border-white/10 font-mono text-[11px] text-white/70 space-y-1">
                <div className="text-white/40"># stdout / stderr</div>
                <div className="text-emerald-400">$ {game.execPath} {game.args || ''}</div>
                <div>[INFO] Initialized Vulkan 1.3 physical device</div>
                <div>[INFO] PipeWire low-latency sound stream opened (latency: 3.2ms)</div>
                <div>[INFO] Gamepad DualSense mapped to /dev/input/js0</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-white/5 text-xs text-white/60">
          <span>Press PS Button or ESC to return to XMB</span>
          <button
            onClick={() => {
              soundFx.playCancel();
              onClose();
            }}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
          >
            Minimize to XMB
          </button>
        </div>
      </div>
    </div>
  );
};
