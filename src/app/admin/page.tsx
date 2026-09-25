'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ShieldCheck, Activity, Users, Eye, Database, Send,
  Lock, RefreshCw, ChevronLeft, BarChart2,
} from 'lucide-react';

interface Stats {
  total: number; sessions: number; pageviews: number;
  byDay: { day: string; c: number; sessions: number }[];
  byEvent: { event: string; c: number }[];
  byDevice: { device: string; c: number }[];
  byLang: { lang: string; c: number }[];
  topPaths: { path: string; c: number }[];
  dbSizeBytes: number | null;
  relayCount: number;
}

type Range = '1d' | '7d' | '30d';

function fmtBytes(b: number | null) {
  if (b == null) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function SparkArea({ points, color }: { points: number[]; color: string }) {
  const w = 560, h = 120, pad = 8;
  const max = Math.max(1, ...points);
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const y = (v: number) => h - pad - (v / max) * (h - pad * 2);
  const line = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${(pad + i * step).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${(w - pad).toFixed(1)},${(h - pad).toFixed(1)} L${pad},${(h - pad).toFixed(1)} Z`;
  const id = `ag-${color.replace('#', '')}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[120px]" role="img" aria-label="traffic trend">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <motion.path d={area} fill={`url(#${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
      <motion.path d={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: 'easeOut' }} />
      {points.map((v, i) => (
        <circle key={i} cx={pad + i * step} cy={y(v)} r={3} fill={color}>
          <title>{`${v} events`}</title>
        </circle>
      ))}
    </svg>
  );
}

