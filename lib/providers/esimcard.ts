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
 * On missing token only, fall back to MockProvider. With a live token, listPlans never returns mock.
 */
import dns from 'node:dns';
import { prisma } from '@/lib/db/prisma';
import { MockProvider } from './mock';
import type { EsimPlan, EsimProvider, ProviderDevice, PurchaseResult, UsageSummary } from './types';
import {
  WEEBLE_TIER_DEFS,
  buildWeeblePlanFromResolved,
  getWeebleRetailPlan,
  getWeebleTierDef,
  listWeebleRetailPlans,
  type WeebleTierDef,
} from '@/lib/plans/weeble-plans';

// VPS has IPv6; eSIMCard whitelist is IPv4-only — prefer A records (also set NODE_OPTIONS=--dns-result-order=ipv4first on start).
dns.setDefaultResultOrder('ipv4first');

/** Short in-memory cache of LIVE eSIMCard plans only (never mock). */
let livePlansCache: { at: number; plans: EsimPlan[] } | null = null;
const LIVE_CACHE_TTL_MS = 60_000;

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
  type?: string | null,
  scope?: string | null
): { region: string; isUs: boolean; countryCode: string } {
  const hay = `${name || ''} ${country || ''} ${type || ''} ${scope || ''}`.toUpperCase();
  const code = String(country || '').trim().toUpperCase();
  const scopeLower = String(scope || type || '').toLowerCase();

  if (
    code === 'US' ||
    code === 'USA' ||
    /\bUSA\b/.test(hay) ||
    /\bU\.?S\.?A\.?\b/.test(hay) ||
    /\bUNITED STATES\b/.test(hay) ||
    (/\bUS\b/.test(hay) && scopeLower !== 'global')
  ) {
    return { region: 'United States', isUs: true, countryCode: 'US' };
  }
  if (
    scopeLower === 'global' ||
    /\bGLOBAL\b/.test(hay) ||
    /\bWORLDWIDE\b/.test(hay) ||
    code === 'GL' ||
    code === 'WW' ||
    type === 'global'
  ) {
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
  const days = Number(
    p.package_validity ??
      p.validity_days ??
      p.validityDays ??
      p.days ??
      p.duration ??
      p.validity
  );
  if (Number.isFinite(days) && days > 0) {
    const unit = String(p.package_validity_unit || p.validity_unit || p.unit || '').toLowerCase();
    if (unit.includes('month')) return Math.round(days * 30);
    if (unit.includes('week')) return Math.round(days * 7);
    if (unit.includes('hour')) return Math.max(1, Math.round(days / 24));
    return Math.round(days);
  }
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
    // Purchase API expects package_type_id — prefer explicit field, else package id.
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
    const scope = String(p.scope || '');
    const { region, isUs, countryCode } = detectRegion(
      name,
      countryRaw ? String(countryRaw) : null,
      type,
      scope
    );
    const dataMb = dataMbFromPkg(p);
    const validityDays = validityDaysFromPkg(p);
    const wholesale = wholesaleCentsFromPkg(p);
    const priceCents = retailCentsFromWholesale(wholesale, dataMb);
    const spn = spnName();

    // Customer-facing copy is Weeble-only (no upstream brand names).
    return {
      id: `esimcard-${id}`.slice(0, 64),
      providerId: id,
      name: name.replace(/eSIMCard|esimcard|Visible|DepinSim|Firsty|Telnyx/gi, spn),
      region,
      countryCode,
      dataMb,
      validityDays,
      priceCents,
      currency: String(p.currency || 'USD'),
      description: `${spn} — ${region} ${dataMb < 0 ? 'Unlimited' : dataMb + ' MB'} / ${validityDays} days.`,
      popular: isUs && dataMb >= 1024 && dataMb <= 10240,
      isUs,
      features: [`${spn} eSIM`, 'Instant QR', '4G/5G', 'Hotspot OK'],
    };
  }

  private preferUsGlobal(plans: EsimPlan[]): EsimPlan[] {
    const us = plans.filter((p) => p.isUs);
    const global = plans.filter((p) => !p.isUs && (p.countryCode === 'GL' || /global/i.test(p.region)));
    const rest = plans.filter((p) => !us.includes(p) && !global.includes(p));
    const ordered = [...us, ...global, ...rest];
    if (us.length || global.length) return ordered;
    return plans;
  }

  private async fetchPackagePages(
    path: string,
    query: Record<string, string | number | null | undefined>,
    maxPages: number
  ): Promise<Record<string, unknown>[]> {
    const out: Record<string, unknown>[] = [];
    for (let page = 1; page <= maxPages; page++) {
      const res = await this.api<unknown>(path, { query: { ...query, page } });
      if (!res) break;
      const batch = unwrapList(res);
      if (!batch.length) break;
      out.push(...batch);
      if (batch.length < 10) break;
    }
    return out;
  }

  private packageTypeIdOf(p: Record<string, unknown>): string {
    return String(p.package_type_id ?? p.packageTypeId ?? p.id ?? p.package_id ?? p.slug ?? '');
  }

  private isUnlimitedPkg(p: Record<string, unknown>, dataMb: number): boolean {
    const name = String(p.name || p.title || p.package_name || '');
    if (/unlimited/i.test(name)) return true;
    // Treat very large caps as unlimited for matching
    return dataMb >= 500_000 || dataMb < 0;
  }

  private isUsPackage(p: Record<string, unknown>): boolean {
    const name = String(p.name || p.title || p.package_name || '');
    const countryRaw =
      p.country_code ||
      p.countryCode ||
      p.country ||
      p.location ||
      (Array.isArray(p.countries) ? (p.countries as string[])[0] : '');
    const type = String(p.type || p.package_type || p.packageType || '');
    const scope = String(p.scope || '');
    return detectRegion(name, countryRaw ? String(countryRaw) : null, type, scope).isUs;
  }

  /** Fetch a live package row by preferred id (detail endpoint and/or packages?id=). */
  private async fetchPackageById(id: string): Promise<Record<string, unknown> | null> {
    const detail = await this.api<Record<string, unknown> | { data?: Record<string, unknown> }>(
      `package/detail/${encodeURIComponent(id)}`
    );
    if (detail) {
      const raw =
        detail && typeof detail === 'object' && 'data' in detail && (detail as { data?: Record<string, unknown> }).data
          ? (detail as { data: Record<string, unknown> }).data
          : (detail as Record<string, unknown>);
      if (raw && typeof raw === 'object') return raw;
    }
    const listed = await this.api<unknown>('packages', { query: { id, page: 1 } });
    const batch = unwrapList(listed);
    if (batch.length) {
      const hit =
        batch.find((p) => this.packageTypeIdOf(p) === id) ||
        batch.find((p) => String(p.id || '') === id) ||
        batch[0];
      return hit || null;
    }
    return null;
  }

  /**
   * Build a US-focused package index for closest-size fallback.
   * Does NOT dump the full 6000+ catalog into the UI — only used for matching.
   */
  private async fetchUsPackageIndex(): Promise<Record<string, unknown>[]> {
    const collected: Record<string, unknown>[] = [];
    const seen = new Set<string>();

    const pushAll = (rows: Record<string, unknown>[]) => {
      for (const p of rows) {
        const id = this.packageTypeIdOf(p);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        collected.push(p);
      }
    };

    // Country endpoint first (usually local/US-heavy)
    pushAll(await this.fetchPackagePages('packages/country', {}, 5));

    // Explicit US / local filters when available
    pushAll(await this.fetchPackagePages('packages', { type: 'local', package_type: 'local' }, 3));
    pushAll(await this.fetchPackagePages('packages', { country: 'US' }, 3));
    pushAll(await this.fetchPackagePages('packages', { country_code: 'US' }, 2));

    // A few general pages as safety net (capped — never expose full catalog)
    if (collected.filter((p) => this.isUsPackage(p)).length < 8) {
      pushAll(await this.fetchPackagePages('packages', {}, 6));
    }

    return collected;
  }

  private pickClosestUsPackage(
    index: Record<string, unknown>[],
    tier: WeebleTierDef
  ): Record<string, unknown> | null {
    const us = index.filter((p) => this.isUsPackage(p));
    const pool = us.length ? us : index;
    if (!pool.length) return null;

    if (tier.targetDataMb < 0) {
      // Prefer named Unlimited / highest US data package
      const unlimited = pool.filter((p) => this.isUnlimitedPkg(p, dataMbFromPkg(p)));
      if (unlimited.length) {
        // Prefer "Plus" / higher wholesale as "best" unlimited
        return unlimited.sort((a, b) => wholesaleCentsFromPkg(b) - wholesaleCentsFromPkg(a))[0];
      }
      return pool.sort((a, b) => dataMbFromPkg(b) - dataMbFromPkg(a))[0];
    }

    const target = tier.targetDataMb;
    let best: Record<string, unknown> | null = null;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const p of pool) {
      const mb = dataMbFromPkg(p);
      if (this.isUnlimitedPkg(p, mb)) continue;
      const score = Math.abs(mb - target);
      // Prefer exact / near matches; slight preference for >= target
      const adj = score + (mb < target * 0.85 ? 5000 : 0);
      if (adj < bestScore) {
        bestScore = adj;
        best = p;
      }
    }
    return best;
  }

  private resolveTierFromPkg(tier: WeebleTierDef, pkg: Record<string, unknown>): EsimPlan {
    const packageTypeId = this.packageTypeIdOf(pkg) || tier.preferredPackageTypeId;
    const liveDataMb = dataMbFromPkg(pkg);
    const wholesale = wholesaleCentsFromPkg(pkg);
    const validityDays = validityDaysFromPkg(pkg);
    return buildWeeblePlanFromResolved({
      tier,
      packageTypeId,
      wholesaleCents: wholesale,
      validityDays,
      liveDataMb: tier.targetDataMb < 0 ? -1 : liveDataMb,
    });
  }

  /** Resolve exactly 4 Weeble tiers against live eSIMCard packages. */
  private async resolveWeebleTiersFromLive(): Promise<EsimPlan[] | null> {
    if (!this.token) return null;

    const preferredHits = await Promise.all(
      WEEBLE_TIER_DEFS.map(async (tier) => {
        const pkg = await this.fetchPackageById(tier.preferredPackageTypeId);
        return { tier, pkg };
      })
    );

    const needIndex = preferredHits.some((h) => !h.pkg);
    const index = needIndex ? await this.fetchUsPackageIndex() : [];

    // Also index preferred hits so closest matching can use them if needed later
    const indexById = new Map<string, Record<string, unknown>>();
    for (const p of index) {
      const id = this.packageTypeIdOf(p);
      if (id) indexById.set(id, p);
    }
    for (const h of preferredHits) {
      if (h.pkg) {
        const id = this.packageTypeIdOf(h.pkg) || h.tier.preferredPackageTypeId;
        indexById.set(id, h.pkg);
        indexById.set(h.tier.preferredPackageTypeId, h.pkg);
      }
    }

    const plans: EsimPlan[] = [];
    for (const { tier, pkg } of preferredHits) {
      let chosen = pkg;
      let source = 'preferred';
      if (!chosen) {
        // Preferred id may still appear in the broader index under another field shape
        chosen = indexById.get(tier.preferredPackageTypeId) || null;
      }
      if (!chosen) {
        chosen = this.pickClosestUsPackage(index, tier);
        source = 'closest-us';
      }
      if (!chosen) {
        console.warn(`[EsimCard] no live package for tier ${tier.key}; using sticky preferred id`);
        plans.push(
          buildWeeblePlanFromResolved({
            tier,
            packageTypeId: tier.preferredPackageTypeId,
          })
        );
        continue;
      }

      const plan = this.resolveTierFromPkg(tier, chosen);
      const wholesale = wholesaleCentsFromPkg(chosen);
      console.info(
        `[EsimCard] tier=${tier.key} source=${source} package_type_id=${plan.providerId} wholesale_cents=${wholesale} retail_cents=${plan.priceCents}`
      );
      plans.push(plan);
    }

    return plans.length === 4 ? plans : null;
  }

  async listPlans(): Promise<EsimPlan[]> {
    // Exactly 4 Weeble US retail cards — resolve package_type_ids from live eSIMCard when possible.
    try {
      if (this.token) {
        if (livePlansCache && Date.now() - livePlansCache.at < LIVE_CACHE_TTL_MS) {
          return livePlansCache.plans.map((p) => ({ ...p, features: [...p.features] }));
        }
        const live = await this.resolveWeebleTiersFromLive();
        if (live?.length === 4) {
          livePlansCache = { at: Date.now(), plans: live };
          console.info(
            `[EsimCard] storefront 4 tiers: ${live.map((p) => `${p.id}→${p.providerId}`).join(' | ')}`
          );
          return live.map((p) => ({ ...p, features: [...p.features] }));
        }
        console.warn('[EsimCard] live tier resolve incomplete; sticky preferred ids');
      }
    } catch (e) {
      console.warn('[EsimCard] listPlans live resolve failed; sticky retail', e);
    }
    const plans = listWeebleRetailPlans();
    livePlansCache = { at: Date.now(), plans };
    return plans;
  }

  async getPlan(id: string): Promise<EsimPlan | null> {
    try {
      if (id.startsWith('mock-') || id.includes('mock-')) return null;

      const tier = getWeebleTierDef(id);
      if (tier) {
        const plans = await this.listPlans();
        const hit = plans.find((p) => p.id === tier.id || p.providerId === id);
        if (hit) return { ...hit, features: [...hit.features] };
        return getWeebleRetailPlan(tier.id);
      }

      // Already-resolved weeble id from listPlans cache
      if (livePlansCache) {
        const hit = livePlansCache.plans.find(
          (p) => p.id === id || p.providerId === id || p.providerId === id.replace(/^esimcard-/, '')
        );
        if (hit) return { ...hit, features: [...hit.features] };
      }

      const retail = getWeebleRetailPlan(id);
      if (retail) return retail;

      if (!this.token) return null;
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
      return null;
    } catch (e) {
      console.warn('[EsimCard] getPlan failed (no mock fallback)', e);
      return null;
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
      // Prefer live-resolved Weeble tier (real package_type_id), then sticky retail, then mock.
      const plan =
        (await this.getPlan(planId)) ||
        getWeebleRetailPlan(planId) ||
        (await this.fallback.getPlan(planId));
      if (!plan) throw new Error('Plan not found');

      // Free starter / $0 plans stay local — never bill eSIMCard.
      if (plan.priceCents <= 0 || !this.token) {
        return this.fallback.purchase(planId, userId);
      }

      const packageTypeId = plan.providerId || plan.id.replace(/^esimcard-/, '');
      console.info(`[EsimCard] purchase plan=${plan.id} package_type_id=${packageTypeId}`);
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
      const ledgerMb = plan.dataMb < 0 ? 999999 : plan.dataMb;

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
          dataRemainingMb: ledgerMb,
          dataTotalMb: ledgerMb,
          expiresAt,
        },
      });

      await prisma.device.create({
        data: {
          userId,
          purchaseId: purchase.id,
          nickname: `${plan.name} eSIM`,
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
