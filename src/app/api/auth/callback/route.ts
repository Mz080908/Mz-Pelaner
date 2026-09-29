import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthConfig, exchangeCode, createSessionToken, SESSION_COOKIE, originFrom } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET /api/auth/callback?code=…&state=… → sets the session cookie. */
export async function GET(req: Request) {
  const cfg = getAuthConfig(originFrom(req));
  if (!cfg) {
    return NextResponse.redirect(`${originFrom(req)}/settings?sync=unavailable`);
  }
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const jar = await cookies();
  const expected = jar.get('mz_oauth_state')?.value;
  jar.delete('mz_oauth_state');

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${originFrom(req)}/settings?sync=error`);
  }
  const result = await exchangeCode(code, originFrom(req), cfg);
  if (!result.ok || !result.user) {
    return NextResponse.redirect(`${originFrom(req)}/settings?sync=error`);
  }
  const res = NextResponse.redirect(`${originFrom(req)}/settings?sync=ok`);
  res.cookies.set(SESSION_COOKIE, createSessionToken(result.user, cfg.secret), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
