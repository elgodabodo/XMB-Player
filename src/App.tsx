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
  VisualizerMode,
  XMBTheme,
} from './types';
import { gstEngine } from './services/gstreamerEngine';
import { soundFx } from './services/soundFx';
import { colorExtractor } from './services/colorExtractor';
import { gameService } from './services/gameService';
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
import { CloudServicesModal } from './components/CloudServicesModal';
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
  const [currentTrack, setCurrentTrack] = useState<Track | null>(INITIAL_TRACKS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(INITIAL_TRACKS[0]?.duration || 0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [crossfadeSec, setCrossfadeSec] = useState<number>(gstEngine.getCrossfadeDuration());
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
  const [theme, setTheme] = useState<XMBTheme>('original_silver');
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

  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('wave');
  const [settingNotification, setSettingNotification] = useState<SettingNotification | null>(null);

  // Modals, Picture Viewers, & Context Menus
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [viewingPictureIndex, setViewingPictureIndex] = useState<number | null>(null);
  const [contextPicture, setContextPicture] = useState<PictureItem | null>(null);
  const [contextPictureIndex, setContextPictureIndex] = useState(0);
  const [contextTrack, setContextTrack] = useState<Track | null>(null);
  const [contextMenuIndex, setContextMenuIndex] = useState(0);

  const [isGstModalOpen, setIsGstModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);
  const [activeLaunchGame, setActiveLaunchGame] = useState<CustomGameApp | null>(null);

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

  const refreshLibrary = useCallback(() => {
    setTracks(libraryStorage.getTracks());
    setPlaylists(libraryStorage.getPlaylists());
    setGames(gameService.getGames());
  }, []);

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
    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % tracks.length;
    handlePlayTrack(tracks[nextIndex]);
  }, [currentTrack, tracks, handlePlayTrack]);

  const handlePrevTrack = useCallback(() => {
    if (!currentTrack || tracks.length === 0) return;
    const currentIndex = tracks.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    handlePlayTrack(tracks[prevIndex]);
  }, [currentTrack, tracks, handlePlayTrack]);

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
    (newVol: number) => {
      const clamped = Math.max(0, Math.min(1, Math.round(newVol * 100) / 100));
      gstEngine.setVolume(clamped);
      setVolume(clamped);
      if (isMuted && clamped > 0) {
        setIsMuted(false);
      }
    },
    [isMuted]
  );

  const handleCrossfadeChange = useCallback((seconds: number) => {
    gstEngine.setCrossfadeDuration(seconds);
    setCrossfadeSec(seconds);
    showSettingFeedback(
      'Crossfade Updated',
      seconds === 0 ? 'Crossfade playback disabled' : `Crossfade set to ${seconds} Seconds`,
      'crossfade'
    );
  }, [showSettingFeedback]);

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
            id: 'ms-crossfade',
            title: 'Crossfade Playback Settings',
            subtitle: `Currently: ${crossfadeSec === 0 ? 'Disabled' : `${crossfadeSec} Seconds`}`,
            badge: crossfadeSec > 0 ? `${crossfadeSec}s` : 'OFF',
            bulletType: 'crossfade',
            isFolder: true,
            folderType: 'crossfade_options',
          },
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

      if (currentSubFolder === 'crossfade_options') {
        const durations = [0, 2, 3, 4, 6, 8, 10, 12];
        return durations.map((d) => ({
          id: `cf-${d}`,
          title: d === 0 ? 'Crossfade Off' : `${d} Seconds Crossfade`,
          subtitle: crossfadeSec === d ? 'Current Setting (Active)' : 'Click to apply',
          badge: crossfadeSec === d ? 'ACTIVE' : undefined,
          bulletType: 'crossfade',
          action: () => handleCrossfadeChange(d),
        }));
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
          { id: 'starfield_warp', name: 'Starfield Warp (Hyperspace)' },
          { id: 'sonic_radar', name: 'Sonic Bloom Radar' },
          { id: 'vu_spectrum', name: '32-Band VU Spectrum' },
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
        return tracks.map((t) => ({
          id: t.id,
          title: t.title,
          subtitle: `${t.artist} · ${t.album}`,
          coverUrl: t.coverUrl,
          track: t,
          action: () => handlePlayTrack(t),
        }));
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
            title: 'crossbeat@fedora-linux',
            subtitle: 'Host: PipeWire / GStreamer 1.24 Subsystem',
            bulletType: 'network',
          },
          {
            id: 'usr-stats',
            title: 'Playback Statistics',
            subtitle: `${tracks.length} tracks indexed · ${games.length} games installed`,
            bulletType: 'clock',
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
            subtitle: `Crossfade: ${crossfadeSec === 0 ? 'Off' : `${crossfadeSec}s`} · Sink: ${pipelineStatus.sink.replace('sink', '')}`,
            badge: crossfadeSec > 0 ? `${crossfadeSec}s` : 'OFF',
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
            subtitle: 'LRCLIB Synced Lyrics API: Connected · YouTube / Spotify: Active',
            bulletType: 'network',
            action: () => setIsCloudModalOpen(true),
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
            id: 'vid-ytm',
            title: 'YouTube Music Video Streams',
            subtitle: 'Explore trending streaming releases',
            bulletType: 'network',
            action: () => setIsCloudModalOpen(true),
          },
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
          {
            id: 'gm-warp',
            title: 'Starfield Warp Visualizer',
            subtitle: 'High-speed cosmic hyperspace reaction',
            bulletType: 'display',
            action: () => {
              setVisualizerMode('starfield_warp');
              setIsFullVisualizerView(true);
            },
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
            id: 'net-ytm',
            title: 'YouTube Music Streaming',
            subtitle: 'Search and stream global tracks',
            bulletType: 'network',
            action: () => setIsCloudModalOpen(true),
          },
          {
            id: 'net-spotify',
            title: 'Spotify Connect Hub',
            subtitle: 'Sync Spotify playlists into Linux library',
            bulletType: 'disc',
            action: () => setIsCloudModalOpen(true),
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
            id: 'fr-mpris',
            title: 'Linux MPRIS2 D-Bus Broadcast',
            subtitle: currentTrack ? `Broadcasting: ${currentTrack.title}` : 'Session Idle',
            bulletType: 'network',
            action: () => setIsGstModalOpen(true),
          },
          {
            id: 'fr-now',
            title: 'Now Playing Status',
            subtitle: currentTrack ? `${currentTrack.artist} — ${currentTrack.title}` : 'No track',
            bulletType: 'music',
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
    crossfadeSec,
    pipelineStatus.sink,
    visualizerMode,
    controllerType,
    soundFx.isEnabled(),
    tracks,
    playlists,
    games,
    galleryPictures,
    currentTrack,
    controllerConnected,
    handlePlayTrack,
    handleCrossfadeChange,
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
        case 'KeyQ':
          if (!currentSubFolder && !isFullVisualizerView && viewingPictureIndex === null && !contextTrack && !contextPicture) {
            soundFx.playTick();
            setCategoryIndex((prev) => (prev - 1 + AUTHENTIC_PS3_CATEGORIES.length) % AUTHENTIC_PS3_CATEGORIES.length);
            setItemIndex(0);
          }
          break;

        case 'ArrowRight':
        case 'KeyE':
          if (!currentSubFolder && !isFullVisualizerView && viewingPictureIndex === null && !contextTrack && !contextPicture) {
            soundFx.playTick();
            setCategoryIndex((prev) => (prev + 1) % AUTHENTIC_PS3_CATEGORIES.length);
            setItemIndex(0);
          }
          break;

        case 'ArrowUp':
        case 'KeyW':
          if (!isFullVisualizerView && viewingPictureIndex === null && !contextTrack && !contextPicture) {
            e.preventDefault();
            soundFx.playTick();
            setItemIndex((prev) => Math.max(0, prev - 1));
          }
          break;

        case 'ArrowDown':
        case 'KeyS':
          if (!isFullVisualizerView && viewingPictureIndex === null && !contextTrack && !contextPicture) {
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
          } else if (isCloudModalOpen) {
            setIsCloudModalOpen(false);
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
    isCloudModalOpen,
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

  // Compute context actions count for controller navigation
  // Compute context actions count for controller navigation:
  // 0: Play Now, 1: Volume, 2: Favorite, 3..: Playlists, then DSP, then Delete
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

          // If focused on the Volume item (index 1), allow left/right to change volume in steps of 5!
          if (contextMenuIndex === 1) {
            if (leftPressed) {
              soundFx.playTick();
              handleVolumeChange(Math.max(0, Math.round((volume - 0.05) * 100) / 100));
            } else if (rightPressed) {
              soundFx.playTick();
              handleVolumeChange(Math.min(1, Math.round((volume + 0.05) * 100) / 100));
            }
          }

          if (upPressed) {
            soundFx.playTick();
            setContextMenuIndex((i) => Math.max(0, i - 1));
          } else if (downPressed) {
            soundFx.playTick();
            setContextMenuIndex((i) => Math.min(contextMenuActionCount - 1, i + 1));
          } else if (crossPressed) {
            // Trigger action at contextMenuIndex
            if (contextMenuIndex === 0) {
              soundFx.playSelect();
              handlePlayTrack(contextTrack);
              setContextTrack(null);
            } else if (contextMenuIndex === 1) {
              soundFx.playTick();
              handleToggleMute();
            } else if (contextMenuIndex === 2) {
              soundFx.playSelect();
              handleToggleFavorite(contextTrack.id);
              setContextTrack(null);
            } else if (contextMenuIndex >= 3 && contextMenuIndex < 3 + customPlaylists.length) {
              const pl = customPlaylists[contextMenuIndex - 3];
              soundFx.playSelect();
              handleAddToPlaylist(pl.id, contextTrack);
              setContextTrack(null);
            } else if (contextMenuIndex === 3 + customPlaylists.length) {
              soundFx.playSelect();
              setIsGstModalOpen(true);
              setContextTrack(null);
            } else if (contextMenuIndex === 3 + customPlaylists.length + 1) {
              soundFx.playCancel();
              handleDeleteTrack(contextTrack.id);
              setContextTrack(null);
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
        // Case D: Standard XMB Navigation
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
        interactiveAudio={isPlaying}
        dynamicPalette={dynamicPalette}
        customPalette={customThemePalette}
      />

      {/* PS3 Top Bar with Live Clock, DSP Status, and User Profile Avatar */}
      <PS3TopBar
        pipelineStatus={pipelineStatus}
        currentTrack={currentTrack}
        onOpenGstInspector={() => setIsGstModalOpen(true)}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenCloudServices={() => setIsCloudModalOpen(true)}
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
      />

      {/* Authentic Now Playing Album Cover Jacket in Bottom Right */}
      <NowPlayingMiniJacket
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onOpenVisualizer={() => setIsFullVisualizerView(true)}
      />

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

      {/* Cloud Streaming (YouTube Music & Spotify) Modal */}
      <CloudServicesModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        onPlayTrack={handlePlayTrack}
        onTrackImported={refreshLibrary}
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
      />
    </div>
  );
}
