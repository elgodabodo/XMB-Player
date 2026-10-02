/**
 * Picture Management Service
 * Manages custom imported user pictures, folders, and persistent storage.
 */

import { PictureItem } from '../types';

const STORAGE_KEY = 'xmb_custom_pictures';

class PictureService {
  private pictures: PictureItem[] = [];

  constructor() {
    this.loadPictures();
  }

  private loadPictures() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.pictures = JSON.parse(stored);
      } else {
        this.pictures = [];
      }
    } catch {
      this.pictures = [];
    }
  }

  private savePictures() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.pictures));
    } catch (err) {
      console.warn('Failed to save pictures to localStorage (quota exceeded?):', err);
    }
  }

  public getPictures(): PictureItem[] {
    return [...this.pictures];
  }

  public getFolders(): string[] {
    const folders = new Set<string>();
    for (const pic of this.pictures) {
      folders.add(pic.folder || 'Imported Photos');
    }
    return Array.from(folders);
  }

  public getPicturesByFolder(folderName: string): PictureItem[] {
    return this.pictures.filter((p) => (p.folder || 'Imported Photos') === folderName);
  }

  public addPicture(picture: PictureItem): PictureItem {
    this.pictures.unshift(picture);
    this.savePictures();
    return picture;
  }

  public addPictures(newPictures: PictureItem[]): PictureItem[] {
    if (!newPictures.length) return [];
    this.pictures = [...newPictures, ...this.pictures];
    this.savePictures();
    return newPictures;
  }

  public removePicture(id: string): boolean {
    const initialLen = this.pictures.length;
    this.pictures = this.pictures.filter((p) => p.id !== id);
    if (this.pictures.length !== initialLen) {
      this.savePictures();
      return true;
    }
    return false;
  }

  public clearAllCustomPictures(): void {
    this.pictures = [];
    this.savePictures();
  }

  /**
   * Optimize and downscale uploaded photo to max 1920x1080 to ensure crisp rendering
   * while keeping storage footprint compact.
   */
  public optimizeImage(file: File): Promise<string> {
    return new Promise((resolve) => {
      // If SVG or small file (< 300KB), read directly as data URL
      if (file.type === 'image/svg+xml' || file.size < 300 * 1024) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(URL.createObjectURL(file));
        reader.readAsDataURL(file);
        return;
      }

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxW = 1920;
        const maxH = 1080;
        let w = img.width;
        let h = img.height;

        if (w > maxW || h > maxH) {
          if (w / maxW > h / maxH) {
            h = Math.round((h * maxW) / w);
            w = maxW;
          } else {
            w = Math.round((w * maxH) / h);
            h = maxH;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(URL.createObjectURL(file));
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(format, 0.85);
        resolve(dataUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(URL.createObjectURL(file));
        reader.readAsDataURL(file);
      };

      img.src = objectUrl;
    });
  }
}

export const pictureService = new PictureService();
