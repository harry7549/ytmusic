import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1');
  if (!q) return NextResponse.json({ results: [] });

  const pageSize = 20;
  const start = (page - 1) * pageSize + 1;
  const end = page * pageSize;

  try {
    const { stdout } = await execAsync(
      `yt-dlp "ytsearch${end}:${q.replace(/"/g, '')}" --dump-json --flat-playlist --no-warnings --playlist-start ${start} --playlist-end ${end}`,
      { timeout: 30000 }
    );

    const results = stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          const v = JSON.parse(line);
          return {
            id: v.id,
            title: v.title,
            author: v.uploader ?? v.channel ?? '',
            thumbnail: v.thumbnail ?? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
            duration: v.duration_string ?? '',
          };
        } catch { return null; }
      })
      .filter(Boolean);

    return NextResponse.json({ results, hasMore: results.length === pageSize });
  } catch (e: any) {
    console.error('[search error]', e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? 'Search failed' }, { status: 500 });
  }
}
