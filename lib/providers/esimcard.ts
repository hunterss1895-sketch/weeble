/**
 * EsimCardProvider — recommended reseller provider (custom SPN path).
 *
 * Official PHP SDK pattern (Codiea/esimcard-php-sdk):
 *   Sandbox: https://sandbox.esimcard.com/api/developer/
 *   Live:    https://portal.esimcard.com/api/developer/
 *   Auth:    Authorization: Bearer <ESIMCARD_TOKEN>
 *   First GET check-token → response.extension; then base + extension + '/'
 *
 * Endpoints (relative to extended base):
 *   GET  packages?page=&id=&type=&package_type=
 *   GET  packages/country | packages/continent | packages/global
 *   GET  package/detail/:id
 *   POST package/purchase { package_type_id, sim_applied, iccid }
 *   GET  my-esims, my-esims/:id, my-sim/:id/usage
 *   GET  pricing, balance
 *
 * Env:
 *   ESIMCARD_TOKEN
 *   ESIMCARD_SANDBOX=true|false (default true)
 *   ESIMCARD_SPN="Weeble" (brand name for docs/UI; enable Custom SPN in partner portal)
 *   PROVIDER=esimcard
 *
 * Apply: https://esimcard.com/partners/ (NDA → API token). Free setup; pay when you sell.
 * On missing token or API errors, fall back to MockProvider — never crashes.
 */
import { prisma } from '@/lib/db/prisma';
import { MockProvider } from './mock';
import type { EsimPlan, EsimProvider, ProviderDevice, PurchaseResult, UsageSummary } from './types';

const SANDBOX_BASE = 'https://sandbox.esimcard.com/api/developer/';
const LIVE_BASE = 'https://portal.esimcard.com/api/developer/';

function spnName(): string {
  return (
    process.env.ESIMCARD_SPN?.trim() ||
    process.env.WEEBLE_SPN?.trim() ||
    process.env.TELNYX_WHITELABEL_NAME?.trim() ||
    'Weeble'
  );
}

function useSandbox(): boolean {
  const v = (process.env.ESIMCARD_SANDBOX ?? 'true').toLowerCase().trim();
  return v !== 'false' && v !== '0' && v !== 'no';
}

/** Thin positive retail markup over wholesale (cents). */
function retailCentsFromWholesale(wholesaleCents: number, dataMb: number): number {
  const markup = Number(process.env.PRICE_MARKUP || '1.35');
  const m = Number.isFinite(markup) && markup > 0 ? markup : 1.35;
  if (Number.isFinite(wholesaleCents) && wholesaleCents > 0) {
    return Math.min(4999, Math.max(99, Math.round(wholesaleCents * m)));
  }
  // Fallback: ~$0.25/MB wholesale * markup
  const wholesalePerMb = Number(process.env.ESIMCARD_WHOLESALE_CENTS_PER_MB || '0.25');
  const raw = Math.round(dataMb * (Number.isFinite(wholesalePerMb) ? wholesalePerMb : 0.25) * m);
  return Math.min(4999, Math.max(99, raw));
}

