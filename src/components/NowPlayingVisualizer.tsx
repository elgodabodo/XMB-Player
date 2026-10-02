import React, { useEffect, useRef, useState, useMemo } from 'react';
import { gstEngine } from '../services/gstreamerEngine';
import { lyricsService } from '../services/lyricsService';
import { LyricLine, LyricsData, Track, VisualizerMode } from '../types';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Disc,
  Globe,
  Activity,
  Waves,
  Sparkles,
  Radio,
  FileText,
  Search,
  Check,
  X,
  Volume2,
} from 'lucide-react';
import { soundFx } from '../services/soundFx';

interface NowPlayingVisualizerProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  currentTime: number;
  duration: number;
  mode: VisualizerMode;
  onModeChange: (mode: VisualizerMode) => void;
}

export const NowPlayingVisualizer: React.FC<NowPlayingVisualizerProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  currentTime,
  duration,
  mode,
  onModeChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  // Lyrics State
  const [lyricsData, setLyricsData] = useState<LyricsData | null>(null);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [isSearchLyricsOpen, setIsSearchLyricsOpen] = useState(false);
  const [lyricsSearchQuery, setLyricsSearchQuery] = useState('');
  const [lyricsSearchResults, setLyricsSearchResults] = useState<LyricsData[]>([]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Fetch LRCLIB lyrics when track changes
  useEffect(() => {
    if (!currentTrack) return;
    let isCancelled = false;
    setIsLoadingLyrics(true);

    lyricsService.getLyricsForTrack(currentTrack).then((data) => {
      if (!isCancelled) {
        setLyricsData(data);
        setIsLoadingLyrics(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [currentTrack]);

  // Determine current active lyric line
  const activeLyricIndex = useMemo(() => {
    if (!lyricsData || !lyricsData.lines.length) return -1;
    let activeIdx = -1;
    for (let i = 0; i < lyricsData.lines.length; i++) {
      if (currentTime >= lyricsData.lines[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
  }, [lyricsData, currentTime]);

  // Auto-scroll lyrics container to active line
  useEffect(() => {
    if (mode !== 'lyrics_synced' || activeLyricIndex === -1 || !lyricsContainerRef.current) return;
    const el = lyricsContainerRef.current.querySelector(
      `[data-lyric-idx="${activeLyricIndex}"]`
    ) as HTMLElement | null;

    if (el) {
      el.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeLyricIndex, mode]);

  // Manual Lyrics Search
  const handleSearchLyrics = async () => {
    if (!lyricsSearchQuery.trim()) return;
    const results = await lyricsService.searchLyrics(lyricsSearchQuery);
    setLyricsSearchResults(results);
  };

  // Render Visualizer Canvas
  useEffect(() => {
    if (mode === 'lyrics_synced') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let globeAngle = 0;
    const peakBars: number[] = new Array(32).fill(0);

    // Starfield Warp particles
    const starCount = 180;
    const stars = Array.from({ length: starCount }, () => ({
      x: (Math.random() - 0.5) * 2000,
      y: (Math.random() - 0.5) * 2000,
      z: Math.random() * 1000 + 10,
      pz: 1000,
    }));

    let radarRings: { radius: number; alpha: number }[] = [];

    const render = () => {
      const width = (canvas.width = canvas.clientWidth * window.devicePixelRatio);
      const height = (canvas.height = canvas.clientHeight * window.devicePixelRatio);
      ctx.clearRect(0, 0, width, height);

      const freqData = gstEngine.getFrequencyData();
      const timeData = gstEngine.getTimeDomainData();

      // Energy calculation
      let bassEnergy = 0;
      for (let i = 0; i < 16; i++) {
        bassEnergy += freqData[i] || 0;
      }
      bassEnergy = bassEnergy / 16 / 255;

      if (mode === 'starfield_warp') {
        // PS3 Cosmic Hyperspace Starfield Warp
        const cx = width / 2;
        const cy = height / 2;
        const speed = 8 + bassEnergy * 32;

        ctx.fillStyle = '#ffffff';

        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          s.pz = s.z;
          s.z -= speed;

          if (s.z <= 0) {
            s.z = 1000;
            s.pz = 1000;
            s.x = (Math.random() - 0.5) * 2000;
            s.y = (Math.random() - 0.5) * 2000;
          }

          const k = 400 / s.z;
          const px = s.x * k + cx;
          const py = s.y * k + cy;

          const pk = 400 / s.pz;
          const prevX = s.x * pk + cx;
          const prevY = s.y * pk + cy;

          if (px >= 0 && px <= width && py >= 0 && py <= height) {
            const size = Math.max(1, (1 - s.z / 1000) * 3);
            const alpha = (1 - s.z / 1000) * 0.9;

            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(px, py);
            ctx.strokeStyle = `rgba(224, 242, 254, ${alpha})`;
            ctx.lineWidth = size;
            ctx.stroke();
          }
        }
      } else if (mode === 'sonic_radar') {
        // Sonic Bloom Radar
        const cx = width / 2;
        const cy = height / 2;
        const maxRadius = Math.min(width, height) * 0.45;

        if (bassEnergy > 0.4 && (radarRings.length === 0 || radarRings[radarRings.length - 1].radius > 30)) {
          radarRings.push({ radius: 5, alpha: 0.9 });
        }

        radarRings.forEach((ring) => {
          ring.radius += 2.5 + bassEnergy * 4;
          ring.alpha *= 0.97;

          ctx.beginPath();
          ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(56, 189, 248, ${ring.alpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        });

        radarRings = radarRings.filter((r) => r.alpha > 0.05 && r.radius < maxRadius);

        // Circular frequency spikes
        const numSpikes = 64;
        for (let i = 0; i < numSpikes; i++) {
          const angle = (i / numSpikes) * Math.PI * 2;
          const val = (freqData[i % freqData.length] || 0) / 255;
          const r1 = 50 + bassEnergy * 20;
          const r2 = r1 + val * 90;

          const x1 = cx + Math.cos(angle) * r1;
          const y1 = cy + Math.sin(angle) * r1;
          const x2 = cx + Math.cos(angle) * r2;
          const y2 = cy + Math.sin(angle) * r2;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + val * 0.7})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      } else if (mode === 'earth_cosmos') {
        // PS3 Signature Earth Cosmos Wireframe Globe
        globeAngle += 0.006 + bassEnergy * 0.01;
        const centerX = width * 0.5;
        const centerY = height * 0.45;
        const radius = Math.min(width, height) * 0.28 + bassEnergy * 15;

        // Atmosphere glow
        const glowGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          radius * 0.7,
          centerX,
          centerY,
          radius * 1.5
        );
        glowGrad.addColorStop(0, 'rgba(56, 189, 248, 0.12)');
        glowGrad.addColorStop(0.5, 'rgba(30, 58, 138, 0.08)');
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Latitude lines
        ctx.strokeStyle = 'rgba(125, 211, 252, 0.25)';
        ctx.lineWidth = 1.2;

        for (let lat = -60; lat <= 60; lat += 20) {
          const latRad = (lat * Math.PI) / 180;
          const rLat = radius * Math.cos(latRad);
          const yLat = centerY + radius * Math.sin(latRad);

          ctx.beginPath();
          ctx.ellipse(centerX, yLat, rLat, rLat * 0.35, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Longitude lines
        for (let lon = 0; lon < 180; lon += 30) {
          const rad = (lon * Math.PI) / 180 + globeAngle;
          const rLon = radius * Math.cos(rad);

          ctx.beginPath();
          ctx.ellipse(centerX, centerY, Math.abs(rLon), radius, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(186, 230, 253, ${0.15 + Math.abs(Math.sin(rad)) * 0.25})`;
          ctx.stroke();
        }

        // Audio Frequency Pulses radiating outward
        const numBeams = 48;
        for (let i = 0; i < numBeams; i++) {
          const angle = (i / numBeams) * Math.PI * 2 + globeAngle * 0.5;
          const val = (freqData[i % freqData.length] / 255);
          const beamLen = 10 + val * 70;

          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * (radius * 0.65);
          const x2 = centerX + Math.cos(angle) * (radius + beamLen);
          const y2 = centerY + Math.sin(angle) * ((radius + beamLen) * 0.65);

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(224, 242, 254, ${0.3 + val * 0.7})`;
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
      } else if (mode === 'vu_spectrum') {
        // 32-Band Classic Hi-Fi Spectrum Analyzer
        const numBars = 32;
        const totalBarWidth = width * 0.75;
        const startX = (width - totalBarWidth) / 2;
        const barWidth = (totalBarWidth / numBars) * 0.7;
        const gap = (totalBarWidth / numBars) * 0.3;
        const baseY = height * 0.75;
        const maxHeight = height * 0.5;

        for (let i = 0; i < numBars; i++) {
          const val = (freqData[Math.floor((i / numBars) * (freqData.length / 2))] || 0) / 255;
          const barHeight = Math.max(4, val * maxHeight);
          const x = startX + i * (barWidth + gap);
          const y = baseY - barHeight;

          // Peak hold
          if (barHeight > (peakBars[i] || 0)) {
            peakBars[i] = barHeight;
          } else {
            peakBars[i] = Math.max(4, (peakBars[i] || 0) - 1.5);
          }

          // Bar gradient
          const grad = ctx.createLinearGradient(0, baseY, 0, y);
          grad.addColorStop(0, 'rgba(56, 189, 248, 0.4)');
          grad.addColorStop(0.7, 'rgba(125, 211, 252, 0.85)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');

          ctx.fillStyle = grad;
          ctx.fillRect(x, y, barWidth, barHeight);

          // Peak line
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(x, baseY - peakBars[i] - 2, barWidth, 2);
        }
      } else {
        // Signature PS3 Silk Wave Mode
        const centerY = height * 0.5;
        ctx.beginPath();
        const sliceWidth = width / timeData.length;
        let x = 0;

        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i] / 128.0;
          const y = centerY + (v - 1.0) * (height * 0.35 + bassEnergy * 50);

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#7dd3fc';
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [mode]);

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/50 space-y-4">
        <Disc className="w-16 h-16 animate-spin text-white/20" />
        <p className="font-sans text-lg tracking-wider text-white/70">
          No Track Loaded in GStreamer Pipeline
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full w-full max-w-5xl mx-auto px-6 py-2 justify-between">
      {/* Top Visualizer Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs uppercase tracking-wider text-white/70 font-semibold">
            PS3 Visualizer
          </span>
          <span aria-hidden="true" className="text-white/30">·</span>
          <span className="text-xs font-mono text-white font-bold drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]">
            {mode.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Visualizer Mode Buttons */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-black/60 border border-white/10 rounded-lg">
          {[
            { id: 'wave' as VisualizerMode, name: 'Silk Wave', icon: Waves },
            { id: 'earth_cosmos' as VisualizerMode, name: 'Earth Cosmos', icon: Globe },
            { id: 'starfield_warp' as VisualizerMode, name: 'Starfield Warp', icon: Sparkles },
            { id: 'sonic_radar' as VisualizerMode, name: 'Sonic Radar', icon: Radio },
            { id: 'vu_spectrum' as VisualizerMode, name: 'VU Spectrum', icon: Activity },
            { id: 'lyrics_synced' as VisualizerMode, name: 'Synced Lyrics', icon: FileText },
          ].map((m) => {
            const Icon = m.icon;
            const isSel = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  soundFx.playTick();
                  onModeChange(m.id);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded transition-all ${
                  isSel
                    ? 'bg-white text-black font-semibold shadow-[0_0_10px_rgba(255,255,255,0.8)]'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{m.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Center Stage: Either Canvas Visualizer or Synced Lyrics Display */}
      <div className="relative flex-1 flex items-center justify-center my-2 min-h-[280px]">
        {mode === 'lyrics_synced' ? (
          // Synced Karaoke Lyrics Display
          <div className="relative w-full h-[320px] flex flex-col items-center justify-between p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10">
            <div className="flex items-center justify-between w-full pb-2 border-b border-white/10 text-xs font-mono text-white/50">
              <span>LRCLIB API Sync · {lyricsData?.source === 'lrclib' ? 'Live Synced' : 'Atmospheric Stream'}</span>
              <button
                onClick={() => {
                  soundFx.playSelect();
                  setLyricsSearchQuery(`${currentTrack.artist} ${currentTrack.title}`);
                  setIsSearchLyricsOpen(true);
                }}
                className="flex items-center gap-1 text-white hover:text-white underline cursor-pointer"
              >
                <Search className="w-3 h-3" />
                <span>Search Lyrics</span>
              </button>
            </div>

            <div
              ref={lyricsContainerRef}
              className="flex-1 w-full overflow-y-auto py-8 space-y-4 text-center scroll-smooth"
            >
              {isLoadingLyrics ? (
                <div className="text-white/50 text-sm animate-pulse">
                  Fetching synchronized LRC lyrics from LRCLIB...
                </div>
              ) : lyricsData && lyricsData.lines.length > 0 ? (
                lyricsData.lines.map((line, idx) => {
                  const isActive = idx === activeLyricIndex;
                  return (
                    <div
                      key={idx}
                      data-lyric-idx={idx}
                      onClick={() => {
                        soundFx.playTick();
                        onSeek(line.time);
                      }}
                      className={`cursor-pointer transition-all duration-300 py-1 px-4 rounded-lg select-text ${
                        isActive
                          ? 'text-lg sm:text-2xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.95)] scale-105'
                          : 'text-sm sm:text-base text-white/40 hover:text-white/80'
                      }`}
                    >
                      {line.text}
                    </div>
                  );
                })
              ) : (
                <div className="text-white/40 text-sm">
                  No synchronized lyrics found.
                </div>
              )}
            </div>
          </div>
        ) : (
          // Canvas Visualizers (Earth, Warp, Wave, Radar, Spectrum)
          <>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center pointer-events-auto">
              <div className="relative group w-44 h-44 rounded-lg overflow-hidden border border-white/20 shadow-[0_0_35px_rgba(0,0,0,0.85)] transition-transform duration-300 hover:scale-105">
                <img
                  src={currentTrack.coverUrl}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                  <span className="text-[11px] font-mono text-white/90 truncate">
                    {currentTrack.format} · {currentTrack.sampleRate ? `${currentTrack.sampleRate / 1000}kHz` : '48kHz'}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Track Details & Playback Controls Bar */}
      <div className="relative z-10 flex flex-col gap-2.5 p-4 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide truncate drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]">
              {currentTrack.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-white/70">
              <span className="font-semibold text-white/90">{currentTrack.artist}</span>
              <span aria-hidden="true" className="text-white/30">·</span>
              <span className="truncate">{currentTrack.album}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-white/70 shrink-0">
            <span className="px-2 py-0.5 rounded bg-white/10 text-white/90 uppercase">
              {currentTrack.source}
            </span>
            <span className="text-white/50">
              {currentTrack.bitrate ? `${currentTrack.bitrate} kbps` : 'FLAC Master'}
            </span>
          </div>
        </div>

        {/* Progress Bar & Seek */}
        <div className="flex items-center gap-3 w-full font-mono text-xs text-white/60">
          <span className="w-10 text-right">{formatTime(currentTime)}</span>
          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickPos = (e.clientX - rect.left) / rect.width;
              onSeek(clickPos * duration);
            }}
            className="relative flex-1 h-1.5 bg-white/15 hover:bg-white/25 rounded-full cursor-pointer overflow-hidden transition-colors"
          >
            <div
              className="absolute left-0 top-0 bottom-0 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.9)]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="w-10">{formatTime(duration)}</span>
        </div>

        {/* Transport Controls */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={() => {
              soundFx.playTick();
              onPrev();
            }}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Previous Track (L1 / [)"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              soundFx.playSelect();
              onTogglePlay();
            }}
            className="p-3 bg-white text-black hover:bg-white/90 rounded-full shadow-[0_0_16px_rgba(255,255,255,0.6)] transition-transform active:scale-95"
            title="Play / Pause (Space / □)"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-black" />
            ) : (
              <Play className="w-5 h-5 fill-black ml-0.5" />
            )}
          </button>

          <button
            onClick={() => {
              soundFx.playTick();
              onNext();
            }}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            title="Next Track (R1 / ])"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Manual LRCLIB Lyrics Search Modal */}
      {isSearchLyricsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="relative flex flex-col w-full max-w-lg bg-slate-950 border border-white/20 rounded-xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-sans">
                Search LRCLIB Lyrics Database
              </h3>
              <button
                onClick={() => setIsSearchLyricsOpen(false)}
                className="p-1 text-white/50 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={lyricsSearchQuery}
                onChange={(e) => setLyricsSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchLyrics()}
                placeholder="Artist and song title..."
                className="flex-1 px-3 py-2 bg-black/60 border border-white/20 rounded text-sm text-white focus:outline-none focus:border-white"
              />
              <button
                onClick={handleSearchLyrics}
                className="px-4 py-2 bg-white text-black font-semibold text-xs rounded hover:bg-white/90"
              >
                Search
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {lyricsSearchResults.map((res, i) => (
                <div
                  key={i}
                  onClick={() => {
                    soundFx.playSelect();
                    setLyricsData(res);
                    setIsSearchLyricsOpen(false);
                  }}
                  className="p-2.5 rounded bg-white/5 hover:bg-white/15 cursor-pointer text-left transition-colors flex items-center justify-between"
                >
                  <div>
                    <h5 className="text-xs font-bold text-white">{res.trackName}</h5>
                    <p className="text-[11px] text-white/60">{res.artistName} · {res.albumName}</p>
                  </div>
                  {res.syncedLyrics && (
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-400/30">
                      SYNCED
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
