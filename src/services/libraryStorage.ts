/**
 * Music Library Management Service
 * Manages Local Library, YouTube Music catalog, Spotify integration,
 * custom playlists, and persistence.
 */

import { Album, Artist, Playlist, Track } from '../types';

// Pre-generated High-Fidelity Album Covers
const COVER_COSMIC = '/src/assets/images/album_cosmic_odyssey_1790904996760.jpg';
const COVER_MIDNIGHT = '/src/assets/images/album_midnight_tokyo_1790905009431.jpg';
const COVER_ACOUSTIC = '/src/assets/images/album_acoustic_horizon_1790905020647.jpg';
const COVER_CYBER = '/src/assets/images/album_cyber_orchestra_1790905030358.jpg';

export const INITIAL_TRACKS: Track[] = [
  {
    id: 'trk-1',
    title: 'Resonance of Andromeda',
    artist: 'Solaris Drift',
    album: 'Cosmic Odyssey',
    duration: 218,
    source: 'local',
    coverUrl: COVER_COSMIC,
    audioUrl: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3',
    genre: 'Synthwave / Retro',
    year: 2024,
    format: 'FLAC',
    bitrate: 1048,
    sampleRate: 96000,
    bitDepth: 24,
    isFavorite: true,
    playCount: 42,
    dateAdded: '2024-03-10',
    synthParams: {
      rootNote: 220,
      scale: 'pentatonic',
      tempo: 112,
      bassFreq: 110,
      leadType: 'sawtooth',
    },
  },
  {
    id: 'trk-2',
    title: 'Rain Over Shinjuku',
    artist: 'Kenji Takahashi',
    album: 'Midnight Tokyo',
    duration: 184,
    source: 'local',
    coverUrl: COVER_MIDNIGHT,
    audioUrl: 'https://cdn.freesound.org/previews/538/538602_11861866-lq.mp3',
    genre: 'Lo-Fi / Chillhop',
    year: 2023,
    format: 'FLAC',
    bitrate: 890,
    sampleRate: 48000,
    bitDepth: 24,
    isFavorite: false,
    playCount: 19,
    dateAdded: '2024-04-12',
    synthParams: {
      rootNote: 261.63,
      scale: 'minor',
      tempo: 84,
      bassFreq: 98,
      leadType: 'sine',
    },
  },
  {
    id: 'trk-3',
    title: 'Northern Pines Echo',
    artist: 'Fjords & Valley',
    album: 'Acoustic Horizon',
    duration: 245,
    source: 'local',
    coverUrl: COVER_ACOUSTIC,
    audioUrl: 'https://cdn.freesound.org/previews/564/564923_11861866-lq.mp3',
    genre: 'Indie Folk / Ambient',
    year: 2024,
    format: 'FLAC',
    bitrate: 920,
    sampleRate: 48000,
    bitDepth: 24,
    isFavorite: true,
    playCount: 31,
    dateAdded: '2024-05-01',
    synthParams: {
      rootNote: 196,
      scale: 'major',
      tempo: 96,
      bassFreq: 98,
      leadType: 'triangle',
    },
  },
  {
    id: 'trk-4',
    title: 'Symphony in Silicon minor',
    artist: 'Neo Philharmonic',
    album: 'Cybernetic Orchestra',
    duration: 312,
    source: 'local',
    coverUrl: COVER_CYBER,
    audioUrl: 'https://cdn.freesound.org/previews/467/467007_7037-lq.mp3',
    genre: 'Neoclassical / Orchestral',
    year: 2024,
    format: 'FLAC',
    bitrate: 1420,
    sampleRate: 96000,
    bitDepth: 24,
    isFavorite: true,
    playCount: 57,
    dateAdded: '2024-01-15',
    synthParams: {
      rootNote: 146.83,
      scale: 'minor',
      tempo: 128,
      bassFreq: 73.4,
      leadType: 'sawtooth',
    },
  },
  {
    id: 'trk-5',
    title: 'Starlight Expressway',
    artist: 'Solaris Drift',
    album: 'Cosmic Odyssey',
    duration: 204,
    source: 'local',
    coverUrl: COVER_COSMIC,
    audioUrl: 'https://cdn.freesound.org/previews/612/612610_5674468-lq.mp3',
    genre: 'Synthwave / Retro',
    year: 2024,
    format: 'MP3',
    bitrate: 320,
    sampleRate: 44100,
    bitDepth: 16,
    isFavorite: false,
    playCount: 14,
    dateAdded: '2024-03-11',
    synthParams: {
      rootNote: 246.94,
      scale: 'pentatonic',
      tempo: 120,
      bassFreq: 123.4,
      leadType: 'sawtooth',
    },
  },
  {
    id: 'trk-6',
    title: 'Neon Lantern Alley',
    artist: 'Kenji Takahashi',
    album: 'Midnight Tokyo',
    duration: 195,
    source: 'local',
    coverUrl: COVER_MIDNIGHT,
    audioUrl: 'https://cdn.freesound.org/previews/538/538602_11861866-lq.mp3',
    genre: 'Lo-Fi / Chillhop',
    year: 2023,
    format: 'OGG',
    bitrate: 256,
    sampleRate: 48000,
    bitDepth: 16,
    isFavorite: false,
    playCount: 8,
    dateAdded: '2024-04-15',
    synthParams: {
      rootNote: 220,
      scale: 'ambient',
      tempo: 82,
      bassFreq: 110,
      leadType: 'sine',
    },
  },
];

