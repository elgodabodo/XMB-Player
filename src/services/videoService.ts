/**
 * Video Management Service
 * Manages imported local video files, metadata extraction, thumbnails, and persistence.
 */

import { VideoItem } from '../types';

class VideoService {
  private videos: VideoItem[] = [];

  constructor() {
    this.loadVideos();
  }

  private loadVideos() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem('xmb_local_videos');
      if (stored) {
        this.videos = JSON.parse(stored);
      } else {
        this.videos = [];
      }
    } catch {
      this.videos = [];
    }
  }

  public getVideos(): VideoItem[] {
    return [...this.videos];
  }

  public getVideoById(id: string): VideoItem | undefined {
    return this.videos.find((v) => v.id === id);
  }

  public addVideo(video: VideoItem): VideoItem {
    this.videos.unshift(video);
    this.saveVideos();
    return video;
  }

  public addVideos(newVideos: VideoItem[]) {
    if (!newVideos.length) return;
    this.videos = [...newVideos.reverse(), ...this.videos];
    this.saveVideos();
  }

  public removeVideo(id: string) {
    this.videos = this.videos.filter((v) => v.id !== id);
    this.saveVideos();
  }

  public updateVideo(id: string, updates: Partial<VideoItem>) {
    const idx = this.videos.findIndex((v) => v.id === id);
    if (idx !== -1) {
      this.videos[idx] = { ...this.videos[idx], ...updates };
      this.saveVideos();
    }
  }

  /**
   * Helper to generate a video thumbnail using HTML5 Video + Canvas
   */
  public generateThumbnail(fileOrUrl: File | string): Promise<{ thumbnailUrl: string; duration: number; resolution: string }> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;

      const url = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
      video.src = url;

      const cleanUp = () => {
        if (typeof fileOrUrl !== 'string') {
          // Keep object URL active or let video player use it
        }
      };

      const handleLoadedData = () => {
        video.currentTime = Math.min(1.5, Math.max(0.1, video.duration * 0.1 || 1));
      };

      const handleSeeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = video.videoWidth || 640;
          const height = video.videoHeight || 360;
          canvas.width = Math.min(width, 480);
          canvas.height = Math.round((canvas.width / width) * height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const thumbData = canvas.toDataURL('image/jpeg', 0.82);
            resolve({
              thumbnailUrl: thumbData,
              duration: Math.round(video.duration || 0),
              resolution: `${width}×${height}`,
            });
            cleanUp();
            return;
          }
        } catch {
          // Canvas capture might fail if cross-origin without CORS
        }

        resolve({
          thumbnailUrl: '',
          duration: Math.round(video.duration || 0),
          resolution: `${video.videoWidth || 1920}×${video.videoHeight || 1080}`,
        });
        cleanUp();
      };

      const handleError = () => {
        resolve({
          thumbnailUrl: '',
          duration: 0,
          resolution: 'HD Video',
        });
        cleanUp();
      };

      video.addEventListener('loadeddata', handleLoadedData, { once: true });
      video.addEventListener('seeked', handleSeeked, { once: true });
      video.addEventListener('error', handleError, { once: true });
      video.load();
    });
  }

  public clearAllVideos() {
    this.videos = [];
    this.saveVideos();
  }

  private saveVideos() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('xmb_local_videos', JSON.stringify(this.videos));
    }
  }
}

export const videoService = new VideoService();
