/**
 * FirstyProvider — primary real eSIM provider (recommended).
 * Docs: https://builders.firsty.app/esim-api
 * Developers: https://developers.firsty.app/
 *
 * Flow: Authenticate (JWT) → Provision eSIM → Activate (QR/LPA) → Manage
 * (top-up / suspend via packages + lifecycle).
 *
 * Auth env (either pattern):
 *   FIRSTY_CLIENT_ID + FIRSTY_CLIENT_SECRET  (OAuth2 client credentials)
 *   FIRSTY_API_KEY                           (pre-minted bearer / JWT shortcut)
 *
 * Base URL: FIRSTY_API_BASE
 *   default sandbox: https://connect.test.firsty.app/api/v3
 *   production:      https://connect.firsty.app/api/v3
 *
 * On missing credentials or API errors, methods fall back to MockProvider
 * so the demo never crashes. getEsimProvider() only selects Firsty when
 * credentials exist (otherwise MockProvider + Demo badge).
 */
import { prisma } from '@/lib/db/prisma';
import { MockProvider } from './mock';
import type { EsimPlan, EsimProvider, ProviderDevice, PurchaseResult, UsageSummary } from './types';

const DEFAULT_BASE = 'https://connect.test.firsty.app/api/v3';

/** Retail cents = wholesale MB cost * markup (thin positive margin). */
function retailCentsFromMb(dataMb: number): number {
  const markup = Number(process.env.PRICE_MARKUP || '1.35');
  // Approximate Firsty flat per-MB wholesale (~$0.0015–0.003); keep retail budget-friendly.
  const wholesalePerMbCents = Number(process.env.FIRSTY_WHOLESALE_CENTS_PER_MB || '0.25');
  const raw = Math.round(dataMb * wholesalePerMbCents * (Number.isFinite(markup) ? markup : 1.35));
  // Floor/ceiling so catalog stays in the “very cheap” band.
  return Math.min(1999, Math.max(99, raw));
}

function regionFromCountry(code: string): { region: string; isUs: boolean } {
  const c = (code || '').toUpperCase();
  if (c === 'US' || c === 'USA') return { region: 'United States', isUs: true };
  if (c === 'GB' || c === 'UK') return { region: 'United Kingdom', isUs: false };
  if (c === 'EU' || c.startsWith('EU')) return { region: 'Europe', isUs: false };
  if (c.includes('GLOBAL') || c === 'GL' || c === 'WW') return { region: 'Global', isUs: false };
  if (['JP', 'KR', 'SG', 'TH', 'AS', 'HK', 'TW'].includes(c) || c.startsWith('AS')) {
    return { region: 'Asia', isUs: false };
  }
  if (['MX', 'BR', 'AR', 'CL', 'LA', 'CO'].includes(c)) return { region: 'Latin America', isUs: false };
  return { region: code || 'International', isUs: false };
}

type TokenCache = { token: string; expiresAt: number };

export class FirstyProvider implements EsimProvider {
  readonly name = 'FirstyProvider';
  /** Live when credentials are configured; UI shows green “Live” badge. */
  readonly isDemo = false;

  private base: string;
  private clientId?: string;
  private clientSecret?: string;
  private apiKey?: string;
  private tokenCache: TokenCache | null = null;
  private fallback = new MockProvider();

  constructor(opts?: {
    clientId?: string;
    clientSecret?: string;
    apiKey?: string;
    baseUrl?: string;
  }) {
    this.base = (opts?.baseUrl || process.env.FIRSTY_API_BASE || DEFAULT_BASE).replace(/\/$/, '');
    this.clientId = opts?.clientId || process.env.FIRSTY_CLIENT_ID?.trim();
    this.clientSecret = opts?.clientSecret || process.env.FIRSTY_CLIENT_SECRET?.trim();
    this.apiKey = opts?.apiKey || process.env.FIRSTY_API_KEY?.trim();
  }

