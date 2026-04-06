# YTMusic — How It Works

A Spotify-inspired music (and video) streaming web app built with Next.js 14, powered entirely by YouTube via `yt-dlp`. No API keys. No ads. No login required.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| State | Zustand |
| Stream extraction | yt-dlp (CLI, server-side) |
| Search | yt-dlp (ytsearch) |
| Runtime | Node.js (server) + Browser (client) |

---

## Architecture Overview

```
Browser (React)
    │
    ├── /home          → HomeClient.tsx   (search UI + results list)
    └── Player.tsx     (fixed bottom bar, audio/video playback)
            │
            ▼
    Next.js API Routes (server-side)
            │
            ├── /api/search?q=...&page=...   → runs yt-dlp ytsearch
            └── /api/stream?id=...&mode=...&quality=...  → runs yt-dlp --get-url
                        │
                        ▼
                    YouTube servers
                    (raw stream URL, no ads)
```

---

## How Ad Blocking Works

YouTube ads are injected at the player level — they're part of the YouTube web/app player, not the raw video stream. `yt-dlp` bypasses the player entirely and extracts the direct CDN stream URL from YouTube's internal API (`/youtubei/v1/player`). The browser then plays this URL directly via `<audio>` or `<video>` tags — no YouTube player, no ad injection possible.

This is the same principle Brave uses: block at the source, not with a filter list.

---

## Search — `/api/search`

**File:** `app/api/search/route.ts`

Uses `yt-dlp`'s built-in `ytsearch` prefix to search YouTube without an API key.

```
yt-dlp "ytsearch40:your query" --dump-json --flat-playlist --no-warnings \
  --playlist-start 1 --playlist-end 20
```

- `--dump-json` returns one JSON object per line (newline-delimited)
- `--flat-playlist` skips downloading, just metadata
- `--playlist-start / --playlist-end` enables pagination

### Pagination (Infinite Scroll)

The API accepts a `page` query param. Each page fetches 20 results:

- Page 1: `--playlist-start 1 --playlist-end 20`
- Page 2: `--playlist-start 21 --playlist-end 40`
- Page N: `--playlist-start (N-1)*20+1 --playlist-end N*20`

The response includes `hasMore: true/false` based on whether a full page was returned.

On the frontend (`HomeClient.tsx`), an `IntersectionObserver` watches a sentinel `<div>` at the bottom of the results list. When it enters the viewport, `loadMore()` is called automatically — no button needed.

Results are deduplicated by video ID before appending to prevent duplicates across pages.

---

## Stream Extraction — `/api/stream`

**File:** `app/api/stream/route.ts`

Accepts three query params:

| Param | Values | Default |
|---|---|---|
| `id` | YouTube video ID | required |
| `mode` | `audio` \| `video` | `audio` |
| `quality` | see below | `best` |

### Audio Quality Options

| Value | yt-dlp format selector |
|---|---|
| `best` | `bestaudio[ext=webm]/bestaudio` |
| `medium` | `bestaudio[abr<=128]/bestaudio` |
| `low` | `bestaudio[abr<=64]/bestaudio` |

### Video Quality Options

| Value | yt-dlp format selector |
|---|---|
| `best` | `bestvideo+bestaudio/best` |
| `1080` | `bestvideo[height<=1080]+bestaudio/best[height<=1080]` |
| `720` | `bestvideo[height<=720]+bestaudio/best[height<=720]` |
| `480` | `bestvideo[height<=480]+bestaudio/best[height<=480]` |
| `360` | `bestvideo[height<=360]+bestaudio/best[height<=360]` |

The `--get-url` flag makes yt-dlp print the direct CDN URL instead of downloading. This URL is returned to the browser, which plays it natively.

> Note: Video+audio merged formats may return two URLs (video stream + audio stream). The API takes the first line, which is the video stream. For best results, `best` quality uses a pre-merged format.

---

## Player — `components/Player.tsx`

The player is a fixed bottom bar that persists across the entire app.

### State (Zustand — `store/playerStore.ts`)

