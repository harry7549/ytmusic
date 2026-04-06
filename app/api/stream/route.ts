import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get('id');
  if (!videoId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    // yt-dlp extracts the best audio-only stream URL, bypassing bot detection & ads
    const { stdout } = await execAsync(
      `yt-dlp -f bestaudio --get-url "https://www.youtube.com/watch?v=${videoId}"`,
      { timeout: 15000 }
    );
    const url = stdout.trim().split('\n')[0];
    if (!url) return NextResponse.json({ error: 'No stream found' }, { status: 404 });
    return NextResponse.json({ url });
  } catch (e: any) {
    console.error('[stream error]', e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? 'Stream extraction failed' }, { status: 500 });
  }
}
