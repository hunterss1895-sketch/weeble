/**
 * CitrusProvider — pay-as-you-go reseller (Citrus Mobile Reseller API v2).
 *
 * Base: https://citrusmobile.com/api/v2/reseller
 * Auth: Authorization: Bearer <CITRUS_API_KEY>
 *
 * Flow: GET /rates → catalog; purchase = POST /esim/provision ($1.75) then
 * POST /esim/{iccid}/fund with USD credit.
 *
 * US storefront: fixed GB tiers (1/3/5/10/20/50/100/Unlimited) funded from
 * live cheapest_per_gb_usd. Unlimited = 200 GB equivalent at that rate
 * (documents as high-use credit; typically ≥ $150 at current US rates).
 * International: $10/$25/$50/$100 credit packs.
 *
 * Retail ≈ fund × PRICE_MARKUP + $1.75 provision, snapped to $X.99.
 * Weeble branding only in UI (no upstream provider name).
 *
 * Env: CITRUS_API_KEY, PROVIDER=citrus, PRICE_MARKUP (default 2)
 */
import { prisma } from '@/lib/db/prisma';
import { MockProvider } from './mock';
import type { EsimPlan, EsimProvider, ProviderDevice, PurchaseResult, UsageSummary } from './types';

const API_BASE = 'https://citrusmobile.com/api/v2/reseller';
const PROVISION_FEE_USD = 1.75;
/** Wholesale fund amounts for international credit packs */
export const CITRUS_FUND_PACKS_USD = [10, 25, 50, 100] as const;

/** US primary SKUs — GB amounts; Unlimited uses UNLIMITED_GB_EQUIV at live rate */
export const US_GB_TIERS = [1, 3, 5, 10, 20, 50, 100] as const;
/** Unlimited: fund enough for ~very high use (200 GB at cheapest US rate). */
export const UNLIMITED_GB_EQUIV = 200;
/** Floor so unlimited credit stays substantial if rates drop */
export const UNLIMITED_MIN_FUND_USD = 150;

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

export type CitrusPlanKind =
  | { kind: 'us-gb'; gb: number; unlimited?: false }
  | { kind: 'us-gb'; gb: typeof UNLIMITED_GB_EQUIV; unlimited: true }
  | { kind: 'credit'; iso2: string; fundUsd: number };

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

/** Round fund to cents (2 dp) for Citrus fund API */
export function roundFundUsd(n: number): number {
  return Math.round(n * 100) / 100;
}

export function unlimitedFundUsd(perGb: number): number {
  const fromGb = Number.isFinite(perGb) && perGb > 0 ? perGb * UNLIMITED_GB_EQUIV : UNLIMITED_MIN_FUND_USD;
  return roundFundUsd(Math.max(fromGb, UNLIMITED_MIN_FUND_USD));
}

export function fundUsdForUsGb(gb: number, perGb: number): number {
  if (!Number.isFinite(perGb) || perGb <= 0) {
    // Fallback ~$1/GB if rates missing
    return roundFundUsd(gb);
  }
  return roundFundUsd(gb * perGb);
}

export function citrusUsGbPlanId(gb: number | 'unlimited'): string {
  return gb === 'unlimited' ? 'citrus-US-unlimited' : `citrus-US-${gb}gb`;
}

export function citrusCreditPlanId(iso2: string, fundUsd: number): string {
  return `citrus-${iso2.toUpperCase()}-${fundUsd}`;
}

/** @deprecated alias — credit packs */
export function citrusPlanId(iso2: string, fundUsd: number): string {
  return citrusCreditPlanId(iso2, fundUsd);
}

export function parseCitrusPlanId(id: string): CitrusPlanKind | null {
  const raw = id.trim();
  const usGb = /^citrus-US-(\d+)gb$/i.exec(raw);
  if (usGb) {
    const gb = Number(usGb[1]);
    if (!Number.isFinite(gb) || gb <= 0) return null;
    return { kind: 'us-gb', gb, unlimited: false };
  }
  if (/^citrus-US-unlimited$/i.test(raw)) {
    return { kind: 'us-gb', gb: UNLIMITED_GB_EQUIV, unlimited: true };
  }
  const credit = /^citrus-([A-Z0-9]{2})-(\d+(?:\.\d+)?)$/i.exec(raw);
  if (!credit) return null;
  const fundUsd = Number(credit[2]);
  if (!Number.isFinite(fundUsd) || fundUsd < 0.01) return null;
  return { kind: 'credit', iso2: credit[1].toUpperCase(), fundUsd };
}