| State | Type | Purpose |
|---|---|---|
| `queue` | `Track[]` | All loaded search results |
| `currentIndex` | `number` | Which track is playing |
| `shuffle` | `boolean` | Random next track |
| `repeat` | `'none' \| 'one'` | Replay current track |
| `streamMode` | `'audio' \| 'video'` | Current playback mode |
| `audioQuality` | `'best' \| 'medium' \| 'low'` | Audio stream quality |
| `videoQuality` | `'best' \| '1080' \| '720' \| '480' \| '360'` | Video stream quality |
| `streamUrl` | `string \| null` | Current CDN stream URL |
| `isLoading` | `boolean` | Fetching stream URL |

### Playback Flow

```
User clicks track
    → setQueue(results, index)         [Zustand]
    → useEffect detects track?.id change
    → fetch /api/stream?id=...&mode=...&quality=...
    → setStreamUrl(url)
    → useEffect detects streamUrl change
    → audioRef/videoRef.current.src = url
    → .play()
```

### Audio vs Video Mode

- Audio mode: plays via a hidden `<audio>` element
- Video mode: plays via a floating `<video>` element that appears above the player bar
  - Can be expanded to fullscreen-ish or kept as a small pip (picture-in-picture style) in the bottom-right corner
  - Toggle with the expand/collapse button on the video overlay

### Shuffle Logic

When shuffle is on and a track ends (or skip next is called):
```js
do {
  next = Math.floor(Math.random() * queue.length);
} while (queue.length > 1 && next === currentIndex);
```
Guarantees a different track is always picked (unless queue has only 1 item).

### Repeat Logic

When a track ends, `handleEnded` fires:
- `repeat === 'one'` → calls `.play()` on the current element (replays from start)
- `repeat === 'none'` → calls `skipNext()` (advances or shuffles)

### Quality Change

Changing mode or quality sets `streamUrl: null` in the store, which triggers the `useEffect` to re-fetch the stream with the new parameters. The track doesn't change — only the stream URL is refreshed.

---

## Infinite Scroll — `HomeClient.tsx`

```
IntersectionObserver
    watches → <div ref={sentinelRef} /> (bottom of list)
    fires   → loadMore()
                → fetch /api/search?q=...&page=N
                → append to results (dedupe by id)
                → increment page
                → update hasMore
```

A `loadMoreRef` ref is used so the `IntersectionObserver` callback always has access to the latest `loadMore` function without needing to re-register the observer on every render.

---

## File Structure

```
ytmusic-web/
├── app/
│   ├── layout.tsx              # Root layout, global CSS
│   ├── page.tsx                # Redirects to /home
│   ├── globals.css             # Tailwind + custom range/scrollbar/equalizer styles
│   ├── providers.tsx           # Client providers wrapper
│   ├── home/
│   │   ├── page.tsx            # Server component (auth check placeholder)
│   │   └── HomeClient.tsx      # Search UI + infinite scroll results
│   └── api/
│       ├── search/route.ts     # yt-dlp search endpoint
│       └── stream/route.ts     # yt-dlp stream URL extraction
├── components/
│   └── Player.tsx              # Fixed bottom player bar + floating video
├── store/
│   └── playerStore.ts          # Zustand global state
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Running Locally

```bash
# Install yt-dlp (required)
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
  -o /usr/local/bin/yt-dlp && sudo chmod +x /usr/local/bin/yt-dlp

# Install Node deps
cd ytmusic-web && npm install

# Start dev server
npm run dev
```

Open `http://localhost:3000` — no login, no API keys needed.

---

## Known Limitations

- Stream URLs from YouTube CDN expire after a few hours — refreshing the page or re-clicking the track re-fetches a fresh URL
- Video+audio for high quality (1080p) requires yt-dlp to merge two separate streams; the current implementation returns the video-only stream URL for those formats — best quality video uses a pre-merged format
- `yt-dlp` adds ~1-2s latency per stream fetch (server-side process spawn)
- YouTube may throttle or block IPs making many requests — using a residential IP or adding cookies mitigates this
