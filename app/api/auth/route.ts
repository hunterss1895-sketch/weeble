import { NextRequest } from 'next/server';
import { createSession, destroySession, loginUser, registerUser } from '@/lib/auth';
import { ensureSeeded } from '@/lib/db/seed-on-boot';
import { jsonCors, optionsCors } from '@/lib/cors';

export async function OPTIONS(req: NextRequest) {
  return optionsCors(req);
}

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
      return jsonCors({ ok: true }, undefined, req);
    }
    if (!email || !password) {
      return jsonCors({ error: 'Email and password required' }, { status: 400 }, req);
    }
    const user =
      mode === 'signup'
        ? await registerUser(email.toLowerCase().trim(), password, name)
        : await loginUser(email.toLowerCase().trim(), password);
    const token = await createSession(user);
    return jsonCors(
      {
        ok: true,
        token,
        user: { id: user.id, email: user.email, name: user.name },
        redirect: next || '/dashboard',
      },
      undefined,
      req
    );
  } catch (e) {
    return jsonCors(
      { error: e instanceof Error ? e.message : 'Auth failed' },
      { status: 400 },
      req
    );
  }
}
