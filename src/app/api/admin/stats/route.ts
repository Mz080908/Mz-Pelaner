import { NextResponse } from 'next/server';
import { query } from '@/lib/server-db';

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
}

function checkAuth(req: Request) {
  const secret = process.env.ADMIN_SECRET ?? process.env.AUTH_SECRET ?? '';
  const got = req.headers.get('x-admin-token') ?? new URL(req.url).searchParams.get('token');
  if (!secret || got !== secret) return false;
  return true;
}

export async function GET(req: Request) {
  const pool = await import('@/lib/server-db').then(m => m.safeGetDb());
  if (!pool) return NextResponse.json({ ok: false, error: 'db unavailable' }, { status: 503 });

  if (!checkAuth(req)) return unauthorized();

  const url = new URL(req.url);
  const range = url.searchParams.get('range') ?? '7d';
  const days = range === '30d' ? 30 : range === '1d' ? 1 : 7;
  const cutoff = new Date(Date.now() - days * 86400_000).toISOString();

  try {
    const totalRes = await query<{ c: string }>(
      'SELECT COUNT(*) as c FROM analytics_events WHERE ts >= $1', [cutoff]
    );
    const sessionsRes = await query<{ c: string }>(
      'SELECT COUNT(DISTINCT session) as c FROM analytics_events WHERE ts >= $1', [cutoff]
    );
    const pageviewsRes = await query<{ c: string }>(
      "SELECT COUNT(*) as c FROM analytics_events WHERE event='pageview' AND ts >= $1", [cutoff]
    );
    const total = totalRes.rows[0]?.c ?? '0';
    const sessions = sessionsRes.rows[0]?.c ?? '0';
    const pageviews = pageviewsRes.rows[0]?.c ?? '0';

    const byDay = await query<{ day: string; c: string; sessions: string }>(`
      SELECT to_char(ts, 'YYYY-MM-DD') as day, COUNT(*) as c, COUNT(DISTINCT session) as sessions
FROM analytics_events WHERE ts >= $1
GROUP BY day ORDER BY day ASC
      FROM analytics_events WHERE ts >= $1
      GROUP BY day ORDER BY day ASC`, [cutoff]);

    const byEvent = await query<{ event: string; c: string }>(`
      SELECT event, COUNT(*) as c FROM analytics_events
      WHERE ts >= $1 GROUP BY event ORDER BY c DESC LIMIT 12`, [cutoff]);

    const byDevice = await query<{ device: string; c: string }>(`
      SELECT device, COUNT(*) as c FROM analytics_events
      WHERE ts >= $1 AND device IS NOT NULL GROUP BY device ORDER BY c DESC`, [cutoff]);

    const byLang = await query<{ lang: string; c: string }>(`
      SELECT lang, COUNT(*) as c FROM analytics_events
      WHERE ts >= $1 AND lang IS NOT NULL GROUP BY lang ORDER BY c DESC`, [cutoff]);

    const topPaths = await query<{ path: string; c: string }>(`
      SELECT path, COUNT(*) as c FROM analytics_events
      WHERE ts >= $1 AND path IS NOT NULL
      GROUP BY path ORDER BY c DESC LIMIT 10`, [cutoff]);

    const dbSizeResult = await query<{ bytes: string }>(`
      SELECT pg_database_size(current_database()) as bytes`);
    const dbSizeBytes = dbSizeResult.rows[0]?.bytes ? parseInt(dbSizeResult.rows[0].bytes, 10) : null;

    const relayCountRes = await query<{ c: string }>(
      'SELECT COUNT(*) as c FROM relay_snapshots');
    const relayCount = relayCountRes.rows[0]?.c ?? '0';

    return NextResponse.json({
      ok: true,
      range, days, cutoff,
      total: parseInt(total, 10), sessions: parseInt(sessions, 10), pageviews: parseInt(pageviews, 10),
      byDay, byEvent, byDevice, byLang, topPaths,
      dbSizeBytes, relayCount: parseInt(relayCount, 10),
    });
  } catch (e) {
    console.error('[admin/stats] query failed:', e);
    return NextResponse.json({ ok: false, error: 'query failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!checkAuth(req)) return unauthorized();
  return NextResponse.json({ ok: false, error: 'unknown action' }, { status: 400 });
}