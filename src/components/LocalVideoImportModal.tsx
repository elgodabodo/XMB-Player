import React, { useState, useRef } from 'react';
import { VideoItem } from '../types';
import { videoService } from '../services/videoService';
import { soundFx } from '../services/soundFx';
import { Film, Upload, Plus, X, CheckCircle2, AlertCircle, HardDrive } from 'lucide-react';

interface LocalVideoImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoImported: (video: VideoItem) => void;
}

export const LocalVideoImportModal: React.FC<LocalVideoImportModalProps> = ({
  isOpen,
  onClose,
  onVideoImported,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Manual URL / Path Input State
  const [manualTitle, setManualTitle] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualFormat, setManualFormat] = useState('MP4');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mkv|mov|avi|ogg|m4v|flv|ts)$/i)) {
          continue;
        }

        const videoBlobUrl = URL.createObjectURL(file);
        const { thumbnailUrl, duration, resolution } = await videoService.generateThumbnail(file);

        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const ext = file.name.split('.').pop()?.toUpperCase() || 'MP4';

        const formatBytes = (bytes: number) => {
          if (bytes === 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB'];
          const idx = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, idx)).toFixed(1)) + ' ' + sizes[idx];
        };

        const newVideo: VideoItem = {
          id: `vid-${Date.now()}-${i}`,
          title: cleanTitle,
          videoUrl: videoBlobUrl,
          thumbnailUrl: thumbnailUrl || 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=500&q=80',
          duration,
          format: ext,
          resolution: resolution || '1080p',
          fileSize: formatBytes(file.size),
          dateAdded: new Date().toISOString().split('T')[0],
        };

        videoService.addVideo(newVideo);
        onVideoImported(newVideo);
      }

      soundFx.playSettingChanged();
      onClose();
    } catch (err) {
      setErrorMsg('Failed to process video file. Please ensure it is a valid video.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl.trim()) {
      setErrorMsg('Please provide a video URL or local file path.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const { thumbnailUrl, duration, resolution } = await videoService.generateThumbnail(manualUrl.trim());

      const urlParts = manualUrl.trim().split('/');
      const fallbackTitle = urlParts[urlParts.length - 1]?.replace(/\.[^/.]+$/, '') || 'Custom Video';

      const newVideo: VideoItem = {
        id: `vid-${Date.now()}`,
        title: manualTitle.trim() || fallbackTitle,
        videoUrl: manualUrl.trim(),
        thumbnailUrl: thumbnailUrl || 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=500&q=80',
        duration: duration || 120,
        format: manualFormat,
        resolution: resolution || '1080p',
        fileSize: 'Local Stream',
        dateAdded: new Date().toISOString().split('T')[0],
      };

      videoService.addVideo(newVideo);
      soundFx.playSettingChanged();
      onVideoImported(newVideo);
      onClose();
    } catch {
      setErrorMsg('Could not load the specified video URL or file path.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative flex flex-col w-full max-w-xl bg-slate-950 border border-white/20 rounded-2xl shadow-2xl overflow-hidden text-slate-200 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <Film className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold text-white tracking-wide font-sans uppercase">
                Import Local Video Files
              </h2>
              <p className="text-xs text-white/50 font-mono">
                PS3 Cinema Subsystem · MP4, WebM, MKV, MOV, AVI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              soundFx.playCancel();
              onClose();
            }}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-lg flex items-center gap-2 text-rose-300 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-sky-400 bg-sky-500/20 scale-[1.01]'
                : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska,video/*,.mkv,.mp4,.webm,.mov,.avi"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />

            <Upload className="w-10 h-10 text-sky-400 mb-3 animate-bounce" />
            <span className="text-sm font-bold text-white tracking-wide">
              {isProcessing ? 'Processing Video & Generating Snapshot...' : 'Drag & Drop Video Files Here'}
            </span>
            <span className="text-xs text-white/50 mt-1">
              or click anywhere to browse from local computer storage
            </span>
            <span className="text-[11px] font-mono text-sky-400/80 mt-2 px-2.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
              Supported: MP4 · WebM · MKV · MOV · AVI · OGG
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs font-mono text-white/40 uppercase">Or Add Direct URL / Path</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Direct Path Form */}
          <form onSubmit={handleManualSubmit} className="space-y-3 font-sans">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">
                Video Title
              </label>
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="e.g. Gran Turismo 5 Prologue Trailer"
                className="w-full px-3.5 py-2 rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/30 text-xs focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">
                Video File URL or Path
              </label>
              <input
                type="text"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="https://.../video.mp4 or /home/user/Videos/clip.mp4"
                className="w-full px-3.5 py-2 rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/30 text-xs font-mono focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isProcessing || !manualUrl.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-sky-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>{isProcessing ? 'Importing...' : 'Add Video to Library'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-white/5 text-xs text-white/60 font-mono">
          <span>Linux PipeWire Video Renderer</span>
          <span>✕: Select · ○: Cancel</span>
        </div>
      </div>
    </div>
  );
};
