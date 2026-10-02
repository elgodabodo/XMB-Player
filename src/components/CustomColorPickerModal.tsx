import React, { useState, useEffect } from 'react';
import { ExtractedPalette } from '../types';
import { soundFx } from '../services/soundFx';
import { Palette, X, Check, RotateCcw, Sparkles } from 'lucide-react';

interface CustomColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPalette: ExtractedPalette;
  onApplyPalette: (palette: ExtractedPalette) => void;
}

const COLOR_PRESETS: { name: string; palette: ExtractedPalette }[] = [
  {
    name: 'Vaporwave Twilight',
    palette: {
      bgTop: '#250730',
      bgBottom: '#05020c',
      ribbon1: [255, 90, 200],
      ribbon2: [90, 220, 255],
      ribbon3: [140, 50, 180],
      accent: '#ff5ad2',
    },
  },
  {
    name: 'Cyberpunk Matrix',
    palette: {
      bgTop: '#041d1a',
      bgBottom: '#000706',
      ribbon1: [50, 255, 180],
      ribbon2: [255, 230, 40],
      ribbon3: [20, 140, 90],
      accent: '#32ffb4',
    },
  },
  {
    name: 'Blood Moon Crimson',
    palette: {
      bgTop: '#3b060d',
      bgBottom: '#0e0103',
      ribbon1: [255, 60, 80],
      ribbon2: [255, 140, 40],
      ribbon3: [150, 20, 30],
      accent: '#ff3c50',
    },
  },
  {
    name: 'Arctic Glacier',
    palette: {
      bgTop: '#071b2e',
      bgBottom: '#01070e',
      ribbon1: [120, 225, 255],
      ribbon2: [180, 240, 255],
      ribbon3: [40, 110, 180],
      accent: '#78e1ff',
    },
  },
  {
    name: 'Solar Flare Gold',
    palette: {
      bgTop: '#361803',
      bgBottom: '#0a0400',
      ribbon1: [255, 190, 50],
      ribbon2: [255, 95, 30],
      ribbon3: [170, 70, 10],
      accent: '#ffbe32',
    },
  },
  {
    name: 'Titanium Slate',
    palette: {
      bgTop: '#181a20',
      bgBottom: '#050608',
      ribbon1: [230, 235, 245],
      ribbon2: [140, 150, 165],
      ribbon3: [70, 80, 95],
      accent: '#e6ebf5',
    },
  },
];

