import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { ensureSeeded } from '@/lib/db/seed-on-boot';
import { Badge, Card } from '@/components/ui';
import { QrDisplay } from '@/components/QrDisplay';
import { DeviceActions } from './DeviceActions';
import { formatData, formatDate } from '@/lib/utils';

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ purchased?: string }>;
}) {
  await ensureSeeded();
  const session = await getSession();
  if (!session) return null;
  const { purchased } = await searchParams;

  const devices = await prisma.device.findMany({
    where: { userId: session.id },
    include: { purchase: { include: { plan: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      {purchased && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Purchase successful! Scan the QR below or follow the install steps on your phone.
        </div>
      )}
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Your devices</h2>
        <p className="text-sm text-slate-500">Nickname, ICCID, QR payload, and install steps for each eSIM.</p>
      </div>

      {devices.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No devices yet. Purchase a plan to get an eSIM QR.</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {devices.map((d) => (
            <Card key={d.id} className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{d.nickname}</h3>
                  <Badge tone={d.status === 'active' ? 'green' : 'amber'}>{d.status}</Badge>
                </div>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-slate-500">ICCID</dt>
                    <dd className="font-mono text-slate-800">{d.iccid}</dd>
                  </div>
                  {d.purchase && (
                    <>
                      <div>
                        <dt className="text-slate-500">Plan</dt>
                        <dd>{d.purchase.plan.name} · {formatData(d.purchase.dataRemainingMb)} left</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Activation code</dt>
                        <dd className="font-mono">{d.purchase.activationCode}</dd>
                      </div>
                      {d.purchase.expiresAt && (
                        <div>
                          <dt className="text-slate-500">Expires</dt>
                          <dd>{formatDate(d.purchase.expiresAt)}</dd>
                        </div>
                      )}
                    </>
                  )}
                </dl>
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  <p className="font-medium text-slate-800">Install steps</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4">
                    <li>Open Settings → Cellular / Mobile Data</li>
                    <li>Tap Add eSIM / Add Cellular Plan</li>
                    <li>Scan the QR code or enter the activation code</li>
                    <li>Label the line (e.g. Weeble) and enable data roaming</li>
                  </ol>
                </div>
                <DeviceActions id={d.id} nickname={d.nickname} status={d.status} />
              </div>
              <div className="flex flex-col items-center justify-center">
                {d.purchase?.qrPayload ? (
                  <QrDisplay payload={d.purchase.qrPayload} />
                ) : (
                  <p className="text-sm text-slate-400">No QR available</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
