import React, { useEffect, useRef } from 'react';
import { gstEngine } from '../services/gstreamerEngine';
import { ExtractedPalette, XMBTheme } from '../types';

interface XMBWaveBackgroundProps {
  theme: XMBTheme;
  interactiveAudio?: boolean;
  dynamicPalette?: ExtractedPalette | null;
  customPalette?: ExtractedPalette | null;
}

interface Sparkle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  pulseSpeed: number;
  pulsePhase: number;
}

interface ThemePalette {
  bgTop: string;
  bgBottom: string;
  ribbon1: [number, number, number];
  ribbon2: [number, number, number];
  ribbon3: [number, number, number];
}

const THEME_PALETTES: Record<Exclude<XMBTheme, 'time_of_day' | 'album_art' | 'custom'>, ThemePalette> = {
  original_silver: {
    bgTop: '#08080a',
    bgBottom: '#000000',
    ribbon1: [230, 235, 245],
    ribbon2: [170, 180, 195],
    ribbon3: [110, 120, 135],
  },
  midnight: {
    bgTop: '#0f131a',
    bgBottom: '#040608',
    ribbon1: [180, 210, 240],
    ribbon2: [120, 150, 180],
    ribbon3: [80, 100, 130],
  },
  classic_red: {
    bgTop: '#350a0e',
    bgBottom: '#0e0204',
    ribbon1: [255, 90, 100],
    ribbon2: [220, 40, 60],
    ribbon3: [140, 20, 30],
  },
  ocean_blue: {
    bgTop: '#081f3d',
    bgBottom: '#020914',
    ribbon1: [100, 200, 255],
    ribbon2: [30, 120, 210],
    ribbon3: [15, 60, 120],
  },
  emerald: {
    bgTop: '#06291a',
    bgBottom: '#010a06',
    ribbon1: [90, 230, 160],
    ribbon2: [20, 160, 90],
    ribbon3: [10, 90, 50],
  },
  sakura: {
    bgTop: '#2b0f29',
    bgBottom: '#0a0209',
    ribbon1: [255, 140, 230],
    ribbon2: [190, 60, 160],
    ribbon3: [110, 30, 90],
  },
  amber_gold: {
    bgTop: '#2d1e08',
    bgBottom: '#090601',
    ribbon1: [255, 200, 80],
    ribbon2: [210, 140, 30],
    ribbon3: [120, 70, 10],
  },
};