  static hasCredentials(): boolean {
    const key = process.env.FIRSTY_API_KEY?.trim();
    const id = process.env.FIRSTY_CLIENT_ID?.trim();
    const secret = process.env.FIRSTY_CLIENT_SECRET?.trim();
    return Boolean(key || (id && secret));
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.apiKey) return this.apiKey;
    if (!this.clientId || !this.clientSecret) return null;

    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60_000) {
      return this.tokenCache.token;
    }

    try {
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });
      const res = await fetch(`${this.base}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        cache: 'no-store',
      });
      if (!res.ok) {
        console.warn('[Firsty] auth failed', res.status);
        return null;
      }
      const data = (await res.json()) as { access_token?: string; expires_in?: number };
      if (!data.access_token) return null;
      this.tokenCache = {
        token: data.access_token,
        expiresAt: now + (data.expires_in ?? 86400) * 1000,
      };
      return data.access_token;
    } catch (e) {
      console.warn('[Firsty] auth request failed', e);
      return null;
    }
  }

  private async api<T>(
    path: string,
    init?: RequestInit & { retryAuth?: boolean }
  ): Promise<T | null> {
    const token = await this.getAccessToken();
    if (!token) return null;
    try {
      const res = await fetch(`${this.base}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(init?.headers || {}),
        },
        cache: 'no-store',
      });
      if (res.status === 401 && init?.retryAuth !== false && !this.apiKey) {
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

  async listPlans(): Promise<EsimPlan[]> {
    const data = await this.api<{
      data?: Array<{
        planReference?: string;
        name?: string;
        type?: string;
        capacityMb?: number | null;
        validityMinutes?: number;
        countryCode?: string;
        recurring?: boolean;
      }>;
    }>('/catalog/packages?limit=50');

    if (!data?.data?.length) return this.fallback.listPlans();

    return data.data
      .filter((p) => (p.type || 'data') === 'data' && Number(p.capacityMb || 0) > 0)
      .map((p, i) => {
        const code = String(p.countryCode || 'GL');
        const { region, isUs } = regionFromCountry(code);
        const dataMb = Number(p.capacityMb || 1024);
        const validityDays = Math.max(1, Math.round(Number(p.validityMinutes || 10080) / 1440));
        const id = String(p.planReference || `firsty-${i}`);
        return {
          id,
          providerId: id,
          name: String(p.name || `Firsty ${dataMb}MB`),
          region,
          countryCode: code.slice(0, 8).toUpperCase(),
          dataMb,
          validityDays,
          priceCents: retailCentsFromMb(dataMb),
          currency: 'USD',
          description: `Firsty ${region} data — ${dataMb} MB / ${validityDays} days.`,
          popular: isUs && dataMb >= 3072 && dataMb <= 10240,
          isUs,
          features: ['Firsty multi-MNO', 'Instant QR', '4G/5G', ...(p.recurring ? ['Auto-renew'] : [])],
        } satisfies EsimPlan;
      });
  }

  async getPlan(id: string): Promise<EsimPlan | null> {
    const plans = await this.listPlans();
    const found = plans.find((p) => p.id === id || p.providerId === id);
    if (found) return found;
    return this.fallback.getPlan(id);
  }

  async purchase(planId: string, userId: string): Promise<PurchaseResult> {
    const plan = (await this.getPlan(planId)) || (await this.fallback.getPlan(planId));
    if (!plan) throw new Error('Plan not found');

    // Free starter / $0 plans stay local (ads/demo unlock) — never bill Firsty.
    if (plan.priceCents <= 0) {
      return this.fallback.purchase(planId, userId);
    }

    const planReference = plan.providerId || plan.id;

    // 1) Provision eSIM (returns QR / LPA activation code)
    const ordered = await this.api<{
      data?: {
        profileReference?: string;
        esimReference?: string;
        iccid?: string;
        activationCode?: string;
      };
    }>('/esims', {
      method: 'POST',
      body: JSON.stringify({ externalProfileId: `weeble-${userId}-${Date.now()}` }),
      headers: { 'X-Idempotency-Key': `order-${userId}-${planId}-${Date.now()}` },
    });

    const esim = ordered?.data;
    if (!esim?.iccid || !esim.profileReference || !esim.esimReference) {
      return this.fallback.purchase(planId, userId);
    }

    // 2) Attach data package (top-up / plan) when planReference looks like Firsty
    const looksLikeFirstyPlan = /^[CS][0-9A-Z]{12,}$/i.test(planReference);
    if (looksLikeFirstyPlan) {
      await this.api(
        `/profiles/${esim.profileReference}/esims/${esim.esimReference}/packages`,
        {
          method: 'POST',
          body: JSON.stringify({
            planReference,
            externalTransactionId: `weeble-${userId}-${Date.now()}`,
          }),
          headers: { 'X-Idempotency-Key': `pkg-${userId}-${planId}-${Date.now()}` },
        }
      );
    }

    const activationCode = String(esim.activationCode || '');
    const qrPayload = activationCode.startsWith('LPA:')
      ? activationCode
      : `LPA:1$firsty.app$${activationCode || esim.iccid}`;
    const expiresAt = new Date(Date.now() + plan.validityDays * 86400000);
    const iccid = String(esim.iccid);

    // Persist locally so dashboard/devices/usage keep working.
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
    // Prefer local ledger (includes ad rewards); optionally enrich from Firsty later.
    return this.fallback.getUsage(userId);
  }

  async getDevices(userId: string): Promise<ProviderDevice[]> {
    return this.fallback.getDevices(userId);
  }

  /** Top-up stub: order another package onto an existing eSIM (Firsty manage step). */
  async topUp(opts: {
    profileReference: string;
    esimReference: string;
    planReference: string;
  }): Promise<boolean> {
    const res = await this.api(
      `/profiles/${opts.profileReference}/esims/${opts.esimReference}/packages`,
      {
        method: 'POST',
        body: JSON.stringify({ planReference: opts.planReference }),
      }
    );
    return Boolean(res);
  }

  /** Suspend stub: lifecycle suspend (Firsty manage step). */
  async suspend(opts: { profileReference: string; esimReference: string }): Promise<boolean> {
    const res = await this.api(
      `/profiles/${opts.profileReference}/esims/${opts.esimReference}/lifecycle`,
      {
        method: 'PATCH',
        body: JSON.stringify({ operation: 'suspend' }),
      }
    );
    return Boolean(res);
  }
}
