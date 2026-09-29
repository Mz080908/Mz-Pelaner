import { NextResponse } from 'next/server';
import { getSessionUser, getAuthConfig } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** GET /api/auth/me — who is signed in (null = anonymous/local). */
export async function GET() {
  if (!getAuthConfig()) return NextResponse.json({ ok: true, available: false, user: null });
  const user = await getSessionUser();
  return NextResponse.json({
    ok: true,
    available: true,
    user: user ? { id: user.id, email: user.email, name: user.name, picture: user.picture } : null,
  });
}
