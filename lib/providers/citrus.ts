/**
 * CitrusProvider — pay-as-you-go reseller (Citrus Mobile Reseller API v2).
 *
 * Base: https://citrusmobile.com/api/v2/reseller
 * Auth: Authorization: Bearer <CITRUS_API_KEY>
 *
 * Flow: GET /rates → catalog; purchase = POST /esim/provision ($1.75) then
 * POST /esim/{iccid}/fund with USD credit. Storefront sells retail credit packs
 * (~2× wholesale fund + provision fee). Weeble branding only in UI.
 *
 * Env: CITRUS_API_KEY, PROVIDER=citrus, PRICE_MARKUP (default 2)
 */
import { prisma } from '@/lib/db/prisma';
import { MockProvider } from './mock';
import type { EsimPlan, EsimProvider, ProviderDevice, PurchaseResult, UsageSummary } from './types';

const API_BASE = 'https://citrusmobile.com/api/v2/reseller';
const PROVISION_FEE_USD = 1.75;
/** Wholesale fund amounts offered as retail credit packs */
export const CITRUS_FUND_PACKS_USD = [10, 25, 50, 100] as const;

type CitrusCountry = {
  name: string;
  iso2: string;
  iso3?: string;
  flag?: string;
  continent?: string;
  has_data?: boolean;
  cheapest_per_gb_usd?: number;
  cheapest_operator?: string;
  networks?: Array<{ operator: string; per_mb_usd?: number; per_gb_usd?: number }>;
};

type RatesResponse = {
  total_countries?: number;
  discount?: string;
  countries?: CitrusCountry[];
};

type ProvisionedEsim = {
  id?: string;
  iccid?: string;
  lpa_string?: string;
  qr_code?: string;
  direct_install_url?: string;
  status?: string;
  cost?: number;
  balance_remaining?: number;
};

let ratesCache: { at: number; countries: CitrusCountry[] } | null = null;
const RATES_TTL_MS = 30 * 60_000;

function apiKey(): string {
  return process.env.CITRUS_API_KEY?.trim() || '';
}

function markup(): number {
  const m = Number(process.env.PRICE_MARKUP || '2');
  return Number.isFinite(m) && m >= 1 ? m : 2;
}

/** Retail cents ≈ fund×markup + $1.75 provision, snapped to $X.99 when ≥ $1 */
export function retailCentsForFund(fundUsd: number): number {
  const raw = fundUsd * markup() + PROVISION_FEE_USD;
  const cents = Math.max(1, Math.round(raw * 100));
  if (cents < 100) return cents;
  return Math.ceil(cents / 100) * 100 - 1;
}

export function parseCitrusPlanId(id: string): { iso2: string; fundUsd: number } | null {
  const m = /^citrus-([A-Z0-9]{2})-(\d+(?:\.\d+)?)$/i.exec(id.trim());
  if (!m) return null;
  const fundUsd = Number(m[2]);
  if (!Number.isFinite(fundUsd) || fundUsd < 0.01) return null;
  return { iso2: m[1].toUpperCase(), fundUsd };
}

export function citrusPlanId(iso2: string, fundUsd: number): string {
  return `citrus-${iso2.toUpperCase()}-${fundUsd}`;
}

function estimateDataMb(fundUsd: number, perGb: number | undefined): number {
  if (!Number.isFinite(perGb) || !perGb || perGb <= 0) {
    // Fallback rough estimate ~$1/GB wholesale → fund buys that many GB
    return Math.max(100, Math.round(fundUsd * 1024));
  }
  const gb = fundUsd / perGb;
  return Math.max(50, Math.round(gb * 1024));
}

function countryToPacks(c: CitrusCountry): EsimPlan[] {
  if (c.has_data === false) return [];
  const iso2 = (c.iso2 || '').toUpperCase();
  if (!iso2 || iso2.length < 2) return [];
  const isUs = iso2 === 'US' || iso2 === 'USA';
  const region = c.name || iso2;
  const flag = c.flag ? `${c.flag} ` : '';
  const perGb = Number(c.cheapest_per_gb_usd) || 0;
  const operator = c.cheapest_operator || 'local networks';

  return CITRUS_FUND_PACKS_USD.map((fundUsd, idx) => {
    const dataMb = estimateDataMb(fundUsd, perGb);
    const priceCents = retailCentsForFund(fundUsd);
    const gbLabel =
      dataMb >= 1024
        ? `~${(dataMb / 1024).toFixed(dataMb % 1024 === 0 ? 0 : 1)} GB`
        : `~${dataMb} MB`;
    return {
      id: citrusPlanId(iso2, fundUsd),
      providerId: citrusPlanId(iso2, fundUsd),
      name: `${flag}${region} $${fundUsd} credit`,
      region,
      countryCode: iso2 === 'USA' ? 'US' : iso2,
      dataMb,
      validityDays: 365,
      priceCents,
      currency: 'USD',
      description: `$${fundUsd} data credit for ${region}. Est. ${gbLabel} at ~$${perGb || '—'}/GB (${operator}). Includes eSIM setup. Pay-as-you-go until credit runs out.`,
      popular: isUs && (fundUsd === 25 || fundUsd === 50),
      isUs,
      features: [
        `${region} coverage`,
        `$${fundUsd} data credit`,
        'Pay-as-you-go',
        'Instant eSIM + QR',
        'Weeble eSIM',
        idx === 0 ? 'Includes setup fee' : '4G/5G',
      ],
    };
  });
}

