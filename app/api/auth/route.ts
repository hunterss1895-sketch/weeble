import { NextRequest, NextResponse } from 'next/server';
import { createSession, destroySession, loginUser, registerUser } from '@/lib/auth';
import { ensureSeeded } from '@/lib/db/seed-on-boot';

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const body = await req.json();
  const { mode, email, password, name, next } = body as {
    mode: 'signin' | 'signup' | 'signout';
    email?: string;
    password?: string;
    name?: string;
    next?: string;
  };

  try {
    if (mode === 'signout') {
      await destroySession();
      return NextResponse.json({ ok: true });
    }
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }
    const user =
      mode === 'signup'
        ? await registerUser(email.toLowerCase().trim(), password, name)
        : await loginUser(email.toLowerCase().trim(), password);
    await createSession(user);
    return NextResponse.json({ ok: true, redirect: next || '/dashboard' });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Auth failed' },
      { status: 400 }
    );
  }
}
