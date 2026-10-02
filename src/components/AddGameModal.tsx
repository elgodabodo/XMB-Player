import React, { useState } from 'react';
import { CustomGameApp } from '../types';
import { gameService } from '../services/gameService';
import { soundFx } from '../services/soundFx';
import { Gamepad2, X, Plus, Sparkles, Folder, Terminal } from 'lucide-react';

interface AddGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGameAdded: (game: CustomGameApp) => void;
}

const getPresetsForOs = (targetOs: 'win' | 'mac' | 'linux') => {
  if (targetOs === 'win') {
    return [
      {
        title: 'RPCS3 (PS3 Emulator)',
        execPath: 'C:\\Program Files\\RPCS3\\rpcs3.exe',
        args: '--no-gui',
        category: 'emulator' as const,
        coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80',
        description: 'Sony PlayStation 3 Emulator (Windows)',
      },
      {
        title: 'RetroArch Universal',
        execPath: 'C:\\RetroArch\\retroarch.exe',
        args: '-v',
        category: 'retro' as const,
        coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=80',
        description: 'Multi-system retro emulation frontend (Windows)',
      },
      {
        title: 'Steam Big Picture',
        execPath: 'steam',
        args: '-gamepadui',
        category: 'steam' as const,
        coverUrl: 'https://images.unsplash.com/photo-1612287233207-6b4df30b42c4?w=400&q=80',
        description: 'Valve Steam full-screen launcher',
      },
      {
        title: 'Epic Games Launcher',
        execPath: 'C:\\Program Files (x86)\\Epic Games\\Launcher\\Portal\\Binaries\\Win32\\EpicGamesLauncher.exe',
        args: '',
        category: 'native' as const,
        coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80',
        description: 'Epic Games store launcher',
      },
      {
        title: 'Dolphin GameCube/Wii',
        execPath: 'C:\\Program Files\\Dolphin\\Dolphin.exe',
        args: '-b',
        category: 'emulator' as const,
        coverUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400&q=80',
        description: 'Nintendo GameCube and Wii emulator (Windows)',
      },
    ];
  } else if (targetOs === 'mac') {
    return [
      {
        title: 'RPCS3 (PS3 Emulator)',
        execPath: '/Applications/RPCS3.app/Contents/MacOS/rpcs3',
        args: '--no-gui',
        category: 'emulator' as const,
        coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80',
        description: 'Sony PlayStation 3 Emulator (macOS)',
      },
      {
        title: 'RetroArch Universal',
        execPath: '/Applications/RetroArch.app/Contents/MacOS/RetroArch',
        args: '-v',
        category: 'retro' as const,
        coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=80',
        description: 'Multi-system retro emulation frontend (macOS)',
      },
      {
        title: 'Steam Big Picture',
        execPath: '/Applications/Steam.app/Contents/MacOS/steam',
        args: '-gamepadui',
        category: 'steam' as const,
        coverUrl: 'https://images.unsplash.com/photo-1612287233207-6b4df30b42c4?w=400&q=80',
        description: 'Valve Steam full-screen launcher (macOS)',
      },
      {
        title: 'Dolphin GameCube/Wii',
        execPath: '/Applications/Dolphin.app/Contents/MacOS/Dolphin',
        args: '-b',
        category: 'emulator' as const,
        coverUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400&q=80',
        description: 'Nintendo GameCube and Wii emulator (macOS)',
      },
    ];
  } else {
    // Linux
    return [
      {
        title: 'RPCS3 (PS3 Emulator)',
        execPath: '/usr/bin/rpcs3',
        args: '--no-gui',
        category: 'emulator' as const,
        coverUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80',
        description: 'Sony PlayStation 3 Emulator (Linux AppImage / Flatpak)',
      },
      {
        title: 'RetroArch Universal',
        execPath: '/usr/bin/retroarch',
        args: '-v',
        category: 'retro' as const,
        coverUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=80',
        description: 'Multi-system retro emulation frontend (Linux)',
      },
      {
        title: 'Steam Big Picture',
        execPath: 'steam',
        args: '-gamepadui',
        category: 'steam' as const,
        coverUrl: 'https://images.unsplash.com/photo-1612287233207-6b4df30b42c4?w=400&q=80',
        description: 'Valve Steam full-screen launcher',
      },
      {
        title: 'Lutris Open Gaming',
        execPath: '/usr/bin/lutris',
        args: '',
        category: 'native' as const,
        coverUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=80',
        description: 'Open gaming platform for Linux',
      },
      {
        title: 'Dolphin GameCube/Wii',
        execPath: '/usr/bin/dolphin-emu',
        args: '-b',
        category: 'emulator' as const,
        coverUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400&q=80',
        description: 'Nintendo GameCube and Wii emulator (Linux)',
      },
    ];
  }
};

