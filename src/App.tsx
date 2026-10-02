/**
 * XMBPlayer - Linux Native Music Player
 * PS3 / PSP XMB Interface & GStreamer Audio Pipeline
 * With Controller-Navigable Options Menu, Single-Press Per-Hold Controller Input,
 * Bottom-Right Now Playing Album Cover Jacket, Custom XMB Wave Colors,
 * Fullscreen Artworks Viewer & Avatar Actions, and Live ACTIVE Setting Badges.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Album,
  Artist,
  AudioSink,
  ControllerType,
  CustomGameApp,
  ExtractedPalette,
  GstPipelineStatus,
  PictureItem,
  Playlist,
  SettingNotification,
  Track,
  UserProfile,
  VideoItem,
  VisualizerMode,
  XMBTheme,
} from './types';
import { gstEngine } from './services/gstreamerEngine';
import { soundFx } from './services/soundFx';
import { colorExtractor } from './services/colorExtractor';
import { openMediaFile } from './services/nativeBridge';
import { gameService } from './services/gameService';
import { videoService } from './services/videoService';
import sackboyAvatar from './assets/images/sackboy_avatar_1790922791643.jpg';
import {
  libraryStorage,
  INITIAL_TRACKS,
} from './services/libraryStorage';
import { XMBWaveBackground } from './components/XMBWaveBackground';
import { PS3TopBar } from './components/PS3TopBar';
import {
  AUTHENTIC_PS3_CATEGORIES,
  XMBItemDef,
  XMBNavigator,
} from './components/XMBNavigator';
import { NowPlayingVisualizer } from './components/NowPlayingVisualizer';
import { PS3ControllerHints } from './components/PS3ControllerHints';
import { GStreamerInspectorModal } from './components/GStreamerInspectorModal';
import { LocalImportModal } from './components/LocalImportModal';
import { LocalVideoImportModal } from './components/LocalVideoImportModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { VideoContextMenu } from './components/VideoContextMenu';
import { ContextMenu } from './components/ContextMenu';
import { AddGameModal } from './components/AddGameModal';
import { GameLaunchModal } from './components/GameLaunchModal';
import { PS3NotificationToast } from './components/PS3NotificationToast';
import { EditProfileModal, AVATAR_PRESETS } from './components/EditProfileModal';
import { PictureViewerModal } from './components/PictureViewerModal';
import { PictureContextMenu } from './components/PictureContextMenu';
import { CustomColorPickerModal } from './components/CustomColorPickerModal';
import { NowPlayingMiniJacket } from './components/NowPlayingMiniJacket';

export default function App() {
  // Navigation & Hierarchy State
  const [categoryIndex, setCategoryIndex] = useState(1); // Start at "Settings" (index 1) as in image.png
  const [itemIndex, setItemIndex] = useState(0);
  const [subBreadcrumb, setSubBreadcrumb] = useState<string | null>(null);
  const [currentSubFolder, setCurrentSubFolder] = useState<string | null>(null);
  const [subFolderPayload, setSubFolderPayload] = useState<unknown>(null);
  const [isFullVisualizerView, setIsFullVisualizerView] = useState(false);

  // Audio Playback State
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState<GstPipelineStatus>(
    gstEngine.getPipelineStatus()
  );

  // User Profile State
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('xmb_user_profile');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return {
      username: 'User 1',
      avatarUrl: AVATAR_PRESETS[0].url,
      statusMessage: 'PlayStation Linux XMB Master',
      level: 18,
    };
  });
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  // Appearance & Custom Colorway State
  const [theme, setTheme] = useState<XMBTheme>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('xmb_theme');
        if (stored) return stored as XMBTheme;
      } catch {}
    }
    return 'original_silver';
  });
  const [dynamicPalette, setDynamicPalette] = useState<ExtractedPalette | null>(null);
  const [customThemePalette, setCustomThemePalette] = useState<ExtractedPalette>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('xmb_custom_palette');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return {
      bgTop: '#181a24',
      bgBottom: '#06080d',
      ribbon1: [140, 200, 255],
      ribbon2: [255, 110, 180],
      ribbon3: [80, 100, 150],
      accent: '#38bdf8',
    };
  });

  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('xmb_visualizer_mode');
        if (stored) return stored as VisualizerMode;
      } catch {}
    }
    return 'wave';
  });

  // Save appearance settings across restarts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('xmb_theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('xmb_custom_palette', JSON.stringify(customThemePalette));
    }
  }, [customThemePalette]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('xmb_visualizer_mode', visualizerMode);
    }
  }, [visualizerMode]);

  const [settingNotification, setSettingNotification] = useState<SettingNotification | null>(null);

  // Modals, Picture Viewers, & Context Menus
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [viewingPictureIndex, setViewingPictureIndex] = useState<number | null>(null);
  const [contextPicture, setContextPicture] = useState<PictureItem | null>(null);
  const [contextPictureIndex, setContextPictureIndex] = useState(0);
  const [contextTrack, setContextTrack] = useState<Track | null>(null);
  const [contextMenuIndex, setContextMenuIndex] = useState(0);

  // Video State
  const [videos, setVideos] = useState<VideoItem[]>(videoService.getVideos());
  const [isImportVideoModalOpen, setIsImportVideoModalOpen] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<VideoItem | null>(null);
  const [contextVideo, setContextVideo] = useState<VideoItem | null>(null);
  const [contextVideoIndex, setContextVideoIndex] = useState(0);

  const [isGstModalOpen, setIsGstModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);
  const [activeLaunchGame, setActiveLaunchGame] = useState<CustomGameApp | null>(null);

  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  // Controller state
  const [controllerConnected, setControllerConnected] = useState(false);
  const [controllerType, setControllerType] = useState<ControllerType>('ds4_ds5');

  // Library & Games State
  const [tracks, setTracks] = useState<Track[]>(libraryStorage.getTracks());
  const [playlists, setPlaylists] = useState<Playlist[]>(libraryStorage.getPlaylists());
  const [games, setGames] = useState<CustomGameApp[]>(gameService.getGames());

  // Gamepad single-press state refs
  const prevButtonsRef = useRef<{ [buttonIndex: number]: boolean }>({});
  const prevAxesRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Setting Change Audio & Visual Feedback Helper
  const showSettingFeedback = useCallback(
    (title: string, detail: string, iconType: SettingNotification['iconType'] = 'check') => {
      soundFx.playSettingChanged();
      setSettingNotification({
        id: `notif-${Date.now()}`,
        title,
        detail,
        iconType,
      });
    },
    []
  );

  const refreshLibrary = useCallback(() => {
    setTracks(libraryStorage.getTracks());
    setPlaylists(libraryStorage.getPlaylists());
    setGames(gameService.getGames());
    setVideos(videoService.getVideos());
  }, []);

  const handleDeleteVideo = useCallback((videoId: string) => {
    videoService.removeVideo(videoId);
    refreshLibrary();
    showSettingFeedback('Video Deleted', 'Removed video from local collection', 'check');
  }, [refreshLibrary, showSettingFeedback]);

  const handleSaveProfile = useCallback(
    (newProfile: UserProfile) => {
      setUserProfile(newProfile);
      if (typeof window !== 'undefined') {
        localStorage.setItem('xmb_user_profile', JSON.stringify(newProfile));
      }
      showSettingFeedback('Profile Updated', `Welcome, ${newProfile.username}!`, 'check');
    },
    [showSettingFeedback]
  );

  // Gallery Pictures list
  const galleryPictures: PictureItem[] = useMemo(() => {
    return libraryStorage.getAlbums().map((alb) => ({
      id: `pic-${alb.id}`,
      title: alb.title,
      subtitle: `${alb.artist} · ${alb.year}`,
      url: alb.coverUrl,
      album: alb.title,
      artist: alb.artist,
      year: alb.year,
    }));
  }, []);

  // Picture Actions
  const handleSetAsAvatar = useCallback(
    (picture: PictureItem) => {
      setUserProfile((prev) => {
        const updated = { ...prev, avatarUrl: picture.url };
        if (typeof window !== 'undefined') {
          localStorage.setItem('xmb_user_profile', JSON.stringify(updated));
        }
        return updated;
      });
      showSettingFeedback('Profile Avatar Set', `Avatar updated to "${picture.title}"`, 'check');
    },
    [showSettingFeedback]
  );

  const handleExtractColorway = useCallback(
    async (picture: PictureItem) => {
      try {
        const palette = await colorExtractor.extractPalette(picture.url);
        setCustomThemePalette(palette);
        setTheme('custom');
        if (typeof window !== 'undefined') {
          localStorage.setItem('xmb_custom_palette', JSON.stringify(palette));
        }
        showSettingFeedback('Colorway Extracted', `Applied colors from "${picture.title}"`, 'palette');
      } catch {
        showSettingFeedback('Theme Error', 'Could not extract palette', 'wrench');
      }
    },
    [showSettingFeedback]
  );

  const handleApplyCustomPalette = useCallback(
    (palette: ExtractedPalette) => {
      setCustomThemePalette(palette);
      setTheme('custom');
      if (typeof window !== 'undefined') {
        localStorage.setItem('xmb_custom_palette', JSON.stringify(palette));
      }
      showSettingFeedback('Theme Changed', 'Custom Colorway applied', 'palette');
    },
    [showSettingFeedback]
  );

  // Dynamic Album Art Palette Extraction on track change
  useEffect(() => {
    if (!currentTrack?.coverUrl) return;
    colorExtractor.extractPalette(currentTrack.coverUrl).then((palette) => {
      setDynamicPalette(palette);
    });
  }, [currentTrack]);

  // Subscribe to GStreamer Audio Engine events
  useEffect(() => {
    const unsubState = gstEngine.onStateChange((state) => {
      setIsPlaying(state === 'GST_STATE_PLAYING');
    });

    const unsubTrack = gstEngine.onTrackChange((track) => {
      setCurrentTrack(track);
    });

    const unsubTime = gstEngine.onTimeUpdate((curr, dur) => {
      setCurrentTime(curr);
      setDuration(dur);
    });

    const unsubPipeline = gstEngine.onPipelineUpdate((status) => {
      setPipelineStatus(status);
    });

    const handleNext = () => handleNextTrack();
    const handlePrev = () => handlePrevTrack();

    window.addEventListener('xmb:trackEnded', handleNext);
    window.addEventListener('xmb:nextTrack', handleNext);
    window.addEventListener('xmb:prevTrack', handlePrev);

    return () => {
      unsubState();
      unsubTrack();
      unsubTime();
      unsubPipeline();
      window.removeEventListener('xmb:trackEnded', handleNext);
      window.removeEventListener('xmb:nextTrack', handleNext);
      window.removeEventListener('xmb:prevTrack', handlePrev);
    };
  }, [tracks, currentTrack]);

  // Audio Playback Settings State with localStorage persistence
  const [isShuffle, setIsShuffle] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('xmb_is_shuffle') === 'true';
    }
    return false;
  });
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('xmb_repeat_mode');
      if (stored === 'all' || stored === 'one') return stored;
    }
    return 'off';
  });

  const handleToggleShuffle = useCallback(() => {
    setIsShuffle((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('xmb_is_shuffle', String(next));
      }
      showSettingFeedback('Shuffle Mode', next ? 'Shuffle Enabled' : 'Shuffle Disabled', 'music');
      return next;
    });
  }, [showSettingFeedback]);

  const handleToggleRepeat = useCallback(() => {
    setRepeatMode((prev) => {
      let next: 'off' | 'all' | 'one' = 'off';
      if (prev === 'off') next = 'all';
      else if (prev === 'all') next = 'one';
      else next = 'off';

      if (typeof window !== 'undefined') {
        localStorage.setItem('xmb_repeat_mode', next);
      }
      const labels = { off: 'Repeat Off', all: 'Repeat All Tracks', one: 'Repeat Current Track' };
      showSettingFeedback('Repeat Mode', labels[next], 'music');
      return next;
    });
  }, [showSettingFeedback]);

  // Audio actions
  const handlePlayTrack = useCallback((track: Track) => {
    soundFx.playSelect();
    gstEngine.playTrack(track);
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (!currentTrack) {
      if (tracks.length > 0) handlePlayTrack(tracks[0]);
      return;
    }
    gstEngine.togglePlayPause();
  }, [currentTrack, tracks, handlePlayTrack]);

  const handleNextTrack = useCallback(() => {
    if (!currentTrack || tracks.length === 0) return;

    if (repeatMode === 'one') {
      handlePlayTrack(currentTrack);
      return;
    }

    if (isShuffle) {
      if (tracks.length === 1) {
        handlePlayTrack(tracks[0]);
        return;
      }
      const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
      let randIndex = Math.floor(Math.random() * tracks.length);
      while (randIndex === currentIndex) {
        randIndex = Math.floor(Math.random() * tracks.length);
      }
      handlePlayTrack(tracks[randIndex]);
      return;
    }

    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex === tracks.length - 1 && repeatMode === 'off') {
      handlePlayTrack(tracks[0]);
      return;
    }
    const nextIndex = (currentIndex + 1) % tracks.length;
    handlePlayTrack(tracks[nextIndex]);
  }, [currentTrack, tracks, isShuffle, repeatMode, handlePlayTrack]);

  const handlePrevTrack = useCallback(() => {
    if (!currentTrack || tracks.length === 0) return;

    if (repeatMode === 'one') {
      handlePlayTrack(currentTrack);
      return;
    }

    if (isShuffle) {
      if (tracks.length === 1) {
        handlePlayTrack(tracks[0]);
        return;
      }
      const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
      let randIndex = Math.floor(Math.random() * tracks.length);
      while (randIndex === currentIndex) {
        randIndex = Math.floor(Math.random() * tracks.length);
      }
      handlePlayTrack(tracks[randIndex]);
      return;
    }

    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    handlePlayTrack(tracks[prevIndex]);
  }, [currentTrack, tracks, isShuffle, repeatMode, handlePlayTrack]);

  const handleSeek = useCallback((seconds: number) => {
    gstEngine.seek(seconds);
  }, []);

  const handleToggleMute = useCallback(() => {
    gstEngine.toggleMute();
    const muted = gstEngine.getIsMuted();
    setIsMuted(muted);
    showSettingFeedback('Sound Settings', muted ? 'Audio Output Muted' : 'Audio Output Unmuted', 'speaker');
  }, [showSettingFeedback]);

  const handleVolumeChange = useCallback(
    (newVolOrUpdater: number | ((prev: number) => number)) => {
      setVolume((prev) => {
        const next = typeof newVolOrUpdater === 'function' ? newVolOrUpdater(prev) : newVolOrUpdater;
        const clamped = Math.max(0, Math.min(1, Math.round(next * 100) / 100));
        gstEngine.setVolume(clamped);
        volumeRef.current = clamped;
        return clamped;
      });
      setIsMuted(false);
    },
    []
  );

  // Library actions
  const handleToggleFavorite = useCallback((trackId: string) => {
    const isFav = libraryStorage.toggleFavorite(trackId);
    refreshLibrary();
    showSettingFeedback('Favorites Updated', isFav ? 'Added track to Favorites' : 'Removed from Favorites', 'check');
  }, [refreshLibrary, showSettingFeedback]);

  const handleAddToPlaylist = useCallback((playlistId: string, track: Track) => {
    libraryStorage.addTrackToPlaylist(playlistId, track);
    refreshLibrary();
    showSettingFeedback('Playlist Updated', `Added "${track.title}" to playlist`, 'check');
  }, [refreshLibrary, showSettingFeedback]);

  const handleDeleteTrack = useCallback((trackId: string) => {
    libraryStorage.removeTrack(trackId);
    refreshLibrary();
    showSettingFeedback('Library Updated', 'Track removed from library', 'check');
  }, [refreshLibrary, showSettingFeedback]);

  const handleClearAllTracks = useCallback(() => {
    soundFx.playCancel();
    gstEngine.stop();
    setCurrentTrack(null);
    setIsPlaying(false);
    libraryStorage.clearAllTracks();
    refreshLibrary();
    showSettingFeedback('Library Cleared', 'All songs removed from music collection', 'check');
  }, [refreshLibrary, showSettingFeedback]);

  // Dynamic Vertical Items Generator: Updates LIVE on any state change!
  const activeVerticalItems = useMemo<XMBItemDef[]>(() => {
    // If inside a subfolder: dynamically generate its items based on live state!
    if (currentSubFolder) {
      if (currentSubFolder === 'art_gallery') {
        return galleryPictures.map((pic, idx) => ({
          id: pic.id,
          title: pic.title,
          subtitle: `${pic.artist} · ${pic.year} · Press △ for Options`,
          coverUrl: pic.url,
          bulletType: 'palette',
          picture: pic,
          action: () => setViewingPictureIndex(idx),
        }));
      }

      if (currentSubFolder === 'music_settings') {
        return [
          {
            id: 'ms-sink',
            title: 'Audio Sink Device',
            subtitle: `Active: ${pipelineStatus.sink.replace('sink', '').toUpperCase()}`,
            badge: pipelineStatus.sink.replace('sink', '').toUpperCase(),
            bulletType: 'speaker',
            isFolder: true,
            folderType: 'sink_options',
          },
          {
            id: 'ms-eq',
            title: 'GStreamer 10-Band Equalizer',
            subtitle: 'Open DSP curves and frequency sliders',
            bulletType: 'equalizer',
            action: () => setIsGstModalOpen(true),
          },
        ];
      }

      if (currentSubFolder === 'display_settings') {
        return [
          {
            id: 'ds-theme',
            title: 'XMB Wave Theme & Colorway',
            subtitle: `Current: ${theme.replace('_', ' ').toUpperCase()}`,
            badge: theme.replace('_', ' ').toUpperCase(),
            bulletType: 'palette',
            isFolder: true,
            folderType: 'theme_options',
          },
          {
            id: 'ds-custom-colors',
            title: 'Custom Wave Colorway Editor',
            subtitle: 'Pick exact RGB & hex values for background and silk ribbons',
            badge: theme === 'custom' ? 'ACTIVE' : undefined,
            bulletType: 'palette',
            action: () => setIsColorPickerOpen(true),
          },
          {
            id: 'ds-vis',
            title: 'Visualizer Default Mode',
            subtitle: `Current: ${visualizerMode.replace('_', ' ').toUpperCase()}`,
            badge: visualizerMode.replace('_', ' ').toUpperCase(),
            bulletType: 'display',
            isFolder: true,
            folderType: 'vis_options',
          },
        ];
      }

      if (currentSubFolder === 'theme_options') {
        const themes: { id: XMBTheme; name: string; desc: string }[] = [
          { id: 'original_silver', name: 'Original PS3 Silver / Smoke Ribbon', desc: 'Authentic firmware look from reference image' },
          { id: 'custom', name: 'Custom User Colorway', desc: 'User-configured RGB values & gradient' },
          { id: 'album_art', name: 'Dynamic Album Art Colorway', desc: 'Extracts radiant palette from current playing track' },
          { id: 'midnight', name: 'Midnight Obsidian', desc: 'Dark charcoal & indigo' },
          { id: 'classic_red', name: 'Firmware Ruby Red', desc: 'Classic intense crimson' },
          { id: 'ocean_blue', name: 'Deep Ocean Blue', desc: 'Cobalt and cyan glow' },
          { id: 'emerald', name: 'Emerald Forest Green', desc: 'Clean vibrant green' },
          { id: 'sakura', name: 'Sakura Violet / Magenta', desc: 'Atmospheric purple' },
          { id: 'amber_gold', name: 'Amber Gold Sunset', desc: 'Warm golden hues' },
          { id: 'time_of_day', name: 'Dynamic 24-Hour Day/Night Cycle', desc: 'Automatically changes with local clock' },
        ];
        return themes.map((th) => ({
          id: th.id,
          title: th.name,
          subtitle: theme === th.id ? `${th.desc} (Active)` : th.desc,
          badge: theme === th.id ? 'ACTIVE' : undefined,
          bulletType: 'palette',
          action: () => {
            if (th.id === 'custom') {
              setIsColorPickerOpen(true);
            } else {
              setTheme(th.id);
              showSettingFeedback('Theme Changed', `Wave theme set to ${th.name}`, 'palette');
            }
          },
        }));
      }

      if (currentSubFolder === 'vis_options') {
        const visModes: { id: VisualizerMode; name: string }[] = [
          { id: 'wave', name: 'Silk Wave (Classic PS3)' },
          { id: 'earth_cosmos', name: 'Earth Cosmos 3D Globe' },
          { id: 'sonic_radar', name: 'Sonic Bloom Radar' },
          { id: 'vu_spectrum', name: '32-Band VU Spectrum' },
          { id: 'none', name: 'No Visualizer (Center Album Art)' },
          { id: 'lyrics_synced', name: 'LRCLIB Synced Karaoke Lyrics' },
        ];
        return visModes.map((v) => ({
          id: v.id,
          title: v.name,
          subtitle: visualizerMode === v.id ? 'Active Mode' : 'Click to select',
          badge: visualizerMode === v.id ? 'ACTIVE' : undefined,
          bulletType: 'display',
          action: () => {
            setVisualizerMode(v.id);
            showSettingFeedback('Visualizer Mode', `Default mode set to ${v.name}`, 'check');
          },
        }));
      }

      if (currentSubFolder === 'sink_options') {
        const sinks: { id: AudioSink; name: string; desc: string }[] = [
          { id: 'pipewiresink', name: 'PipeWire Audio Sink', desc: 'Low-latency modern Linux server' },
          { id: 'pulsesink', name: 'PulseAudio Sink', desc: 'Desktop sound server compatibility' },
          { id: 'alsasink', name: 'ALSA Direct Kernel Sink', desc: 'Raw sound card access' },
          { id: 'jackaudiosink', name: 'JACK Audio Kit', desc: 'Pro studio low-latency router' },
        ];
        return sinks.map((sk) => ({
          id: sk.id,
          title: sk.name,
          subtitle: pipelineStatus.sink === sk.id ? `${sk.desc} (Active)` : sk.desc,
          badge: pipelineStatus.sink === sk.id ? 'ACTIVE' : undefined,
          bulletType: 'speaker',
          action: () => {
            gstEngine.setSink(sk.id);
            showSettingFeedback('Audio Sink Connected', `Routing audio through ${sk.name}`, 'speaker');
          },
        }));
      }

      if (currentSubFolder === 'accessory_settings') {
        return [
          {
            id: 'acc-type',
            title: 'Controller Mode: ' + (controllerType === 'ds4_ds5' ? 'PlayStation (DualShock / DualSense)' : 'Xbox (XInput)'),
            subtitle: 'Click to switch on-screen prompts between PS and Xbox symbols',
            badge: controllerType === 'ds4_ds5' ? 'DS4/DS5' : 'XINPUT',
            bulletType: 'wrench',
            action: () => {
              const nextType: ControllerType = controllerType === 'ds4_ds5' ? 'xinput' : 'ds4_ds5';
              setControllerType(nextType);
              showSettingFeedback(
                'Accessory Settings',
                nextType === 'ds4_ds5' ? 'Switched layout to PlayStation DualShock 4 / DualSense' : 'Switched layout to Xbox XInput',
                'wrench'
              );
            },
          },
          {
            id: 'acc-deadzone',
            title: 'Analog Stick Deadzone: 15%',
            subtitle: 'Optimized for smooth XMB navigation',
            badge: '15%',
            bulletType: 'wrench',
          },
        ];
      }

      if (currentSubFolder === 'all_tracks') {
        return [
          ...(tracks.length > 0
            ? [
                {
                  id: 'mus-all-clear',
                  title: 'Remove All Songs',
                  subtitle: `Clear all ${tracks.length} songs from library`,
                  badge: `${tracks.length} SONGS`,
                  bulletType: 'wrench' as const,
                  action: handleClearAllTracks,
                },
              ]
            : []),
          ...tracks.map((t) => ({
            id: t.id,
            title: t.title,
            subtitle: `${t.artist} · ${t.album}`,
            coverUrl: t.coverUrl,
            track: t,
            action: () => handlePlayTrack(t),
          })),
        ];
      }

      if (currentSubFolder === 'albums') {
        const albums = libraryStorage.getAlbums();
        return albums.map((alb) => ({
          id: alb.id,
          title: alb.title,
          subtitle: `${alb.artist} · ${alb.tracksCount} tracks`,
          coverUrl: alb.coverUrl,
          isFolder: true,
          folderType: 'album_detail',
          folderPayload: alb,
        }));
      }

      if (currentSubFolder === 'album_detail') {
        const alb = subFolderPayload as Album;
        const albTracks = tracks.filter((t) => t.album === alb?.title);
        return albTracks.map((t) => ({
          id: t.id,
          title: t.title,
          subtitle: `${t.artist} · ${t.duration}s`,
          coverUrl: t.coverUrl,
          track: t,
          action: () => handlePlayTrack(t),
        }));
      }

      if (currentSubFolder === 'artists') {
        const artists = libraryStorage.getArtists();
        return artists.map((art) => ({
          id: art.id,
          title: art.name,
          subtitle: `${art.tracksCount} tracks`,
          coverUrl: art.coverUrl,
          isFolder: true,
          folderType: 'artist_detail',
          folderPayload: art,
        }));
      }

      if (currentSubFolder === 'artist_detail') {
        const art = subFolderPayload as Artist;
        const artTracks = tracks.filter((t) => t.artist === art?.name);
        return artTracks.map((t) => ({
          id: t.id,
          title: t.title,
          subtitle: `${t.album} · ${t.format}`,
          coverUrl: t.coverUrl,
          track: t,
          action: () => handlePlayTrack(t),
        }));
      }

      if (currentSubFolder === 'playlists') {
        return playlists.map((pl) => ({
          id: pl.id,
          title: pl.title,
          subtitle: `${pl.tracks.length} tracks · ${pl.description || 'Custom Collection'}`,
          coverUrl: pl.coverUrl,
          isFolder: true,
          folderType: 'playlist_detail',
          folderPayload: pl,
        }));
      }

      if (currentSubFolder === 'playlist_detail') {
        const pl = subFolderPayload as Playlist;
        return (pl?.tracks || []).map((t) => ({
          id: t.id,
          title: t.title,
          subtitle: `${t.artist} · ${t.album}`,
          coverUrl: t.coverUrl,
          track: t,
          action: () => handlePlayTrack(t),
        }));
      }
    }

    // Main Top-Level Categories
    const currentCatId = AUTHENTIC_PS3_CATEGORIES[categoryIndex]?.id;

    switch (currentCatId) {
      case 'users':
        return [
          {
            id: 'usr-profile',
            title: userProfile.username,
            subtitle: `Level ${userProfile.level || 18} · ${userProfile.statusMessage || 'Online'}`,
            coverUrl: userProfile.avatarUrl,
            badge: 'ONLINE',
            bulletType: 'disc',
            action: () => {
              soundFx.playSelect();
              setIsEditProfileModalOpen(true);
            },
          },
          {
            id: 'usr-edit',
            title: 'Edit Profile & Avatar',
            subtitle: 'Change username, avatar image, and status message',
            bulletType: 'wrench',
            action: () => {
              soundFx.playSelect();
              setIsEditProfileModalOpen(true);
            },
          },
          {
            id: 'usr-host',
            title: 'xmbplayer_pkg',
            subtitle: 'Host: PipeWire / GStreamer 1.24 Subsystem',
            bulletType: 'network',
          },
          {
            id: 'usr-stats',
            title: 'Playback Statistics',
            subtitle: `${tracks.length} tracks indexed · ${games.length} games installed`,
            bulletType: 'clock',
          },
          {
            id: 'usr-credits-grim',
            title: 'Grim_PKG',
            subtitle: 'Credits · Vibe Coder',
            coverUrl: sackboyAvatar,
            badge: 'CREDITS',
            bulletType: 'user',
            action: () => {
              soundFx.playSelect();
              showSettingFeedback('Credits', 'Grim_PKG · Vibe Coder', 'check');
            },
          },
        ];

      case 'settings':
        return [
          {
            id: 'set-system',
            title: 'System Settings',
            subtitle: 'Linux Kernel 6.8 · GStreamer Core 1.24.1 · PipeWire 1.0',
            bulletType: 'wrench',
            action: () => setIsGstModalOpen(true),
          },
          {
            id: 'set-music',
            title: 'Music Settings',
            subtitle: `Sink: ${pipelineStatus.sink.replace('sink', '').toUpperCase()} · GStreamer 10-Band EQ`,
            badge: pipelineStatus.sink.replace('sink', '').toUpperCase(),
            bulletType: 'music',
            isFolder: true,
            folderType: 'music_settings',
          },
          {
            id: 'set-display',
            title: 'Display Settings',
            subtitle: `Wave Theme: ${theme.replace('_', ' ').toUpperCase()}`,
            badge: theme.replace('_', ' ').toUpperCase(),
            bulletType: 'display',
            isFolder: true,
            folderType: 'display_settings',
          },
          {
            id: 'set-sound',
            title: 'Sound Settings',
            subtitle: soundFx.isEnabled() ? 'UI Sound Effects: On' : 'UI Sound Effects: Muted',
            badge: soundFx.isEnabled() ? 'ON' : 'MUTED',
            bulletType: 'speaker',
            action: () => {
              const nextState = !soundFx.isEnabled();
              soundFx.setEnabled(nextState);
              showSettingFeedback(
                'Sound Settings',
                nextState ? 'PlayStation UI Sound Effects: Enabled' : 'PlayStation UI Sound Effects: Muted',
                'speaker'
              );
              refreshLibrary();
            },
          },
          {
            id: 'set-accessory',
            title: 'Accessory Settings',
            subtitle: controllerConnected
              ? `Connected: ${controllerType === 'ds4_ds5' ? 'DualShock 4 / DualSense' : 'XInput'}`
              : 'Keyboard & Mouse Active',
            badge: controllerType === 'ds4_ds5' ? 'DS4/DS5' : 'XINPUT',
            bulletType: 'wrench',
            isFolder: true,
            folderType: 'accessory_settings',
          },
          {
            id: 'set-network',
            title: 'Network Settings',
            subtitle: 'LRCLIB Synced Lyrics: Connected · MPRIS2 D-Bus: Active',
            bulletType: 'network',
            action: () => {
              soundFx.playSelect();
              showSettingFeedback('Network Settings', 'MPRIS2 Broadcast & LRCLIB Connected', 'check');
            },
          },
        ];

      case 'photo':
        return [
          {
            id: 'pht-gallery',
            title: 'Album Artworks Gallery',
            subtitle: `${galleryPictures.length} pictures · Click to view fullscreen · △ for options`,
            bulletType: 'palette',
            isFolder: true,
            folderType: 'art_gallery',
          },
          ...galleryPictures.map((pic, idx) => ({
            id: pic.id,
            title: pic.title,
            subtitle: `${pic.artist} · ${pic.year} · Press △ for Options`,
            coverUrl: pic.url,
            bulletType: 'palette' as const,
            picture: pic,
            action: () => setViewingPictureIndex(idx),
          })),
        ];

      case 'music':
        return [
          {
            id: 'mus-remove-all',
            title: 'Remove All Songs',
            subtitle: tracks.length > 0 ? `Delete all ${tracks.length} songs from library` : 'Music library is currently empty',
            badge: tracks.length > 0 ? `${tracks.length} SONGS` : 'EMPTY',
            bulletType: 'wrench',
            action: () => {
              if (tracks.length === 0) {
                soundFx.playTick();
                showSettingFeedback('Music Library', 'Library is already empty', 'music');
                return;
              }
              handleClearAllTracks();
            },
          },
          {
            id: 'mus-all',
            title: 'All Tracks',
            subtitle: `${tracks.length} tracks in collection`,
            bulletType: 'music',
            isFolder: true,
            folderType: 'all_tracks',
          },
          {
            id: 'mus-albums',
            title: 'Albums',
            subtitle: `${libraryStorage.getAlbums().length} albums`,
            bulletType: 'disc',
            isFolder: true,
            folderType: 'albums',
          },
          {
            id: 'mus-artists',
            title: 'Artists',
            subtitle: `${libraryStorage.getArtists().length} artists`,
            bulletType: 'folder',
            isFolder: true,
            folderType: 'artists',
          },
          {
            id: 'mus-playlists',
            title: 'Playlists',
            subtitle: `${playlists.length} playlists created`,
            bulletType: 'folder',
            isFolder: true,
            folderType: 'playlists',
          },
          {
            id: 'mus-import',
            title: 'Import Local Audio Files',
            subtitle: 'Drag & drop FLAC, MP3, WAV, or OGG',
            bulletType: 'plus',
            action: () => setIsImportModalOpen(true),
          },
          ...tracks.map((t) => ({
            id: t.id,
            title: t.title,
            subtitle: `${t.artist} · ${t.album}`,
            coverUrl: t.coverUrl,
            track: t,
            action: () => handlePlayTrack(t),
          })),
        ];

      case 'video':
        return [
          {
            id: 'vid-visualizer',
            title: 'Now Playing Visualizer & Lyrics',
            subtitle: `Active: ${visualizerMode.replace('_', ' ').toUpperCase()} · Click to open fullscreen`,
            bulletType: 'display',
            action: () => setIsFullVisualizerView(true),
          },
          {
            id: 'vid-import',
            title: 'Import Local Video Files',
            subtitle: 'Drag & drop MP4, WebM, MKV, MOV, or AVI',
            bulletType: 'plus',
            action: () => {
              soundFx.playSelect();
              setIsImportVideoModalOpen(true);
            },
          },
          ...videos.map((v) => ({
            id: v.id,
            title: v.title,
            subtitle: `${v.resolution || '1080p'} · ${v.format || 'MP4'} · ${v.fileSize || 'Local File'} · Press △ for Options`,
            coverUrl: v.thumbnailUrl,
            bulletType: 'display' as const,
            video: v,
            action: () => {
              soundFx.playSelect();
              setPlayingVideo(v);
            },
          })),
        ];

      case 'game':
        return [
          {
            id: 'gm-add-app',
            title: '+ Add Custom Game / App Path',
            subtitle: 'Register Linux executables, emulators, or Steam games',
            bulletType: 'plus',
            action: () => {
              soundFx.playSelect();
              setIsAddGameModalOpen(true);
            },
          },
          {
            id: 'gm-hud',
            title: 'DualShock / DualSense Controller Test',
            subtitle: controllerConnected ? 'Gamepad 1 Active' : 'Waiting for controller input',
            badge: controllerType === 'ds4_ds5' ? 'DS4/DS5' : 'XINPUT',
            bulletType: 'wrench',
          },
          ...games.map((g) => ({
            id: g.id,
            title: g.title,
            subtitle: `${g.category.toUpperCase()} · ${g.execPath} ${g.args || ''}`,
            coverUrl: g.coverUrl,
            badge: 'READY',
            bulletType: 'disc' as const,
            action: () => {
              gameService.recordLaunch(g.id);
              setActiveLaunchGame(g);
            },
          })),
        ];

      case 'network':
        return [
          {
            id: 'net-mpris',
            title: 'Linux MPRIS2 D-Bus Broadcast',
            subtitle: currentTrack ? `Broadcasting: ${currentTrack.title}` : 'Session Idle',
            bulletType: 'network',
            action: () => setIsGstModalOpen(true),
          },
          {
            id: 'net-dlna',
            title: 'Local DLNA / UPnP Media Receiver',
            subtitle: 'Local high-fidelity network audio rendering',
            bulletType: 'disc',
            action: () => {
              soundFx.playSelect();
              showSettingFeedback('Network Audio', 'DLNA / UPnP Media Receiver Ready', 'check');
            },
          },
          {
            id: 'net-lyrics',
            title: 'LRCLIB Synced Lyrics Database',
            subtitle: 'Free synchronized karaoke lyrics service',
            bulletType: 'lyrics',
            action: () => {
              setVisualizerMode('lyrics_synced');
              setIsFullVisualizerView(true);
            },
          },
        ];

      case 'friends':
        return [
          {
            id: 'fr-profile',
            title: userProfile.username,
            subtitle: userProfile.statusMessage || 'Online · PlayStation® Network',
            coverUrl: userProfile.avatarUrl,
            bulletType: 'user',
            action: () => {
              soundFx.playSelect();
              setIsEditProfileModalOpen(true);
            },
          },
          {
            id: 'fr-now',
            title: 'Now Playing Status',
            subtitle: currentTrack ? `${currentTrack.artist} — ${currentTrack.title}` : 'Session Idle',
            bulletType: 'music',
            action: () => {
              if (currentTrack) {
                soundFx.playSelect();
                setIsFullVisualizerView(true);
              }
            },
          },
        ];

      default:
        return [];
    }
  }, [
    categoryIndex,
    currentSubFolder,
    subFolderPayload,
    userProfile,
    theme,
    pipelineStatus.sink,
    visualizerMode,
    controllerType,
    soundFx.isEnabled(),
    tracks,
    playlists,
    games,
    videos,
    galleryPictures,
    currentTrack,
    controllerConnected,
    handlePlayTrack,
    handleClearAllTracks,
    showSettingFeedback,
    refreshLibrary,
  ]);

  // Execute or Drill down into subfolder
  const handleExecuteItem = useCallback((item: XMBItemDef) => {
    if (item.action) {
      item.action();
      return;
    }

    if (item.isFolder && item.folderType) {
      soundFx.playSelect();
      setSubBreadcrumb(item.title);
      setCurrentSubFolder(item.folderType);
      setSubFolderPayload(item.folderPayload || null);
      setItemIndex(0);
    }
  }, []);

  const handleGoBack = useCallback(() => {
    soundFx.playCancel();
    if (viewingPictureIndex !== null) {
      setViewingPictureIndex(null);
      return;
    }
    if (isFullVisualizerView) {
      setIsFullVisualizerView(false);
      return;
    }
    if (currentSubFolder) {
      // Step back out of subfolder
      setCurrentSubFolder(null);
      setSubFolderPayload(null);
      setSubBreadcrumb(null);
      setItemIndex(0);
    }
  }, [viewingPictureIndex, isFullVisualizerView, currentSubFolder]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'KeyA':
          if (isFullVisualizerView) {
            e.preventDefault();
            soundFx.playTick();
            const visList: VisualizerMode[] = ['wave', 'earth_cosmos', 'sonic_radar', 'vu_spectrum', 'none', 'lyrics_synced'];
            setVisualizerMode((prev) => {
              const idx = visList.indexOf(prev);
              return visList[(idx - 1 + visList.length) % visList.length];
            });
          } else if (!currentSubFolder && viewingPictureIndex === null && !contextTrack && !contextPicture) {
            soundFx.playTick();
            setCategoryIndex((prev) => (prev - 1 + AUTHENTIC_PS3_CATEGORIES.length) % AUTHENTIC_PS3_CATEGORIES.length);
            setItemIndex(0);
          }
          break;

        case 'ArrowRight':
        case 'KeyD':
          if (isFullVisualizerView) {
            e.preventDefault();
            soundFx.playTick();
            const visList: VisualizerMode[] = ['wave', 'earth_cosmos', 'sonic_radar', 'vu_spectrum', 'none', 'lyrics_synced'];
            setVisualizerMode((prev) => {
              const idx = visList.indexOf(prev);
              return visList[(idx + 1) % visList.length];
            });
          } else if (!currentSubFolder && viewingPictureIndex === null && !contextTrack && !contextPicture) {
            soundFx.playTick();
            setCategoryIndex((prev) => (prev + 1) % AUTHENTIC_PS3_CATEGORIES.length);
            setItemIndex(0);
          }
          break;

        case 'ArrowUp':
        case 'KeyW':
          if (isFullVisualizerView) {
            e.preventDefault();
            soundFx.playTick();
            const visList: VisualizerMode[] = ['wave', 'earth_cosmos', 'sonic_radar', 'vu_spectrum', 'none', 'lyrics_synced'];
            setVisualizerMode((prev) => {
              const idx = visList.indexOf(prev);
              return visList[(idx - 1 + visList.length) % visList.length];
            });
          } else if (viewingPictureIndex === null && !contextTrack && !contextPicture) {
            e.preventDefault();
            soundFx.playTick();
            setItemIndex((prev) => Math.max(0, prev - 1));
          }
          break;

        case 'ArrowDown':
        case 'KeyS':
          if (isFullVisualizerView) {
            e.preventDefault();
            soundFx.playTick();
            const visList: VisualizerMode[] = ['wave', 'earth_cosmos', 'sonic_radar', 'vu_spectrum', 'none', 'lyrics_synced'];
            setVisualizerMode((prev) => {
              const idx = visList.indexOf(prev);
              return visList[(idx + 1) % visList.length];
            });
          } else if (viewingPictureIndex === null && !contextTrack && !contextPicture) {
            e.preventDefault();
            soundFx.playTick();
            setItemIndex((prev) => Math.min(activeVerticalItems.length - 1, prev + 1));
          }
          break;

        case 'Enter':
          if (!contextTrack && !contextPicture && activeVerticalItems[itemIndex]) {
            e.preventDefault();
            handleExecuteItem(activeVerticalItems[itemIndex]);
          }
          break;

        case 'Space':
          if (!contextTrack && !contextPicture) {
            e.preventDefault();
            handleTogglePlay();
          }
          break;

        case 'Escape':
        case 'Backspace':
          e.preventDefault();
          if (viewingPictureIndex !== null) {
            setViewingPictureIndex(null);
          } else if (playingVideo) {
            setPlayingVideo(null);
          } else if (contextVideo) {
            setContextVideo(null);
          } else if (contextPicture) {
            setContextPicture(null);
          } else if (contextTrack) {
            setContextTrack(null);
          } else if (isColorPickerOpen) {
            setIsColorPickerOpen(false);
          } else if (activeLaunchGame) {
            setActiveLaunchGame(null);
          } else if (isEditProfileModalOpen) {
            setIsEditProfileModalOpen(false);
          } else if (isAddGameModalOpen) {
            setIsAddGameModalOpen(false);
          } else if (isGstModalOpen) {
            setIsGstModalOpen(false);
          } else if (isImportModalOpen) {
            setIsImportModalOpen(false);
          } else if (isImportVideoModalOpen) {
            setIsImportVideoModalOpen(false);
          } else {
            handleGoBack();
          }
          break;

        case 'KeyT':
        case 'KeyO':
          e.preventDefault();
          const currentItem = activeVerticalItems[itemIndex];
          if (currentItem?.picture) {
            soundFx.playOption();
            setContextPictureIndex(0);
            setContextPicture(currentItem.picture);
          } else if (currentItem?.video) {
            soundFx.playOption();
            setContextVideoIndex(0);
            setContextVideo(currentItem.video);
          } else if (currentItem?.track) {
            soundFx.playOption();
            setContextMenuIndex(0);
            setContextTrack(currentItem.track);
          } else if (currentTrack) {
            soundFx.playOption();
            setContextMenuIndex(0);
            setContextTrack(currentTrack);
          }
          break;

        case 'KeyM':
          handleToggleMute();
          break;

        case 'BracketLeft':
          handlePrevTrack();
          break;

        case 'BracketRight':
          handleNextTrack();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentSubFolder,
    isFullVisualizerView,
    viewingPictureIndex,
    contextPicture,
    isColorPickerOpen,
    itemIndex,
    activeVerticalItems,
    contextTrack,
    isGstModalOpen,
    isImportModalOpen,
    isAddGameModalOpen,
    isEditProfileModalOpen,
    activeLaunchGame,
    currentTrack,
    handleExecuteItem,
    handleTogglePlay,
    handleGoBack,
    handleToggleMute,
    handlePrevTrack,
    handleNextTrack,
  ]);

  // Gamepad type detector
  const identifyGamepadType = useCallback((id: string): ControllerType => {
    const s = (id || '').toLowerCase();
    if (
      s.includes('dualshock') ||
      s.includes('dualsense') ||
      s.includes('playstation') ||
      s.includes('sony') ||
      s.includes('ps5') ||
      s.includes('ps4') ||
      s.includes('ps3') ||
      s.includes('054c') ||
      s.includes('wireless controller')
    ) {
      return 'ds4_ds5';
    }
    return 'xinput';
  }, []);

  // Listen for window gamepad connect/disconnect events
  useEffect(() => {
    const handleConnected = (e: GamepadEvent) => {
      setControllerConnected(true);
      const type = identifyGamepadType(e.gamepad.id || '');
      setControllerType(type);
      showSettingFeedback(
        'Controller Connected',
        type === 'ds4_ds5'
          ? 'PlayStation Controller Connected (DualShock 4 / DualSense)'
          : 'Xbox / XInput Controller Connected',
        'wrench'
      );
    };

    const handleDisconnected = () => {
      const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
      if (gps.length === 0) {
        setControllerConnected(false);
        showSettingFeedback('Controller Disconnected', 'Switched to Keyboard & Mouse layout', 'wrench');
      } else {
        const type = identifyGamepadType(gps[0]?.id || '');
        setControllerType(type);
      }
    };

    window.addEventListener('gamepadconnected', handleConnected);
    window.addEventListener('gamepaddisconnected', handleDisconnected);
    return () => {
      window.removeEventListener('gamepadconnected', handleConnected);
      window.removeEventListener('gamepaddisconnected', handleDisconnected);
    };
  }, [identifyGamepadType, showSettingFeedback]);

  // Compute context actions count for controller navigation
  const contextMenuActionCount = useMemo(() => {
    if (!contextTrack) return 0;
    const customPlaylists = playlists.filter((p) => !p.isSystem);
    return 3 + customPlaylists.length + 2;
  }, [contextTrack, playlists]);

  // Single-Press-Per-Hold Gamepad Loop
  useEffect(() => {
    let animId: number;

    const pollGamepad = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];

      if (gp && gp.connected) {
        if (!controllerConnected) setControllerConnected(true);

        const idLower = gp.id.toLowerCase();
        if (
          idLower.includes('dualshock') ||
          idLower.includes('dualsense') ||
          idLower.includes('054c') ||
          idLower.includes('sony') ||
          idLower.includes('wireless controller')
        ) {
          if (controllerType !== 'ds4_ds5') setControllerType('ds4_ds5');
        } else if (
          idLower.includes('xbox') ||
          idLower.includes('xinput') ||
          idLower.includes('045e') ||
          idLower.includes('xpad')
        ) {
          if (controllerType !== 'xinput') setControllerType('xinput');
        }

        // True Edge-Detection: trigger once per button push / stick flick
        const isBtnDown = (btnIdx: number) => Boolean(gp.buttons[btnIdx]?.pressed);
        const wasBtnDown = (btnIdx: number) => Boolean(prevButtonsRef.current[btnIdx]);
        const justPressed = (btnIdx: number) => isBtnDown(btnIdx) && !wasBtnDown(btnIdx);

        const prevX = prevAxesRef.current.x;
        const prevY = prevAxesRef.current.y;
        const currX = gp.axes[0] || 0;
        const currY = gp.axes[1] || 0;

        // Stick triggers ONLY when crossing from neutral (< 0.45) into active (>= 0.55)
        const stickLeftJust = currX < -0.55 && prevX >= -0.45;
        const stickRightJust = currX > 0.55 && prevX <= 0.45;
        const stickUpJust = currY < -0.55 && prevY >= -0.45;
        const stickDownJust = currY > 0.55 && prevY <= 0.45;

        const leftPressed = justPressed(14) || justPressed(4) || stickLeftJust;
        const rightPressed = justPressed(15) || justPressed(5) || stickRightJust;
        const upPressed = justPressed(12) || stickUpJust;
        const downPressed = justPressed(13) || stickDownJust;
        const crossPressed = justPressed(0);
        const circlePressed = justPressed(1);
        const squarePressed = justPressed(2);
        const trianglePressed = justPressed(3);
        const l2Pressed = justPressed(6);
        const r2Pressed = justPressed(7);

        // Case A: Options Menu for Track is OPEN -> Controller navigates it!
        if (contextTrack) {
          const customPlaylists = playlists.filter((p) => !p.isSystem);
          const hasAudioUrl = Boolean(contextTrack.audioUrl);
          const totalTrackActions = 3 + customPlaylists.length + 1 + (hasAudioUrl ? 1 : 0) + 1;

          // If focused on the Volume item (index 1), allow left/right to change volume in steps of 5 smoothly!
          if (contextMenuIndex === 1) {
            const isLeftHeld = gp.buttons[14]?.pressed || gp.buttons[4]?.pressed || currX < -0.35;
            const isRightHeld = gp.buttons[15]?.pressed || gp.buttons[5]?.pressed || currX > 0.35;
            const now = Date.now();
            const lastVolTime = (window as unknown as { _lastVolTime?: number })._lastVolTime || 0;
            if (isLeftHeld || isRightHeld) {
              if (leftPressed || rightPressed || now - lastVolTime > 120) {
                (window as unknown as { _lastVolTime?: number })._lastVolTime = now;
                soundFx.playTick();
                if (isLeftHeld && !isRightHeld) {
                  handleVolumeChange((prev) => Math.max(0, Math.round((prev - 0.05) * 100) / 100));
                } else if (isRightHeld && !isLeftHeld) {
                  handleVolumeChange((prev) => Math.min(1, Math.round((prev + 0.05) * 100) / 100));
                }
              }
            }
          }

          if (upPressed) {
            soundFx.playTick();
            setContextMenuIndex((i) => Math.max(0, i - 1));
          } else if (downPressed) {
            soundFx.playTick();
            setContextMenuIndex((i) => Math.min(totalTrackActions - 1, i + 1));
          } else if (crossPressed) {
            let currIdx = 0;
            if (contextMenuIndex === currIdx++) {
              soundFx.playSelect();
              handlePlayTrack(contextTrack);
              setContextTrack(null);
            } else if (contextMenuIndex === currIdx++) {
              soundFx.playTick();
              handleToggleMute();
            } else if (contextMenuIndex === currIdx++) {
              soundFx.playSelect();
              handleToggleFavorite(contextTrack.id);
              setContextTrack(null);
            } else {
              let playlistTriggered = false;
              for (let plIdx = 0; plIdx < customPlaylists.length; plIdx++) {
                if (contextMenuIndex === currIdx++) {
                  soundFx.playSelect();
                  handleAddToPlaylist(customPlaylists[plIdx].id, contextTrack);
                  setContextTrack(null);
                  playlistTriggered = true;
                  break;
                }
              }
              if (!playlistTriggered) {
                if (contextMenuIndex === currIdx++) {
                  soundFx.playSelect();
                  setIsGstModalOpen(true);
                  setContextTrack(null);
                } else if (hasAudioUrl && contextMenuIndex === currIdx++) {
                  soundFx.playSelect();
                  openMediaFile(contextTrack.audioUrl || contextTrack.title);
                  setContextTrack(null);
                } else if (contextMenuIndex === currIdx++) {
                  soundFx.playCancel();
                  handleDeleteTrack(contextTrack.id);
                  setContextTrack(null);
                }
              }
            }
          } else if (circlePressed || trianglePressed) {
            soundFx.playCancel();
            setContextTrack(null);
          }
        }
        // Case B: Options Menu for Picture is OPEN -> Controller navigates it!
        else if (contextPicture) {
          if (upPressed) {
            soundFx.playTick();
            setContextPictureIndex((i) => Math.max(0, i - 1));
          } else if (downPressed) {
            soundFx.playTick();
            setContextPictureIndex((i) => Math.min(2, i + 1));
          } else if (crossPressed) {
            if (contextPictureIndex === 0) {
              soundFx.playSelect();
              const idx = galleryPictures.findIndex((p) => p.id === contextPicture.id);
              setViewingPictureIndex(idx !== -1 ? idx : 0);
              setContextPicture(null);
            } else if (contextPictureIndex === 1) {
              soundFx.playSettingChanged();
              handleSetAsAvatar(contextPicture);
              setContextPicture(null);
            } else if (contextPictureIndex === 2) {
              soundFx.playSettingChanged();
              handleExtractColorway(contextPicture);
              setContextPicture(null);
            }
          } else if (circlePressed || trianglePressed) {
            soundFx.playCancel();
            setContextPicture(null);
          }
        }
        // Case C: Picture Fullscreen Viewer is OPEN
        else if (viewingPictureIndex !== null) {
          if (leftPressed) {
            soundFx.playTick();
            setViewingPictureIndex((i) => ((i || 0) - 1 + galleryPictures.length) % galleryPictures.length);
          } else if (rightPressed) {
            soundFx.playTick();
            setViewingPictureIndex((i) => ((i || 0) + 1) % galleryPictures.length);
          } else if (circlePressed) {
            soundFx.playCancel();
            setViewingPictureIndex(null);
          }
        }
        // Case D: Full Visualizer Screen Controls
        else if (isFullVisualizerView) {
          const visList: VisualizerMode[] = ['wave', 'earth_cosmos', 'sonic_radar', 'vu_spectrum', 'none', 'lyrics_synced'];
          const currentIdx = visList.indexOf(visualizerMode);

          if (leftPressed || upPressed) {
            soundFx.playTick();
            const nextIdx = (currentIdx - 1 + visList.length) % visList.length;
            setVisualizerMode(visList[nextIdx]);
          } else if (rightPressed || downPressed) {
            soundFx.playTick();
            const nextIdx = (currentIdx + 1) % visList.length;
            setVisualizerMode(visList[nextIdx]);
          } else if (crossPressed || squarePressed) {
            soundFx.playSelect();
            handleTogglePlay();
          } else if (circlePressed) {
            soundFx.playCancel();
            setIsFullVisualizerView(false);
          } else if (l2Pressed) {
            soundFx.playTick();
            handlePrevTrack();
          } else if (r2Pressed) {
            soundFx.playTick();
            handleNextTrack();
          }
        }
        // Case E: Standard XMB Navigation
        else {
          if (leftPressed) {
            if (!currentSubFolder && !isFullVisualizerView) {
              soundFx.playTick();
              setCategoryIndex((prev) => (prev - 1 + AUTHENTIC_PS3_CATEGORIES.length) % AUTHENTIC_PS3_CATEGORIES.length);
              setItemIndex(0);
            }
          } else if (rightPressed) {
            if (!currentSubFolder && !isFullVisualizerView) {
              soundFx.playTick();
              setCategoryIndex((prev) => (prev + 1) % AUTHENTIC_PS3_CATEGORIES.length);
              setItemIndex(0);
            }
          } else if (upPressed) {
            if (!isFullVisualizerView) {
              soundFx.playTick();
              setItemIndex((prev) => Math.max(0, prev - 1));
            }
          } else if (downPressed) {
            if (!isFullVisualizerView) {
              soundFx.playTick();
              setItemIndex((prev) => Math.min(activeVerticalItems.length - 1, prev + 1));
            }
          } else if (crossPressed) {
            if (activeVerticalItems[itemIndex]) {
              handleExecuteItem(activeVerticalItems[itemIndex]);
            }
          } else if (circlePressed) {
            handleGoBack();
          } else if (squarePressed) {
            handleTogglePlay();
          } else if (trianglePressed) {
            const currentItem = activeVerticalItems[itemIndex];
            if (currentItem?.picture) {
              soundFx.playOption();
              setContextPictureIndex(0);
              setContextPicture(currentItem.picture);
            } else if (currentItem?.track) {
              soundFx.playOption();
              setContextMenuIndex(0);
              setContextTrack(currentItem.track);
            } else if (currentTrack) {
              soundFx.playOption();
              setContextMenuIndex(0);
              setContextTrack(currentTrack);
            }
          } else if (l2Pressed) {
            handlePrevTrack();
          } else if (r2Pressed) {
            handleNextTrack();
          }
        }

        // Save current frame state for next frame's edge-detection
        const nextButtons: { [idx: number]: boolean } = {};
        for (let i = 0; i < gp.buttons.length; i++) {
          nextButtons[i] = Boolean(gp.buttons[i]?.pressed);
        }
        prevButtonsRef.current = nextButtons;
        prevAxesRef.current = { x: currX, y: currY };
      } else {
        if (controllerConnected) setControllerConnected(false);
      }

      animId = requestAnimationFrame(pollGamepad);
    };

    animId = requestAnimationFrame(pollGamepad);
    return () => cancelAnimationFrame(animId);
  }, [
    controllerConnected,
    controllerType,
    currentSubFolder,
    isFullVisualizerView,
    viewingPictureIndex,
    activeVerticalItems,
    itemIndex,
    currentTrack,
    contextTrack,
    contextPicture,
    contextMenuIndex,
    contextPictureIndex,
    contextMenuActionCount,
    playlists,
    galleryPictures,
    handleExecuteItem,
    handleGoBack,
    handleTogglePlay,
    handlePlayTrack,
    handleToggleFavorite,
    handleAddToPlaylist,
    handleDeleteTrack,
    handleSetAsAvatar,
    handleExtractColorway,
    handlePrevTrack,
    handleNextTrack,
  ]);

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col justify-between text-slate-100 select-none scanlines">
      {/* Real-time Dynamic Silk Ribbon Canvas Background with Custom Palette */}
      <XMBWaveBackground
        theme={theme}
        interactiveAudio={false}
        dynamicPalette={dynamicPalette}
        customPalette={customThemePalette}
      />

      {/* PS3 Top Bar with Live Clock, DSP Status, and User Profile Avatar */}
      <PS3TopBar
        pipelineStatus={pipelineStatus}
        currentTrack={currentTrack}
        onOpenGstInspector={() => setIsGstModalOpen(true)}
        onOpenImport={() => setIsImportModalOpen(true)}
        isMuted={isMuted}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        gamepadConnected={controllerConnected}
        userProfile={userProfile}
        onOpenEditProfile={() => setIsEditProfileModalOpen(true)}
      />

      {/* PS3 Top-Right Setting Change Notification Toast */}
      <PS3NotificationToast
        notification={settingNotification}
        onDismiss={() => setSettingNotification(null)}
      />

      {/* Main Center Area */}
      <main className="relative z-10 flex-1 flex flex-col overflow-hidden pb-12">
        {isFullVisualizerView ? (
          <NowPlayingVisualizer
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onPrev={handlePrevTrack}
            onNext={handleNextTrack}
            onSeek={handleSeek}
            currentTime={currentTime}
            duration={duration}
            mode={visualizerMode}
            onModeChange={setVisualizerMode}
            theme={theme}
            customThemePalette={customThemePalette}
            dynamicPalette={dynamicPalette}
            isShuffle={isShuffle}
            repeatMode={repeatMode}
            onToggleShuffle={handleToggleShuffle}
            onToggleRepeat={handleToggleRepeat}
          />
        ) : (
          <XMBNavigator
            categoryIndex={categoryIndex}
            itemIndex={itemIndex}
            items={activeVerticalItems}
            onSelectCategory={(idx) => {
              setCategoryIndex(idx);
              setCurrentSubFolder(null);
              setSubFolderPayload(null);
              setSubBreadcrumb(null);
              setItemIndex(0);
            }}
            onSelectItemIndex={setItemIndex}
            onExecuteItem={handleExecuteItem}
            onOpenContextMenu={(track) => {
              setContextMenuIndex(0);
              setContextTrack(track);
            }}
            onOpenPictureContextMenu={(pic) => {
              setContextPictureIndex(0);
              setContextPicture(pic);
            }}
            onOpenVideoContextMenu={(vid) => {
              setContextVideoIndex(0);
              setContextVideo(vid);
            }}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            subBreadcrumb={subBreadcrumb}
            onGoBack={handleGoBack}
          />
        )}
      </main>

      {/* Controller & Keyboard Prompts */}
      <PS3ControllerHints
        canGoBack={Boolean(currentSubFolder) || isFullVisualizerView || viewingPictureIndex !== null || Boolean(contextTrack) || Boolean(contextPicture)}
        hasSelection={Boolean(activeVerticalItems[itemIndex])}
        isPlaying={isPlaying}
        controllerType={controllerType}
        controllerConnected={controllerConnected}
        isVisualizerView={isFullVisualizerView}
      />

      {/* Authentic Now Playing Album Cover Jacket in Bottom Right (Hidden inside Visualizer Screen) */}
      {!isFullVisualizerView && (
        <NowPlayingMiniJacket
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onTogglePlay={handleTogglePlay}
          onOpenVisualizer={() => setIsFullVisualizerView(true)}
          onSeek={handleSeek}
          theme={theme}
          customThemePalette={customThemePalette}
          dynamicPalette={dynamicPalette}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          onToggleShuffle={handleToggleShuffle}
          onToggleRepeat={handleToggleRepeat}
        />
      )}

      {/* Fullscreen Picture Viewer Modal */}
      <PictureViewerModal
        isOpen={viewingPictureIndex !== null}
        onClose={() => setViewingPictureIndex(null)}
        pictures={galleryPictures}
        currentIndex={viewingPictureIndex || 0}
        onIndexChange={setViewingPictureIndex}
        onSetAsAvatar={handleSetAsAvatar}
        onExtractColorway={handleExtractColorway}
      />

      {/* Picture Options Context Menu (Triangle △) - Controller Navigable */}
      <PictureContextMenu
        isOpen={Boolean(contextPicture)}
        picture={contextPicture}
        onClose={() => setContextPicture(null)}
        onViewFullscreen={(pic) => {
          const idx = galleryPictures.findIndex((p) => p.id === pic.id);
          setViewingPictureIndex(idx !== -1 ? idx : 0);
        }}
        onSetAsAvatar={handleSetAsAvatar}
        onExtractColorway={handleExtractColorway}
        selectedIndex={contextPictureIndex}
        onSelectedIndexChange={setContextPictureIndex}
        controllerType={controllerType}
        controllerConnected={controllerConnected}
      />

      {/* Custom Color Values Picker Modal */}
      <CustomColorPickerModal
        isOpen={isColorPickerOpen}
        onClose={() => setIsColorPickerOpen(false)}
        initialPalette={customThemePalette}
        onApplyPalette={handleApplyCustomPalette}
      />

      {/* Edit User Profile & Avatar Modal */}
      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        profile={userProfile}
        onSaveProfile={handleSaveProfile}
      />

      {/* Add Custom Game / App Modal */}
      <AddGameModal
        isOpen={isAddGameModalOpen}
        onClose={() => setIsAddGameModalOpen(false)}
        onGameAdded={(newGame) => {
          refreshLibrary();
          showSettingFeedback('Game Added', `"${newGame.title}" registered to Game tab`, 'wrench');
        }}
      />

      {/* Game Process Execution Modal */}
      <GameLaunchModal
        game={activeLaunchGame}
        onClose={() => setActiveLaunchGame(null)}
      />

      {/* GStreamer Inspector & 10-Band EQ Modal */}
      <GStreamerInspectorModal
        isOpen={isGstModalOpen}
        onClose={() => setIsGstModalOpen(false)}
        status={pipelineStatus}
        currentTrack={currentTrack}
      />

      {/* Local Music File Drag & Drop Import Modal */}
      <LocalImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onTrackImported={(track) => {
          refreshLibrary();
          handlePlayTrack(track);
          showSettingFeedback('Music Imported', `Imported "${track.title}" to collection`, 'check');
        }}
      />

      {/* Local Video File Drag & Drop Import Modal */}
      <LocalVideoImportModal
        isOpen={isImportVideoModalOpen}
        onClose={() => setIsImportVideoModalOpen(false)}
        onVideoImported={(video) => {
          refreshLibrary();
          setPlayingVideo(video);
          showSettingFeedback('Video Imported', `Imported "${video.title}" to collection`, 'check');
        }}
      />

      {/* Fullscreen Video Player Modal */}
      <VideoPlayerModal
        video={playingVideo}
        onClose={() => setPlayingVideo(null)}
      />

      {/* Video Context Menu (△) */}
      <VideoContextMenu
        isOpen={Boolean(contextVideo)}
        video={contextVideo}
        onClose={() => setContextVideo(null)}
        onPlay={(v) => setPlayingVideo(v)}
        onDelete={handleDeleteVideo}
        selectedIndex={contextVideoIndex}
        onSelectedIndexChange={setContextVideoIndex}
        controllerType={controllerType}
        controllerConnected={controllerConnected}
      />

      {/* Triangle (△) Context Menu Side Panel - Fully Controller Navigable with Volume Steps */}
      <ContextMenu
        isOpen={Boolean(contextTrack)}
        track={contextTrack}
        playlists={playlists}
        onClose={() => setContextTrack(null)}
        onPlay={handlePlayTrack}
        onToggleFavorite={handleToggleFavorite}
        onAddToPlaylist={handleAddToPlaylist}
        onDeleteTrack={handleDeleteTrack}
        onInspectGst={() => setIsGstModalOpen(true)}
        selectedIndex={contextMenuIndex}
        onSelectedIndexChange={setContextMenuIndex}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        controllerType={controllerType}
        controllerConnected={controllerConnected}
      />
    </div>
  );
}