export class CitrusProvider implements EsimProvider {
  readonly name = 'CitrusProvider';
  readonly isDemo = false;
  private fallback = new MockProvider();

  static hasCredentials(): boolean {
    return Boolean(apiKey());
  }

  private async api<T>(
    path: string,
    init: RequestInit & { okStatuses?: number[] } = {}
  ): Promise<T> {
    const key = apiKey();
    if (!key) throw new Error('Live provider credentials are not configured');
    const { okStatuses, ...req } = init;
    const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
    const res = await fetch(url, {
      ...req,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        ...(req.body ? { 'Content-Type': 'application/json' } : {}),
        ...(req.headers || {}),
      },
      cache: 'no-store',
    });
    const allowed = okStatuses || [200, 201];
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text };
    }
    if (!allowed.includes(res.status)) {
      const err = body as { error?: string; message?: string; code?: string } | null;
      const msg =
        err?.message || err?.error || `Upstream error (${res.status})`;
      console.warn(`[Citrus] ${req.method || 'GET'} ${path} → ${res.status}`);
      throw new Error(msg);
    }
    return body as T;
  }

  async getWalletBalance(): Promise<{
    balance_usd: number;
    lifetime_topup_usd?: number;
    lifetime_usage_usd?: number;
    data_suspended?: boolean;
    currency?: string;
  }> {
    return this.api('/wallet/balance');
  }

  async fetchCountries(): Promise<CitrusCountry[]> {
    if (ratesCache && Date.now() - ratesCache.at < RATES_TTL_MS) {
      return ratesCache.countries;
    }
    const data = await this.api<RatesResponse>('/rates');
    const countries = (data.countries || []).filter((c) => c && c.iso2);
    ratesCache = { at: Date.now(), countries };
    console.info(`[Citrus] rates loaded: ${countries.length} countries`);
    return countries;
  }

  async listCountries(): Promise<Array<{ code: string; name: string }>> {
    try {
      const countries = await this.fetchCountries();
      return countries
        .filter((c) => c.has_data !== false)
        .map((c) => ({
          code: (c.iso2 || '').toUpperCase() === 'USA' ? 'US' : (c.iso2 || '').toUpperCase(),
          name: c.name || c.iso2,
        }))
        .sort((a, b) => {
          if (a.code === 'US') return -1;
          if (b.code === 'US') return 1;
          return a.name.localeCompare(b.name);
        });
    } catch (e) {
      console.warn('[Citrus] listCountries failed', e);
      return [{ code: 'US', name: 'United States' }];
    }
  }

  async listPlans(): Promise<EsimPlan[]> {
    if (!apiKey()) {
      console.warn('[Citrus] no CITRUS_API_KEY; empty catalog');
      return [];
    }
    try {
      const countries = await this.fetchCountries();
      const plans: EsimPlan[] = [];
      // US first
      const ordered = [...countries].sort((a, b) => {
        const au = (a.iso2 || '').toUpperCase() === 'US' ? 0 : 1;
        const bu = (b.iso2 || '').toUpperCase() === 'US' ? 0 : 1;
        if (au !== bu) return au - bu;
        return (a.name || '').localeCompare(b.name || '');
      });
      for (const c of ordered) {
        plans.push(...countryToPacks(c));
      }
      return plans;
    } catch (e) {
      console.warn('[Citrus] listPlans failed', e);
      return [];
    }
  }

  /** US credit packs for homepage / popular strip */
  async listPopularWeebleTiers(): Promise<EsimPlan[]> {
    const all = await this.listPlans();
    const us = all.filter((p) => p.isUs);
    // Prefer $10,$25,$50,$100 order
    return CITRUS_FUND_PACKS_USD.map(
      (f) => us.find((p) => p.id === citrusPlanId('US', f))
    ).filter(Boolean) as EsimPlan[];
  }

  async getPlan(id: string): Promise<EsimPlan | null> {
    const parsed = parseCitrusPlanId(id);
    if (!parsed) {
      // Allow lookup from full catalog by id
      const plans = await this.listPlans();
      return plans.find((p) => p.id === id || p.providerId === id) || null;
    }
    try {
      const countries = await this.fetchCountries();
      const c = countries.find(
        (x) => (x.iso2 || '').toUpperCase() === parsed.iso2 || (x.iso3 || '').toUpperCase() === parsed.iso2
      );
      if (!c) return null;
      const packs = countryToPacks(c);
      return packs.find((p) => p.id === citrusPlanId(parsed.iso2, parsed.fundUsd)) || null;
    } catch (e) {
      console.warn('[Citrus] getPlan failed', e);
      return null;
    }
  }

  async purchase(planId: string, userId: string): Promise<PurchaseResult> {
    const plan = await this.getPlan(planId);
    if (!plan) throw new Error('Plan not found');
    const parsed = parseCitrusPlanId(plan.id);
    if (!parsed) throw new Error('Invalid plan');
    if (!apiKey()) throw new Error('Live provider credentials are not configured');

    const fundUsd = parsed.fundUsd;
    // Citrus Reseller API has no custom SPN — only label / end_user_reference.
    // UI must not claim the cellular SPN is Weeble.
    const orderRef = `${userId.slice(-6)}-${Date.now().toString(36)}`.slice(0, 48);
    const label = `Weeble-${orderRef}`.slice(0, 100);
    console.info(`[Citrus] provision + fund plan=${plan.id} fund_usd=${fundUsd}`);

    const provisioned = await this.api<ProvisionedEsim>('/esim/provision', {
      method: 'POST',
      body: JSON.stringify({
        end_user_reference: orderRef,
        label,
      }),
      okStatuses: [200, 201],
    });

    const iccid = String(provisioned.iccid || '');
    if (!iccid) throw new Error('Provisioning succeeded but ICCID was missing');

    await this.api(`/esim/${encodeURIComponent(iccid)}/fund`, {
      method: 'POST',
      body: JSON.stringify({ amount: fundUsd }),
      okStatuses: [200],
    });

    const lpa = String(provisioned.lpa_string || '').trim();
    const qrImage = String(provisioned.qr_code || '').trim();
    const installUrl = String(provisioned.direct_install_url || '').trim();

    let activationCode = lpa || installUrl || `WEEBLE-${iccid.slice(-8)}`;
    if (lpa && installUrl) {
      activationCode = `${lpa}\n${installUrl}`;
    }

    // Prefer PNG data-URL for dashboard QR; fall back to LPA string
    const qrPayload = qrImage.startsWith('data:image')
      ? qrImage
      : lpa || qrImage || activationCode;

    const expiresAt = new Date(Date.now() + plan.validityDays * 86400000);
    // Ledger: store fund as synthetic MB so dashboard has a balance figure
    const ledgerMb = plan.dataMb > 0 ? plan.dataMb : Math.round(fundUsd * 1024);

    let localPlanId = plan.id;
    const local = await prisma.plan.findFirst({
      where: { OR: [{ id: plan.id }, { providerId: plan.providerId }] },
    });
    if (local) {
      localPlanId = local.id;
    } else {
      const created = await prisma.plan.create({
        data: {
          id: plan.id.slice(0, 64),
          providerId: plan.providerId,
          name: plan.name.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim() || plan.name,
          region: plan.region,
          countryCode: plan.countryCode,
          dataMb: ledgerMb,
          validityDays: plan.validityDays,
          priceCents: plan.priceCents,
          currency: plan.currency,
          description: plan.description,
          popular: plan.popular,
          isUs: plan.isUs,
          features: JSON.stringify(plan.features),
        },
      });
      localPlanId = created.id;
    }

    const purchase = await prisma.purchase.create({
      data: {
        userId,
        planId: localPlanId,
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
        nickname: `${plan.region} $${fundUsd} eSIM`,
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
    try {
      if (!apiKey()) return this.fallback.getUsage(userId);

      const purchases = await prisma.purchase.findMany({
        where: { userId, status: 'active' },
      });
      let remaining = 0;
      let total = 0;
      let hitRemote = false;

      for (const p of purchases) {
        if (!p.iccid) {
          remaining += p.dataRemainingMb;
          total += p.dataTotalMb;
          continue;
        }
        try {
          const detail = await this.api<{
            wallet_balance_usd?: number | null;
            total_data_charged_usd?: number;
          }>(`/esim/${encodeURIComponent(p.iccid)}`);
          hitRemote = true;
          const bal = Number(detail.wallet_balance_usd);
          const charged = Number(detail.total_data_charged_usd) || 0;
          // Map USD wallet → approximate MB using plan ratio if possible
          if (Number.isFinite(bal) && bal >= 0 && p.dataTotalMb > 0) {
            // Rough: remaining fraction of original fund
            const parsed = parseCitrusPlanId(
              (await prisma.plan.findUnique({ where: { id: p.planId } }))?.providerId || ''
            );
            const fund = parsed?.fundUsd || 0;
            if (fund > 0) {
              const frac = Math.min(1, bal / fund);
              remaining += Math.round(p.dataTotalMb * frac);
              total += p.dataTotalMb;
            } else {
              remaining += Math.round(bal * 1024);
              total += Math.round((bal + charged) * 1024);
            }
          } else {
            remaining += p.dataRemainingMb;
            total += p.dataTotalMb;
          }
        } catch {
          remaining += p.dataRemainingMb;
          total += p.dataTotalMb;
        }
      }

      if (hitRemote || purchases.length) {
        return {
          dataRemainingMb: remaining,
          dataTotalMb: total,
          activePlans: purchases.length,
        };
      }
      return this.fallback.getUsage(userId);
    } catch (e) {
      console.warn('[Citrus] getUsage failed', e);
      return this.fallback.getUsage(userId);
    }
  }

  async getDevices(userId: string): Promise<ProviderDevice[]> {
    return this.fallback.getDevices(userId);
  }
}
