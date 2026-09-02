import { prisma } from '@/lib/db/prisma';
import type { EsimPlan, EsimProvider, ProviderDevice, PurchaseResult, UsageSummary } from './types';

function mapPlan(p: {
  id: string;
  providerId: string;
  name: string;
  region: string;
  countryCode: string;
  dataMb: number;
  validityDays: number;
  priceCents: number;
  currency: string;
  description: string | null;
  popular: boolean;
  isUs: boolean;
  features: string;
}): EsimPlan {
  return {
    id: p.id,
    providerId: p.providerId,
    name: p.name,
    region: p.region,
    countryCode: p.countryCode,
    dataMb: p.dataMb,
    validityDays: p.validityDays,
    priceCents: p.priceCents,
    currency: p.currency,
    description: p.description || '',
    popular: p.popular,
    isUs: p.isUs,
    features: JSON.parse(p.features || '[]'),
  };
}

function randomIccid() {
  let s = '89';
  for (let i = 0; i < 18; i++) s += Math.floor(Math.random() * 10);
  return s;
}

function makeQrPayload(activationCode: string) {
  // LPA eSIM activation string (demo)
  return `LPA:1$weeble.demo$` + activationCode;
}

export class MockProvider implements EsimProvider {
  readonly name = 'MockProvider';
  readonly isDemo = true;

  async listPlans(): Promise<EsimPlan[]> {
    const plans = await prisma.plan.findMany({ orderBy: [{ isUs: 'desc' }, { popular: 'desc' }, { priceCents: 'asc' }] });
    return plans.map(mapPlan);
  }

  async getPlan(id: string): Promise<EsimPlan | null> {
    const plan = await prisma.plan.findUnique({ where: { id } });
    return plan ? mapPlan(plan) : null;
  }

  async purchase(planId: string, userId: string): Promise<PurchaseResult> {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plan not found');

    const iccid = randomIccid();
    const activationCode = 'WEEBLE-' + Math.random().toString(36).slice(2, 10).toUpperCase();
    const qrPayload = makeQrPayload(activationCode);
    const expiresAt = new Date(Date.now() + plan.validityDays * 24 * 60 * 60 * 1000);

    const purchase = await prisma.purchase.create({
      data: {
        userId,
        planId: plan.id,
        status: 'active',
        activationCode,
        qrPayload,
        iccid,
        dataRemainingMb: plan.dataMb,
        dataTotalMb: plan.dataMb,
        expiresAt,
      },
    });

    await prisma.device.create({
      data: {
        userId,
        purchaseId: purchase.id,
        nickname: plan.name + ' eSIM',
        iccid,
        status: 'pending_install',
      },
    });

    return {
      purchaseId: purchase.id,
      iccid,
      activationCode,
      qrPayload,
      dataTotalMb: plan.dataMb,
      expiresAt,
    };
  }

  async getUsage(userId: string): Promise<UsageSummary> {
    const purchases = await prisma.purchase.findMany({
      where: { userId, status: 'active' },
    });
    const dataRemainingMb = purchases.reduce((s, p) => s + p.dataRemainingMb, 0);
    const dataTotalMb = purchases.reduce((s, p) => s + p.dataTotalMb, 0);
    return { dataRemainingMb, dataTotalMb, activePlans: purchases.length };
  }

  async getDevices(userId: string): Promise<ProviderDevice[]> {
    const devices = await prisma.device.findMany({ where: { userId } });
    return devices.map((d) => ({ iccid: d.iccid, nickname: d.nickname, status: d.status }));
  }
}
