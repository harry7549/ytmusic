import { NextRequest, NextResponse } from 'next/server';
import YouTube from 'youtube-sr';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q) return NextResponse.json({ results: [] });

  try {
    const videos = await YouTube.search(q, { limit: 20, type: 'video' });
    const results = videos.map((v) => ({
      id: v.id,
      title: v.title,
      author: v.channel?.name ?? '',
      thumbnail: v.thumbnail?.url ?? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      duration: v.durationFormatted ?? '',
    }));
    return NextResponse.json({ results });
  } catch (e) {
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
