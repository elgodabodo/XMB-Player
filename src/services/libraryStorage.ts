/**
 * Music Library Management Service
 * Manages Local Library, custom playlists, and persistence.
 */

import { Album, Artist, Playlist, Track } from '../types';

export const INITIAL_TRACKS: Track[] = [];

class LibraryStorageService {
  private tracks: Track[] = [];
  private playlists: Playlist[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const storedTracks = localStorage.getItem('crossbeat_tracks');
      if (storedTracks) {
        const parsed: Track[] = JSON.parse(storedTracks);
        // Filter out old premade tracks if present
        this.tracks = parsed.filter((t) => !t.id.startsWith('trk-') && !t.id.startsWith('ytm-') && !t.id.startsWith('spt-'));
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

  public getTracks(): Track[] {
    return [...this.tracks];
  }

  public getTrackById(id: string): Track | undefined {
    return this.tracks.find((t) => t.id === id);
  }

  public addTrack(track: Track) {
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
