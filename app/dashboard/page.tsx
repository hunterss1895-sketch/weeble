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
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">Data remaining</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatData(usage.dataRemainingMb)}</p>
          <p className="text-xs text-white/40">of {formatData(usage.dataTotalMb)} total</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">Active plans</p>
          <p className="mt-2 text-2xl font-semibold text-white">{usage.activePlans}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">Devices</p>
          <p className="mt-2 text-2xl font-semibold text-white">{devices}</p>
          <Link href="/dashboard/devices" className="text-xs font-medium text-white/55 hover:text-white">Manage →</Link>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">Earned from ads</p>
          <p className="mt-2 text-2xl font-semibold text-white">{formatData(adMb._sum.dataMb || 0)}</p>
          <p className="text-xs text-white/40">{adCount} rewards</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Recent purchases</h2>
            <Link href="/plans" className="text-sm font-medium text-white/55 hover:text-white">Top up</Link>
          </div>
          {purchases.length === 0 ? (
            <p className="text-sm text-white/45">
              No plans yet.{' '}
              <Link href="/plans" className="font-medium text-white/70 hover:text-white">Browse US plans</Link>
            </p>
          ) : (
            <ul className="space-y-3">
              {purchases.map((p) => (
                <li key={p.id} className="flex items-center justify-between border border-white/15 bg-black px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-white">{p.plan.name}</p>
                    <p className="text-xs text-white/40">{formatData(p.dataRemainingMb)} left · {p.status}</p>
                  </div>
                  <span className="font-medium text-white/70">{formatPrice(p.plan.priceCents)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 text-base font-semibold text-white">Quick actions</h2>
          <div className="grid gap-2">
            <Link href="/plans" className="border border-white/15 bg-black px-4 py-3 text-sm font-medium text-white/70 hover:border-white/40 hover:text-white transition">
              Order a plan
            </Link>
            <Link href="/dashboard/earn" className="border border-white/15 bg-black px-4 py-3 text-sm font-medium text-white/70 hover:border-white/40 hover:text-white transition">
              Watch ads for free data
            </Link>
            <Link href="/dashboard/devices" className="border border-white/15 bg-black px-4 py-3 text-sm font-medium text-white/70 hover:border-white/40 hover:text-white transition">
              Install eSIM / view QR
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
