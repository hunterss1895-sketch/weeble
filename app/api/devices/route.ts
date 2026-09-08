import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';
import { ensureSeeded } from '@/lib/db/seed-on-boot';
import { jsonCors, optionsCors } from '@/lib/cors';
import { extractLpaString, pickQrImage, isSafeQrCodeValue } from '@/lib/esim-qr';

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
    const rawActivation = d.purchase?.activationCode || '';
    const rawQr = d.purchase?.qrPayload || null;
    // qrImage may be missing on older rows; fall back if qrPayload was wrongly a PNG.
    const qrImage = pickQrImage(d.purchase?.qrImage, rawQr);
    const lpa = extractLpaString(rawActivation, rawQr);
    const lines = rawActivation
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const installUrl = lines.find((l) => /^https?:\/\//i.test(l)) || null;
    // qrPayload for clients that encode a QR: always the short LPA when available.
    const qrPayload = isSafeQrCodeValue(lpa)
      ? lpa
      : isSafeQrCodeValue(rawQr)
        ? (rawQr as string)
        : null;

    return {
      id: d.id,
      nickname: d.nickname,
      status: d.status,
      iccid: d.iccid,
      installedAt: d.installedAt,
      createdAt: d.createdAt,
      /** Short LPA string safe for <QRCode value={...} /> */
      qrPayload,
      /** Alias for clients expecting lpa / lpaString / lpa_string */
      lpa,
      lpaString: lpa,
      lpa_string: lpa,
      activationCode: lpa || null,
      /** Optional provider PNG/data-URL or https image — render with <Image>, not QRCode */
      qrImage,
      qr_code: qrImage,
      qrCode: qrImage,
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