function estimateDataMb(fundUsd: number, perGb: number | undefined): number {
  if (!Number.isFinite(perGb) || !perGb || perGb <= 0) {
    return Math.max(100, Math.round(fundUsd * 1024));
  }
  const gb = fundUsd / perGb;
  return Math.max(50, Math.round(gb * 1024));
}

/** Major US carriers for coverage copy (Weeble branding — not a network picker). */
function usCoverageNetworks(c: CitrusCountry): string[] {
  const majors = ['T-Mobile', 'AT&T', 'Verizon'];
  const fromApi = (c.networks || [])
    .map((n) => n.operator || '')
    .filter(Boolean);
  const found: string[] = [];
  for (const m of majors) {
    const hit = fromApi.find((op) => op.toLowerCase().includes(m.toLowerCase().replace('&', '')));
    // AT&T special: "AT&T" or "ATT"
    if (m === 'AT&T') {
      const att = fromApi.find((op) => /at\s*&?\s*t/i.test(op) || /^att$/i.test(op));
      if (att) found.push('AT&T');
      continue;
    }
    if (hit || fromApi.some((op) => op.toLowerCase().includes(m.toLowerCase()))) {
      found.push(m === 'T-Mobile' ? 'T-Mobile' : m === 'Verizon' ? 'Verizon' : m);
    }
  }
  // Deduplicate while preserving order
  return found.length ? Array.from(new Set(found)) : majors;
}

function perGbLabel(perGb: number): string {
  if (!Number.isFinite(perGb) || perGb <= 0) return '—';
  return perGb < 1 ? perGb.toFixed(2) : perGb.toFixed(2);
}

function buildUsGbPlans(c: CitrusCountry): EsimPlan[] {
  const iso2 = 'US';
  const perGb = Number(c.cheapest_per_gb_usd) || 0;
  const networks = usCoverageNetworks(c);
  const coverage = networks.join(', ');
  const fromRate = perGb > 0 ? `from $${perGbLabel(perGb)}/GB` : 'pay-as-you-go';
  const popularGbs = new Set([5, 10, 50]);

  const tiers: EsimPlan[] = US_GB_TIERS.map((gb) => {
    const fundUsd = fundUsdForUsGb(gb, perGb);
    const priceCents = retailCentsForFund(fundUsd);
    const dataMb = gb * 1024;
    return {
      id: citrusUsGbPlanId(gb),
      providerId: citrusUsGbPlanId(gb),
      name: `Weeble ${gb} GB`,
      region: 'United States',
      countryCode: iso2,
      dataMb,
      validityDays: 365,
      priceCents,
      currency: 'USD',
      description: `${gb} GB US data credit (${fromRate}). Coverage on ${coverage}. Includes eSIM setup. Pay-as-you-go until credit runs out.`,
      popular: popularGbs.has(gb),
      isUs: true,
      features: [
        'United States coverage',
        `${gb} GB data`,
        `${fromRate} wholesale basis`,
        `Networks: ${coverage}`,
        'Instant eSIM + QR',
        'Weeble eSIM',
      ],
    };
  });

  const unlFund = unlimitedFundUsd(perGb);
  const unlPrice = retailCentsForFund(unlFund);
  tiers.push({
    id: citrusUsGbPlanId('unlimited'),
    providerId: citrusUsGbPlanId('unlimited'),
    name: 'Weeble Unlimited',
    region: 'United States',
    countryCode: iso2,
    dataMb: -1,
    validityDays: 365,
    priceCents: unlPrice,
    currency: 'USD',
    description: `High-use US data credit (~${UNLIMITED_GB_EQUIV} GB at ${fromRate}, $${unlFund.toFixed(2)} wholesale). Coverage on ${coverage}. Includes eSIM setup. Pay-as-you-go until credit runs out.`,
    popular: true,
    isUs: true,
    features: [
      'United States coverage',
      `~${UNLIMITED_GB_EQUIV} GB high-use credit`,
      `${fromRate} wholesale basis`,
      `Networks: ${coverage}`,
      'Instant eSIM + QR',
      'Weeble eSIM',
    ],
  });

  return tiers;
}

