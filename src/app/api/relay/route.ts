import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { transaction } from '@/lib/server-db';

const REMINDERS_DIR = path.join(process.cwd(), '.reminders');
const INBOX = path.join(REMINDERS_DIR, 'inbox.json');

interface RelayPayload {
  sentAt?: string;
  due?: Array<{ id: string; title: string; reminderAt: string | null; priority?: string; date?: string | null; time?: string | null }>;
  overdue?: Array<{ id: string; title: string; date: string | null; priority?: string }>;
  state?: {
    tasks?: Array<{ id: string; title: string; date: string | null; time: string | null; priority?: string; completed?: boolean; reminderAt?: string | null; tags?: string[]; projectId?: string | null }>;
    habits?: Array<{ id: string; name: string; icon?: string; history?: Record<string, number> }>;
    stats?: Record<string, { date: string; completed: number; focusSec: number; energy: number | null }>;
  };
}

function isSafeShape(body: unknown): body is RelayPayload {
  if (!body || typeof body !== 'object') return false;
  const b = body as RelayPayload;
  if (b.due !== undefined && !Array.isArray(b.due)) return false;
  if (b.overdue !== undefined && !Array.isArray(b.overdue)) return false;
  return true;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  if (!isSafeShape(body)) {
    return NextResponse.json({ ok: false, error: 'invalid shape' }, { status: 422 });
  }
  const snapshot = {
    version: 1,
    sentAt: body.sentAt ?? new Date().toISOString(),
    due: body.due ?? [],
    overdue: body.overdue ?? [],
    state: body.state ?? null,
  };
  try {
    await fs.mkdir(REMINDERS_DIR, { recursive: true });
    const tmp = `${INBOX}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(snapshot, null, 2), 'utf8');
    await fs.rename(tmp, INBOX);
  } catch {
    return NextResponse.json({ ok: false, error: 'write failed' }, { status: 500 });
  }
  // Also persist to PostgreSQL for production (Vercel filesystem is ephemeral)
  try {
    await transaction(async (client) => {
      await client.query(
        'INSERT INTO relay_snapshots (ts, payload) VALUES ($1, $2)',
        [snapshot.sentAt, JSON.stringify(snapshot)]
      );
      // keep only latest 100 rows to cap DB size
      await client.query(
        'DELETE FROM relay_snapshots WHERE id NOT IN (SELECT id FROM relay_snapshots ORDER BY id DESC LIMIT 100)'
      );
    });
  } catch { /* postgres optional — never fail the relay */ }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  try {
    const raw = await fs.readFile(INBOX, 'utf8');
    return NextResponse.json({ ok: true, inbox: JSON.parse(raw) });
  } catch {
    return NextResponse.json({ ok: true, inbox: null });
  }
}