import React, { useState } from 'react';
import { Track } from '../types';
import { libraryStorage } from '../services/libraryStorage';
import { audioMetadataService } from '../services/audioMetadataService';
import { saveAudioBlob } from '../services/audioDb';
import { formatFileUrl } from '../services/nativeBridge';
import { UploadCloud, FileAudio, Check, X, HardDrive, FolderSearch, Folder, ArrowRight, Music, RefreshCw, Trash2 } from 'lucide-react';
import { soundFx } from '../services/soundFx';

interface LocalImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackImported: (track: Track) => void;
}

export const LocalImportModal: React.FC<LocalImportModalProps> = ({
  isOpen,
  onClose,
  onTrackImported,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [importedTracks, setImportedTracks] = useState<Track[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [directoryPath, setDirectoryPath] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [savedDirs, setSavedDirs] = useState<string[]>(() => libraryStorage.getMusicDirectories());

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | null, folderPrefix?: string) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setStatusMessage(null);

    const newTracks: Track[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|flac|wav|ogg|m4a|aac|opus|wma)$/i)) {
        continue;
      }

      // Check if Electron native path is available on the File object
      const nativePath = (file as any).path as string | undefined;

      // Generate local object URL or file URL
      const audioUrl = nativePath ? formatFileUrl(nativePath) : URL.createObjectURL(file);

      // Deep parse ID3v2, ID3v1, FLAC Vorbis metadata & embedded cover images
      const meta = await audioMetadataService.parseFile(file);

      const track: Track = {
        id: `local-${Date.now()}-${i}`,
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

      // Always save the audio blob into IndexedDB so it reliably persists across restarts
      // in both Web, Linux AppImage, and Windows Portable (avoiding Chromium local file:// security blocks)
      await saveAudioBlob(track.id, file);

      // If nativePath exists, save its parent directory so the directory config is remembered
      if (nativePath) {
        try {
          const separator = nativePath.includes('\\') ? '\\' : '/';
          const parts = nativePath.split(separator);
          parts.pop();
          const parentDir = parts.join(separator);
          if (parentDir) {
            libraryStorage.addMusicDirectory(parentDir);
            setSavedDirs(libraryStorage.getMusicDirectories());
          }
        } catch {}
      }

      libraryStorage.addTrack(track);
      newTracks.push(track);
      onTrackImported(track);
    }

    setImportedTracks((prev) => [...prev, ...newTracks]);
    setIsProcessing(false);
    soundFx.playSelect();
    setStatusMessage(`Successfully imported ${newTracks.length} audio tracks with persistent metadata.`);
  };

  // Pull music from pasted directory path or scan directory
  const handlePullFromDirectory = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = directoryPath.trim();
    if (!path) return;

    setIsProcessing(true);
    soundFx.playTick();

    // 1. If in Electron or native scan succeeds:
    const realScanned = await libraryStorage.scanMusicDirectory(path);
    setSavedDirs(libraryStorage.getMusicDirectories());

    if (realScanned.length > 0) {
      realScanned.forEach((t) => onTrackImported(t));
      setImportedTracks((prev) => [...prev, ...realScanned]);
      setIsProcessing(false);
      soundFx.playSelect();
      setStatusMessage(`Found and registered ${realScanned.length} music tracks from: "${path}"`);
      setDirectoryPath('');
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

      const track: Track = {
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

      libraryStorage.addTrack(track);
      onTrackImported(track);
      return track;
    });

    setImportedTracks((prev) => [...prev, ...added]);
    setIsProcessing(false);
    soundFx.playSelect();
    setStatusMessage(`Saved directory "${path}" and registered ${added.length} tracks.`);
    setDirectoryPath('');
  };

  const handleRescanDir = async (dir: string) => {
    setIsProcessing(true);
    soundFx.playTick();
    const tracks = await libraryStorage.scanMusicDirectory(dir);
    tracks.forEach((t) => onTrackImported(t));
    setIsProcessing(false);
    soundFx.playSelect();
    setStatusMessage(`Rescanned "${dir}": found ${tracks.length} tracks.`);
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
            <HardDrive className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white tracking-wide font-display uppercase">
                Import Local Music to XMB Library
              </h2>
              <p className="text-xs text-white/50">
                Paste a folder path, pick a directory, or drag & drop files
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
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Section 1: Paste Directory Path */}
          <form onSubmit={handlePullFromDirectory} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/90 uppercase tracking-wider">
              <FolderSearch className="w-4 h-4 text-sky-400" />
              <span>Paste Local Music Directory Path:</span>
            </div>
            <p className="text-[11px] text-white/50">
              Enter any directory path to automatically scan and pull all audio files into your collection.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={directoryPath}
                onChange={(e) => setDirectoryPath(e.target.value)}
                placeholder="/home/user/Music/FLAC or ~/Music/Albums"
                className="flex-1 px-3.5 py-2 bg-black/60 border border-white/20 rounded-lg text-xs font-mono text-white placeholder-white/40 focus:outline-none focus:border-sky-400"
              />
              <button
                type="submit"
                disabled={!directoryPath.trim() || isProcessing}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white font-semibold text-xs rounded-lg transition-all shrink-0 cursor-pointer shadow-sm"
              >
                <span>Pull Music</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

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
                onChange={(e) => handleFiles(e.target.files)}
                className="hidden"
              />
            </label>
          </div>

          {/* Section 3: Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFiles(e.dataTransfer.files);
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
            <div className="space-y-2">
              <span className="text-xs font-semibold text-white/80 uppercase">
                Imported Files ({importedTracks.length}):
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-black/40 rounded border border-white/10 font-sans">
                {importedTracks.map((trk) => (
                  <div
                    key={trk.id}
                    className="flex items-center justify-between text-xs p-2 bg-white/5 rounded"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileAudio className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-white truncate">{trk.title}</span>
                      <span className="text-white/40 font-mono text-[10px]">
                        [{trk.format}]
                      </span>
                    </div>
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-white/5 text-xs text-white/60">
          <span>Processed directly via HTML5 & Web Audio Pipeline</span>
          <button
            onClick={() => {
              soundFx.playCancel();
              onClose();
            }}
            className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
