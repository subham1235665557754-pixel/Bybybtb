import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  ArrowLeft,
  RotateCcw,
  RotateCw,
  Check,
  ListVideo,
} from 'lucide-react';
import { FileDetail, FolderItem } from '../types.ts';
import { playTapSound, playOpenSound, playBackSound } from '../utils/sound.ts';

interface VideoPlayerProps {
  file: FileDetail;
  onBack: () => void;
  playlist?: FolderItem[];
  currentBatchId: number | string;
  onSelectPlaylistItem?: (item: FolderItem) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  file,
  onBack,
  playlist = [],
  currentBatchId,
  onSelectPlaylistItem,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState<boolean>(false);
  const [showPlaylistDrawer, setShowPlaylistDrawer] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Format seconds into HH:MM:SS or MM:SS
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Video progress persistence key
  const storageKey = `progress_${currentBatchId}_${file.id}`;

  // Safe play helper to avoid "play() interrupted by pause()" or unmount error
  const safePlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !isMountedRef.current) return;
    try {
      const promise = video.play();
      playPromiseRef.current = promise;
      await promise;
      if (isMountedRef.current) {
        setIsPlaying(true);
      }
    } catch (err: any) {
      // AbortError is normal when play request is superseded by pause or unmount
      if (err && err.name !== 'AbortError' && !err.message?.includes('interrupted')) {
        console.warn('Playback prevented by browser policy:', err);
      }
      if (isMountedRef.current) {
        setIsPlaying(false);
      }
    } finally {
      playPromiseRef.current = null;
    }
  }, []);

  // Safe pause helper
  const safePause = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    if (playPromiseRef.current) {
      try {
        await playPromiseRef.current;
      } catch {
        // Ignore play rejection
      }
    }
    if (video && !video.paused) {
      video.pause();
    }
    if (isMountedRef.current) {
      setIsPlaying(false);
    }
  }, []);

  // Initialize HLS Stream
  useEffect(() => {
    isMountedRef.current = true;
    const video = videoRef.current;
    if (!video || !file.file_url) return;

    setIsLoading(true);
    setErrorMsg(null);

    // If an existing play promise is pending, attach a dummy catch handler
    if (playPromiseRef.current) {
      playPromiseRef.current.catch(() => {});
    }

    // Destroy existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = file.file_url;

    if (Hls.isSupported() && streamUrl.includes('.m3u8')) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 60,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!isMountedRef.current) return;
        setIsLoading(false);
        // Restore progress if available
        const savedTime = localStorage.getItem(storageKey);
        if (savedTime && parseFloat(savedTime) > 10) {
          video.currentTime = parseFloat(savedTime);
        }
        safePlay();
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (!isMountedRef.current) return;
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('HLS Network Error, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('HLS Media Error, recovering media...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal HLS error, cannot recover:', data);
              setErrorMsg('Unable to play this video stream directly. Checking fallback...');
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple / Safari HLS support
      video.src = streamUrl;
      const onLoadedMetadata = () => {
        if (!isMountedRef.current) return;
        setIsLoading(false);
        const savedTime = localStorage.getItem(storageKey);
        if (savedTime && parseFloat(savedTime) > 10) {
          video.currentTime = parseFloat(savedTime);
        }
        safePlay();
      };
      video.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
    } else {
      // Fallback regular video file
      video.src = streamUrl;
      setIsLoading(false);
    }

    return () => {
      isMountedRef.current = false;
      if (playPromiseRef.current) {
        playPromiseRef.current
          .then(() => {
            if (video) video.pause();
          })
          .catch(() => {});
      } else if (video && !video.paused) {
        video.pause();
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [file.file_url, storageKey, safePlay]);

  // Handle Play/Pause
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      safePlay();
    } else {
      safePause();
    }
  }, [safePlay, safePause]);

  // Update time and save progress
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.currentTime % 5 < 1) {
      localStorage.setItem(storageKey, String(video.currentTime));
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
  };

  // Scrub seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const seekTime = parseFloat(e.target.value);
    video.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  // Jump forward / backward 10s
  const jumpTime = (delta: number) => {
    playTapSound();
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(0, video.currentTime + delta), duration || 999999);
  };

  // Volume control
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    setIsMuted(newVol === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
      videoRef.current.muted = newVol === 0;
    }
  };

  const toggleMute = () => {
    playTapSound();
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      video.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  // Playback speed
  const changeSpeed = (rate: number) => {
    playTapSound();
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
    setShowSpeedMenu(false);
  };

  // Fullscreen
  const toggleFullscreen = () => {
    playTapSound();
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  // Listen for fullscreen change
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Controls auto-hide on inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
      }, 3000);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea'].includes((e.target as HTMLElement).tagName.toLowerCase())) return;

      if (e.code === 'Space' || e.key === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight' || e.key === 'l') {
        e.preventDefault();
        jumpTime(10);
      } else if (e.key === 'ArrowLeft' || e.key === 'j') {
        e.preventDefault();
        jumpTime(-10);
      } else if (e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, duration]);

  // Sibling video lectures for playlist drawer
  const videoLectures = playlist.filter((p) => p.type === 'file' && p.data?.file_type === 2);
  const currentIndex = videoLectures.findIndex((v) => v.entity_id === file.id);
  const nextLecture = currentIndex !== -1 && currentIndex < videoLectures.length - 1
    ? videoLectures[currentIndex + 1]
    : null;

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col pb-16">
      {/* Top Video Player Container */}
      <div className="w-full bg-black">
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => isPlaying && setShowControls(false)}
          className="relative max-w-6xl mx-auto aspect-video bg-black select-none overflow-hidden group shadow-2xl"
        >
          {/* Back button over video (Screenshot 110957) */}
          <button
            onClick={() => {
              playBackSound();
              onBack();
            }}
            className={`absolute top-4 left-4 z-40 flex items-center gap-2 bg-black/60 hover:bg-black/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 text-xs sm:text-sm font-semibold transition-all shadow-lg ${
              showControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
            }`}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {/* Video Element */}
          <video
            ref={videoRef}
            onClick={togglePlay}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onWaiting={() => setIsLoading(true)}
            onPlaying={() => setIsLoading(false)}
            playsInline
            className="w-full h-full object-contain cursor-pointer"
          />

          {/* Loading Spinner */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-20">
              <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
            </div>
          )}

          {/* Center Play/Pause Overlay indicator when paused */}
          {!isPlaying && !isLoading && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors z-20 focus:outline-none cursor-pointer"
              aria-label="Play Video"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-110 transition-transform">
                <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white text-white ml-1" />
              </div>
            </button>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
              <p className="text-red-400 font-semibold mb-3">{errorMsg}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm"
              >
                Reload Player
              </button>
            </div>
          )}

          {/* Video Bottom Overlay Controls (Screenshot 110957) */}
          <div
            className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95 via-black/60 to-transparent pt-12 pb-3 px-4 sm:px-6 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Seek Bar & Progress */}
            <div className="relative flex items-center group/bar mb-2">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all"
                style={{
                  background: `linear-gradient(to right, #3b82f6 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.2) ${(currentTime / (duration || 1)) * 100}%)`,
                }}
              />
            </div>

            {/* Time Stamp Display */}
            <div className="flex items-center justify-between text-[11px] sm:text-xs font-mono tabular-nums text-neutral-400 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-white font-bold">{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>
              {playbackRate !== 1 && (
                <span className="bg-blue-600/30 border border-blue-500/30 text-blue-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  {playbackRate}x Speed
                </span>
              )}
            </div>

            {/* Control Bar Actions */}
            <div className="flex items-center justify-between">
              {/* Left: Play/Pause, Rewind, Fast Forward, Volume */}
              <div className="flex items-center gap-3 sm:gap-5">
                <button
                  onClick={togglePlay}
                  className="hover:scale-110 text-white hover:text-blue-400 transition-all p-1"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 fill-current" />
                  ) : (
                    <Play className="w-6 h-6 fill-current" />
                  )}
                </button>

                {/* Rewind 10s */}
                <button
                  onClick={() => jumpTime(-10)}
                  title="Rewind 10s"
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                {/* Fast-forward 10s */}
                <button
                  onClick={() => jumpTime(10)}
                  title="Forward 10s"
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  <RotateCw className="w-5 h-5" />
                </button>

                {/* Volume & Slider */}
                <div className="flex items-center gap-2 group/vol">
                  <button
                    onClick={toggleMute}
                    className="text-neutral-400 hover:text-white transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 sm:w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white"
                  />
                </div>
              </div>

              {/* Right: Playlist toggle, Speed dropdown, Fullscreen */}
              <div className="flex items-center gap-3 sm:gap-5 relative">
                {/* Playlist button */}
                {videoLectures.length > 1 && (
                  <button
                    onClick={() => setShowPlaylistDrawer(!showPlaylistDrawer)}
                    title="Lectures Playlist"
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      showPlaylistDrawer
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/10 hover:bg-white/20 text-neutral-300'
                    }`}
                  >
                    <ListVideo className="w-4 h-4" />
                    <span className="hidden sm:inline">Playlist ({videoLectures.length})</span>
                  </button>
                )}

                {/* Speed Settings Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="flex items-center gap-1 text-neutral-300 hover:text-white transition-colors text-xs font-bold px-2 py-1 rounded-lg hover:bg-white/10"
                    title="Playback Speed"
                  >
                    <Settings className="w-4 h-4" />
                    <span>{playbackRate}x</span>
                  </button>

                  {/* Speed Popup */}
                  {showSpeedMenu && (
                    <div className="absolute right-0 bottom-full mb-2 bg-[#121217] border border-white/15 rounded-xl p-1.5 shadow-2xl flex flex-col gap-0.5 min-w-[100px] z-50">
                      <div className="text-[10px] uppercase font-bold text-neutral-500 px-2 py-1">
                        Speed
                      </div>
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => changeSpeed(rate)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors ${
                            playbackRate === rate
                              ? 'bg-blue-600 text-white'
                              : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span>{rate}x</span>
                          {playbackRate === rate && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fullscreen Button */}
                <button
                  onClick={toggleFullscreen}
                  className="text-neutral-400 hover:text-white transition-colors"
                  aria-label="Fullscreen"
                >
                  {isFullscreen ? (
                    <Minimize className="w-5 h-5" />
                  ) : (
                    <Maximize className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Information Header (Exact match to Screenshot 110957) */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              {file.title}
            </h1>
            <div className="flex items-center gap-3 mt-3">
              <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold tracking-wider uppercase rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                PREMIUM STREAM
              </span>
              <span className="text-xs text-neutral-500 font-medium">
                Live CloudFront HLS
              </span>
            </div>
          </div>

          {/* Up Next CTA if next lecture available */}
          {nextLecture && onSelectPlaylistItem && (
            <button
              onClick={() => onSelectPlaylistItem(nextLecture)}
              className="flex items-center gap-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl px-4 py-2.5 transition-all text-left group"
            >
              <div className="flex flex-col">
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                  Up Next
                </span>
                <span className="text-xs sm:text-sm font-bold text-white line-clamp-1 max-w-[200px]">
                  {nextLecture.title}
                </span>
              </div>
              <Play className="w-4 h-4 fill-white text-white group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>

        {/* Description or details if present */}
        {file.description && (
          <div
            className="mt-6 p-5 bg-white/5 border border-white/5 rounded-2xl text-neutral-300 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: file.description }}
          />
        )}

        {/* Playlist Grid / Chapter Lectures (Screenshot 110945 / 110957) */}
        {videoLectures.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ListVideo className="w-5 h-5 text-blue-400" />
              Lectures in this Topic ({videoLectures.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {videoLectures.map((lec) => {
                const isCurrent = lec.entity_id === file.id;
                return (
                  <button
                    key={lec.entity_id}
                    onClick={() => onSelectPlaylistItem?.(lec)}
                    className={`flex items-center gap-3.5 p-3 rounded-2xl border text-left transition-all ${
                      isCurrent
                        ? 'bg-blue-600/20 border-blue-500/50 text-white shadow-lg shadow-blue-500/10'
                        : 'bg-[#0c0c0f] border-white/5 hover:border-white/20 text-neutral-300 hover:text-white'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/5 text-neutral-400'
                      }`}
                    >
                      <Play className="w-5 h-5 fill-current" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold truncate">
                        {lec.title}
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {isCurrent ? 'Now Playing' : 'Video Lecture'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