function Donut({ parts, size = 150 }: { parts: { label: string; value: number; color: string }[]; size?: number }) {
  const total = Math.max(1, parts.reduce((a, p) => a + p.value, 0));
  const R = 60, C = 2 * Math.PI * R;
  // compute segments purely — no mutation
  const segs = parts.map((p, i, arr) => {
    const before = arr.slice(0, i).reduce((a, x) => a + x.value, 0);
    const frac = p.value / total;
    const dash = frac * C;
    const off = -before * C / total;
    return { ...p, dash, off };
  });
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox="0 0 150 150" role="img" aria-label="breakdown donut">
        <circle cx="75" cy="75" r={R} fill="none" stroke="rgba(127,127,127,.15)" strokeWidth="16" />
        {segs.map((p, i) => {
          return (
            <motion.circle key={i} cx="75" cy="75" r={R} fill="none"
              stroke={p.color} strokeWidth="16" strokeLinecap="butt"
              strokeDasharray={`${p.dash} ${C - p.dash}`}
              initial={{ strokeDashoffset: -p.off, opacity: 0 }}
              animate={{ strokeDashoffset: -p.off, opacity: 1 }}
              transition={{ duration: 0.7, delay: i * 0.08 }}
              style={{ rotate: '-90deg', transformOrigin: '75px 75px' }}
            >
              <title>{`${p.label}: ${p.value}`}</title>
            </motion.circle>
          );
        })}
      </svg>
      <ul className="text-[13px] space-y-1.5">
        {parts.map((p, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
            <span className="opacity-70">{p.label}</span>
            <span className="font-semibold tabular-nums">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const PALETTE = ['#7c8cff', '#98d2c7', '#f0a390', '#b8a7ff', '#f0c973', '#88d1ff', '#9ad8cf'];

function colorFor(i: number) { return PALETTE[i % PALETTE.length]; }

export default function AdminPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [token, setToken] = useState('');
  const [range, setRange] = useState<Range>('7d');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchStats = useCallback(async (tok: string, r: Range) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/stats?range=${r}`, {
        headers: { 'x-admin-token': tok },
      });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      setStats(j);
      sessionStorage.setItem('mz_admin', tok);
      setAuthed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed');
      setAuthed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('mz_admin');
    if (saved) {
      setToken(saved);
      void fetchStats(saved, range);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLogin = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchStats(token.trim(), range);
  };

  const onTestPing = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // remind-cron accepts CRON_SECRET ?? ADMIN_SECRET — reuse the admin token
      const res = await fetch('/api/remind-cron?test=1', { headers: { 'x-cron-secret': token } });
      const j = await res.json();
      setTestResult(res.ok ? `OK · due=${j.due ?? 0} sent=${(j.sent ?? []).length}` : `FAIL · ${j.error ?? res.status}`);
    } catch (e) {
      setTestResult(`FAIL · ${e instanceof Error ? e.message : 'network'}`);
    } finally {
      setTesting(false);
    }
  };

  const days = useMemo(() => stats?.byDay ?? [], [stats]);

  if (!authed) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" dir="ltr">
        <motion.form onSubmit={onLogin} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-3xl p-8 w-full max-w-sm space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl grid place-items-center" style={{ background: 'var(--mz-accent)' }}>
              <Lock size={18} className="text-white" />
            </span>
            <div>
              <h1 className="text-lg font-semibold">Admin access</h1>
              <p className="text-[12.5px] opacity-55">Traffic + reminders control</p>
            </div>
          </div>
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
            placeholder="ADMIN_SECRET" autoComplete="off"
            className="w-full rounded-xl px-4 py-2.5 bg-black/10 dark:bg-white/10 outline-none border border-black/10 dark:border-white/10 font-mono" />
          {error && <p className="text-[13px] text-red-500">{error}</p>}
          <button type="submit" disabled={loading || !token.trim()}
            className="w-full rounded-xl py-2.5 font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--mz-accent)' }}>
            {loading ? 'Checking…' : 'Unlock'}
          </button>
          <button type="button" onClick={() => router.push('/')}
            className="w-full text-[13px] opacity-60 hover:opacity-100 flex items-center justify-center gap-1">
            <ChevronLeft size={14} /> Back to app
          </button>
        </motion.form>
      </main>
    );
  }

  const cards = [
    { icon: Activity, label: 'Events', value: stats?.total ?? 0 },
    { icon: Users, label: 'Sessions', value: stats?.sessions ?? 0 },
    { icon: Eye, label: 'Pageviews', value: stats?.pageviews ?? 0 },
    { icon: Database, label: 'DB size', value: fmtBytes(stats?.dbSizeBytes ?? null), raw: true },
  ];

  return (
    <main className="min-h-screen px-4 sm:px-8 py-8 max-w-[1100px] mx-auto space-y-6" dir="ltr">
      <header className="flex flex-wrap items-center gap-3">
        <span className="w-10 h-10 rounded-2xl grid place-items-center text-white" style={{ background: 'var(--mz-accent)' }}>
          <ShieldCheck size={18} />
        </span>
        <div className="flex-1 min-w-[180px]">
          <h1 className="text-xl font-semibold flex items-center gap-2">Mz Planer · Admin</h1>
          <p className="text-[12.5px] opacity-55">privacy-first: counts only, no personal data</p>
        </div>
        <div className="flex items-center gap-2">
          {(['1d', '7d', '30d'] as Range[]).map((r) => (
            <button key={r} onClick={() => { setRange(r); void fetchStats(token, r); }}
              className={`px-3 py-1.5 rounded-full text-[13px] font-medium ${range === r ? 'text-white' : 'opacity-60 hover:opacity-100'}`}
              style={range === r ? { background: 'var(--mz-accent)' } : undefined}>
              {r === '1d' ? 'Today' : r === '7d' ? '7 days' : '30 days'}
            </button>
          ))}
          <button onClick={() => void fetchStats(token, range)} disabled={loading}
            className="p-2 rounded-full opacity-70 hover:opacity-100" title="Refresh">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => router.push('/')} className="p-2 rounded-full opacity-70 hover:opacity-100" title="Back">
            <ChevronLeft size={16} />
          </button>
        </div>
      </header>

      {error && <p className="text-[13px] text-red-500">{error}</p>}

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="glass rounded-2xl p-4">
            <c.icon size={16} className="opacity-50 mb-2" />
            <div className="text-[22px] font-semibold tabular-nums">{(c as { raw?: boolean }).raw ? c.value : (c.value as number).toLocaleString()}</div>
            <div className="text-[12px] opacity-55">{c.label}</div>
          </motion.div>
        ))}
      </section>

      <section className="glass rounded-3xl p-5">
        <h2 className="text-[15px] font-semibold mb-1 flex items-center gap-2"><BarChart2 size={15} /> Traffic trend</h2>
        <p className="text-[12px] opacity-50 mb-3">events per day · sessions in tooltip</p>
        {days.length ? <SparkArea points={days.map((d) => d.c)} color="#7c8cff" /> : <p className="opacity-50 text-[13px]">No data in this range yet.</p>}
        <div className="flex gap-4 mt-2 text-[11.5px] opacity-60 overflow-x-auto">
          {days.map((d) => (
            <span key={d.day} className="tabular-nums whitespace-nowrap" title={`${d.sessions} sessions`}>{d.day.slice(5)} · {d.c}</span>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-3">
        <div className="glass rounded-3xl p-5">
          <h2 className="text-[15px] font-semibold mb-3">Events</h2>
          <ul className="space-y-2 text-[13px]">
            {(stats?.byEvent ?? []).map((e, i) => (
              <li key={e.event} className="flex items-center gap-2">
                <span className="w-24 shrink-0 font-mono text-[12px] opacity-70">{e.event}</span>
                <span className="flex-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <motion.span className="block h-full rounded-full" style={{ background: colorFor(i), width: `${Math.min(100, (e.c / Math.max(1, stats?.total ?? 1)) * 100)}%` }}
                    initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * 0.05 }} />
                </span>
                <span className="tabular-nums font-semibold w-12 text-end">{e.c}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass rounded-3xl p-5">
          <h2 className="text-[15px] font-semibold mb-3">Top pages</h2>
          <ul className="space-y-2 text-[13px]">
            {(stats?.topPaths ?? []).map((p, i) => (
              <li key={p.path} className="flex items-center gap-2">
                <span className="flex-1 font-mono text-[12px] opacity-70 truncate" dir="ltr">{p.path}</span>
                <span className="flex-1 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden max-w-[120px]">
                  <motion.span className="block h-full rounded-full" style={{ background: colorFor(i + 2), width: `${Math.min(100, (p.c / Math.max(1, (stats?.topPaths[0]?.c ?? 1))) * 100)}%` }}
                    initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * 0.05 }} />
                </span>
                <span className="tabular-nums font-semibold w-12 text-end">{p.c}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-3">
        <div className="glass rounded-3xl p-5">
          <h2 className="text-[15px] font-semibold mb-3">Devices</h2>
          <Donut parts={(stats?.byDevice ?? []).map((d, i) => ({ label: d.device ?? 'unknown', value: d.c, color: colorFor(i) }))} />
        </div>
        <div className="glass rounded-3xl p-5">
          <h2 className="text-[15px] font-semibold mb-3">Languages</h2>
          <Donut parts={(stats?.byLang ?? []).map((d, i) => ({ label: d.lang ?? 'unknown', value: d.c, color: colorFor(i + 3) }))} />
        </div>
      </section>

      <section className="glass rounded-3xl p-5">
        <h2 className="text-[15px] font-semibold mb-1 flex items-center gap-2"><Send size={15} /> Telegram reminders</h2>
        <p className="text-[12px] opacity-50 mb-3">snapshots in server DB: <b className="tabular-nums">{stats?.relayCount ?? 0}</b> · cron hits <code className="font-mono">/api/remind-cron</code> every minute</p>
        <div className="flex items-center gap-2">
          <button onClick={onTestPing} disabled={testing}
            className="px-4 py-2 rounded-xl text-white text-[13.5px] font-medium disabled:opacity-50"
            style={{ background: 'var(--mz-accent)' }}>
            {testing ? 'Pinging…' : 'Send test ping'}
          </button>
          {testResult && <span className="text-[13px] font-mono opacity-80">{testResult}</span>}
        </div>
        <p className="text-[11.5px] opacity-45 mt-2">Requires <code className="font-mono">TELEGRAM_BOT_TOKEN</code> + <code className="font-mono">TELEGRAM_CHAT_ID</code> on the server. Local proxy env (127.0.0.1:9081) also works when deployed from this network.</p>
      </section>
    </main>
  );
}
