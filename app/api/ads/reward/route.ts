import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAdRewardProvider } from '@/lib/ads';
import { ensureSeeded } from '@/lib/db/seed-on-boot';

export async function GET() {
  await ensureSeeded();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ads = getAdRewardProvider();
  const status = await ads.canWatch(session.id);
  const history = await ads.getHistory(session.id);
  return NextResponse.json({ ...status, dailyCap: ads.dailyCap, history });
}

export async function POST() {
  await ensureSeeded();
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ads = getAdRewardProvider();
  const result = await ads.grantReward(session.id);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
