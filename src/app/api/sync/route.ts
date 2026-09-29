import { NextResponse } from 'next/server';
import { getAuthConfig, getSessionUser } from '@/lib/auth';
import { query } from '@/lib/server-db';
import { mergeSettings } from '@/lib/storage';
import type { CloudSnapshot, Task, Project, Habit, CalEvent, NoteItem, Tag, Settings, DayStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

const hasId = <T extends { id?: unknown }>(v: unknown): v is T =>
  !!v && typeof v === 'object' && typeof (v as { id?: unknown }).id === 'string';

function sanitize(body: unknown): CloudSnapshot | null {
  if (!body || typeof body !== 'object') return null;
  const p = body as Record<string, unknown>;
  if (!Array.isArray(p.tasks)) return null;
  if ((p.version as number) !== 1) return null;
  const list = <T extends { id?: unknown }>(v: unknown): T[] =>
    (Array.isArray(v) ? (v as T[]) : []).filter(hasId);
  return {
    version: 1,
    updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : new Date().toISOString(),
    tasks: list<Task>(p.tasks).map((t) => ({ ...t, dependencies: (t as Task).dependencies ?? [] })),
    projects: list<Project>(p.projects),
    habits: list<Habit>(p.habits),
    events: list<CalEvent>(p.events),
    notes: list<NoteItem>(p.notes),
    tags: list<Tag>(p.tags),
    settings: mergeSettings(p.settings as Settings),
    stats: (typeof p.stats === 'object' && p.stats !== null ? p.stats : {}) as Record<string, DayStats>,
  };
}

/** GET — pull the latest cloud snapshot (null when never pushed). */
export async function GET() {
  if (!getAuthConfig()) return NextResponse.json({ ok: false, available: false, error: 'not configured' }, { status: 503 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: 'signed out' }, { status: 401 });
  try {
    const r = await query<{ payload: CloudSnapshot; updated_at: string }>(
      'SELECT payload, updated_at FROM user_snapshots WHERE user_id = $1',
      [user.id],
    );
    const row = r.rows[0] as unknown as { payload?: CloudSnapshot; updated_at?: string } | undefined;
    return NextResponse.json({ ok: true, snapshot: row?.payload ?? null, updatedAt: row?.updated_at ?? null });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'db error' }, { status: 500 });
  }
}

/** PUT — push the local state to the cloud. Shallow merge by (table,id):
 *  rows with the same id are replaced, everything else is preserved. */
export async function PUT(req: Request) {
  if (!getAuthConfig()) return NextResponse.json({ ok: false, available: false, error: 'not configured' }, { status: 503 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: 'signed out' }, { status: 401 });
  let incoming: CloudSnapshot | null = null;
  try {
    const body = (await req.json()) as unknown;
    incoming = sanitize(body);
  } catch {
    incoming = null;
  }
  if (!incoming) return NextResponse.json({ ok: false, error: 'invalid snapshot' }, { status: 400 });
  try {
    const cur = await query<{ payload: CloudSnapshot }>('SELECT payload FROM user_snapshots WHERE user_id = $1', [user.id]);
    const old = (cur.rows[0] as unknown as { payload?: CloudSnapshot } | undefined)?.payload;
    const merge = <T extends { id: string }>(o: T[] | undefined, n: T[]): T[] => {
      const byId = new Map((o ?? []).map((x) => [x.id, x]));
      for (const x of n) byId.set(x.id, { ...byId.get(x.id), ...x });
      return [...byId.values()];
    };
    const merged: CloudSnapshot = old
      ? {
          version: 1,
          updatedAt: incoming.updatedAt,
          tasks: merge(old.tasks, incoming.tasks),
          projects: merge(old.projects, incoming.projects),
          habits: merge(old.habits, incoming.habits),
          events: merge(old.events, incoming.events),
          notes: merge(old.notes, incoming.notes),
          tags: merge(old.tags, incoming.tags),
          settings: { ...mergeSettings(old.settings), ...mergeSettings(incoming.settings) },
          stats: { ...old.stats, ...incoming.stats },
        }
      : incoming;
    // the cloud copy always reports the provider actually in use
    merged.settings.authProvider = 'google';
    await query(
      `INSERT INTO user_snapshots (user_id, payload, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      [user.id, JSON.stringify(merged)],
    );
    return NextResponse.json({ ok: true, updatedAt: new Date().toISOString(), merged: !!old });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'db error' }, { status: 500 });
  }
}
