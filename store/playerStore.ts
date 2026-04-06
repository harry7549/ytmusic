import { create } from 'zustand';

export type RepeatMode = 'none' | 'one';

export interface Track {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: string;
}

interface PlayerState {
  queue: Track[];
  currentIndex: number;
  shuffle: boolean;
  repeat: RepeatMode;
  isLoading: boolean;
  streamUrl: string | null;

  setQueue: (tracks: Track[], startIndex?: number) => void;
  setCurrentIndex: (i: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setLoading: (v: boolean) => void;
  setStreamUrl: (url: string | null) => void;
  skipNext: () => void;
  skipPrevious: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: -1,
  shuffle: false,
  repeat: 'none',
  isLoading: false,
  streamUrl: null,

  setQueue: (tracks, startIndex = 0) =>
    set({ queue: tracks, currentIndex: startIndex, streamUrl: null }),

  setCurrentIndex: (i) => set({ currentIndex: i, streamUrl: null }),

  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),

  toggleRepeat: () =>
    set((s) => ({ repeat: s.repeat === 'none' ? 'one' : 'none' })),

  setLoading: (v) => set({ isLoading: v }),

  setStreamUrl: (url) => set({ streamUrl: url }),

  skipNext: () => {
    const { queue, currentIndex, shuffle } = get();
    if (!queue.length) return;
    let next: number;
    if (shuffle) {
      do { next = Math.floor(Math.random() * queue.length); }
      while (queue.length > 1 && next === currentIndex);
    } else {
      next = (currentIndex + 1) % queue.length;
    }
    set({ currentIndex: next, streamUrl: null });
  },

  skipPrevious: () => {
    const { queue, currentIndex } = get();
    if (!queue.length) return;
    const prev = (currentIndex - 1 + queue.length) % queue.length;
    set({ currentIndex: prev, streamUrl: null });
  },
}));
