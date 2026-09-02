import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getEsimProvider } from '@/lib/providers';
import { ensureSeeded } from '@/lib/db/seed-on-boot';

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const { planId } = await req.json();
  if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 });

  try {
    const result = await getEsimProvider().purchase(planId, session.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Purchase failed' },
      { status: 400 }
    );
  }
}
