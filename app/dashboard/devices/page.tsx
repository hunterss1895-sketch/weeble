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
        <div className="rounded-md border border-emerald-800/60 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-300">
          Purchase successful! Scan the QR below or follow the install steps on your phone.
        </div>
      )}
      <div>
        <h2 className="text-lg font-semibold text-white">Your devices</h2>
        <p className="text-sm text-ink-500">Nickname, ICCID, QR, and install steps for each eSIM.</p>
      </div>

      {devices.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-500">No devices yet. Purchase a credit pack to get an eSIM QR.</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {devices.map((d) => {
            const raw = d.purchase?.activationCode || '';
            const lines = raw.split('\n').map((s) => s.trim()).filter(Boolean);
            const lpa = lines.find((l) => l.startsWith('LPA:')) || lines[0] || '';
            const installUrl = lines.find((l) => /^https?:\/\//i.test(l));
            return (
              <Card key={d.id} className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-white">{d.nickname}</h3>
                    <Badge tone={d.status === 'active' ? 'green' : 'amber'}>{d.status}</Badge>
                  </div>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-ink-500">ICCID</dt>
                      <dd className="font-mono text-ink-200">{d.iccid}</dd>
                    </div>
                    {d.purchase && (
                      <>
                        <div>
                          <dt className="text-ink-500">Plan</dt>
                          <dd className="text-ink-200">{d.purchase.plan.name} · {formatData(d.purchase.dataRemainingMb)} left</dd>
                        </div>
                        {lpa && (
                          <div>
                            <dt className="text-ink-500">Activation code</dt>
                            <dd className="break-all font-mono text-xs text-ink-300">{lpa}</dd>
                          </div>
                        )}
                        {installUrl && (
                          <div>
                            <dt className="text-ink-500">Install link</dt>
                            <dd>
                              <a href={installUrl} className="break-all text-ink-300 underline hover:text-white">
                                Open install URL
                              </a>
                            </dd>
                          </div>
                        )}
                        {d.purchase.expiresAt && (
                          <div>
                            <dt className="text-ink-500">Expires</dt>
                            <dd className="text-ink-300">{formatDate(d.purchase.expiresAt)}</dd>
                          </div>
                        )}
                      </>
                    )}
                  </dl>
                  <div className="rounded-md border border-ink-800 bg-black p-3 text-sm text-ink-400">
                    <p className="font-medium text-ink-200">Install steps</p>
                    <ol className="mt-2 list-decimal space-y-1 pl-4">
                      <li>Open Settings → Cellular / Mobile Data</li>
                      <li>Tap Add eSIM / Add Cellular Plan</li>
                      <li>Scan the QR code or enter the activation code</li>
                      <li>Enable data roaming when you travel</li>
                    </ol>
                  </div>
                  <DeviceActions id={d.id} nickname={d.nickname} status={d.status} />
                </div>
                <div className="flex flex-col items-center justify-center">
                  {d.purchase?.qrPayload ? (
                    <QrDisplay payload={d.purchase.qrPayload} />
                  ) : (
                    <p className="text-sm text-ink-600">No QR available</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
