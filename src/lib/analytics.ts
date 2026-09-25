'use client';
// Client analytics queue — fire-and-forget, keeps UI unaffected by failures.
// Filters out the admin panel itself and local dev tedium (bots optional).

const QUEUE_KEY = '__mz_analytics_q';

function sessionId(): string {
  try {
    let s = sessionStorage.getItem('mz_session');
    if (!s) {
      s = crypto.randomUUID();
      sessionStorage.setItem('mz_session', s);
    }
    return s;
  } catch {
    return 'unknown';
  }
}

function device(): string {
  try {
    const ua = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return 'mobile';
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    return 'desktop';
  } catch { return 'desktop'; }
}

interface PendingEvent {
  event: string;
  path?: string;
  lang?: string;
  device?: string;
  referrer?: string;
  meta?: Record<string, unknown>;
}

let queue: PendingEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function isBot(): boolean {
  try { return /bot|crawler|spider|crawling|prerender|headless/i.test(navigator.userAgent); }
  catch { return false; }
}

function loadQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (raw) queue = JSON.parse(raw) as PendingEvent[];
  } catch { queue = []; }
}

function saveQueue() {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-50))); }
  catch { /* ignore */ }
}

async function flush() {
  if (!queue.length) return;
  const batch = queue.splice(0, queue.length);
  saveQueue();
  const payload = batch.map((e) => ({
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    session: sessionId(),
    event: e.event,
    path: e.path ?? window.location.pathname,
    lang: e.lang ?? document.documentElement.lang ?? 'en',
    device: e.device ?? device(),
    referrer: e.referrer ?? document.referrer ?? '',
    meta: e.meta,
  }));
  try {
    const blob = JSON.stringify({ events: payload });
    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon('/api/analytics', blob);
      if (!ok) throw new Error('beacon rejected');
    } else {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: blob,
        keepalive: true,
      });
    }
  } catch {
    // re-queue at front (cap 50) for next flush
    queue = [...payload.map((p) => ({
      event: p.event, path: p.path, lang: p.lang, device: p.device, referrer: p.referrer,
    })), ...queue].slice(-50);
    saveQueue();
  }
}

function schedule() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, 1500);
}

export function track(event: string, meta?: Record<string, unknown>) {
  try {
    if (typeof window === 'undefined') return;
    if (isBot()) return;
    // never track admin viewing itself — keeps traffic numbers clean
    if (window.location.pathname.startsWith('/admin')) return;
    if (!queue.length && typeof localStorage !== 'undefined') loadQueue();
    queue.push({ event, meta });
    saveQueue();
    schedule();
  } catch { /* analytics must never break the app */ }
}

export function trackPageview() {
  track('pageview', { title: document.title });
}

export function flushAnalytics() {
  return flush();
}
