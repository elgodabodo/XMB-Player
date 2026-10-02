export type AudioSourceType = 'local' | 'youtube' | 'spotify' | 'radio';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  source: AudioSourceType;
  coverUrl: string;
  audioUrl?: string; // real audio file URL, Blob URL, or synthesized stream
  filePath?: string; // Persistent local file path (e.g. /home/user/Music/song.flac)
  genre?: string;
  year?: number;
  format?: 'FLAC' | 'MP3' | 'OGG' | 'WAV' | 'AAC';
  bitrate?: number; // kbps
  sampleRate?: number; // Hz, e.g. 44100, 48000, 96000
  bitDepth?: number; // 16 or 24 bit
  isFavorite?: boolean;
  playCount?: number;
  dateAdded: string;
  streamId?: string; // for YouTube / Spotify ID
  synthParams?: {
    rootNote: number;
    scale: 'pentatonic' | 'major' | 'minor' | 'ambient';
    tempo: number;
    bassFreq: number;
    leadType: 'sine' | 'triangle' | 'sawtooth';
  };
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  year: number;
  coverUrl: string;
  tracksCount: number;
  genre: string;
  format: string;
}

export interface Artist {
  id: string;
  name: string;
  coverUrl: string;
  tracksCount: number;
  albumsCount: number;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  tracks: Track[];
  coverUrl: string;
  createdAt: string;
  isSystem?: boolean;
}

export type XMBTheme = 
  | 'original_silver'
  | 'midnight'
  | 'classic_red'
  | 'ocean_blue'
  | 'emerald'
  | 'sakura'
  | 'amber_gold'
  | 'time_of_day'
  | 'album_art'
  | 'custom';

export interface PictureItem {
  id: string;
  title: string;
  subtitle?: string;
  url: string;
  album?: string;
  artist?: string;
  year?: number;
  folder?: string;
  dateAdded?: string;
  filePath?: string;
  isCustom?: boolean;
}

export interface VideoItem {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number; // in seconds
  format?: string; // MP4, WebM, MKV, etc.
  resolution?: string; // 1080p, 4K, 720p, etc.
  fileSize?: string;
  dateAdded: string;
}

export type VisualizerMode = 
  | 'wave' 
  | 'earth_cosmos' 
  | 'vu_spectrum' 
  | 'sonic_radar' 
  | 'none'
  | 'lyrics_synced';

export interface LyricLine {
  time: number; // in seconds
  text: string;
}

export interface LyricsData {
  id?: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  plainLyrics?: string;
  syncedLyrics?: string;
  lines: LyricLine[];
  source: 'lrclib' | 'local' | 'none';
}

export interface ExtractedPalette {
  bgTop: string;
  bgBottom: string;
  ribbon1: [number, number, number];
  ribbon2: [number, number, number];
  ribbon3: [number, number, number];
  accent: string;
}

export type ControllerType = 'ds4_ds5' | 'xinput' | 'generic';

export type AudioSink = 'pipewiresink' | 'pulsesink' | 'alsasink' | 'jackaudiosink';

export type GstState = 'GST_STATE_NULL' | 'GST_STATE_READY' | 'GST_STATE_PAUSED' | 'GST_STATE_PLAYING';

export interface EqualizerBands {
  b32: number;
  b64: number;
  b125: number;
  b250: number;
  b500: number;
  b1k: number;
  b2k: number;
  b4k: number;
  b8k: number;
  b16k: number;
}

export interface GstPipelineStatus {
  state: GstState;
  sink: AudioSink;
  bufferLatencyMs: number;
  underruns: number;
  cpuUsagePct: number;
  pipelineString: string;
  sampleRate: number;
  channels: number;
  bitDepth: number;
}

export interface CustomGameApp {
  id: string;
  title: string;
  execPath: string; // e.g. /usr/bin/rpcs3, steam -gamepadui, /usr/bin/retroarch
  args?: string;
  category: 'emulator' | 'steam' | 'native' | 'retro';
  coverUrl?: string;
  description?: string;
  lastPlayed?: string;
}

export interface SettingNotification {
  id: string;
  title: string;
  detail: string;
  iconType?: 'check' | 'palette' | 'crossfade' | 'speaker' | 'wrench' | 'music';
}

export interface UserProfile {
  username: string;
  avatarUrl: string;
  statusMessage?: string;
  level?: number;
}

export interface XMBNavigationState {
  categoryIndex: number;
  itemIndex: number;
  subLevel: number; // 0 = main vertical column, 1 = entered folder / album / playlist
  activeFolderId: string | null;
  activeContextTrack: Track | null;
  isOptionsMenuOpen: boolean;
}
