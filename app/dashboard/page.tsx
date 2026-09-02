import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { getEsimProvider, providerMeta } from '@/lib/providers';
import { prisma } from '@/lib/db/prisma';
import { ensureSeeded } from '@/lib/db/seed-on-boot';
import { Badge, Card } from '@/components/ui';
import { formatData, formatPrice } from '@/lib/utils';

export default async function DashboardPage() {
  await ensureSeeded();
  const session = await getSession();
  if (!session) return null;

  const provider = getEsimProvider();
  const meta = providerMeta();
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
      <div className="flex flex-wrap gap-2">
        {meta.isDemo && <Badge tone="amber">Demo provider ({meta.name})</Badge>}
        {!meta.isDemo && <Badge tone="green">Live: {meta.name}</Badge>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs font-medium uppercase text-slate-500">Data remaining</p>
          <p className="mt-2 text-2xl font-bold text-weeble-700">{formatData(usage.dataRemainingMb)}</p>
          <p className="text-xs text-slate-400">of {formatData(usage.dataTotalMb)} total</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-slate-500">Active plans</p>
          <p className="mt-2 text-2xl font-bold">{usage.activePlans}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-slate-500">Devices</p>
          <p className="mt-2 text-2xl font-bold">{devices}</p>
          <Link href="/dashboard/devices" className="text-xs text-weeble-700 hover:underline">Manage →</Link>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase text-slate-500">Earned from ads</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{formatData(adMb._sum.dataMb || 0)}</p>
          <p className="text-xs text-slate-400">{adCount} rewards</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Recent purchases</h2>
            <Link href="/plans" className="text-sm text-weeble-700 hover:underline">Top up</Link>
          </div>
          {purchases.length === 0 ? (
            <p className="text-sm text-slate-500">
              No plans yet.{' '}
              <Link href="/plans" className="text-weeble-700 hover:underline">Browse US plans</Link>
            </p>
          ) : (
            <ul className="space-y-3">
              {purchases.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">{p.plan.name}</p>
                    <p className="text-xs text-slate-500">{formatData(p.dataRemainingMb)} left · {p.status}</p>
                  </div>
                  <span className="text-slate-600">{formatPrice(p.plan.priceCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-2 font-semibold text-slate-900">Quick actions</h2>
          <div className="grid gap-2">
            <Link href="/plans" className="rounded-xl border border-slate-200 px-4 py-3 text-sm hover:bg-weeble-50">Buy a US plan</Link>
            <Link href="/plans?region=international" className="rounded-xl border border-slate-200 px-4 py-3 text-sm hover:bg-weeble-50">International plans</Link>
            <Link href="/dashboard/earn" className="rounded-xl border border-slate-200 px-4 py-3 text-sm hover:bg-weeble-50">Watch ads for free data</Link>
            <Link href="/dashboard/devices" className="rounded-xl border border-slate-200 px-4 py-3 text-sm hover:bg-weeble-50">Install eSIM / view QR</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
