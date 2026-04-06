import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('id');
  const mode = req.nextUrl.searchParams.get('mode') ?? 'audio';
  const quality = req.nextUrl.searchParams.get('quality') ?? 'best';

  if (!videoId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
    const formats = info.formats;

    let chosen: ytdl.videoFormat | undefined;

    if (mode === 'video') {
      const heightMap: Record<string, number> = {
        '1080': 1080, '720': 720, '480': 480, '360': 360,
      };
      const maxHeight = heightMap[quality] ?? 1080;
      // prefer progressive (video+audio) formats first
      chosen =
        formats
          .filter((f) => f.hasVideo && f.hasAudio && (f.height ?? 0) <= maxHeight)
          .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0] ??
        formats
          .filter((f) => f.hasVideo && (f.height ?? 0) <= maxHeight)
          .sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0];
    } else {
      const abrMap: Record<string, number> = { best: 9999, medium: 128, low: 64 };
      const maxAbr = abrMap[quality] ?? 9999;
      chosen =
        formats
          .filter((f) => f.hasAudio && !f.hasVideo && (f.audioBitrate ?? 0) <= maxAbr)
          .sort((a, b) => (b.audioBitrate ?? 0) - (a.audioBitrate ?? 0))[0] ??
        formats.filter((f) => f.hasAudio).sort((a, b) => (b.audioBitrate ?? 0) - (a.audioBitrate ?? 0))[0];
    }

    if (!chosen?.url) return NextResponse.json({ error: 'No stream found' }, { status: 404 });

    return NextResponse.json({ url: chosen.url, mode, mimeType: chosen.mimeType });
  } catch (e: any) {
    console.error('[stream error]', e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? 'Stream extraction failed' }, { status: 500 });
  }
}