export const XMBWaveBackground: React.FC<XMBWaveBackgroundProps> = ({
  theme,
  interactiveAudio = true,
  dynamicPalette = null,
  customPalette = null,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const themeRef = useRef(theme);
  const interactiveAudioRef = useRef(interactiveAudio);
  const dynamicPaletteRef = useRef(dynamicPalette);
  const customPaletteRef = useRef(customPalette);

  useEffect(() => {
    themeRef.current = theme;
    interactiveAudioRef.current = interactiveAudio;
    dynamicPaletteRef.current = dynamicPalette;
    customPaletteRef.current = customPalette;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Generate floating sparkles
    const sparklesCount = 45;
    const sparkles: Sparkle[] = Array.from({ length: sparklesCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2.2 + 0.6,
      speedY: -(Math.random() * 0.35 + 0.1),
      speedX: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.7 + 0.3,
      pulseSpeed: Math.random() * 0.03 + 0.015,
      pulsePhase: Math.random() * Math.PI * 2,
    }));

    let time = 0;

    const render = () => {
      time += 0.009;

      const currTheme = themeRef.current;
      const currInteractiveAudio = interactiveAudioRef.current;
      const currDynamicPalette = dynamicPaletteRef.current;
      const currCustomPalette = customPaletteRef.current;

      // Audio analysis for wave reactivity
      let audioBoost = 0;
      if (currInteractiveAudio) {
        const freqData = gstEngine.getFrequencyData();
        let sum = 0;
        for (let i = 0; i < 32; i++) {
          sum += freqData[i] || 0;
        }
        audioBoost = (sum / 32 / 255) * 1.6;
      }

      // Determine palette
      let palette: ThemePalette;
      if (currTheme === 'custom' && currCustomPalette) {
        palette = {
          bgTop: currCustomPalette.bgTop,
          bgBottom: currCustomPalette.bgBottom,
          ribbon1: currCustomPalette.ribbon1,
          ribbon2: currCustomPalette.ribbon2,
          ribbon3: currCustomPalette.ribbon3,
        };
      } else if (currTheme === 'album_art' && currDynamicPalette) {
        palette = {
          bgTop: currDynamicPalette.bgTop,
          bgBottom: currDynamicPalette.bgBottom,
          ribbon1: currDynamicPalette.ribbon1,
          ribbon2: currDynamicPalette.ribbon2,
          ribbon3: currDynamicPalette.ribbon3,
        };
      } else if (currTheme === 'time_of_day') {
        const hour = new Date().getHours() + new Date().getMinutes() / 60;
        if (hour >= 5 && hour < 9) {
          palette = THEME_PALETTES.amber_gold; // Dawn
        } else if (hour >= 9 && hour < 17) {
          palette = THEME_PALETTES.ocean_blue; // Day
        } else if (hour >= 17 && hour < 21) {
          palette = THEME_PALETTES.sakura; // Sunset
        } else {
          palette = THEME_PALETTES.original_silver; // Night
        }
      } else {
        palette = THEME_PALETTES[currTheme as keyof typeof THEME_PALETTES] || THEME_PALETTES.original_silver;
      }

      // Background Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, palette.bgTop);
      bgGrad.addColorStop(1, palette.bgBottom);
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Render Multi-Layer Silky PS3 Ribbon Waves
      const ribbons = [
        {
          rgb: palette.ribbon1,
          baseY: height * 0.54,
          amplitude: 65 + audioBoost * 45,
          freq: 0.0018,
          speed: 1.0,
          phase: time,
          alpha: 0.22,
          thickness: 180,
        },
        {
          rgb: palette.ribbon2,
          baseY: height * 0.58,
          amplitude: 80 + audioBoost * 55,
          freq: 0.0013,
          speed: 0.85,
          phase: time * 0.9 + 2,
          alpha: 0.16,
          thickness: 210,
        },
        {
          rgb: palette.ribbon3,
          baseY: height * 0.62,
          amplitude: 95 + audioBoost * 65,
          freq: 0.0011,
          speed: 0.7,
          phase: time * 0.75 + 4,
          alpha: 0.12,
          thickness: 240,
        },
      ];

      ribbons.forEach((ribbon) => {
        ctx.save();
        ctx.beginPath();

        const step = 20;
        const ptsTop: [number, number][] = [];
        const ptsBottom: [number, number][] = [];

        for (let x = 0; x <= width + step; x += step) {
          const wave1 = Math.sin(x * ribbon.freq + ribbon.phase) * ribbon.amplitude;
          const wave2 = Math.cos(x * ribbon.freq * 0.5 - ribbon.phase * 0.5) * (ribbon.amplitude * 0.4);
          const y = ribbon.baseY + wave1 + wave2;

          ptsTop.push([x, y - ribbon.thickness * 0.5]);
          ptsBottom.push([x, y + ribbon.thickness * 0.5]);
        }

        // Draw top curve
        ctx.moveTo(ptsTop[0][0], ptsTop[0][1]);
        for (let i = 1; i < ptsTop.length; i++) {
          ctx.lineTo(ptsTop[i][0], ptsTop[i][1]);
        }

        // Draw bottom curve in reverse
        for (let i = ptsBottom.length - 1; i >= 0; i--) {
          ctx.lineTo(ptsBottom[i][0], ptsBottom[i][1]);
        }
        ctx.closePath();

        // Ribbon Gradient
        const [r, g, b] = ribbon.rgb;
        const grad = ctx.createLinearGradient(0, ribbon.baseY - ribbon.thickness, 0, ribbon.baseY + ribbon.thickness);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
        grad.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${ribbon.alpha * 0.7})`);
        grad.addColorStop(0.5, `rgba(${r + 30}, ${g + 30}, ${b + 30}, ${ribbon.alpha * 1.4})`);
        grad.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${ribbon.alpha * 0.7})`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.fillStyle = grad;
        ctx.fill();

        // Sharp highlight centerline for authentic silky PS3 edge
        ctx.beginPath();
        for (let i = 0; i < ptsTop.length; i++) {
          const midX = (ptsTop[i][0] + ptsBottom[i][0]) / 2;
          const midY = (ptsTop[i][1] + ptsBottom[i][1]) / 2;
          if (i === 0) ctx.moveTo(midX, midY);
          else ctx.lineTo(midX, midY);
        }
        ctx.strokeStyle = `rgba(255, 255, 255, ${ribbon.alpha * 0.85})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();
      });

      // Render Floating Sparkles
      sparkles.forEach((s) => {
        s.y += s.speedY;
        s.x += s.speedX;
        s.pulsePhase += s.pulseSpeed;

        if (s.y < -10) {
          s.y = height + 10;
          s.x = Math.random() * width;
        }
        if (s.x < -10) s.x = width + 10;
        if (s.x > width + 10) s.x = -10;

        const currentOpacity = s.opacity * (0.6 + 0.4 * Math.sin(s.pulsePhase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity * (0.8 + audioBoost * 0.4)})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ffffff';
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};
