import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('id');
  const mode = req.nextUrl.searchParams.get('mode') ?? 'audio';
  const quality = req.nextUrl.searchParams.get('quality') ?? 'best';

  if (!videoId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  // build yt-dlp format selector
  let formatSelector: string;
  if (mode === 'video') {
    const heightMap: Record<string, number> = { '1080': 1080, '720': 720, '480': 480, '360': 360 };
    const maxH = heightMap[quality] ?? 1080;
    formatSelector = `bestvideo[height<=${maxH}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${maxH}][ext=mp4]/best`;
  } else {
    const abrMap: Record<string, string> = { best: 'bestaudio', medium: 'bestaudio[abr<=128]', low: 'bestaudio[abr<=64]' };
    formatSelector = abrMap[quality] ?? 'bestaudio';
  }

  try {
    const { stdout } = await execFileAsync('/usr/local/bin/yt-dlp', [
      '--no-playlist',
      '-f', formatSelector,
      '-g',           // print URL only
      '--no-warnings',
      url,
    ], { timeout: 15000 });

    const streamUrl = stdout.trim().split('\n')[0];
    if (!streamUrl) return NextResponse.json({ error: 'No stream URL found' }, { status: 404 });

    return NextResponse.json({ url: streamUrl, mode });
  } catch (e: any) {
    console.error('[stream error]', e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? 'Stream extraction failed' }, { status: 500 });
  }
}
