import { listWeebleRetailPlans, getWeebleRetailPlan } from '@/lib/plans/weeble-plans';
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

function weebleSpn(): string {
  return (
    process.env.ESIMCARD_SPN?.trim() ||
    process.env.TELNYX_WHITELABEL_NAME?.trim() ||
    process.env.WEEBLE_SPN?.trim() ||
    'Weeble'
  );
}

function makeQrPayload(activationCode: string) {
  // Demo LPA string branded with Weeble SPN (matches Telnyx whitelabel_name when live)
  const spn = weebleSpn().replace(/\s+/g, '').toLowerCase() || 'weeble';
  return `LPA:1$${spn}.demo$` + activationCode;
}

export class MockProvider implements EsimProvider {
  readonly name = 'MockProvider';
  readonly isDemo = true;

  private liveEsimCardActive(): boolean {
    const forced = (process.env.PROVIDER || '').toLowerCase().trim();
    return forced === 'esimcard' && Boolean(process.env.ESIMCARD_TOKEN?.trim());
  }

  async listPlans(): Promise<EsimPlan[]> {
    // Fixed Weeble retail only — no mock seed catalog on the storefront.
    return listWeebleRetailPlans();
  }

  async getPlan(id: string): Promise<EsimPlan | null> {
    return getWeebleRetailPlan(id);
  }

  async purchase(planId: string, userId: string): Promise<PurchaseResult> {
    const retail = getWeebleRetailPlan(planId);
    let plan = await prisma.plan.findFirst({
      where: { OR: [{ id: planId }, { providerId: planId }, ...(retail ? [{ id: retail.id }, { providerId: retail.providerId }] : [])] },
    });
    if (!plan && retail) {
      const ledgerMb = retail.dataMb < 0 ? 999999 : retail.dataMb;
      plan = await prisma.plan.create({
        data: {
          id: retail.id,
          providerId: retail.providerId,
          name: retail.name,
          region: retail.region,
          countryCode: retail.countryCode,
          dataMb: ledgerMb,
          validityDays: retail.validityDays,
          priceCents: retail.priceCents,
          currency: retail.currency,
          description: retail.description,
          popular: retail.popular,
          isUs: retail.isUs,
          features: JSON.stringify(retail.features),
        },
      });
    }
    if (!plan) throw new Error('Plan not found');

    const ledgerMb = plan.dataMb < 0 ? 999999 : plan.dataMb;
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
        dataRemainingMb: ledgerMb,
        dataTotalMb: ledgerMb,
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
      dataTotalMb: ledgerMb,
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
