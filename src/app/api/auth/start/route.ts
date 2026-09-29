import { NextResponse } from 'next/server';
import { getAuthConfig, googleAuthUrl, originFrom } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET /api/auth/start → redirect to Google (or 503 when not configured). */
export async function GET(req: Request) {
  const cfg = getAuthConfig(originFrom(req));
  if (!cfg) {
    return NextResponse.json({ ok: false, available: false, error: 'not configured' }, { status: 503 });
  }
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(googleAuthUrl(originFrom(req), state, cfg));
  res.cookies.set('mz_oauth_state', state, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600,
  });
  return res;
}
