import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('id');
  const mode = req.nextUrl.searchParams.get('mode') ?? 'audio'; // 'audio' | 'video'
  const quality = req.nextUrl.searchParams.get('quality') ?? 'best'; // 'best'|'medium'|'low' for audio; '1080'|'720'|'480'|'360' for video

  if (!videoId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Build yt-dlp format selector
  let fmt: string;
  if (mode === 'video') {
    const heightMap: Record<string, string> = {
      '1080': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
      '720':  'bestvideo[height<=720]+bestaudio/best[height<=720]',
      '480':  'bestvideo[height<=480]+bestaudio/best[height<=480]',
      '360':  'bestvideo[height<=360]+bestaudio/best[height<=360]',
      'best': 'bestvideo+bestaudio/best',
    };
    fmt = heightMap[quality] ?? heightMap['best'];
  } else {
    const audioMap: Record<string, string> = {
      'best':   'bestaudio[ext=webm]/bestaudio',
      'medium': 'bestaudio[abr<=128]/bestaudio',
      'low':    'bestaudio[abr<=64]/bestaudio',
    };
    fmt = audioMap[quality] ?? audioMap['best'];
  }

  try {
    const { stdout } = await execAsync(
      `yt-dlp -f "${fmt}" --get-url "https://www.youtube.com/watch?v=${videoId}"`,
      { timeout: 15000 }
    );
    // For video+audio merged formats yt-dlp may return two lines; take first
    const url = stdout.trim().split('\n')[0];
    if (!url) return NextResponse.json({ error: 'No stream found' }, { status: 404 });
    return NextResponse.json({ url, mode });
  } catch (e: any) {
    console.error('[stream error]', e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? 'Stream extraction failed' }, { status: 500 });
  }
}
