import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';

function httpsPost(path: string, body: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: 'www.youtube.com',
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 11)',
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try { resolve(JSON.parse(raw)); }
          catch { reject(new Error('Failed to parse YouTube response')); }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('id');
  const mode = req.nextUrl.searchParams.get('mode') ?? 'audio';
  const quality = req.nextUrl.searchParams.get('quality') ?? 'best';

  if (!videoId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    // ANDROID client returns direct URLs — no cipher/signature needed
    const json = await httpsPost(`/youtubei/v1/player?key=${INNERTUBE_KEY}`, {
      context: {
        client: {
          clientName: 'ANDROID',
          clientVersion: '19.09.37',
          androidSdkVersion: 30,
          hl: 'en',
          gl: 'US',
        },
      },
      videoId,
      params: '2AMBCgIQBg==',
    });

    const formats: any[] = [
      ...(json.streamingData?.formats ?? []),
      ...(json.streamingData?.adaptiveFormats ?? []),
    ];

    if (!formats.length) {
      const reason = json.playabilityStatus?.reason ?? 'No formats returned';
      return NextResponse.json({ error: reason }, { status: 404 });
    }

    let chosen: any;

    if (mode === 'video') {
      const heightMap: Record<string, number> = { '1080': 1080, '720': 720, '480': 480, '360': 360 };
      const maxH = heightMap[quality] ?? 1080;
      chosen =
        formats
          .filter((f) => f.mimeType?.includes('video/mp4') && f.audioQuality && (f.height ?? 0) <= maxH)
          .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0] ??
        formats
          .filter((f) => f.mimeType?.includes('video') && (f.height ?? 0) <= maxH)
          .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0];
    } else {
      const abrMap: Record<string, number> = { best: 9999, medium: 128, low: 64 };
      const maxAbr = abrMap[quality] ?? 9999;
      chosen =
        formats
          .filter((f) => f.mimeType?.startsWith('audio') && (f.bitrate ?? 0) / 1000 <= maxAbr)
          .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0] ??
        formats
          .filter((f) => f.mimeType?.startsWith('audio'))
          .sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
    }

    if (!chosen?.url) return NextResponse.json({ error: 'No stream URL found' }, { status: 404 });

    return NextResponse.json({ url: chosen.url, mode, mimeType: chosen.mimeType });
  } catch (e: any) {
    console.error('[stream error]', e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? 'Stream extraction failed' }, { status: 500 });
  }
}
