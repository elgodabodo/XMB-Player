import React, { useState } from 'react';
import { PictureItem } from '../types';
import { pictureService } from '../services/pictureService';
import { Image, UploadCloud, Folder, Check, X, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { soundFx } from '../services/soundFx';

interface LocalPictureImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPicturesImported: (pictures: PictureItem[]) => void;
}

export const LocalPictureImportModal: React.FC<LocalPictureImportModalProps> = ({
  isOpen,
  onClose,
  onPicturesImported,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [folderName, setFolderName] = useState('Imported Photos');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | null, detectedFolder?: string) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setStatusMessage(null);
    soundFx.playTick(); // Start sound effect

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/') || file.name.match(/\.(png|jpe?g|webp|gif|bmp|svg)$/i)) {
        validFiles.push(file);
      }
    }

    const total = validFiles.length;
    if (total === 0) {
      setIsProcessing(false);
      return;
    }

    const targetFolder = detectedFolder || folderName.trim() || 'Imported Photos';
    const newPictures: PictureItem[] = [];

    for (let i = 0; i < total; i++) {
      const file = validFiles[i];

      // Update progress
      if (i % 2 === 0 || i === total - 1) {
        setProgress({ current: i + 1, total });
        await new Promise((r) => setTimeout(r, 0));
      }

      const nativePath = (file as any).path as string | undefined;
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '');

      try {
        const optimizedUrl = await pictureService.optimizeImage(file);
        const pic: PictureItem = {
          id: `pic-custom-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          title: cleanTitle,
          subtitle: `${targetFolder} · ${new Date().toLocaleDateString()}`,
          url: optimizedUrl,
          folder: targetFolder,
          dateAdded: new Date().toISOString().split('T')[0],
          filePath: nativePath,
          isCustom: true,
        };
        newPictures.push(pic);
      } catch (err) {
        console.warn('Failed to process picture file:', file.name, err);
      }
    }

    pictureService.addPictures(newPictures);
    setIsProcessing(false);
    setProgress(null);
    soundFx.playSelect(); // End sound effect
    setStatusMessage(`Successfully imported ${newPictures.length} pictures into folder "${targetFolder}".`);

    onPicturesImported(newPictures);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-lg bg-slate-950 border border-white/15 rounded-xl shadow-2xl overflow-hidden text-slate-200 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <Image className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
              Import Custom Pictures to Photo Tab
            </h3>
          </div>
          <button
            onClick={() => {
              soundFx.playCancel();
              onClose();
            }}
            className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Target Folder Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-amber-400" />
              <span>Target Photo Folder Name:</span>
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Imported Photos, Wallpapers, Screenshots..."
              disabled={isProcessing}
              className="w-full px-3.5 py-2 bg-black/50 border border-white/15 rounded-lg text-xs font-medium text-white placeholder-white/30 focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* Import Buttons */}
          <div className="flex items-center gap-3">
            {/* Folder Picker */}
            <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 rounded-xl cursor-pointer transition-all text-xs font-semibold text-white/90">
              <Folder className="w-4 h-4 text-amber-400" />
              <span>Select Folder</span>
              <input
                type="file"
                // @ts-expect-error webkitdirectory is standard for folder import
                webkitdirectory=""
                directory=""
                multiple
                disabled={isProcessing}
                onChange={(e) => {
                  const files = e.target.files;
                  const folder = files?.[0]?.webkitRelativePath?.split('/')[0];
                  handleFiles(files, folder);
                }}
                className="hidden"
              />
            </label>

            {/* Individual Files Picker */}
            <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 rounded-xl cursor-pointer transition-all text-xs font-semibold text-white/90">
              <Image className="w-4 h-4 text-sky-400" />
              <span>Select Images</span>
              <input
                type="file"
                multiple
                accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.bmp"
                disabled={isProcessing}
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
            </label>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!isProcessing) setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (!isProcessing) handleFiles(e.dataTransfer.files);
            }}
            className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition-all ${
              dragActive
                ? 'border-amber-400 bg-amber-950/20'
                : 'border-white/15 bg-white/5 hover:border-white/25'
            }`}
          >
            <UploadCloud className="w-8 h-8 text-white/40 mb-2" />
            <p className="text-xs font-medium text-white mb-0.5">
              Or drag & drop image files / folders here
            </p>
            <p className="text-[11px] text-white/40 font-mono">
              Supports PNG, JPG, WEBP, and GIF
            </p>
          </div>

          {/* Progress Bar */}
          {isProcessing && progress && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-amber-300 font-semibold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Processing Pictures ({progress.current} of {progress.total})</span>
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {Math.round((progress.current / progress.total) * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-amber-500/20">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-100"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-white/10 bg-white/5">
          <button
            onClick={() => {
              soundFx.playCancel();
              onClose();
            }}
            disabled={isProcessing}
            className="px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
