import { create } from 'zustand';

export type RepeatMode = 'none' | 'one';
export type StreamMode = 'audio' | 'video';
export type AudioQuality = 'best' | 'medium' | 'low';
export type VideoQuality = 'best' | '1080' | '720' | '480' | '360';

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
  streamMode: StreamMode;
  audioQuality: AudioQuality;
  videoQuality: VideoQuality;

  setQueue: (tracks: Track[], startIndex?: number) => void;
  setCurrentIndex: (i: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setLoading: (v: boolean) => void;
  setStreamUrl: (url: string | null) => void;
  setStreamMode: (m: StreamMode) => void;
  setAudioQuality: (q: AudioQuality) => void;
  setVideoQuality: (q: VideoQuality) => void;
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
  streamMode: 'audio',
  audioQuality: 'best',
  videoQuality: 'best',

  setQueue: (tracks, startIndex = 0) =>
    set({ queue: tracks, currentIndex: startIndex, streamUrl: null }),

  setCurrentIndex: (i) => set({ currentIndex: i, streamUrl: null }),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  toggleRepeat: () => set((s) => ({ repeat: s.repeat === 'none' ? 'one' : 'none' })),
  setLoading: (v) => set({ isLoading: v }),
  setStreamUrl: (url) => set({ streamUrl: url }),
  setStreamMode: (m) => set({ streamMode: m, streamUrl: null }),
  setAudioQuality: (q) => set({ audioQuality: q, streamUrl: null }),
  setVideoQuality: (q) => set({ videoQuality: q, streamUrl: null }),

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
    set({ currentIndex: (currentIndex - 1 + queue.length) % queue.length, streamUrl: null });
  },
}));
