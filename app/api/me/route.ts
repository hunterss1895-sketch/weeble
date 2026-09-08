import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { ensureSeeded } from '@/lib/db/seed-on-boot';
import { jsonCors, optionsCors } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req: NextRequest) {
  return optionsCors(req);
}

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const session = await getSession(req);
  if (!session) return jsonCors({ error: 'Unauthorized' }, { status: 401 }, req);
  return jsonCors({ ok: true, user: session }, undefined, req);
}
