import { NextResponse } from 'next/server';
import { query, transaction } from '@/lib/server-db';

interface DueItem {
  id: string;
  title: string;
  reminderAt: string | null;
  priority?: string;
  date?: string | null;
  time?: string | null;
}

function esc(s: string) {
  return s.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
}

async function sendTelegram(token: string, chatId: string, html: string) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const attempts = [0, 1500, 4000];
  let lastErr = '';
  for (const wait of attempts) {
    if (wait) await new Promise((r) => setTimeout(r, wait));
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: html, parse_mode: 'HTML', disable_web_page_preview: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && (j as { ok?: boolean }).ok) return { ok: true as const };
      lastErr = (j as { description?: string }).description ?? `HTTP ${res.status}`;
      if (res.status === 400) return { ok: false as const, error: lastErr };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : 'network';
    }
  }
  return { ok: false as const, error: lastErr };
}

export async function GET(req: Request) {
  const adminSecret = process.env.ADMIN_SECRET ?? '';
  const cronSecret = process.env.CRON_SECRET ?? adminSecret;
  const got = req.headers.get('x-cron-secret') ?? new URL(req.url).searchParams.get('secret');
  const isTest = new URL(req.url).searchParams.get('test') === '1';
  
  const validSecrets = new Set([adminSecret, cronSecret].filter(Boolean));
  if (!got || !validSecrets.has(got)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN ?? '';
  const chatId = process.env.TELEGRAM_CHAT_ID ?? '';
  if (!token || !chatId) {
    return NextResponse.json({ ok: false, error: 'telegram not configured' }, { status: 503 });
  }

  const pool = await import('@/lib/server-db').then(m => m.safeGetDb());
  if (!pool) return NextResponse.json({ ok: false, error: 'db unavailable' }, { status: 503 });

  try {
    const rows = await query<{ id: number; ts: string; payload: string; sent_json: string | null }>(
      'SELECT id, ts, payload, sent_json FROM relay_snapshots ORDER BY id DESC LIMIT 1'
    );
    const row = rows.rows[0];
    if (!row) return NextResponse.json({ ok: true, due: 0, sent: [], note: 'no snapshot yet' });

    let due: DueItem[] = [];
    try {
      const snap = JSON.parse(row.payload) as { due?: DueItem[] };
      due = snap.due ?? [];
    } catch {
      return NextResponse.json({ ok: false, error: 'snapshot corrupt' }, { status: 500 });
    }

    const sentSet = new Set<string>();
    try {
      const arr = JSON.parse(row.sent_json ?? '[]') as { key: string }[];
      for (const s of arr) sentSet.add(s.key);
    } catch { /* start fresh */ }

    const now = Date.now();
    const WINDOW_MS = 120_000;
    const toSend: { key: string; html: string }[] = [];

    for (const t of due) {
      if (!t.reminderAt) continue;
      const when = new Date(t.reminderAt).getTime();
      if (Number.isNaN(when)) continue;
      const key = `reminder:${t.id}:${t.reminderAt}`;
      if (sentSet.has(key)) continue;
      if (when <= now && when > now - WINDOW_MS) {
        toSend.push({
          key,
          html: `⏰ <b>${esc(t.title)}</b>\n${t.date ? `📅 ${esc(t.date)}` : ''}${t.time ? ` · 🕐 ${esc(t.time)}` : ''}`,
        });
      }
    }

    const sent: string[] = [];
    for (const item of toSend.slice(0, 10)) {
      const r = await sendTelegram(token, chatId, item.html);
      if (r.ok) {
        sent.push(item.key);
        sentSet.add(item.key);
      } else {
        console.error('[remind-cron] telegram failed:', r.error);
        break;
      }
    }
    if (isTest) {
      const r = await sendTelegram(token, chatId, '✅ <b>Mz Planer cron is live</b>\nReminders will arrive here on time.');
      return NextResponse.json({
        ok: r.ok, test: true, due: toSend.length,
        sent, telegramError: r.ok ? undefined : r.error,
      });
    }

    try {
      await transaction(async (client) => {
        await client.query(
          'UPDATE relay_snapshots SET sent_json = $1 WHERE id = $2',
          [JSON.stringify([...sentSet].slice(-200).map((key) => ({ key, sentAt: new Date().toISOString() }))), row.id]
        );
      });
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true, due: toSend.length, sent });
  } catch (e) {
    console.error('[remind-cron] error:', e);
    return NextResponse.json({ ok: false, error: 'internal error' }, { status: 500 });
  }
}