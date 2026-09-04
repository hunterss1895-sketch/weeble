/**
 * FirstyProvider — optional legacy eSIM provider (api.firsty.app often 404).
 * Prefer EsimCardProvider for custom SPN reseller branding.
 *
 * Official dashboard API (api.firsty.app):
 *   POST /oauth/token          JSON { grant_type, client_id, client_secret } → access_token
 *   GET  /v1/bundles           Bearer → { data: bundles }
 *   POST /v1/sims              { bundle_id, customer_ref } + Idempotency-Key
 *   POST /v1/sims/{id}/activate
 *   GET  /v1/sims/{id}         status / usage
 *
 * Env:
 *   FIRSTY_API_BASE      default https://api.firsty.app
 *   FIRSTY_CLIENT_ID / FIRSTY_CLIENT_SECRET
 *   PROVIDER=firsty
 *
 * On missing credentials or API errors, methods fall back to MockProvider
 * so the demo never crashes. isDemo=false when credentials exist (this class
 * is only selected when credentials are present).
 */
import { prisma } from '@/lib/db/prisma';
import { MockProvider } from './mock';
import type { EsimPlan, EsimProvider, ProviderDevice, PurchaseResult, UsageSummary } from './types';

const DEFAULT_BASE = 'https://api.firsty.app';

/** Retail cents = wholesale MB cost * markup (thin positive margin). */
function retailCentsFromMb(dataMb: number): number {
  const markup = Number(process.env.PRICE_MARKUP || '1.35');
  const wholesalePerMbCents = Number(process.env.FIRSTY_WHOLESALE_CENTS_PER_MB || '0.25');
  const raw = Math.round(dataMb * wholesalePerMbCents * (Number.isFinite(markup) ? markup : 1.35));
  return Math.min(1999, Math.max(99, raw));
}

function detectRegion(name: string, country?: string | null): { region: string; isUs: boolean; countryCode: string } {
  const hay = `${name || ''} ${country || ''}`.toUpperCase();
  const code = String(country || '').trim().toUpperCase();

  if (
    code === 'US' ||
    code === 'USA' ||
    /\bUSA\b/.test(hay) ||
    /\bU\.?S\.?A\.?\b/.test(hay) ||
    /\bUNITED STATES\b/.test(hay) ||
    /\bUS\b/.test(hay)
  ) {
    return { region: 'United States', isUs: true, countryCode: 'US' };
  }
  if (code === 'GB' || code === 'UK' || /\bUNITED KINGDOM\b/.test(hay) || /\bUK\b/.test(hay)) {
    return { region: 'United Kingdom', isUs: false, countryCode: code || 'GB' };
  }
  if (code === 'EU' || code.startsWith('EU') || /\bEUROPE\b/.test(hay) || /\bEU\b/.test(hay)) {
    return { region: 'Europe', isUs: false, countryCode: code || 'EU' };
  }
  if (/\bGLOBAL\b/.test(hay) || /\bWORLDWIDE\b/.test(hay) || code === 'GL' || code === 'WW') {
    return { region: 'Global', isUs: false, countryCode: code || 'GL' };
  }
  if (
    ['JP', 'KR', 'SG', 'TH', 'AS', 'HK', 'TW'].includes(code) ||
    /\bASIA\b/.test(hay)
  ) {
    return { region: 'Asia', isUs: false, countryCode: code || 'AS' };
  }
  if (['MX', 'BR', 'AR', 'CL', 'LA', 'CO'].includes(code) || /\bLATIN\b/.test(hay)) {
    return { region: 'Latin America', isUs: false, countryCode: code || 'LA' };
  }
  return {
    region: country || name || 'International',
    isUs: false,
    countryCode: (code || 'GL').slice(0, 8),
  };
}

function dataMbFromBundle(b: Record<string, unknown>): number {
  const candidates = [
    b.data_mb,
    b.dataMb,
    b.capacity_mb,
    b.capacityMb,
    b.data_amount_mb,
    b.amount_mb,
    b.mb,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  // GB fields
  const gbCandidates = [b.data_gb, b.dataGb, b.capacity_gb, b.capacityGb, b.gb];
  for (const c of gbCandidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) return Math.round(n * 1024);
  }
  // bytes
  const bytes = Number(b.data_bytes ?? b.dataBytes ?? b.bytes);
  if (Number.isFinite(bytes) && bytes > 0) return Math.max(1, Math.round(bytes / (1024 * 1024)));
  return 1024;
}

function validityDaysFromBundle(b: Record<string, unknown>): number {
  const days = Number(b.validity_days ?? b.validityDays ?? b.days ?? b.duration_days);
  if (Number.isFinite(days) && days > 0) return Math.round(days);
  const minutes = Number(b.validity_minutes ?? b.validityMinutes);
  if (Number.isFinite(minutes) && minutes > 0) return Math.max(1, Math.round(minutes / 1440));
  const hours = Number(b.validity_hours ?? b.validityHours);
  if (Number.isFinite(hours) && hours > 0) return Math.max(1, Math.round(hours / 24));
  return 7;
}