function countryToCreditPacks(c: CitrusCountry): EsimPlan[] {
  if (c.has_data === false) return [];
  const iso2Raw = (c.iso2 || '').toUpperCase();
  if (!iso2Raw || iso2Raw.length < 2) return [];
  // US uses GB tiers only — skip credit packs for US/USA
  if (iso2Raw === 'US' || iso2Raw === 'USA') return [];
  const iso2 = iso2Raw;
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
      id: citrusCreditPlanId(iso2, fundUsd),
      providerId: citrusCreditPlanId(iso2, fundUsd),
      name: `${flag}${region} $${fundUsd} credit`,
      region,
      countryCode: iso2,
      dataMb,
      validityDays: 365,
      priceCents,
      currency: 'USD',
      description: `$${fundUsd} data credit for ${region}. Est. ${gbLabel} at ~$${perGb || '—'}/GB (${operator}). Includes eSIM setup. Pay-as-you-go until credit runs out.`,
      popular: false,
      isUs: false,
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

function resolveFundUsd(parsed: CitrusPlanKind, perGb: number): number {
  if (parsed.kind === 'credit') return roundFundUsd(parsed.fundUsd);
  if (parsed.unlimited) return unlimitedFundUsd(perGb);
  return fundUsdForUsGb(parsed.gb, perGb);
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

  private findCountry(countries: CitrusCountry[], iso2: string): CitrusCountry | undefined {
    const code = iso2.toUpperCase();
    return countries.find(
      (x) =>
        (x.iso2 || '').toUpperCase() === code ||
        (x.iso3 || '').toUpperCase() === code ||
        (code === 'US' && (x.iso2 || '').toUpperCase() === 'USA')
    );
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
      const us = this.findCountry(countries, 'US');
      if (us) {
        plans.push(...buildUsGbPlans(us));
      }
      const ordered = [...countries].sort((a, b) => {
        const au = ['US', 'USA'].includes((a.iso2 || '').toUpperCase()) ? 0 : 1;
        const bu = ['US', 'USA'].includes((b.iso2 || '').toUpperCase()) ? 0 : 1;
        if (au !== bu) return au - bu;
        return (a.name || '').localeCompare(b.name || '');
      });
      for (const c of ordered) {
        plans.push(...countryToCreditPacks(c));
      }
      return plans;
    } catch (e) {
      console.warn('[Citrus] listPlans failed', e);
      return [];
    }
  }

  /** All US GB tiers for homepage / popular strip (live-priced). */
  async listPopularWeebleTiers(): Promise<EsimPlan[]> {
    try {
      const countries = await this.fetchCountries();
      const us = this.findCountry(countries, 'US');
      if (!us) return [];
      return buildUsGbPlans(us);
    } catch (e) {
      console.warn('[Citrus] listPopularWeebleTiers failed', e);
      return [];
    }
  }

  /** Live US cheapest $/GB from rates (for diagnostics / UI notes). */
  async getUsCheapestPerGb(): Promise<number | null> {
    try {
      const countries = await this.fetchCountries();
      const us = this.findCountry(countries, 'US');
      const v = Number(us?.cheapest_per_gb_usd);
      return Number.isFinite(v) && v > 0 ? v : null;
    } catch {
      return null;
    }
  }

  async getPlan(id: string): Promise<EsimPlan | null> {
    const parsed = parseCitrusPlanId(id);
    if (!parsed) {
      const plans = await this.listPlans();
      return plans.find((p) => p.id === id || p.providerId === id) || null;
    }
    try {
      const countries = await this.fetchCountries();
      if (parsed.kind === 'us-gb') {
        const us = this.findCountry(countries, 'US');
        if (!us) return null;
        const tiers = buildUsGbPlans(us);
        const want = parsed.unlimited ? citrusUsGbPlanId('unlimited') : citrusUsGbPlanId(parsed.gb);
        return tiers.find((p) => p.id === want) || null;
      }
      const c = this.findCountry(countries, parsed.iso2);
      if (!c) return null;
      const packs = countryToCreditPacks(c);
      return packs.find((p) => p.id === citrusCreditPlanId(parsed.iso2, parsed.fundUsd)) || null;
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

    let perGb = 0;
    if (parsed.kind === 'us-gb') {
      const countries = await this.fetchCountries();
      const us = this.findCountry(countries, 'US');
      perGb = Number(us?.cheapest_per_gb_usd) || 0;
    } else {
      const countries = await this.fetchCountries();
      const c = this.findCountry(countries, parsed.iso2);
      perGb = Number(c?.cheapest_per_gb_usd) || 0;
    }
    const fundUsd = resolveFundUsd(parsed, perGb);

    // Citrus Reseller API has no custom SPN — only label / end_user_reference.
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
    const qrCodeRaw = String(provisioned.qr_code || '').trim();
    const installUrl = String(provisioned.direct_install_url || '').trim();

    let activationCode = lpa || installUrl || `WEEBLE-${iccid.slice(-8)}`;
    if (lpa && installUrl) {
      activationCode = `${lpa}\n${installUrl}`;
    }

    // Citrus qr_code is often a huge base64 PNG data URL — never store that as the
    // QR payload (mobile react-native-qrcode-svg would crash). Keep LPA as qrPayload.
    const qrImage =
      qrCodeRaw.startsWith('data:image') || /^https?:\/\//i.test(qrCodeRaw)
        ? qrCodeRaw
        : '';
    const qrPayload =
      lpa || (!qrImage ? qrCodeRaw : '') || activationCode.split('\n')[0] || activationCode;

    const expiresAt = new Date(Date.now() + plan.validityDays * 86400000);
    const ledgerMb =
      plan.dataMb < 0
        ? UNLIMITED_GB_EQUIV * 1024
        : plan.dataMb > 0
          ? plan.dataMb
          : Math.round(fundUsd * 1024);

    let localPlanId = plan.id;
    const local = await prisma.plan.findFirst({
      where: { OR: [{ id: plan.id }, { providerId: plan.providerId }] },
    });
    if (local) {
      localPlanId = local.id;
      await prisma.plan.update({
        where: { id: local.id },
        data: {
          priceCents: plan.priceCents,
          dataMb: ledgerMb,
          description: plan.description,
          features: JSON.stringify(plan.features),
        },
      });
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
        qrImage: qrImage || null,
        iccid,
        dataRemainingMb: ledgerMb,
        dataTotalMb: ledgerMb,
        expiresAt,
      },
    });

    const nick =
      parsed.kind === 'us-gb'
        ? parsed.unlimited
          ? 'US Unlimited eSIM'
          : `US ${parsed.gb} GB eSIM`
        : `${plan.region} $${fundUsd} eSIM`;

    await prisma.device.create({
      data: {
        userId,
        purchaseId: purchase.id,
        nickname: nick,
        iccid,
        status: 'pending_install',
      },
    });

    return {
      purchaseId: purchase.id,
      iccid,
      activationCode,
      qrPayload,
      qrImage: qrImage || null,
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
          if (Number.isFinite(bal) && bal >= 0 && p.dataTotalMb > 0) {
            const planRow = await prisma.plan.findUnique({ where: { id: p.planId } });
            const parsed = parseCitrusPlanId(planRow?.providerId || planRow?.id || '');
            let fund = 0;
            if (parsed?.kind === 'credit') {
              fund = parsed.fundUsd;
            } else if (parsed?.kind === 'us-gb') {
              const countries = await this.fetchCountries();
              const us = this.findCountry(countries, 'US');
              const rate = Number(us?.cheapest_per_gb_usd) || 0;
              fund = resolveFundUsd(parsed, rate);
            }
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
