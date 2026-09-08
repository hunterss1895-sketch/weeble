import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAdRewardProvider } from '@/lib/ads';
import { ensureSeeded } from '@/lib/db/seed-on-boot';
import { jsonCors, optionsCors } from '@/lib/cors';

export async function OPTIONS(req: NextRequest) {
  return optionsCors(req);
}

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const session = await getSession(req);
  if (!session) return jsonCors({ error: 'Unauthorized' }, { status: 401 }, req);
  const ads = getAdRewardProvider();
  const status = await ads.canWatch(session.id);
  const history = await ads.getHistory(session.id);
  return jsonCors({ ...status, dailyCap: ads.dailyCap, history }, undefined, req);
}

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const session = await getSession(req);
  if (!session) return jsonCors({ error: 'Unauthorized' }, { status: 401 }, req);
  const ads = getAdRewardProvider();
  const result = await ads.grantReward(session.id);
  return jsonCors(result, { status: result.success ? 200 : 400 }, req);
}
