import { getSession } from '@/lib/auth';
import { getEsimProvider } from '@/lib/providers';
import { prisma } from '@/lib/db/prisma';
import { ensureSeeded } from '@/lib/db/seed-on-boot';
import { Card } from '@/components/ui';
import { formatData, formatDate } from '@/lib/utils';

export default async function UsagePage() {
  await ensureSeeded();
  const session = await getSession();
  if (!session) return null;

  const usage = await getEsimProvider().getUsage(session.id);
  const purchases = await prisma.purchase.findMany({
    where: { userId: session.id },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });
  const records = await prisma.usageRecord.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const usedPct =
    usage.dataTotalMb > 0
      ? Math.min(100, Math.round(((usage.dataTotalMb - usage.dataRemainingMb) / usage.dataTotalMb) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-50">Usage & balance</h2>
        <p className="text-sm text-ink-400">Track remaining data across active plans and reward credits.</p>
      </div>

      <Card>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-ink-400">Remaining</p>
            <p className="text-3xl font-bold text-weeble-400">{formatData(usage.dataRemainingMb)}</p>
            <p className="text-xs text-ink-500">of {formatData(usage.dataTotalMb)}</p>
          </div>
          <p className="text-sm text-ink-400">{usedPct}% used</p>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-ink-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-weeble-500 to-emerald-400"
            style={{ width: `${100 - usedPct}%` }}
          />
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">Plans & top-ups</h3>
        {purchases.length === 0 ? (
          <p className="text-sm text-ink-400">No purchases yet.</p>
        ) : (
          <ul className="space-y-2">
            {purchases.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl bg-ink-950/70 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{p.plan.name}</p>
                  <p className="text-xs text-ink-400">
                    {formatData(p.dataRemainingMb)} / {formatData(p.dataTotalMb)} · {p.status}
                    {p.expiresAt ? ` · exp ${formatDate(p.expiresAt)}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">Activity</h3>
        {records.length === 0 ? (
          <p className="text-sm text-ink-400">No usage events yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {records.map((r) => (
              <li key={r.id} className="flex justify-between py-2 text-sm">
                <div>
                  <p className="font-medium">{r.note || r.source}</p>
                  <p className="text-xs text-ink-500">{r.source}</p>
                </div>
                <div className="text-right">
                  <p className={r.mbUsed < 0 ? 'text-weeble-400' : 'text-ink-200'}>
                    {r.mbUsed < 0 ? '+' : '-'}
                    {formatData(Math.abs(r.mbUsed))}
                  </p>
                  <p className="text-xs text-ink-500">{formatDate(r.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