type TokenCache = { token: string; expiresAt: number };

type FirstyBundle = Record<string, unknown> & {
  id?: string | number;
  bundle_id?: string | number;
  name?: string;
  title?: string;
  country?: string;
  country_code?: string;
  countryCode?: string;
  countries?: string[] | string;
};

type FirstySim = {
  id?: string | number;
  sim_id?: string | number;
  iccid?: string;
  activation_code?: string;
  activationCode?: string;
  lpa?: string;
  qr?: string;
  qr_code?: string;
  status?: string;
  data_remaining_mb?: number;
  data_total_mb?: number;
  data_used_mb?: number;
  usage?: {
    remaining_mb?: number;
    total_mb?: number;
    used_mb?: number;
  };
};

export class FirstyProvider implements EsimProvider {
  readonly name = 'FirstyProvider';
  /** Live when credentials are configured; UI shows green “Live” badge. */
  readonly isDemo = false;

  private base: string;
  private clientId?: string;
  private clientSecret?: string;
  private tokenCache: TokenCache | null = null;
  private fallback = new MockProvider();

  constructor(opts?: {
    clientId?: string;
    clientSecret?: string;
    baseUrl?: string;
  }) {
    this.base = (opts?.baseUrl || process.env.FIRSTY_API_BASE || DEFAULT_BASE).replace(/\/$/, '');
    this.clientId = opts?.clientId || process.env.FIRSTY_CLIENT_ID?.trim();
    this.clientSecret = opts?.clientSecret || process.env.FIRSTY_CLIENT_SECRET?.trim();
  }

  static hasCredentials(): boolean {
    const id = process.env.FIRSTY_CLIENT_ID?.trim();
    const secret = process.env.FIRSTY_CLIENT_SECRET?.trim();
    return Boolean(id && secret);
  }

  private async getAccessToken(): Promise<string | null> {
    if (!this.clientId || !this.clientSecret) return null;

    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60_000) {
      return this.tokenCache.token;
    }

