'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '@/store/playerStore';

export default function Player() {
  const {
    queue, currentIndex, shuffle, repeat,
    isLoading, streamUrl,
    setStreamUrl, setLoading,
    toggleShuffle, toggleRepeat,
    skipNext, skipPrevious,
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const track = currentIndex >= 0 ? queue[currentIndex] : null;

  useEffect(() => {
    if (!track) return;
    setLoading(true);
    setStreamUrl(null);
    setProgress(0);
    setDuration(0);
    fetch(`/api/stream?id=${track.id}`)
      .then((r) => r.json())
      .then((data) => { if (data.url) setStreamUrl(data.url); })
      .finally(() => setLoading(false));
  }, [track?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !streamUrl) return;
    audio.src = streamUrl;
    audio.play().then(() => setPlaying(true)).catch(() => {});
  }, [streamUrl]);

  // Update CSS variable for progress track fill
  useEffect(() => {
    const pct = duration ? (progress / duration) * 100 : 0;
    document.documentElement.style.setProperty('--progress', `${pct}%`);
  }, [progress, duration]);

  const handleEnded = useCallback(() => {
    if (repeat === 'one') audioRef.current?.play();
    else skipNext();
  }, [repeat, skipNext]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) { audio.play(); setPlaying(true); }
    else { audio.pause(); setPlaying(false); }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(e.target.value);
    setProgress(Number(e.target.value));
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  if (!track) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Progress bar — sits on top edge */}
      <div className="h-0.5 bg-[#282828]">
        <div
          className="h-full bg-[#1DB954] transition-all"
          style={{ width: duration ? `${(progress / duration) * 100}%` : '0%' }}
        />
      </div>

      <div className="bg-[#0f0f0f]/95 backdrop-blur-xl border-t border-white/5
        px-4 py-3 flex items-center gap-4">

        <audio
          ref={audioRef}
          onTimeUpdate={() => setProgress(audioRef.current?.currentTime ?? 0)}
          onDurationChange={() => setDuration(audioRef.current?.duration ?? 0)}
          onEnded={handleEnded}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />

        {/* Track info */}
        <div className="flex items-center gap-3 w-56 shrink-0 min-w-0">
          <div className="relative shrink-0">
            <img
              src={track.thumbnail}
              alt={track.title}
              className={`w-12 h-12 rounded-lg object-cover transition-all duration-300
                ${playing ? 'shadow-lg shadow-[#1DB954]/30' : ''}`}
            />
            {playing && (
              <div className="absolute inset-0 rounded-lg ring-1 ring-[#1DB954]/40 animate-pulse" />
            )}
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
            <button onClick={skipPrevious}
              className="text-gray-400 hover:text-white transition hover:scale-110">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            {/* Play/Pause */}
            <button onClick={togglePlay} disabled={isLoading}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center
                text-black hover:scale-105 transition-all active:scale-95 disabled:opacity-40 shrink-0">
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
            <button onClick={skipNext}
              className="text-gray-400 hover:text-white transition hover:scale-110">
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
            <input
              type="range" min={0} max={duration || 1} value={progress}
              onChange={seek}
              className="flex-1"
            />
            <span className="text-xs text-gray-600 w-8 tabular-nums">{fmt(duration)}</span>
          </div>
        </div>

        {/* Volume (decorative placeholder) */}
        <div className="w-32 shrink-0 hidden md:flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#666">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
          </svg>
          <input type="range" min={0} max={100} defaultValue={80}
            onChange={(e) => { if (audioRef.current) audioRef.current.volume = Number(e.target.value) / 100; }}
            className="flex-1"
          />
        </div>
      </div>
    </div>
  );
}