export const AddGameModal: React.FC<AddGameModalProps> = ({
  isOpen,
  onClose,
  onGameAdded,
}) => {
  const [selectedOs, setSelectedOs] = useState<'win' | 'mac' | 'linux'>(() => {
    const platform = (window as unknown as { api?: { platform?: string } }).api?.platform;
    if (platform === 'win32' || /Win/i.test(navigator.userAgent)) return 'win';
    if (platform === 'darwin' || /Mac/i.test(navigator.userAgent)) return 'mac';
    return 'linux';
  });

  const presets = getPresetsForOs(selectedOs);
  const [title, setTitle] = useState('');
  const [execPath, setExecPath] = useState('');
  const [args, setArgs] = useState('');
  const [category, setCategory] = useState<'emulator' | 'steam' | 'native' | 'retro'>('native');
  const [coverUrl, setCoverUrl] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleApplyPreset = (p: typeof presets[0]) => {
    soundFx.playTick();
    setTitle(p.title);
    setExecPath(p.execPath);
    setArgs(p.args);
    setCategory(p.category);
    setCoverUrl(p.coverUrl);
    setDescription(p.description);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !execPath.trim()) return;

    soundFx.playSettingChanged();
    const newGame = gameService.addGame({
      title: title.trim(),
      execPath: execPath.trim(),
      args: args.trim(),
      category,
      coverUrl: coverUrl.trim() || 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&q=80',
      description: description.trim() || 'Custom Linux executable application',
    });

    onGameAdded(newGame);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-xl max-h-[90vh] bg-slate-950 border border-white/20 rounded-xl shadow-2xl overflow-hidden text-slate-200 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <Gamepad2 className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold text-white tracking-wide font-sans uppercase">
                Add Custom Game / Linux Application
              </h2>
              <p className="text-xs text-white/50 font-mono">
                Launch emulators, Steam games, and custom binaries directly from XMB
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Quick Presets & OS Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                Quick App Presets ({selectedOs === 'win' ? 'Windows .exe' : selectedOs === 'mac' ? 'macOS' : 'Linux'}):
              </label>
              <div className="flex gap-1">
                {(['win', 'mac', 'linux'] as const).map((os) => (
                  <button
                    key={os}
                    type="button"
                    onClick={() => {
                      soundFx.playTick();
                      setSelectedOs(os);
                    }}
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded transition-all cursor-pointer ${
                      selectedOs === os
                        ? 'bg-sky-500 text-slate-950 shadow-[0_0_8px_rgba(56,189,248,0.5)]'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {os === 'win' ? 'Windows' : os === 'mac' ? 'macOS' : 'Linux'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p: ReturnType<typeof getPresetsForOs>[number], i: number) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="px-2.5 py-1 text-xs bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 text-white/80 rounded transition-colors cursor-pointer"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block mb-1.5">
              Game / Application Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. RPCS3 PlayStation 3 Emulator, Steam Game, RetroArch"
              className="w-full px-3.5 py-2 bg-black/60 border border-white/15 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-sky-400 font-sans"
            />
          </div>

          {/* Executable Path */}
          <div>
            <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block mb-1.5">
              Executable Command or Binary Path *
            </label>
            <div className="relative">
              <Terminal className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={execPath}
                onChange={(e) => setExecPath(e.target.value)}
                placeholder="e.g. /usr/bin/rpcs3, steam -gamepadui, /usr/bin/retroarch"
                className="w-full pl-9 pr-3.5 py-2 bg-black/60 border border-white/15 rounded-lg text-xs font-mono text-emerald-400 placeholder-white/40 focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {/* Launch Arguments */}
          <div>
            <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block mb-1.5">
              Launch Arguments (Optional)
            </label>
            <input
              type="text"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder="e.g. --fullscreen, -L core.so, /home/user/ROMs/game.iso"
              className="w-full px-3.5 py-2 bg-black/60 border border-white/15 rounded-lg text-xs font-mono text-white/90 placeholder-white/40 focus:outline-none focus:border-sky-400"
            />
          </div>

          {/* Category */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'emulator', label: 'Emulator' },
              { id: 'steam', label: 'Steam' },
              { id: 'native', label: 'Native Linux' },
              { id: 'retro', label: 'Retro Game' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  soundFx.playTick();
                  setCategory(cat.id as typeof category);
                }}
                className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                  category === cat.id
                    ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                    : 'bg-white/5 text-white/60 border-white/10 hover:border-white/20 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Cover Art URL */}
          <div>
            <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block mb-1.5">
              Cover Image URL (Optional)
            </label>
            <input
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://... image banner"
              className="w-full px-3.5 py-2 bg-black/60 border border-white/15 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none focus:border-sky-400"
            />
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                soundFx.playCancel();
                onClose();
              }}
              className="px-4 py-2 text-xs text-white/60 hover:text-white rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs rounded-lg shadow-[0_0_15px_rgba(56,189,248,0.4)] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Game Tab</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
