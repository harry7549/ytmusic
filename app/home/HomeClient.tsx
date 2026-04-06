'use client';
import { useState, useRef, useCallback } from 'react';
import { usePlayerStore, Track } from '@/store/playerStore';
import Player from '@/components/Player';

export default function HomeClient() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [currentQuery, setCurrentQuery] = useState('');
  const { setQueue, currentIndex, queue } = usePlayerStore();

  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMoreRef.current?.();
    }, { threshold: 0.1 });
    observerRef.current.observe(node);
  }, []);

  // Use a ref so the observer closure always has the latest loadMore
  const loadMoreRef = useRef<(() => void) | null>(null);

  const fetchPage = async (q: string, p: number) => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&page=${p}`);
    const data = await res.json();
    return { items: (data.results ?? []) as Track[], hasMore: data.hasMore ?? false };
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    setHasMore(false);
    const q = query;
    setCurrentQuery(q);
    const { items, hasMore: more } = await fetchPage(q, 1);
    setResults(items);
    setHasMore(more);
    setPage(2);
    setSearching(false);
  };

  const loadMore = useCallback(async () => {
    if (!currentQuery || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const { items, hasMore: more } = await fetchPage(currentQuery, page);
    setResults((prev) => {
      const ids = new Set(prev.map((t) => t.id));
      return [...prev, ...items.filter((t) => !ids.has(t.id))];
    });
    setHasMore(more);
    setPage((p) => p + 1);
    setLoadingMore(false);
  }, [currentQuery, page, loadingMore, hasMore]);

  loadMoreRef.current = loadMore;

  const currentTrack = currentIndex >= 0 ? queue[currentIndex] : null;

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white">

      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center gap-4 px-6 py-4
        bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2 mr-4 shrink-0">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#1DB954">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
          </svg>
          <span className="text-lg font-bold tracking-tight">YTMusic</span>
        </div>

        <form onSubmit={search} className="flex-1 max-w-xl flex items-center gap-2
          bg-[#1a1a1a] border border-white/10 rounded-full px-4 py-2
          focus-within:border-[#1DB954]/60 transition-colors">
          <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text" value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums..."
            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-600"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')}
              className="text-gray-600 hover:text-white transition text-xs">✕</button>
          )}
        </form>

        <button onClick={search as any}
          className="bg-[#1DB954] hover:bg-[#1ed760] text-black text-sm font-semibold
            px-5 py-2 rounded-full transition-all active:scale-95 shrink-0">
          Search
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-6 pb-36">
        {searching ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="flex gap-1 items-end h-8">
              <div className="w-1 bg-[#1DB954] rounded-full bar1" style={{height:'60%'}}/>
              <div className="w-1 bg-[#1DB954] rounded-full bar2" style={{height:'100%'}}/>
              <div className="w-1 bg-[#1DB954] rounded-full bar3" style={{height:'40%'}}/>
            </div>
            <p className="text-gray-500 text-sm">Searching...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3 text-center">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <p className="text-gray-600 text-sm">Search for your favorite songs or artists</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-600 mb-4 uppercase tracking-widest">
              {results.length} results
            </p>
            <ul className="space-y-1">
              {results.map((track, i) => {
                const isActive = currentTrack?.id === track.id;
                return (
                  <li key={track.id} onClick={() => setQueue(results, i)}
                    className={`group flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all
                      ${isActive
                        ? 'bg-[#1DB954]/10 border border-[#1DB954]/20'
                        : 'hover:bg-white/5 border border-transparent'}`}
                  >
                    <div className="w-6 text-center shrink-0">
                      {isActive ? (
                        <div className="flex gap-0.5 items-end h-4 justify-center">
                          <div className="w-0.5 bg-[#1DB954] rounded-full bar1" style={{height:'60%'}}/>
                          <div className="w-0.5 bg-[#1DB954] rounded-full bar2" style={{height:'100%'}}/>
                          <div className="w-0.5 bg-[#1DB954] rounded-full bar3" style={{height:'40%'}}/>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs text-gray-600 group-hover:hidden">{i + 1}</span>
                          <svg className="w-4 h-4 text-white hidden group-hover:block mx-auto"
                            fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </>
                      )}
                    </div>
                    <img src={track.thumbnail} alt={track.title}
                      className={`w-12 h-12 rounded-lg object-cover shrink-0
                        ${isActive ? 'shadow-lg shadow-[#1DB954]/20' : ''}`}
                    />
                    <div className="overflow-hidden flex-1 min-w-0">
                      <p className={`font-medium truncate text-sm leading-tight
                        ${isActive ? 'text-[#1DB954]' : 'text-white'}`}>
                        {track.title}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{track.author}</p>
                    </div>
                    <span className="text-xs text-gray-600 shrink-0 tabular-nums">{track.duration}</span>
                  </li>
                );
              })}
            </ul>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="py-8 flex justify-center">
              {loadingMore && (
                <div className="flex gap-1 items-end h-6">
                  <div className="w-1 bg-[#1DB954] rounded-full bar1" style={{height:'60%'}}/>
                  <div className="w-1 bg-[#1DB954] rounded-full bar2" style={{height:'100%'}}/>
                  <div className="w-1 bg-[#1DB954] rounded-full bar3" style={{height:'40%'}}/>
                </div>
              )}
              {!hasMore && !loadingMore && (
                <p className="text-xs text-gray-700">— end of results —</p>
              )}
            </div>
          </>
        )}
      </main>

      <Player />
    </div>
  );
}
