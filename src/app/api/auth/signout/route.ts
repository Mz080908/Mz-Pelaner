import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** POST /api/auth/signout — clears the session cookie. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  return res;
}