    try {
      const res = await fetch(`${this.base}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }),
        cache: 'no-store',
      });
      if (!res.ok) {
        console.warn('[Firsty] oauth/token failed', res.status);
        return null;
      }
      const data = (await res.json()) as { access_token?: string; expires_in?: number };
      if (!data.access_token) return null;
      this.tokenCache = {
        token: data.access_token,
        expiresAt: now + (data.expires_in ?? 3600) * 1000,
      };
      return data.access_token;
    } catch (e) {
      console.warn('[Firsty] oauth/token request failed', e);
      return null;
    }
  }

  private async api<T>(
    path: string,
    init?: RequestInit & { retryAuth?: boolean; idempotencyKey?: string }
  ): Promise<T | null> {
    const token = await this.getAccessToken();
    if (!token) return null;
    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(init?.headers as Record<string, string> | undefined),
      };
      if (init?.idempotencyKey) {
        headers['Idempotency-Key'] = init.idempotencyKey;
      }
      const { retryAuth: _r, idempotencyKey: _i, ...fetchInit } = init || {};
      const res = await fetch(`${this.base}${path}`, {
        ...fetchInit,
        headers,
        cache: 'no-store',
      });
      if (res.status === 401 && init?.retryAuth !== false) {
        this.tokenCache = null;
        return this.api<T>(path, { ...init, retryAuth: false });
      }
      if (!res.ok) {
        console.warn('[Firsty]', path, res.status);
        return null;
      }
      if (res.status === 204) return {} as T;
      return (await res.json()) as T;
    } catch (e) {
      console.warn('[Firsty] request failed, using mock fallback', e);
      return null;
    }
  }

  private mapBundle(b: FirstyBundle, i: number): EsimPlan | null {
    const id = String(b.id ?? b.bundle_id ?? '');
    if (!id) return null;
    const name = String(b.name || b.title || `Firsty bundle ${id}`);
    const countryRaw =
      b.country_code ||
      b.countryCode ||
      b.country ||
      (Array.isArray(b.countries) ? b.countries[0] : typeof b.countries === 'string' ? b.countries : '');
    const { region, isUs, countryCode } = detectRegion(name, countryRaw ? String(countryRaw) : null);
    const dataMb = dataMbFromBundle(b);
    const validityDays = validityDaysFromBundle(b);
    return {
      id,
      providerId: id,
      name,
      region,
      countryCode,
      dataMb,
      validityDays,
      priceCents: retailCentsFromMb(dataMb),
      currency: 'USD',
      description: `Firsty ${region} data — ${dataMb} MB / ${validityDays} days.`,
      popular: isUs && dataMb >= 3072 && dataMb <= 10240,
      isUs,
      features: ['Firsty multi-MNO', 'Instant QR', '4G/5G'],
    };
  }

  async listPlans(): Promise<EsimPlan[]> {
    try {
      const data = await this.api<{ data?: FirstyBundle[] } | FirstyBundle[]>('/v1/bundles');
      if (!data) return this.fallback.listPlans();

      const bundles = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
      if (!bundles.length) return this.fallback.listPlans();

      const plans = bundles
        .map((b, i) => this.mapBundle(b, i))
        .filter((p): p is EsimPlan => p != null && p.dataMb > 0);

      if (!plans.length) return this.fallback.listPlans();
      return plans;
    } catch (e) {
      console.warn('[Firsty] listPlans failed, mock fallback', e);
      return this.fallback.listPlans();
    }
  }

  async getPlan(id: string): Promise<EsimPlan | null> {
    try {
      const plans = await this.listPlans();
      const found = plans.find((p) => p.id === id || p.providerId === id);
      if (found) return found;
      return this.fallback.getPlan(id);
    } catch (e) {
      console.warn('[Firsty] getPlan failed, mock fallback', e);
      return this.fallback.getPlan(id);
    }
  }

  async purchase(planId: string, userId: string): Promise<PurchaseResult> {
    try {
      const plan = (await this.getPlan(planId)) || (await this.fallback.getPlan(planId));
      if (!plan) throw new Error('Plan not found');

      // Free starter / $0 plans stay local (ads/demo unlock) — never bill Firsty.
      if (plan.priceCents <= 0) {
        return this.fallback.purchase(planId, userId);
      }

      const bundleId = plan.providerId || plan.id;
      const customerRef = `weeble-${userId}-${Date.now()}`;
      const idemKey = `sim-${userId}-${planId}-${Date.now()}`;

      // 1) Create SIM with bundle
      const created = await this.api<{ data?: FirstySim } | FirstySim>('/v1/sims', {
        method: 'POST',
        body: JSON.stringify({
          bundle_id: bundleId,
          customer_ref: customerRef,
        }),
        idempotencyKey: idemKey,
      });

      const simRaw = created && 'data' in (created as object) && (created as { data?: FirstySim }).data
        ? (created as { data: FirstySim }).data
        : (created as FirstySim | null);

      const simId = simRaw?.id ?? simRaw?.sim_id;
      if (!simRaw || simId == null) {
        return this.fallback.purchase(planId, userId);
      }

      // 2) Activate
      await this.api(`/v1/sims/${simId}/activate`, {
        method: 'POST',
        body: JSON.stringify({}),
        idempotencyKey: `activate-${simId}-${Date.now()}`,
      });

      // 3) Fetch status / activation details
      const detailRes = await this.api<{ data?: FirstySim } | FirstySim>(`/v1/sims/${simId}`);
      const detail =
        detailRes && 'data' in (detailRes as object) && (detailRes as { data?: FirstySim }).data
          ? (detailRes as { data: FirstySim }).data
          : ((detailRes as FirstySim | null) || simRaw);

      const iccid = String(detail.iccid || `firsty-${simId}`);
      const activationCode = String(
        detail.activation_code || detail.activationCode || detail.lpa || ''
      );
      const qrPayload = activationCode.startsWith('LPA:')
        ? activationCode
        : detail.qr || detail.qr_code
          ? String(detail.qr || detail.qr_code)
          : `LPA:1$firsty.app$${activationCode || iccid}`;
      const expiresAt = new Date(Date.now() + plan.validityDays * 86400000);

      // Persist locally so dashboard/devices/usage keep working.
      let localPlanId = plan.id;
      const local = await prisma.plan.findFirst({
        where: { OR: [{ id: plan.id }, { providerId: plan.providerId }] },
      });
      if (local) {
        localPlanId = local.id;
      } else {
        const createdPlan = await prisma.plan.create({
          data: {
            id: plan.id.slice(0, 64),
            providerId: plan.providerId,
            name: plan.name,
            region: plan.region,
            countryCode: plan.countryCode,
            dataMb: plan.dataMb,
            validityDays: plan.validityDays,
            priceCents: plan.priceCents,
            currency: plan.currency,
            description: plan.description,
            popular: plan.popular,
            isUs: plan.isUs,
            features: JSON.stringify(plan.features),
          },
        });
        localPlanId = createdPlan.id;
      }

      const purchase = await prisma.purchase.create({
        data: {
          userId,
          planId: localPlanId,
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
    } catch (e) {
      console.warn('[Firsty] purchase failed, mock fallback', e);
      return this.fallback.purchase(planId, userId);
    }
  }

  async getUsage(userId: string): Promise<UsageSummary> {
    // Prefer local ledger (includes ad rewards); Firsty GET /v1/sims/{id} can enrich later.
    return this.fallback.getUsage(userId);
  }

  async getDevices(userId: string): Promise<ProviderDevice[]> {
    return this.fallback.getDevices(userId);
  }
}
