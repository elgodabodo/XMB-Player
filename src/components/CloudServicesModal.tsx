import React, { useState } from 'react';
import { Track } from '../types';
import { libraryStorage, SPOTIFY_CATALOG, YOUTUBE_MUSIC_CATALOG } from '../services/libraryStorage';
import { Youtube, Search, Plus, Play, Check, X, Disc3 } from 'lucide-react';
import { soundFx } from '../services/soundFx';

interface CloudServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayTrack: (track: Track) => void;
  onTrackImported: (track: Track) => void;
}

export const CloudServicesModal: React.FC<CloudServicesModalProps> = ({
  isOpen,
  onClose,
  onPlayTrack,
  onTrackImported,
}) => {
  const [activeService, setActiveService] = useState<'youtube' | 'spotify'>('youtube');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const filteredYtTracks = libraryStorage.searchYouTubeMusic(searchQuery);
  const spotifyPlaylists = libraryStorage.getSpotifyPlaylists();

  const handleAddTrack = (track: Track) => {
    soundFx.playSelect();
    libraryStorage.addTrack(track);
    setAddedIds((prev) => new Set([...prev, track.id]));
    onTrackImported(track);
  };

  const handleImportSpotifyPlaylist = (pl: typeof spotifyPlaylists[0]) => {
    soundFx.playSelect();
    libraryStorage.importSpotifyPlaylist(pl.name, pl.tracks);
    pl.tracks.forEach((t) => {
      setAddedIds((prev) => new Set([...prev, t.id]));
      onTrackImported(t);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[85vh] bg-slate-950 border border-white/15 rounded-xl shadow-2xl overflow-hidden text-slate-200 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Youtube className="w-5 h-5 text-rose-500" />
              <span className="text-white/40">/</span>
              <Disc3 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide font-display uppercase">
                Cloud Streaming & Integration
              </h2>
              <p className="text-xs text-white/50">
                Stream YouTube Music & sync Spotify playlists into your Linux XMB collection
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

        {/* Service Switcher Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-white/10 bg-slate-900/50">
          <button
            onClick={() => {
              soundFx.playTick();
              setActiveService('youtube');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeService === 'youtube'
                ? 'border-rose-500 text-white'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Youtube className="w-4 h-4 text-rose-400" />
            <span>YouTube Music</span>
          </button>

          <button
            onClick={() => {
              soundFx.playTick();
              setActiveService('spotify');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
              activeService === 'spotify'
                ? 'border-emerald-500 text-white'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            <Disc3 className="w-4 h-4 text-emerald-400" />
            <span>Spotify Connect</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeService === 'youtube' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search YouTube Music for tracks, artists, or albums..."
                  className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-white/15 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>

              {/* YouTube Tracks List */}
              <div className="space-y-2">
                {filteredYtTracks.map((trk) => {
                  const isAdded = addedIds.has(trk.id) || libraryStorage.getTrackById(trk.id) !== undefined;

                  return (
                    <div
                      key={trk.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={trk.coverUrl}
                          alt={trk.title}
                          className="w-11 h-11 rounded object-cover border border-white/10 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-white truncate">
                            {trk.title}
                          </h4>
                          <p className="text-xs text-white/60 truncate">
                            {trk.artist} · {trk.album}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            soundFx.playSelect();
                            onPlayTrack(trk);
                          }}
                          className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                          title="Stream Now"
                        >
                          <Play className="w-4 h-4 fill-white" />
                        </button>

                        <button
                          onClick={() => handleAddTrack(trk)}
                          disabled={isAdded}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            isAdded
                              ? 'bg-white/10 text-emerald-400 cursor-default'
                              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-sm'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>In Library</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add to XMB</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeService === 'spotify' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      Spotify Connect: Active Session
                    </h4>
                    <p className="text-xs text-white/60">
                      Logged in as audiophile_linux · Premium High-Bitrate Vorbis
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-400/30">
                  ONLINE
                </span>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                  Your Synced Spotify Playlists:
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {spotifyPlaylists.map((pl) => (
                    <div
                      key={pl.id}
                      className="flex items-center justify-between p-3.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={pl.coverUrl}
                          alt={pl.name}
                          className="w-12 h-12 rounded object-cover border border-white/10 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-white truncate">
                            {pl.name}
                          </h4>
                          <p className="text-xs text-white/60">
                            {pl.trackCount} tracks · Synced
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleImportSpotifyPlaylist(pl)}
                        className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm transition-colors shrink-0"
                      >
                        Import to XMB
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-white/5 text-xs text-white/60">
          <span>Real-time metadata bridge & GStreamer souphttpsrc streamer</span>
          <button
            onClick={() => {
              soundFx.playCancel();
              onClose();
            }}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