// YouTube Music Catalog
export const YOUTUBE_MUSIC_CATALOG: Track[] = [
  {
    id: 'ytm-1',
    title: 'Blinding Lights (Cyber Live)',
    artist: 'The Weeknd',
    album: 'After Hours Re-Engineered',
    duration: 200,
    source: 'youtube',
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
    genre: 'Synthpop',
    year: 2024,
    format: 'AAC',
    bitrate: 256,
    sampleRate: 48000,
    bitDepth: 16,
    isFavorite: false,
    playCount: 310,
    dateAdded: '2024-06-01',
    streamId: 'fHI8X4ElY61',
    synthParams: {
      rootNote: 349.23,
      scale: 'minor',
      tempo: 171,
      bassFreq: 174.6,
      leadType: 'sawtooth',
    },
  },
  {
    id: 'ytm-2',
    title: 'Midnight City (Remastered)',
    artist: 'M83',
    album: 'Hurry Up, We\'re Dreaming',
    duration: 243,
    source: 'youtube',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
    genre: 'Shoegaze / Electronic',
    year: 2023,
    format: 'AAC',
    bitrate: 256,
    sampleRate: 48000,
    bitDepth: 16,
    isFavorite: true,
    playCount: 420,
    dateAdded: '2024-06-05',
    streamId: 'dX3k_QDnzHE',
    synthParams: {
      rootNote: 293.66,
      scale: 'major',
      tempo: 105,
      bassFreq: 146.8,
      leadType: 'sawtooth',
    },
  },
  {
    id: 'ytm-3',
    title: 'Aerodynamic (Daft Club Live)',
    artist: 'Daft Punk',
    album: 'Discovery Live Session',
    duration: 212,
    source: 'youtube',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
    genre: 'French House',
    year: 2024,
    format: 'AAC',
    bitrate: 256,
    sampleRate: 48000,
    bitDepth: 16,
    isFavorite: false,
    playCount: 198,
    dateAdded: '2024-06-08',
    streamId: 'L93-7vRDPcU',
    synthParams: {
      rootNote: 220,
      scale: 'minor',
      tempo: 123,
      bassFreq: 110,
      leadType: 'sawtooth',
    },
  },
  {
    id: 'ytm-4',
    title: 'Gymnopédie No. 1 (Neo-Space Ambient)',
    artist: 'Erik Satie & Celestial Ensemble',
    album: 'Classical Horizons in Space',
    duration: 215,
    source: 'youtube',
    coverUrl: COVER_ACOUSTIC,
    genre: 'Modern Classical',
    year: 2024,
    format: 'AAC',
    bitrate: 256,
    sampleRate: 48000,
    bitDepth: 16,
    isFavorite: true,
    playCount: 154,
    dateAdded: '2024-06-10',
    synthParams: {
      rootNote: 293.66,
      scale: 'major',
      tempo: 68,
      bassFreq: 146.8,
      leadType: 'triangle',
    },
  },
];

// Spotify Curated Catalog
export const SPOTIFY_CATALOG: Track[] = [
  {
    id: 'spt-1',
    title: 'Instant Crush (feat. Julian Casablancas)',
    artist: 'Daft Punk',
    album: 'Random Access Memories',
    duration: 337,
    source: 'spotify',
    coverUrl: COVER_CYBER,
    genre: 'Nu-Disco / Electronic',
    year: 2023,
    format: 'OGG',
    bitrate: 320,
    sampleRate: 44100,
    bitDepth: 16,
    isFavorite: true,
    playCount: 512,
    dateAdded: '2024-05-18',
    synthParams: {
      rootNote: 293.66,
      scale: 'minor',
      tempo: 110,
      bassFreq: 146.8,
      leadType: 'sawtooth',
    },
  },
  {
    id: 'spt-2',
    title: 'Nightcall (Drive OST Edition)',
    artist: 'Kavinsky',
    album: 'OutRun',
    duration: 259,
    source: 'spotify',
    coverUrl: COVER_COSMIC,
    genre: 'Synthwave',
    year: 2022,
    format: 'OGG',
    bitrate: 320,
    sampleRate: 44100,
    bitDepth: 16,
    isFavorite: true,
    playCount: 680,
    dateAdded: '2024-05-20',
    synthParams: {
      rootNote: 196,
      scale: 'minor',
      tempo: 91,
      bassFreq: 98,
      leadType: 'sawtooth',
    },
  },
  {
    id: 'spt-3',
    title: 'Starry Night (Live in Berlin)',
    artist: 'Peggy Gou',
    album: 'Moment EP',
    duration: 234,
    source: 'spotify',
    coverUrl: COVER_MIDNIGHT,
    genre: 'Deep House',
    year: 2024,
    format: 'OGG',
    bitrate: 320,
    sampleRate: 44100,
    bitDepth: 16,
    isFavorite: false,
    playCount: 220,
    dateAdded: '2024-05-25',
    synthParams: {
      rootNote: 261.63,
      scale: 'pentatonic',
      tempo: 124,
      bassFreq: 130.8,
      leadType: 'sine',
    },
  },
];

