import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { getEsimProvider } from '@/lib/providers';
import { ensureSeeded } from '@/lib/db/seed-on-boot';
import { jsonCors, optionsCors } from '@/lib/cors';

export async function OPTIONS(req: NextRequest) {
  return optionsCors(req);
}

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const session = await getSession(req);
  if (!session) return jsonCors({ error: 'Sign in required' }, { status: 401 }, req);

  const { planId } = await req.json();
  if (!planId) return jsonCors({ error: 'planId required' }, { status: 400 }, req);

  try {
    const result = await getEsimProvider().purchase(planId, session.id);
    return jsonCors({ ok: true, ...result }, undefined, req);
  } catch (e) {
    return jsonCors(
      { error: e instanceof Error ? e.message : 'Purchase failed' },
      { status: 400 },
      req
    );
  }
}
