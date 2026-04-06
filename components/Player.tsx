'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore, AudioQuality, VideoQuality } from '@/store/playerStore';

export default function Player() {
  const {
    queue, currentIndex, shuffle, repeat,
    isLoading, streamUrl, streamMode, audioQuality, videoQuality,
    setStreamUrl, setLoading,
    toggleShuffle, toggleRepeat,
    skipNext, skipPrevious,
    setStreamMode, setAudioQuality, setVideoQuality,
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showQuality, setShowQuality] = useState(false);
  const [videoExpanded, setVideoExpanded] = useState(false);

  const track = currentIndex >= 0 ? queue[currentIndex] : null;
  const quality = streamMode === 'audio' ? audioQuality : videoQuality;

  // Fetch stream when track/mode/quality changes
  useEffect(() => {
    if (!track) return;
    setLoading(true);
    setStreamUrl(null);
    setProgress(0);
    setDuration(0);
    setPlaying(false);
    const q = streamMode === 'audio' ? audioQuality : videoQuality;
    fetch(`/api/stream?id=${track.id}&mode=${streamMode}&quality=${q}`)
      .then((r) => r.json())
      .then((data) => { if (data.url) setStreamUrl(data.url); })
      .finally(() => setLoading(false));
  }, [track?.id, streamMode, audioQuality, videoQuality]);

  // Load into the right media element
  useEffect(() => {
    if (!streamUrl) return;
    const el = streamMode === 'video' ? videoRef.current : audioRef.current;
    if (!el) return;
    el.src = streamUrl;
    el.play().then(() => setPlaying(true)).catch(() => {});
  }, [streamUrl, streamMode]);

  const activeEl = () => streamMode === 'video' ? videoRef.current : audioRef.current;

  const handleEnded = useCallback(() => {
    if (repeat === 'one') activeEl()?.play();
    else skipNext();
  }, [repeat, skipNext, streamMode]);

  const togglePlay = () => {
    const el = activeEl();
    if (!el) return;
    if (el.paused) { el.play(); setPlaying(true); }
    else { el.pause(); setPlaying(false); }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = activeEl();
    if (!el) return;
    el.currentTime = Number(e.target.value);
    setProgress(Number(e.target.value));
  };

  const onTimeUpdate = () => setProgress(activeEl()?.currentTime ?? 0);
  const onDurationChange = () => setDuration(activeEl()?.duration ?? 0);

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  if (!track) return null;

  const audioQualities: { value: AudioQuality; label: string }[] = [
    { value: 'best',   label: 'Best quality' },
    { value: 'medium', label: 'Medium (~128kbps)' },
    { value: 'low',    label: 'Low (~64kbps)' },
  ];
  const videoQualities: { value: VideoQuality; label: string }[] = [
    { value: 'best', label: 'Best available' },
    { value: '1080', label: '1080p Full HD' },
    { value: '720',  label: '720p HD' },
    { value: '480',  label: '480p' },
    { value: '360',  label: '360p' },
  ];

  return (
    <>
      {/* Hidden audio element always present */}
      <audio
        ref={audioRef}
        onTimeUpdate={streamMode === 'audio' ? onTimeUpdate : undefined}
        onDurationChange={streamMode === 'audio' ? onDurationChange : undefined}
        onEnded={streamMode === 'audio' ? handleEnded : undefined}
        onPlay={() => streamMode === 'audio' && setPlaying(true)}
        onPause={() => streamMode === 'audio' && setPlaying(false)}
      />

      {/* Floating video player */}
      {streamMode === 'video' && streamUrl && (
        <div className={`fixed z-40 bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 transition-all
          ${videoExpanded
            ? 'inset-4 bottom-24'
            : 'bottom-24 right-4 w-72 h-40'}`}>
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            onTimeUpdate={onTimeUpdate}
            onDurationChange={onDurationChange}
            onEnded={handleEnded}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            controls={false}
          />
          <button
            onClick={() => setVideoExpanded((v) => !v)}
            className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white hover:bg-black/80 transition"
          >
            {videoExpanded ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Bottom player bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div className="h-0.5 bg-[#282828]">
          <div className="h-full bg-[#1DB954] transition-all"
            style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }} />
        </div>

        <div className="bg-[#0f0f0f]/95 backdrop-blur-xl border-t border-white/5 px-4 py-3 flex items-center gap-4">

          {/* Track info */}
          <div className="flex items-center gap-3 w-56 shrink-0 min-w-0">
            <div className="relative shrink-0">
              <img src={track.thumbnail} alt={track.title}
                className={`w-12 h-12 rounded-lg object-cover transition-all duration-300
                  ${playing ? 'shadow-lg shadow-[#1DB954]/30' : ''}`}
              />
              {playing && <div className="absolute inset-0 rounded-lg ring-1 ring-[#1DB954]/40 animate-pulse" />}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-sm font-medium truncate leading-tight">{track.title}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">{track.author}</p>
            </div>
          </div>

          {/* Center controls */}
          <div className="flex flex-col items-center flex-1 gap-2 min-w-0">
            <div className="flex items-center gap-5">
              {/* Shuffle */}
              <button onClick={toggleShuffle} title="Shuffle"
                className={`transition-all hover:scale-110 ${shuffle ? 'text-[#1DB954]' : 'text-gray-500 hover:text-white'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
                </svg>
              </button>

              {/* Prev */}
              <button onClick={skipPrevious} className="text-gray-400 hover:text-white transition hover:scale-110">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>

              {/* Play/Pause */}
              <button onClick={togglePlay} disabled={isLoading}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black
                  hover:scale-105 transition-all active:scale-95 disabled:opacity-40 shrink-0">
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : playing ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{marginLeft:'2px'}}>
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </button>

              {/* Next */}
              <button onClick={skipNext} className="text-gray-400 hover:text-white transition hover:scale-110">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                </svg>
              </button>

              {/* Repeat */}
              <button onClick={toggleRepeat} title="Repeat one"
                className={`transition-all hover:scale-110 ${repeat === 'one' ? 'text-[#1DB954]' : 'text-gray-500 hover:text-white'}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
                </svg>
              </button>
            </div>

            {/* Seek bar */}
            <div className="flex items-center gap-2 w-full max-w-md">
              <span className="text-xs text-gray-600 w-8 text-right tabular-nums">{fmt(progress)}</span>
              <input type="range" min={0} max={duration || 1} value={progress}
                onChange={seek} className="flex-1" />
              <span className="text-xs text-gray-600 w-8 tabular-nums">{fmt(duration)}</span>
            </div>
          </div>

          {/* Right side: mode toggle + quality + volume */}
          <div className="shrink-0 flex items-center gap-3">

            {/* Audio / Video toggle */}
            <div className="flex items-center bg-[#1a1a1a] rounded-full p-0.5 border border-white/10">
              <button
                onClick={() => setStreamMode('audio')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                  ${streamMode === 'audio' ? 'bg-[#1DB954] text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
                Audio
              </button>
              <button
                onClick={() => setStreamMode('video')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
                  ${streamMode === 'video' ? 'bg-[#1DB954] text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                </svg>
                Video
              </button>
            </div>

            {/* Quality picker */}
            <div className="relative">
              <button
                onClick={() => setShowQuality((v) => !v)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition
                  bg-[#1a1a1a] border border-white/10 rounded-full px-3 py-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                </svg>
                {quality === 'best' ? 'Best' : streamMode === 'video' ? `${quality}p` : quality}
              </button>

              {showQuality && (
                <div className="absolute bottom-10 right-0 bg-[#1a1a1a] border border-white/10 rounded-xl
                  overflow-hidden shadow-xl z-50 min-w-40">
                  <p className="text-xs text-gray-600 px-3 pt-2 pb-1 uppercase tracking-widest">
                    {streamMode === 'audio' ? 'Audio Quality' : 'Video Quality'}
                  </p>
                  {(streamMode === 'audio' ? audioQualities : videoQualities).map((opt) => {
                    const isSelected = streamMode === 'audio'
                      ? audioQuality === opt.value
                      : videoQuality === opt.value;
                    return (
                      <button key={opt.value}
                        onClick={() => {
                          if (streamMode === 'audio') setAudioQuality(opt.value as AudioQuality);
                          else setVideoQuality(opt.value as VideoQuality);
                          setShowQuality(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition hover:bg-white/5
                          ${isSelected ? 'text-[#1DB954]' : 'text-gray-300'}`}
                      >
                        {isSelected && <span className="mr-2">✓</span>}{opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Volume */}
            <div className="hidden md:flex items-center gap-2 w-24">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#555">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
              </svg>
              <input type="range" min={0} max={100} defaultValue={80}
                onChange={(e) => {
                  const v = Number(e.target.value) / 100;
                  if (audioRef.current) audioRef.current.volume = v;
                  if (videoRef.current) videoRef.current.volume = v;
                }}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
