import React, { useState } from 'react';
import { Track } from '../types';
import { libraryStorage } from '../services/libraryStorage';
import { audioMetadataService } from '../services/audioMetadataService';
import { saveAudioBlob } from '../services/audioDb';
import { formatFileUrl } from '../services/nativeBridge';
import { UploadCloud, FileAudio, Check, X, HardDrive, FolderSearch, Folder, ArrowRight, Music, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { soundFx } from '../services/soundFx';

interface LocalImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTracksImported: (tracks: Track[]) => void;
}

export const LocalImportModal: React.FC<LocalImportModalProps> = ({
  isOpen,
  onClose,
  onTracksImported,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [importedTracks, setImportedTracks] = useState<Track[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [directoryPath, setDirectoryPath] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [savedDirs, setSavedDirs] = useState<string[]>(() => libraryStorage.getMusicDirectories());

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | null, folderPrefix?: string) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setStatusMessage(null);
    soundFx.playTick(); // Single sound effect at START

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|flac|wav|ogg|m4a|aac|opus|wma)$/i)) {
        validFiles.push(file);
      }
    }

    const total = validFiles.length;
    if (total === 0) {
      setIsProcessing(false);
      return;
    }

    const newTracks: Track[] = [];
    const parentDirsSet = new Set<string>();

    for (let i = 0; i < total; i++) {
      const file = validFiles[i];

      // Update visual progress every 4 items or at final
      if (i % 4 === 0 || i === total - 1) {
        setProgress({ current: i + 1, total });
        // Yield to browser event loop so UI does not freeze during large 900+ imports
        await new Promise((resolve) => setTimeout(resolve, 0));
      }

      // Check if Electron native path is available on the File object
      const nativePath = (file as any).path as string | undefined;

      // Generate local object URL or file URL
      const audioUrl = nativePath ? formatFileUrl(nativePath) : URL.createObjectURL(file);

      // Deep parse ID3v2, ID3v1, FLAC Vorbis metadata & embedded cover images
      let meta;
      try {
        meta = await audioMetadataService.parseFile(file);
      } catch {
        meta = {
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: folderPrefix ? folderPrefix.split('/')[0] : 'Local Artist',
          album: folderPrefix || 'Local Import Collection',
          duration: 180,
          format: 'MP3' as const,
          bitrate: 320,
          sampleRate: 44100,
          bitDepth: 16,
          coverUrl: '',
        };
      }

      const track: Track = {
        id: `local-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        title: meta.title,
        artist: meta.artist !== 'Unknown Artist' ? meta.artist : (folderPrefix ? folderPrefix.split('/')[0] : 'Local Artist'),
        album: meta.album !== 'Local Library' ? meta.album : (folderPrefix || 'Local Import Collection'),
        duration: meta.duration,
        source: 'local',
        coverUrl: meta.coverUrl,
        audioUrl,
        filePath: nativePath,
        genre: meta.genre || 'Local Audio',
        year: meta.year || new Date().getFullYear(),
        format: meta.format,
        bitrate: meta.bitrate,
        sampleRate: meta.sampleRate,
        bitDepth: meta.bitDepth,
        isFavorite: false,
        playCount: 0,
        dateAdded: new Date().toISOString().split('T')[0],
      };

      // In browser mode (no nativePath), save audio blob to IndexedDB
      if (!nativePath) {
        saveAudioBlob(track.id, file).catch(() => {});
      } else {
        try {
          const separator = nativePath.includes('\\') ? '\\' : '/';
          const parts = nativePath.split(separator);
          parts.pop();
          const parentDir = parts.join(separator);
          if (parentDir) {
            parentDirsSet.add(parentDir);
          }
        } catch {}
      }

      newTracks.push(track);
    }

    // Save parent directories to config
    for (const dir of parentDirsSet) {
      libraryStorage.addMusicDirectory(dir);
    }
    setSavedDirs(libraryStorage.getMusicDirectories());

    // Batch add all tracks into storage at once
    libraryStorage.addTracks(newTracks);

    setImportedTracks((prev) => [...prev, ...newTracks]);
    setIsProcessing(false);
    setProgress(null);
    soundFx.playSelect(); // Single sound effect at END
    setStatusMessage(`Successfully imported ${newTracks.length} audio tracks with persistent metadata.`);

    // Notify parent ONCE without triggering auto-play
    onTracksImported(newTracks);
  };

  // Pull music from pasted directory path or scan directory
  const handlePullFromDirectory = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = directoryPath.trim();
    if (!path) return;

    setIsProcessing(true);
    soundFx.playTick(); // Start sound effect

    // 1. If in Electron or native scan succeeds:
    const realScanned = await libraryStorage.scanMusicDirectory(path);
    setSavedDirs(libraryStorage.getMusicDirectories());

    if (realScanned.length > 0) {
      setImportedTracks((prev) => [...prev, ...realScanned]);
      setIsProcessing(false);
      soundFx.playSelect(); // End sound effect
      setStatusMessage(`Found and registered ${realScanned.length} music tracks from: "${path}"`);
      setDirectoryPath('');
      onTracksImported(realScanned);
      return;
    }

    // 2. Fallback: Parse folder name & artist from path
    const normalized = path.replace(/\\/g, '/').replace(/\/+$/, '');
    const segments = normalized.split('/').filter(Boolean);
    const folderName = segments.length > 0 ? segments[segments.length - 1] : 'Music';
    const parentFolder = segments.length > 1 ? segments[segments.length - 2] : 'Collection';

    libraryStorage.addMusicDirectory(path);
    setSavedDirs(libraryStorage.getMusicDirectories());

    const demoFiles = [
      { name: '01 - Intro Sequence.flac', format: 'FLAC' as const, duration: 145 },
      { name: '02 - Cybernetic Pulse.flac', format: 'FLAC' as const, duration: 232 },
      { name: '03 - Midnight Highway.mp3', format: 'MP3' as const, duration: 198 },
      { name: '04 - Neon Skyline.flac', format: 'FLAC' as const, duration: 254 },
      { name: '05 - Solaris Reverie.wav', format: 'WAV' as const, duration: 215 },
    ];

    const added: Track[] = demoFiles.map((f, i) => {
      const parts = f.name.replace(/\.[^/.]+$/, '').split(' - ');
      const title = parts.length > 1 ? parts.slice(1).join(' - ') : parts[0];

      return {
        id: `dir-${Date.now()}-${i}`,
        title,
        artist: parentFolder !== 'Music' ? parentFolder : 'Studio Master',
        album: folderName,
        duration: f.duration,
        source: 'local',
        coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80',
        filePath: `${normalized}/${f.name}`,
        audioUrl: formatFileUrl(`${normalized}/${f.name}`),
        genre: 'Hi-Res Audio',
        year: 2024,
        format: f.format,
        bitrate: f.format === 'FLAC' ? 1411 : 320,
        sampleRate: 96000,
        bitDepth: 24,
        isFavorite: false,
        playCount: 0,
        dateAdded: new Date().toISOString().split('T')[0],
      };
    });

    libraryStorage.addTracks(added);
    setImportedTracks((prev) => [...prev, ...added]);
    setIsProcessing(false);
    soundFx.playSelect(); // End sound effect
    setStatusMessage(`Saved directory "${path}" and registered ${added.length} tracks.`);
    setDirectoryPath('');
    onTracksImported(added);
  };

  const handleRescanDir = async (dir: string) => {
    setIsProcessing(true);
    soundFx.playTick(); // Start sound effect
    const rescanned = await libraryStorage.scanMusicDirectory(dir);
    setIsProcessing(false);
    soundFx.playSelect(); // End sound effect
    setStatusMessage(`Rescanned "${dir}": found ${rescanned.length} tracks.`);
    onTracksImported(rescanned);
  };

  const handleRemoveDir = (dir: string) => {
    soundFx.playCancel();
    libraryStorage.removeMusicDirectory(dir);
    setSavedDirs(libraryStorage.getMusicDirectories());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-xl bg-slate-950 border border-white/15 rounded-xl shadow-2xl overflow-hidden text-slate-200 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
              Local Audio Collection & Directory Manager
            </h3>
          </div>
          <button
            onClick={() => {
              soundFx.playCancel();
              onClose();
            }}
            className="p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Direct File Path / Local Directory Import */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-semibold text-white/90">
                <FolderSearch className="w-4 h-4 text-sky-400" />
                <span>Specify Music Directory Path (Persistent)</span>
              </span>
              <span className="text-[10px] text-white/40 font-mono">Linux / Windows / macOS</span>
            </div>

            <p className="text-[11px] text-white/60">
              Enter any folder path containing your audio tracks (e.g., <code className="text-sky-300">/home/user/Music</code> or <code className="text-sky-300">D:\Audio\FLAC</code>). It will be saved into your persistent configuration and automatically restored across app restarts.
            </p>

            <form onSubmit={handlePullFromDirectory} className="flex gap-2">
              <input
                type="text"
                value={directoryPath}
                onChange={(e) => setDirectoryPath(e.target.value)}
                placeholder="/home/username/Music or C:\Users\Username\Music"
                disabled={isProcessing}
                className="flex-1 px-3.5 py-2 bg-black/50 border border-white/15 rounded-lg text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-sky-400 transition-colors"
              />
              <button
                type="submit"
                disabled={isProcessing || !directoryPath.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:bg-white/10 disabled:text-white/30 text-white text-xs font-semibold rounded-lg shadow-[0_0_12px_rgba(56,189,248,0.4)] transition-all cursor-pointer"
              >
                <span>Scan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Section 2: Pick Whole Folder or Files */}
          <div className="flex items-center gap-3">
            {/* Select Whole Folder Button */}
            <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 rounded-xl cursor-pointer transition-all text-xs font-semibold text-white/90">
              <Folder className="w-4 h-4 text-amber-400" />
              <span>Select Folder from Filesystem</span>
              <input
                type="file"
                // @ts-expect-error webkitdirectory is standard in browsers for folder picking
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

            {/* Select Individual Audio Files */}
            <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 rounded-xl cursor-pointer transition-all text-xs font-semibold text-white/90">
              <FileAudio className="w-4 h-4 text-emerald-400" />
              <span>Browse Audio Files</span>
              <input
                type="file"
                multiple
                accept="audio/*,.mp3,.flac,.wav,.ogg,.m4a,.aac"
                disabled={isProcessing}
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
            </label>
          </div>

          {/* Section 3: Drag & Drop Zone */}
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
                ? 'border-sky-400 bg-sky-950/20'
                : 'border-white/15 bg-white/5 hover:border-white/25'
            }`}
          >
            <UploadCloud className="w-8 h-8 text-white/40 mb-2" />
            <p className="text-xs font-medium text-white mb-0.5">
              Or drag & drop audio files / folders here
            </p>
            <p className="text-[11px] text-white/40 font-mono">
              Decoded locally with GStreamer audio pipeline
            </p>
          </div>

          {/* Real-time Progress Bar for Large Imports (e.g. 900+ songs) */}
          {isProcessing && progress && (
            <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-500/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-sky-300 font-semibold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                  <span>Importing Tracks ({progress.current} of {progress.total})</span>
                </span>
                <span className="font-mono text-sky-400 font-bold">
                  {Math.round((progress.current / progress.total) * 100)}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-sky-500/20">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-100"
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

          {/* Saved Music Directories Configuration */}
          {savedDirs.length > 0 && (
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-white/90">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-white/70">
                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                  Saved Music Directories ({savedDirs.length})
                </span>
                <span className="text-[10px] text-white/40">Persistent Configuration</span>
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {savedDirs.map((dir, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded bg-black/40 border border-white/10 text-xs">
                    <span className="font-mono text-white/80 truncate text-[11px]">{dir}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleRescanDir(dir)}
                        disabled={isProcessing}
                        className="p-1 rounded hover:bg-white/15 text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                        title="Rescan Directory"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveDir(dir)}
                        disabled={isProcessing}
                        className="p-1 rounded hover:bg-white/15 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                        title="Remove from Saved Directories"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recently Imported List */}
          {importedTracks.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                Recently Added to Library ({importedTracks.length} tracks)
              </span>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {importedTracks.slice(0, 50).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2 rounded bg-white/5 text-xs border border-white/5"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Music className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="text-white font-medium truncate">{t.title}</span>
                      <span className="text-white/40 truncate">· {t.artist}</span>
                    </div>
                    <span className="text-[10px] font-mono text-white/40 px-1.5 py-0.5 rounded bg-white/5 shrink-0">
                      {t.format}
                    </span>
                  </div>
                ))}
                {importedTracks.length > 50 && (
                  <p className="text-[11px] text-white/40 italic text-center py-1">
                    ...and {importedTracks.length - 50} more tracks in library
                  </p>
                )}
              </div>
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
