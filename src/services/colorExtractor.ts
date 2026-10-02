/**
 * Dynamic Album Art Color Extractor
 * Samples colors from album art to dynamically generate cohesive
 * PS3 XMB background gradients and ribbon wave colors.
 */

import { ExtractedPalette } from '../types';

export class ColorExtractor {
  private cache: Map<string, ExtractedPalette> = new Map();

  public async extractPalette(imageUrl: string): Promise<ExtractedPalette> {
    if (this.cache.has(imageUrl)) {
      return this.cache.get(imageUrl)!;
    }

    try {
      const palette = await this.sampleFromImage(imageUrl);
      this.cache.set(imageUrl, palette);
      return palette;
    } catch {
      // Deterministic fallback based on image URL string
      const fallback = this.generateFallbackPalette(imageUrl);
      this.cache.set(imageUrl, fallback);
      return fallback;
    }
  }

  private sampleFromImage(src: string): Promise<ExtractedPalette> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas unsupported'));
            return;
          }

          canvas.width = 40;
          canvas.height = 40;
          ctx.drawImage(img, 0, 0, 40, 40);

          const imgData = ctx.getImageData(0, 0, 40, 40).data;
          let rSum = 0, gSum = 0, bSum = 0;
          let rMax = 0, gMax = 0, bMax = 0;
          let maxLuminance = 0;

          // Sample pixels
          for (let i = 0; i < imgData.length; i += 16) {
            const r = imgData[i];
            const g = imgData[i + 1];
            const b = imgData[i + 2];
            rSum += r;
            gSum += g;
            bSum += b;

            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            if (lum > maxLuminance && lum < 240) {
              maxLuminance = lum;
              rMax = r;
              gMax = g;
              bMax = b;
            }
          }

          const count = imgData.length / 16;
          const avgR = Math.round(rSum / count);
          const avgG = Math.round(gSum / count);
          const avgB = Math.round(bSum / count);

          // Deep dark background derived from average
          const bgTop = `rgb(${Math.floor(avgR * 0.25 + 6)}, ${Math.floor(avgG * 0.25 + 8)}, ${Math.floor(avgB * 0.25 + 12)})`;
          const bgBottom = `rgb(${Math.floor(avgR * 0.1 + 2)}, ${Math.floor(avgG * 0.1 + 2)}, ${Math.floor(avgB * 0.1 + 4)})`;

          // Vibrant ribbon tones
          const ribbon1: [number, number, number] = [
            Math.min(255, Math.floor(rMax * 1.1 + 40)),
            Math.min(255, Math.floor(gMax * 1.1 + 40)),
            Math.min(255, Math.floor(bMax * 1.1 + 40)),
          ];
          const ribbon2: [number, number, number] = [
            Math.floor(avgR * 1.2),
            Math.floor(avgG * 1.2),
            Math.floor(avgB * 1.2),
          ];
          const ribbon3: [number, number, number] = [
            Math.floor(avgR * 0.7),
            Math.floor(avgG * 0.7),
            Math.floor(avgB * 0.7),
          ];

          resolve({
            bgTop,
            bgBottom,
            ribbon1,
            ribbon2,
            ribbon3,
            accent: `rgb(${rMax}, ${gMax}, ${bMax})`,
          });
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  private generateFallbackPalette(seed: string): ExtractedPalette {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const r = Math.abs((hash & 0xff0000) >> 16);
    const g = Math.abs((hash & 0x00ff00) >> 8);
    const b = Math.abs(hash & 0x0000ff);

    return {
      bgTop: `rgb(${Math.floor(r * 0.2 + 8)}, ${Math.floor(g * 0.2 + 8)}, ${Math.floor(b * 0.2 + 14)})`,
      bgBottom: '#040608',
      ribbon1: [Math.min(255, r + 50), Math.min(255, g + 50), Math.min(255, b + 50)],
      ribbon2: [r, g, b],
      ribbon3: [Math.floor(r * 0.6), Math.floor(g * 0.6), Math.floor(b * 0.6)],
      accent: `rgb(${r}, ${g}, ${b})`,
    };
  }
}

export const colorExtractor = new ColorExtractor();
