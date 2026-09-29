// src/lib/auth.ts — minimal, dependency-free Google sign-in + session cookies.
//
// Design notes:
// * Only two env vars are mandatory: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
//   AUTH_SECRET signs the session cookie (falls back to ADMIN_SECRET, then to
//   a stable value derived from the DB URL so dev still works).
// * id_token verification goes through Google's official tokeninfo endpoint,
//   which validates signature, audience (aud) and expiry (exp) server-side.
//   No JWT library needed.
// * The session is an HMAC-SHA256 signed JSON blob in an httpOnly cookie —
//   stateless, so it works across serverless invocations.
// * Everything degrades: when not configured the API answers 503
//   { available:false } and the UI simply says sync is unavailable.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { query } from './server-db';

export const SESSION_COOKIE = 'mz_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  picture: string | null;
}

interface AuthConfig {
  clientId: string;
  clientSecret: string;
  secret: string;
  baseUrl: string;
}

export function getAuthConfig(baseUrl?: string): AuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const secret = process.env.AUTH_SECRET || process.env.ADMIN_SECRET || process.env.DATABASE_URL || 'mz-planer-dev-secret';
  return { clientId, clientSecret, secret, baseUrl: baseUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? '' };
}

/** Absolute origin used for the OAuth redirect_uri (request-derived wins). */
export function originFrom(req: Request): string {
  try {
    const u = new URL(req.url);
    const fwd = req.headers.get('x-forwarded-proto');
    const host = req.headers.get('x-forwarded-host') ?? u.host;
    return `${fwd ?? u.protocol.replace(':', '')}://${host}`;
  } catch {
    return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  }
}

export function redirectUri(origin: string): string {
  return `${origin}/api/auth/callback`;
}

/* ------------------------------------------------------------------ */
/* session signing                                                      */
/* ------------------------------------------------------------------ */

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken(user: SessionUser, secret: string): string {
  const body = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + SESSION_TTL_MS })).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

export function readSessionToken(token: string | undefined, secret: string): SessionUser | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expected = sign(body, secret);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionUser & { exp: number };
    if (!data.exp || data.exp < Date.now()) return null;
    if (!data.id || !data.email) return null;
    return { id: data.id, email: data.email, name: data.name ?? null, picture: data.picture ?? null };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cfg = getAuthConfig();
  if (!cfg) return null;
  const jar = await cookies();
  return readSessionToken(jar.get(SESSION_COOKIE)?.value, cfg.secret);
}

/* ------------------------------------------------------------------ */
/* identity (Postgres)                                                  */
/* ------------------------------------------------------------------ */

export async function upsertUser(profile: SessionUser): Promise<void> {
  await query(
    `INSERT INTO app_users (id, email, name, picture, last_login)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       name = COALESCE(EXCLUDED.name, app_users.name),
       picture = COALESCE(EXCLUDED.picture, app_users.picture),
       last_login = NOW()`,
    [profile.id, profile.email, profile.name, profile.picture],
  );
}

/* ------------------------------------------------------------------ */
/* Google OAuth helpers                                                  */
/* ------------------------------------------------------------------ */

export function googleAuthUrl(origin: string, state: string, cfg: AuthConfig): string {
  const p = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
    access_type: 'online',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

export interface TokenResult {
  ok: boolean;
  user?: SessionUser;
  error?: string;
}

/** Exchange the authorization code, then verify id_token via Google's
 *  tokeninfo endpoint (signature + aud + exp are checked there). */
export async function exchangeCode(code: string, origin: string, cfg: AuthConfig): Promise<TokenResult> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: redirectUri(origin),
        grant_type: 'authorization_code',
      }),
      cache: 'no-store',
    });
    if (!res.ok) return { ok: false, error: `token exchange failed (${res.status})` };
    const tokens = (await res.json()) as { id_token?: string };
    if (!tokens.id_token) return { ok: false, error: 'no id_token returned' };

    const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`, { cache: 'no-store' });
    if (!info.ok) return { ok: false, error: 'id_token verification failed' };
    const claims = (await info.json()) as { sub?: string; email?: string; name?: string; picture?: string; aud?: string; exp?: string };
    if (claims.aud && claims.aud !== cfg.clientId) return { ok: false, error: 'audience mismatch' };
    if (claims.exp && Number(claims.exp) * 1000 < Date.now()) return { ok: false, error: 'token expired' };
    if (!claims.sub || !claims.email) return { ok: false, error: 'incomplete profile' };

    const user: SessionUser = {
      id: claims.sub,
      email: claims.email,
      name: claims.name ?? null,
      picture: claims.picture ?? null,
    };
    await upsertUser(user);
    return { ok: true, user };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown error' };
  }
}