function detectRegion(
  name: string,
  country?: string | null,
  type?: string | null
): { region: string; isUs: boolean; countryCode: string } {
  const hay = `${name || ''} ${country || ''} ${type || ''}`.toUpperCase();
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
  if (/\bGLOBAL\b/.test(hay) || /\bWORLDWIDE\b/.test(hay) || code === 'GL' || code === 'WW' || type === 'global') {
    return { region: 'Global', isUs: false, countryCode: code || 'GL' };
  }
  if (code === 'GB' || code === 'UK' || /\bUNITED KINGDOM\b/.test(hay) || /\bUK\b/.test(hay)) {
    return { region: 'United Kingdom', isUs: false, countryCode: code || 'GB' };
  }
  if (code === 'EU' || code.startsWith('EU') || /\bEUROPE\b/.test(hay) || /\bEU\b/.test(hay) || type === 'continent') {
    return { region: 'Europe', isUs: false, countryCode: code || 'EU' };
  }
  if (['JP', 'KR', 'SG', 'TH', 'AS', 'HK', 'TW'].includes(code) || /\bASIA\b/.test(hay)) {
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

function dataMbFromPkg(p: Record<string, unknown>): number {
  const candidates = [
    p.data_mb,
    p.dataMb,
    p.data,
    p.capacity_mb,
    p.amount_mb,
    p.mb,
    p.data_quantity,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n > 0) {
      // Some APIs return GB in a "data" field when unit is GB
      if (n > 0 && n < 100 && String(p.data_unit || p.unit || '').toUpperCase().includes('GB')) {
        return Math.round(n * 1024);
      }
      return Math.round(n);
    }
  }
  const gb = Number(p.data_gb ?? p.dataGb ?? p.gb ?? p.capacity_gb);
  if (Number.isFinite(gb) && gb > 0) return Math.round(gb * 1024);
  return 1024;
}

function validityDaysFromPkg(p: Record<string, unknown>): number {
  const days = Number(p.validity_days ?? p.validityDays ?? p.days ?? p.duration ?? p.validity);
  if (Number.isFinite(days) && days > 0) return Math.round(days);
  return 7;
}

function wholesaleCentsFromPkg(p: Record<string, unknown>): number {
  // price may be dollars or cents depending on field
  const price = Number(p.price ?? p.amount ?? p.wholesale_price ?? p.net_price);
  if (!Number.isFinite(price) || price <= 0) return 0;
  // Explicit cents fields
  const cents = Number(p.price_cents ?? p.priceCents ?? p.amount_cents);
  if (Number.isFinite(cents) && cents > 0) return Math.round(cents);
  // Fractional or small values → dollars
  if (!Number.isInteger(price) || price < 100) {
    return Math.round(price * 100);
  }
  // Integer >= 100 → already cents
  return Math.round(price);
}

function unwrapList(data: unknown): Record<string, unknown>[] {
  if (!data || typeof data !== 'object') return [];
  const o = data as Record<string, unknown>;
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  for (const key of ['data', 'packages', 'items', 'results']) {
    const v = o[key];
    if (Array.isArray(v)) return v as Record<string, unknown>[];
    if (v && typeof v === 'object') {
      const inner = v as Record<string, unknown>;
      for (const k2 of ['data', 'packages', 'items', 'results']) {
        if (Array.isArray(inner[k2])) return inner[k2] as Record<string, unknown>[];
      }
    }
  }
  return [];
}

type TokenCheck = { extension?: string; status?: boolean; message?: string };

export class EsimCardProvider implements EsimProvider {
  readonly name = 'EsimCardProvider';
  /** Live when token is configured; UI shows green “Live” badge. */
  readonly isDemo: boolean;

  private token?: string;
  private sandbox: boolean;
  private rootBase: string;
  private extendedBase: string | null = null;
  private extensionPromise: Promise<string | null> | null = null;
  private fallback = new MockProvider();

  constructor(opts?: { token?: string; sandbox?: boolean }) {
    this.token = opts?.token || process.env.ESIMCARD_TOKEN?.trim() || undefined;
    this.sandbox = opts?.sandbox ?? useSandbox();
    this.rootBase = (this.sandbox ? SANDBOX_BASE : LIVE_BASE).replace(/\/?$/, '/');
    this.isDemo = !this.token;
  }

  static hasCredentials(): boolean {
    return Boolean(process.env.ESIMCARD_TOKEN?.trim());
  }

  private async resolveExtension(): Promise<string | null> {
    if (!this.token) return null;
    if (this.extendedBase) return this.extendedBase;
    if (this.extensionPromise) return this.extensionPromise;

    this.extensionPromise = (async () => {
      try {
        const res = await fetch(`${this.rootBase}check-token`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
        });
        if (!res.ok) {
          console.warn('[EsimCard] check-token failed', res.status);
          return null;
        }
        const data = (await res.json()) as TokenCheck;
        const ext = data?.extension?.replace(/^\/+|\/+$/g, '');
        if (!ext) {
          console.warn('[EsimCard] check-token missing extension');
          return null;
        }
        this.extendedBase = `${this.rootBase}${ext}/`;
        return this.extendedBase;
      } catch (e) {
        console.warn('[EsimCard] check-token request failed', e);
        return null;
      } finally {
        this.extensionPromise = null;
      }
    })();

    return this.extensionPromise;
  }

  private async api<T>(
    path: string,
    init?: RequestInit & { query?: Record<string, string | number | null | undefined> }
  ): Promise<T | null> {
    if (!this.token) return null;
    const base = await this.resolveExtension();
    if (!base) return null;

    try {
      let url = `${base}${path.replace(/^\//, '')}`;
      if (init?.query) {
        const qs = new URLSearchParams();
        for (const [k, v] of Object.entries(init.query)) {
          if (v === null || v === undefined || v === '') continue;
          qs.set(k, String(v));
        }
        const s = qs.toString();
        if (s) url += (url.includes('?') ? '&' : '?') + s;
      }

      const { query: _q, ...fetchInit } = init || {};
      const res = await fetch(url, {
        ...fetchInit,
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(fetchInit.headers as Record<string, string> | undefined),
        },
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.warn('[EsimCard]', path, res.status, body.slice(0, 200));
        return null;
      }
      if (res.status === 204) return {} as T;
      return (await res.json()) as T;
    } catch (e) {
      console.warn('[EsimCard] request failed', e);
      return null;
    }
  }

  private mapPackage(p: Record<string, unknown>, i: number): EsimPlan | null {
    const id = String(
      p.package_type_id ?? p.packageTypeId ?? p.id ?? p.package_id ?? p.slug ?? ''
    );
    if (!id) return null;

    const name = String(p.name || p.title || p.package_name || `eSIMCard plan ${id}`);
    const countryRaw =
      p.country_code ||
      p.countryCode ||
      p.country ||
      p.location ||
      (Array.isArray(p.countries) ? (p.countries as string[])[0] : '');
    const type = String(p.type || p.package_type || p.packageType || '');
    const { region, isUs, countryCode } = detectRegion(
      name,
      countryRaw ? String(countryRaw) : null,
      type
    );
    const dataMb = dataMbFromPkg(p);
    const validityDays = validityDaysFromPkg(p);
    const wholesale = wholesaleCentsFromPkg(p);
    const priceCents = retailCentsFromWholesale(wholesale, dataMb);
    const spn = spnName();

    return {
      id: `esimcard-${id}`.slice(0, 64),
      providerId: id,
      name,
      region,
      countryCode,
      dataMb,
      validityDays,
      priceCents,
      currency: String(p.currency || 'USD'),
      description: `${spn} via eSIMCard — ${region} ${dataMb} MB / ${validityDays} days.`,
      popular: isUs && dataMb >= 1024 && dataMb <= 10240,
      isUs,
      features: [`${spn} SPN`, 'eSIMCard network', 'Instant QR', '4G/5G'],
    };
  }

  private preferUsGlobal(plans: EsimPlan[]): EsimPlan[] {
    const us = plans.filter((p) => p.isUs);
    const global = plans.filter((p) => !p.isUs && (p.countryCode === 'GL' || /global/i.test(p.region)));
    const rest = plans.filter((p) => !us.includes(p) && !global.includes(p));
    const ordered = [...us, ...global, ...rest];
    // Prefer US/global first; if we have any, return full ordered list (already prioritized)
    if (us.length || global.length) return ordered;
    return plans;
  }

  async listPlans(): Promise<EsimPlan[]> {
    try {
      if (!this.token) return this.fallback.listPlans();

      const collected: Record<string, unknown>[] = [];

      // Prefer country (US) + global endpoints, then general packages
      const countryRes = await this.api<unknown>('packages/country', { query: { page: 1 } });
      collected.push(...unwrapList(countryRes));

      const globalRes = await this.api<unknown>('packages/global', { query: { page: 1 } });
      collected.push(...unwrapList(globalRes));

      if (collected.length < 5) {
        const all = await this.api<unknown>('packages', { query: { page: 1 } });
        collected.push(...unwrapList(all));
      }

      if (!collected.length) {
        console.warn('[EsimCard] no packages; mock fallback');
        return this.fallback.listPlans();
      }

      const seen = new Set<string>();
      const plans: EsimPlan[] = [];
      collected.forEach((raw, i) => {
        const mapped = this.mapPackage(raw, i);
        if (!mapped || seen.has(mapped.providerId)) return;
        seen.add(mapped.providerId);
        plans.push(mapped);
      });

      if (!plans.length) return this.fallback.listPlans();
      return this.preferUsGlobal(plans);
    } catch (e) {
      console.warn('[EsimCard] listPlans failed, mock fallback', e);
      return this.fallback.listPlans();
    }
  }

  async getPlan(id: string): Promise<EsimPlan | null> {
    try {
      if (!this.token) return this.fallback.getPlan(id);

      // Strip optional esimcard- prefix
      const providerId = id.startsWith('esimcard-') ? id.slice('esimcard-'.length) : id;

      const detail = await this.api<Record<string, unknown> | { data?: Record<string, unknown> }>(
        `package/detail/${encodeURIComponent(providerId)}`
      );
      if (detail) {
        const raw =
          detail && typeof detail === 'object' && 'data' in detail && (detail as { data?: Record<string, unknown> }).data
            ? (detail as { data: Record<string, unknown> }).data
            : (detail as Record<string, unknown>);
        const mapped = this.mapPackage(raw, 0);
        if (mapped) return mapped;
      }

      const plans = await this.listPlans();
      const found = plans.find((p) => p.id === id || p.providerId === id || p.providerId === providerId);
      if (found) return found;
      return this.fallback.getPlan(id);
    } catch (e) {
      console.warn('[EsimCard] getPlan failed, mock fallback', e);
      return this.fallback.getPlan(id);
    }
  }

  private extractPurchaseFields(raw: Record<string, unknown>): {
    id?: string;
    iccid?: string;
    activationCode?: string;
    qrPayload?: string;
  } {
    const nested =
      (raw.data as Record<string, unknown> | undefined) ||
      (raw.esim as Record<string, unknown> | undefined) ||
      (raw.sim as Record<string, unknown> | undefined) ||
      raw;

    const id = String(nested.id ?? nested.esim_id ?? nested.sim_id ?? raw.id ?? '') || undefined;
    const iccid = String(nested.iccid ?? nested.ICCID ?? raw.iccid ?? '') || undefined;
    const activationCode = String(
      nested.activation_code ??
        nested.activationCode ??
        nested.lpa ??
        nested.matching_id ??
        nested.smdp_address ??
        ''
    ) || undefined;
    let qrPayload = String(nested.qr_code ?? nested.qr ?? nested.qrcode ?? nested.lpa ?? '') || undefined;
    if (!qrPayload && activationCode?.startsWith('LPA:')) qrPayload = activationCode;
    if (!qrPayload && nested.smdp_address && nested.matching_id) {
      qrPayload = `LPA:1$${nested.smdp_address}$${nested.matching_id}`;
    }
    return { id, iccid, activationCode, qrPayload };
  }

  async purchase(planId: string, userId: string): Promise<PurchaseResult> {
    try {
      const plan = (await this.getPlan(planId)) || (await this.fallback.getPlan(planId));
      if (!plan) throw new Error('Plan not found');

      // Free starter / $0 plans stay local — never bill eSIMCard.
      if (plan.priceCents <= 0 || !this.token) {
        return this.fallback.purchase(planId, userId);
      }

      const packageTypeId = plan.providerId || plan.id.replace(/^esimcard-/, '');
      const purchased = await this.api<Record<string, unknown>>('package/purchase', {
        method: 'POST',
        body: JSON.stringify({
          package_type_id: packageTypeId,
          sim_applied: true,
          iccid: null,
        }),
      });

      if (!purchased) {
        console.warn('[EsimCard] purchase returned null; mock fallback');
        return this.fallback.purchase(planId, userId);
      }

      let fields = this.extractPurchaseFields(purchased);

      // Enrich from my-esims detail when ICCID/QR missing
      if ((!fields.iccid || !fields.qrPayload) && fields.id) {
        const detail = await this.api<Record<string, unknown>>(`my-esims/${encodeURIComponent(fields.id)}`);
        if (detail) {
          const more = this.extractPurchaseFields(detail);
          fields = {
            id: fields.id || more.id,
            iccid: fields.iccid || more.iccid,
            activationCode: fields.activationCode || more.activationCode,
            qrPayload: fields.qrPayload || more.qrPayload,
          };
        }
      }

      // Last resort: list my-esims and pick newest
      if (!fields.iccid) {
        const list = await this.api<unknown>('my-esims', { query: { page: 1 } });
        const items = unwrapList(list);
        if (items.length) {
          const more = this.extractPurchaseFields(items[0]);
          fields = {
            id: fields.id || more.id,
            iccid: fields.iccid || more.iccid,
            activationCode: fields.activationCode || more.activationCode,
            qrPayload: fields.qrPayload || more.qrPayload,
          };
        }
      }

      if (!fields.iccid && !fields.qrPayload && !fields.activationCode) {
        console.warn('[EsimCard] purchase missing ICCID/QR; mock fallback');
        return this.fallback.purchase(planId, userId);
      }

      const spn = spnName();
      const iccid = fields.iccid || `esimcard-${fields.id || Date.now()}`;
      let activationCode = fields.activationCode || '';
      let qrPayload = fields.qrPayload || '';
      if (!qrPayload) {
        qrPayload = activationCode.startsWith('LPA:')
          ? activationCode
          : activationCode
            ? `LPA:1$esimcard.com$${activationCode}`
            : `LPA:1$${spn.toLowerCase().replace(/\s+/g, '')}.esimcard$${iccid}`;
      }
      if (!activationCode) {
        activationCode = qrPayload.startsWith('LPA:') ? qrPayload : `WEEBLE-${iccid.slice(-8)}`;
      }

      const expiresAt = new Date(Date.now() + plan.validityDays * 86400000);

      // Persist plan locally if needed
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
          nickname: `${plan.name} eSIM (${spn})`,
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
      console.warn('[EsimCard] purchase failed, mock fallback', e);
      return this.fallback.purchase(planId, userId);
    }
  }

  async getUsage(userId: string): Promise<UsageSummary> {
    try {
      if (!this.token) return this.fallback.getUsage(userId);

      const devices = await prisma.device.findMany({ where: { userId } });
      let remaining = 0;
      let total = 0;
      let hitRemote = false;

      for (const d of devices) {
        // Prefer device purchaseId / iccid as sim id when available
        const simKey = d.iccid;
        if (!simKey) continue;
        // Try usage by looking up my-esims then usage — local purchases store ICCID
        const purchases = await prisma.purchase.findMany({
          where: { userId, iccid: simKey, status: 'active' },
        });
        for (const p of purchases) {
          // Attempt remote usage if we can resolve an eSIMCard id (stored in activation sometimes)
          const usage = await this.api<Record<string, unknown>>(`my-sim/${encodeURIComponent(simKey)}/usage`);
          if (usage) {
            hitRemote = true;
            const rem = Number(
              usage.remaining_mb ??
                usage.data_remaining_mb ??
                (usage.data as Record<string, unknown> | undefined)?.remaining_mb ??
                p.dataRemainingMb
            );
            const tot = Number(
              usage.total_mb ??
                usage.data_total_mb ??
                (usage.data as Record<string, unknown> | undefined)?.total_mb ??
                p.dataTotalMb
            );
            if (Number.isFinite(rem)) remaining += rem;
            if (Number.isFinite(tot)) total += tot;
          }
        }
      }

      if (hitRemote) {
        const active = await prisma.purchase.count({ where: { userId, status: 'active' } });
        return { dataRemainingMb: remaining, dataTotalMb: total, activePlans: active };
      }
      return this.fallback.getUsage(userId);
    } catch (e) {
      console.warn('[EsimCard] getUsage failed, mock ledger', e);
      return this.fallback.getUsage(userId);
    }
  }

  async getDevices(userId: string): Promise<ProviderDevice[]> {
    return this.fallback.getDevices(userId);
  }
}
