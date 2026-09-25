import { NextResponse } from 'next/server';
import { transaction } from '@/lib/server-db';

export async function POST(req: Request) {
  const pool = await import('@/lib/server-db').then(m => m.safeGetDb());
  if (!pool) return NextResponse.json({ ok: true, note: 'db unavailable' });

  let body: { events?: Array<{ id: string; ts: string; session: string; event: string; path?: string; lang?: string; device?: string; referrer?: string; meta?: unknown }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const events = body.events ?? [];
  if (!events.length) return NextResponse.json({ ok: true });

  try {
    await transaction(async (client) => {
      for (const e of events) {
        await client.query(
          `INSERT INTO analytics_events (id, ts, session, event, path, lang, device, referrer, ua)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING`,
          [
            e.id,
            e.ts,
            e.session,
            e.event,
            e.path ?? null,
            e.lang ?? null,
            e.device ?? null,
            e.referrer ?? null,
            JSON.stringify(e.meta ?? {}),
          ]
        );
      }
    });
    return NextResponse.json({ ok: true, inserted: events.length });
  } catch (err) {
    console.error('[analytics] insert failed:', err);
    return NextResponse.json({ ok: false, error: 'insert failed' }, { status: 500 });
  }
}