class LibraryStorageService {
  private tracks: Track[] = [];
  private playlists: Playlist[] = [];
  private spotifyConnected = true;
  private youtubeConnected = true;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const storedTracks = localStorage.getItem('crossbeat_tracks');
      if (storedTracks) {
        this.tracks = JSON.parse(storedTracks);
      } else {
        this.tracks = [...INITIAL_TRACKS];
        this.saveTracks();
      }

      const storedPlaylists = localStorage.getItem('crossbeat_playlists');
      if (storedPlaylists) {
        this.playlists = JSON.parse(storedPlaylists);
      } else {
        this.playlists = [
          {
            id: 'pl-favorites',
            title: 'Favorites',
            description: 'Your starred and favorite tracks',
            tracks: this.tracks.filter((t) => t.isFavorite),
            coverUrl: COVER_COSMIC,
            createdAt: '2024-01-01',
            isSystem: true,
          },
          {
            id: 'pl-synthwave',
            title: 'Late Night PS3 Cruise',
            description: 'Retro synthwave and ambient lo-fi soundscapes',
            tracks: this.tracks.filter((t) => t.genre?.includes('Synthwave') || t.genre?.includes('Lo-Fi')),
            coverUrl: COVER_MIDNIGHT,
            createdAt: '2024-03-01',
            isSystem: false,
          },
          {
            id: 'pl-audiophile',
            title: 'Hi-Res GStreamer Masters',
            description: '96kHz / 24-bit lossless FLAC recordings',
            tracks: this.tracks.filter((t) => t.format === 'FLAC'),
            coverUrl: COVER_CYBER,
            createdAt: '2024-04-01',
            isSystem: false,
          },
        ];
        this.savePlaylists();
      }
    } catch {
      this.tracks = [...INITIAL_TRACKS];
    }
  }

  public getTracks(): Track[] {
    return [...this.tracks];
  }

  public getTrackById(id: string): Track | undefined {
    return this.tracks.find((t) => t.id === id) || 
      YOUTUBE_MUSIC_CATALOG.find((t) => t.id === id) || 
      SPOTIFY_CATALOG.find((t) => t.id === id);
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
    // Keep favorites up to date
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
      coverUrl: COVER_COSMIC,
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
          year: t.year || 2024,
          coverUrl: t.coverUrl,
          tracksCount: 1,
          genre: t.genre || 'Electronic',
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

  public searchYouTubeMusic(query: string): Track[] {
    const q = query.toLowerCase();
    if (!q) return YOUTUBE_MUSIC_CATALOG;
    return YOUTUBE_MUSIC_CATALOG.filter(
      (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album.toLowerCase().includes(q)
    );
  }

  public getSpotifyPlaylists(): { id: string; name: string; trackCount: number; coverUrl: string; tracks: Track[] }[] {
    return [
      {
        id: 'spt-pl-1',
        name: 'Discover Weekly (Synced)',
        trackCount: 30,
        coverUrl: COVER_COSMIC,
        tracks: SPOTIFY_CATALOG,
      },
      {
        id: 'spt-pl-2',
        name: 'Daily Mix 1: Synth & Wave',
        trackCount: 45,
        coverUrl: COVER_MIDNIGHT,
        tracks: [SPOTIFY_CATALOG[1], SPOTIFY_CATALOG[0]],
      },
      {
        id: 'spt-pl-3',
        name: 'Daft Punk & French Touch Essentials',
        trackCount: 22,
        coverUrl: COVER_CYBER,
        tracks: [SPOTIFY_CATALOG[0]],
      },
    ];
  }

  public importSpotifyPlaylist(playlistName: string, tracks: Track[]): Playlist {
    const pl = this.createPlaylist(`Spotify: ${playlistName}`, 'Imported from Spotify Connect');
    tracks.forEach((t) => {
      this.addTrack(t);
      this.addTrackToPlaylist(pl.id, t);
    });
    return pl;
  }

  public searchAll(query: string): { local: Track[]; youtube: Track[]; spotify: Track[] } {
    const q = query.toLowerCase();
    return {
      local: this.tracks.filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)),
      youtube: YOUTUBE_MUSIC_CATALOG.filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)),
      spotify: SPOTIFY_CATALOG.filter((t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)),
    };
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
