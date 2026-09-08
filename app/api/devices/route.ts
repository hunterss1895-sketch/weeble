import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
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

  const devices = await prisma.device.findMany({
    where: { userId: session.id },
    include: { purchase: { include: { plan: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const payload = devices.map((d) => {
    const raw = d.purchase?.activationCode || '';
    const lines = raw.split('\n').map((s) => s.trim()).filter(Boolean);
    const lpa = lines.find((l) => l.startsWith('LPA:')) || lines[0] || '';
    const installUrl = lines.find((l) => /^https?:\/\//i.test(l)) || null;
    return {
      id: d.id,
      nickname: d.nickname,
      status: d.status,
      iccid: d.iccid,
      installedAt: d.installedAt,
      createdAt: d.createdAt,
      qrPayload: d.purchase?.qrPayload || null,
      activationCode: lpa || null,
      installUrl,
      plan: d.purchase?.plan
        ? {
            id: d.purchase.plan.id,
            name: d.purchase.plan.name,
            dataMb: d.purchase.plan.dataMb,
            region: d.purchase.plan.region,
          }
        : null,
      dataRemainingMb: d.purchase?.dataRemainingMb ?? null,
      dataTotalMb: d.purchase?.dataTotalMb ?? null,
      expiresAt: d.purchase?.expiresAt ?? null,
      purchaseId: d.purchaseId,
    };
  });

  return jsonCors({ ok: true, devices: payload }, undefined, req);
}

export async function PATCH(req: NextRequest) {
  await ensureSeeded();
  const session = await getSession(req);
  if (!session) return jsonCors({ error: 'Unauthorized' }, { status: 401 }, req);
  const { id, nickname, status } = await req.json();
  if (!id) return jsonCors({ error: 'id required' }, { status: 400 }, req);

  const device = await prisma.device.findFirst({ where: { id, userId: session.id } });
  if (!device) return jsonCors({ error: 'Not found' }, { status: 404 }, req);

  const updated = await prisma.device.update({
    where: { id },
    data: {
      ...(nickname != null ? { nickname } : {}),
      ...(status != null
        ? { status, installedAt: status === 'active' ? new Date() : device.installedAt }
        : {}),
    },
  });
  return jsonCors(updated, undefined, req);
}
