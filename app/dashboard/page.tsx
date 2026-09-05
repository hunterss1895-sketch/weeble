import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getEsimProvider } from '@/lib/providers';
import { prisma } from '@/lib/db/prisma';
import { ensureSeeded } from '@/lib/db/seed-on-boot';
import { Card } from '@/components/ui';
import { formatData, formatPrice } from '@/lib/utils';

export default async function DashboardPage() {
  await ensureSeeded();
  const session = await getSession();
  if (!session) return null;

  const provider = getEsimProvider();
  const usage = await provider.getUsage(session.id);
  const devices = await prisma.device.count({ where: { userId: session.id } });
  const purchases = await prisma.purchase.findMany({
    where: { userId: session.id },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  const adCount = await prisma.adReward.count({ where: { userId: session.id } });
  const adMb = await prisma.adReward.aggregate({
    where: { userId: session.id },
    _sum: { dataMb: true },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-weeble-400">Data remaining</p>
          <p className="mt-2 text-3xl font-black text-ink-50">{formatData(usage.dataRemainingMb)}</p>
          <p className="text-xs text-ink-500">of {formatData(usage.dataTotalMb)} total</p>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-weeble-400">Active plans</p>
          <p className="mt-2 text-3xl font-black text-ink-50">{usage.activePlans}</p>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-weeble-400">Devices</p>
          <p className="mt-2 text-3xl font-black text-ink-50">{devices}</p>
          <Link href="/dashboard/devices" className="text-xs font-semibold text-weeble-400 hover:text-weeble-300">Manage →</Link>
        </Card>
        <Card>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-weeble-400">Earned from ads</p>
          <p className="mt-2 text-3xl font-black text-weeble-400">{formatData(adMb._sum.dataMb || 0)}</p>
          <p className="text-xs text-ink-500">{adCount} rewards</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink-50">Recent purchases</h2>
            <Link href="/plans" className="text-sm font-semibold text-weeble-400 hover:text-weeble-300">Top up</Link>
          </div>
          {purchases.length === 0 ? (
            <p className="text-sm text-ink-400">
              No plans yet.{' '}
              <Link href="/plans" className="font-semibold text-weeble-400 hover:text-weeble-300">Browse Weeble plans</Link>
            </p>
          ) : (
            <ul className="space-y-3">
              {purchases.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-2xl bg-ink-950/70 px-4 py-3 text-sm ring-1 ring-ink-800">
                  <div>
                    <p className="font-semibold text-ink-50">{p.plan.name}</p>
                    <p className="text-xs text-ink-500">{formatData(p.dataRemainingMb)} left · {p.status}</p>
                  </div>
                  <span className="font-bold text-weeble-400">{formatPrice(p.plan.priceCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="border-weeble-500/30">
          <h2 className="mb-3 text-lg font-bold text-ink-50">Quick actions</h2>
          <div className="grid gap-2">
            <Link href="/plans" className="rounded-2xl border border-ink-700 bg-ink-950/50 px-4 py-3.5 text-sm font-semibold text-ink-200 hover:border-weeble-500/50 hover:text-weeble-400 transition">
              Buy a Weeble plan
            </Link>
            <Link href="/dashboard/earn" className="rounded-2xl border border-ink-700 bg-ink-950/50 px-4 py-3.5 text-sm font-semibold text-ink-200 hover:border-weeble-500/50 hover:text-weeble-400 transition">
              Watch ads for free data
            </Link>
            <Link href="/dashboard/devices" className="rounded-2xl border border-ink-700 bg-ink-950/50 px-4 py-3.5 text-sm font-semibold text-ink-200 hover:border-weeble-500/50 hover:text-weeble-400 transition">
              Install eSIM / view QR
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
