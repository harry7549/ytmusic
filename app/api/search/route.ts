import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const CLIENT_CTX = {
  clientName: 'WEB',
  clientVersion: '2.20240101.00.00',
  hl: 'en',
  gl: 'US',
};

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
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(new Error('Failed to parse YouTube response'));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function parseResults(contents: any[]): any[] {
  const results: any[] = [];
  for (const item of contents) {
    const v = item.videoRenderer;
    if (!v?.videoId) continue;
    const id = v.videoId;
    results.push({
      id,
      title: v.title?.runs?.[0]?.text ?? '',
      author: v.ownerText?.runs?.[0]?.text ?? '',
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      duration: v.lengthText?.simpleText ?? '',
    });
  }
  return results;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1');
  if (!q) return NextResponse.json({ results: [] });

  const pageSize = 20;

  try {
    const body = {
      context: { client: CLIENT_CTX },
      query: q,
      params: 'EgIQAQ%3D%3D', // videos only filter
    };

    const json = await httpsPost(
      `/youtubei/v1/search?key=${INNERTUBE_KEY}`,
      body
    );

    const contents: any[] =
      json?.contents?.twoColumnSearchResultsRenderer
        ?.primaryContents?.sectionListRenderer?.contents?.[0]
        ?.itemSectionRenderer?.contents ?? [];

    const all = parseResults(contents);
    const slice = all.slice((page - 1) * pageSize, page * pageSize);

    return NextResponse.json({ results: slice, hasMore: slice.length === pageSize });
  } catch (e: any) {
    console.error('[search error]', e?.message ?? e);
    return NextResponse.json({ error: e?.message ?? 'Search failed' }, { status: 500 });
  }
}
