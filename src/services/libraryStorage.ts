/**
 * Music Library Management Service
 * Manages Local Library, custom playlists, and persistence.
 */

import { Album, Artist, Playlist, Track } from '../types';
import { formatFileUrl, readDirectory, readFileAsBlob } from './nativeBridge';
import { getAudioBlob, saveAudioBlob, deleteAudioBlob, clearAllAudioBlobs } from './audioDb';

export const INITIAL_TRACKS: Track[] = [];

class LibraryStorageService {
  private tracks: Track[] = [];
  private playlists: Playlist[] = [];
  private musicDirectories: string[] = [];

  constructor() {
    this.loadFromStorage();
    this.restoreAudioBlobsAsync();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      // 1. Music Directories Config
      const storedDirs = localStorage.getItem('xmb_music_directories');
      if (storedDirs) {
        this.musicDirectories = JSON.parse(storedDirs);
      } else {
        this.musicDirectories = [];
      }

      // 2. Tracks with file path restoration
      const storedTracks = localStorage.getItem('crossbeat_tracks');
      if (storedTracks) {
        const parsed: Track[] = JSON.parse(storedTracks);
        // Filter out old premade demo tracks if present
        this.tracks = parsed
          .filter((t) => !t.id.startsWith('trk-') && !t.id.startsWith('ytm-') && !t.id.startsWith('spt-'))
          .map((t) => {
            // Restore persistent file path URL if present
            if (t.filePath) {
              return {
                ...t,
                audioUrl: formatFileUrl(t.filePath),
              };
            }
            return t;
          });
        this.saveTracks();
      } else {
        this.tracks = [];
        this.saveTracks();
      }

      const storedPlaylists = localStorage.getItem('crossbeat_playlists');
      if (storedPlaylists) {
        const parsed: Playlist[] = JSON.parse(storedPlaylists);
        // Clean out default sample playlists
        this.playlists = parsed
          .filter((p) => p.isSystem || (!p.id.startsWith('pl-synthwave') && !p.id.startsWith('pl-audiophile')))
          .map((p) => ({
            ...p,
            tracks: p.tracks.filter((t) => !t.id.startsWith('trk-') && !t.id.startsWith('ytm-') && !t.id.startsWith('spt-')),
          }));
        this.savePlaylists();
      } else {
        this.playlists = [
          {
            id: 'pl-favorites',
            title: 'Favorites',
            description: 'Your starred and favorite tracks',
            tracks: [],
            coverUrl: '',
            createdAt: new Date().toISOString().split('T')[0],
            isSystem: true,
          },
        ];
        this.savePlaylists();
      }
    } catch {
      this.tracks = [];
      this.musicDirectories = [];
      this.playlists = [
        {
          id: 'pl-favorites',
          title: 'Favorites',
          description: 'Your starred and favorite tracks',
          tracks: [],
          coverUrl: '',
          createdAt: new Date().toISOString().split('T')[0],
          isSystem: true,
        },
      ];
    }
  }

  // Restore audio URLs from IndexedDB or disk for any tracks across restarts
  private async restoreAudioBlobsAsync() {
    if (typeof window === 'undefined') return;
    let modified = false;

    for (const track of this.tracks) {
      try {
        const blob = await getAudioBlob(track.id);
        if (blob) {
          track.audioUrl = URL.createObjectURL(blob);
          modified = true;
        } else if (track.filePath) {
          const diskBlob = await readFileAsBlob(track.filePath, track.format);
          if (diskBlob) {
            await saveAudioBlob(track.id, diskBlob);
            track.audioUrl = URL.createObjectURL(diskBlob);
            modified = true;
          }
        }
      } catch {}
    }

    if (modified) {
      this.saveTracks();
    }
  }

  public getTracks(): Track[] {
    return [...this.tracks];
  }

  public getTrackById(id: string): Track | undefined {
    return this.tracks.find((t) => t.id === id);
  }

  public addTrack(track: Track) {
    // If track has a local file path, ensure audioUrl is formatted as file://
    if (track.filePath) {
      track.audioUrl = formatFileUrl(track.filePath);
    }
    // Prevent duplicate track IDs or filePaths
    this.tracks = this.tracks.filter((t) => t.id !== track.id && (!track.filePath || t.filePath !== track.filePath));
    this.tracks.unshift(track);
    this.saveTracks();
  }

  public removeTrack(trackId: string) {
    this.tracks = this.tracks.filter((t) => t.id !== trackId);
    this.saveTracks();
    // Also remove from playlists
    this.playlists.forEach((p) => {
      p.tracks = p.tracks.filter((t) => t.id !== trackId);
    });
    this.savePlaylists();
    deleteAudioBlob(trackId);
  }

  public clearAllTracks() {
    this.tracks = [];
    this.saveTracks();
    this.playlists.forEach((p) => {
      p.tracks = [];
    });
    this.savePlaylists();
    clearAllAudioBlobs();
  }

  // Music Directories Management
  public getMusicDirectories(): string[] {
    return [...this.musicDirectories];
  }

  public addMusicDirectory(dirPath: string): void {
    const cleaned = dirPath.trim();
    if (!cleaned) return;
    if (!this.musicDirectories.includes(cleaned)) {
      this.musicDirectories.push(cleaned);
      if (typeof window !== 'undefined') {
        localStorage.setItem('xmb_music_directories', JSON.stringify(this.musicDirectories));
      }
    }
  }

  public removeMusicDirectory(dirPath: string): void {
    this.musicDirectories = this.musicDirectories.filter((d) => d !== dirPath);
    if (typeof window !== 'undefined') {
      localStorage.setItem('xmb_music_directories', JSON.stringify(this.musicDirectories));
    }
  }

  // Scan a directory and add tracks with persistent filePaths
  public async scanMusicDirectory(dirPath: string): Promise<Track[]> {
    this.addMusicDirectory(dirPath);
    const result = await readDirectory(dirPath);
    if (!result.success || !result.files) {
      return [];
    }

    const added: Track[] = [];
    const normalized = dirPath.replace(/\\/g, '/').replace(/\/+$/, '');
    const folderSegments = normalized.split('/').filter(Boolean);
    const folderName = folderSegments.length > 0 ? folderSegments[folderSegments.length - 1] : 'Music';

    for (let i = 0; i < result.files.length; i++) {
      const file = result.files[i];
      const fileName = file.name;
      const cleanName = fileName.replace(/\.[^/.]+$/, '');
      const parts = cleanName.split(' - ');
      const artist = parts.length > 1 ? parts[0].trim() : 'Local Artist';
      const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : cleanName;
      const ext = (fileName.split('.').pop() || 'mp3').toUpperCase() as any;

      const track: Track = {
        id: `file-${Date.now()}-${i}`,
        title,
        artist,
        album: folderName,
        duration: 180,
        source: 'local',
        coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&q=80',
        audioUrl: formatFileUrl(file.path),
        filePath: file.path,
        genre: 'Local Audio',
        year: new Date().getFullYear(),
        format: ext,
        bitrate: ext === 'FLAC' ? 1411 : 320,
        sampleRate: 48000,
        bitDepth: 16,
        isFavorite: false,
        playCount: 0,
        dateAdded: new Date().toISOString().split('T')[0],
      };

      this.addTrack(track);
      added.push(track);
    }

    return added;
  }

  public toggleFavorite(trackId: string): boolean {
    const track = this.tracks.find((t) => t.id === trackId);
    if (track) {
      track.isFavorite = !track.isFavorite;
      this.saveTracks();
      // Sync favorites playlist
      const favPl = this.playlists.find((p) => p.id === 'pl-favorites');
      if (favPl) {
        favPl.tracks = this.tracks.filter((t) => t.isFavorite);
        this.savePlaylists();
      }
      return track.isFavorite;
    }
    return false;
  }

  public updateTrackMetadata(trackId: string, metadata: Partial<Track>) {
    const index = this.tracks.findIndex((t) => t.id === trackId);
    if (index !== -1) {
      this.tracks[index] = { ...this.tracks[index], ...metadata };
      this.saveTracks();
    }
  }

  public getPlaylists(): Playlist[] {
    const favPl = this.playlists.find((p) => p.id === 'pl-favorites');
    if (favPl) {
      favPl.tracks = this.tracks.filter((t) => t.isFavorite);
    }
    return [...this.playlists];
  }

  public createPlaylist(title: string, description: string = ''): Playlist {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      title,
      description,
      tracks: [],
      coverUrl: '',
      createdAt: new Date().toISOString().split('T')[0],
      isSystem: false,
    };
    this.playlists.push(newPl);
    this.savePlaylists();
    return newPl;
  }

  public deletePlaylist(playlistId: string) {
    this.playlists = this.playlists.filter((p) => p.id !== playlistId || p.isSystem);
    this.savePlaylists();
  }

  public addTrackToPlaylist(playlistId: string, track: Track) {
    const pl = this.playlists.find((p) => p.id === playlistId);
    if (pl && !pl.tracks.some((t) => t.id === track.id)) {
      pl.tracks.push(track);
      this.savePlaylists();
    }
  }

  public removeTrackFromPlaylist(playlistId: string, trackId: string) {
    const pl = this.playlists.find((p) => p.id === playlistId);
    if (pl) {
      pl.tracks = pl.tracks.filter((t) => t.id !== trackId);
      this.savePlaylists();
    }
  }

  public getAlbums(): Album[] {
    const albumMap = new Map<string, Album>();
    this.tracks.forEach((t) => {
      const key = `${t.album}::${t.artist}`;
      if (!albumMap.has(key)) {
        albumMap.set(key, {
          id: `alb-${encodeURIComponent(t.album)}`,
          title: t.album,
          artist: t.artist,
          year: t.year || new Date().getFullYear(),
          coverUrl: t.coverUrl,
          tracksCount: 1,
          genre: t.genre || 'Music',
          format: t.format || 'FLAC',
        });
      } else {
        const item = albumMap.get(key)!;
        item.tracksCount++;
      }
    });
    return Array.from(albumMap.values());
  }

  public getArtists(): Artist[] {
    const artistMap = new Map<string, Artist>();
    this.tracks.forEach((t) => {
      if (!artistMap.has(t.artist)) {
        artistMap.set(t.artist, {
          id: `art-${encodeURIComponent(t.artist)}`,
          name: t.artist,
          coverUrl: t.coverUrl,
          tracksCount: 1,
          albumsCount: 1,
        });
      } else {
        const item = artistMap.get(t.artist)!;
        item.tracksCount++;
      }
    });
    return Array.from(artistMap.values());
  }

  public getGenres(): { name: string; count: number }[] {
    const map = new Map<string, number>();
    this.tracks.forEach((t) => {
      const g = t.genre?.split('/')[0].trim() || 'Other';
      map.set(g, (map.get(g) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }

  private saveTracks() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crossbeat_tracks', JSON.stringify(this.tracks));
    }
  }

  private savePlaylists() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crossbeat_playlists', JSON.stringify(this.playlists));
    }
  }
}

export const libraryStorage = new LibraryStorageService();