// Helper: rgb array to hex string
function rgbToHex([r, g, b]: [number, number, number]): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Helper: hex to rgb array
function hexToRgb(hex: string): [number, number, number] {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export const CustomColorPickerModal: React.FC<CustomColorPickerModalProps> = ({
  isOpen,
  onClose,
  initialPalette,
  onApplyPalette,
}) => {
  const [bgTop, setBgTop] = useState(initialPalette.bgTop);
  const [bgBottom, setBgBottom] = useState(initialPalette.bgBottom);
  const [ribbon1Hex, setRibbon1Hex] = useState(rgbToHex(initialPalette.ribbon1));
  const [ribbon2Hex, setRibbon2Hex] = useState(rgbToHex(initialPalette.ribbon2));
  const [accent, setAccent] = useState(initialPalette.accent || '#38bdf8');

  useEffect(() => {
    if (isOpen) {
      setBgTop(initialPalette.bgTop);
      setBgBottom(initialPalette.bgBottom);
      setRibbon1Hex(rgbToHex(initialPalette.ribbon1));
      setRibbon2Hex(rgbToHex(initialPalette.ribbon2));
      setAccent(initialPalette.accent || '#38bdf8');
    }
  }, [isOpen, initialPalette]);

  if (!isOpen) return null;

  const handleApplyPreset = (p: typeof COLOR_PRESETS[0]) => {
    soundFx.playTick();
    setBgTop(p.palette.bgTop);
    setBgBottom(p.palette.bgBottom);
    setRibbon1Hex(rgbToHex(p.palette.ribbon1));
    setRibbon2Hex(rgbToHex(p.palette.ribbon2));
    setAccent(p.palette.accent);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playSettingChanged();

    const r1 = hexToRgb(ribbon1Hex);
    const r2 = hexToRgb(ribbon2Hex);
    const r3: [number, number, number] = [
      Math.round(r1[0] * 0.5),
      Math.round(r1[1] * 0.5),
      Math.round(r1[2] * 0.5),
    ];

    onApplyPalette({
      bgTop,
      bgBottom,
      ribbon1: r1,
      ribbon2: r2,
      ribbon3: r3,
      accent,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-xl bg-slate-950 border border-white/20 rounded-xl shadow-2xl overflow-hidden text-slate-200 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold text-white tracking-wide font-sans uppercase">
                Custom XMB Wave Background Colors
              </h2>
              <p className="text-xs text-white/50 font-mono">
                Set custom background gradient and silky ribbon wave color values
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
        <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto max-h-[80vh]">
          {/* Live Mini Preview Box */}
          <div className="relative h-28 rounded-xl overflow-hidden border border-white/20 shadow-inner flex items-center justify-center">
            <div
              className="absolute inset-0 transition-colors duration-300"
              style={{
                background: `linear-gradient(to bottom, ${bgTop}, ${bgBottom})`,
              }}
            />
            {/* Simulated Silk Ribbons in Preview */}
            <div
              className="absolute w-[140%] h-12 blur-md opacity-40 -rotate-6 transition-all duration-300"
              style={{ backgroundColor: ribbon1Hex }}
            />
            <div
              className="absolute w-[140%] h-10 blur-lg opacity-35 rotate-3 transition-all duration-300"
              style={{ backgroundColor: ribbon2Hex }}
            />
            <div className="relative z-10 flex flex-col items-center drop-shadow-md">
              <span className="text-xs font-mono tracking-widest text-white/90 uppercase font-semibold">
                Live Wave Preview
              </span>
              <span className="text-[10px] text-white/50 font-mono mt-0.5">
                Top: {bgTop} · Bottom: {bgBottom}
              </span>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-xs font-semibold text-white/80 uppercase tracking-wider block mb-2">
              Curated Colorway Presets:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 hover:border-white/30 text-left transition-colors"
                >
                  <div className="flex items-center -space-x-1 shrink-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/40"
                      style={{ backgroundColor: p.palette.bgTop }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/40"
                      style={{ backgroundColor: rgbToHex(p.palette.ribbon1) }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/40"
                      style={{ backgroundColor: rgbToHex(p.palette.ribbon2) }}
                    />
                  </div>
                  <span className="text-xs text-white/90 truncate font-sans font-medium">
                    {p.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Values Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Background Top */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
              <label className="text-xs font-semibold text-white/80 block">
                Background Top
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  type="color"
                  value={bgTop}
                  onChange={(e) => setBgTop(e.target.value)}
                  className="w-8 h-8 rounded border border-white/30 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={bgTop}
                  onChange={(e) => setBgTop(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs font-mono text-white bg-black/60 border border-white/20 rounded uppercase"
                />
              </div>
            </div>

            {/* Background Bottom */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
              <label className="text-xs font-semibold text-white/80 block">
                Background Bottom
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  type="color"
                  value={bgBottom}
                  onChange={(e) => setBgBottom(e.target.value)}
                  className="w-8 h-8 rounded border border-white/30 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={bgBottom}
                  onChange={(e) => setBgBottom(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs font-mono text-white bg-black/60 border border-white/20 rounded uppercase"
                />
              </div>
            </div>

            {/* Primary Ribbon Color */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
              <label className="text-xs font-semibold text-white/80 block">
                Primary Ribbon Wave
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  type="color"
                  value={ribbon1Hex}
                  onChange={(e) => setRibbon1Hex(e.target.value)}
                  className="w-8 h-8 rounded border border-white/30 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={ribbon1Hex}
                  onChange={(e) => setRibbon1Hex(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs font-mono text-white bg-black/60 border border-white/20 rounded uppercase"
                />
              </div>
            </div>

            {/* Secondary Ribbon Color */}
            <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
              <label className="text-xs font-semibold text-white/80 block">
                Secondary Ribbon Wave
              </label>
              <div className="flex items-center gap-2.5">
                <input
                  type="color"
                  value={ribbon2Hex}
                  onChange={(e) => setRibbon2Hex(e.target.value)}
                  className="w-8 h-8 rounded border border-white/30 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={ribbon2Hex}
                  onChange={(e) => setRibbon2Hex(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs font-mono text-white bg-black/60 border border-white/20 rounded uppercase"
                />
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => handleApplyPreset(COLOR_PRESETS[0])}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white/60 hover:text-white rounded transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Defaults</span>
            </button>
            <div className="flex items-center gap-2">
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
                <Check className="w-4 h-4" />
                <span>Apply Custom Colors</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
