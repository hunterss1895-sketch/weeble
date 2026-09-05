import type { EsimPlan } from '@/lib/providers/types';

/**
 * Optional Popular US highlight tiers (5 / 10 / 50 GB / Unlimited).
 * The main storefront is the FULL live eSIMCard catalog; these ids are only used
 * for the "Popular US" strip and still purchase via real package_type_id.
 *
 * Preferred eSIMCard package_type_ids (validated live; fallback = closest US by data size):
 *   5 GB      → 019c9954-75ca-7104-985d-c08d3a1e31cc
 *   10 GB     → 019c9954-7670-72cc-bd00-c071e84ca5e2
 *   50 GB     → 019c9954-770a-7033-a9cf-4242ceb23faf
 *   Unlimited → 019c9959-5778-7388-8a8d-03a9a5e31c40
 *
 * Markup rule (full catalog): retail ≈ wholesale × PRICE_MARKUP (default 2), snapped to $X.99.
 * Popular sticky prices kept when they still cover wholesale (+~5% margin).
 * Weeble-only branding in UI (no upstream provider names).
 * dataMb = -1 means Unlimited in UI helpers.
 */

export type WeebleTierKey = '5gb' | '10gb' | '50gb' | 'unlimited';

export type WeebleTierDef = {
  key: WeebleTierKey;
  id: string;
  name: string;
  /** Target data in MB; -1 = Unlimited */
  targetDataMb: number;
  preferredPackageTypeId: string;
  /** Sticky retail price when it still covers wholesale */
  retailPriceCents: number;
  description: string;
  popular: boolean;
  features: string[];
};

export const WEEBLE_TIER_DEFS: WeebleTierDef[] = [
  {
    key: '5gb',
    id: 'weeble-us-5gb',
    name: 'Weeble 5 GB',
    targetDataMb: 5 * 1024,
    preferredPackageTypeId: '019c9954-75ca-7104-985d-c08d3a1e31cc',
    retailPriceCents: 1500,
    description: 'Light US data for messaging, maps, and everyday browsing. Instant eSIM with Weeble.',
    popular: false,
    features: ['United States coverage', '4G/5G', 'Hotspot OK', 'Instant QR', 'Weeble eSIM'],
  },
  {
    key: '10gb',
    id: 'weeble-us-10gb',
    name: 'Weeble 10 GB',
    targetDataMb: 10 * 1024,
    preferredPackageTypeId: '019c9954-7670-72cc-bd00-c071e84ca5e2',
    retailPriceCents: 2500,
    description: 'Our most popular US plan — streaming, social, and remote work without sweat.',
    popular: true,
    features: ['United States coverage', '4G/5G', 'Hotspot OK', 'Instant QR', 'Weeble eSIM'],
  },
  {
    key: '50gb',
    id: 'weeble-us-50gb',
    name: 'Weeble 50 GB',
    targetDataMb: 50 * 1024,
    preferredPackageTypeId: '019c9954-770a-7033-a9cf-4242ceb23faf',
    retailPriceCents: 4500,
    description: 'Heavy US data for creators, households, and always-on devices.',
    popular: false,
    features: ['United States coverage', '4G/5G', 'Hotspot OK', 'Instant QR', 'Weeble eSIM'],
  },
  {
    key: 'unlimited',
    id: 'weeble-us-unlimited',
    name: 'Weeble Unlimited',
    targetDataMb: -1,
    preferredPackageTypeId: '019c9959-5778-7388-8a8d-03a9a5e31c40',
    retailPriceCents: 6500,
    description: 'Unlimited US data for the month. One plan, zero data anxiety — powered by Weeble.',
    popular: true,
    features: ['United States coverage', 'Unlimited data', '4G/5G', 'Hotspot OK', 'Instant QR', 'Weeble eSIM'],
  },
];

/** Sticky fallback catalog (no live API). Still carries preferred package_type_ids for purchase. */
export const WEEBLE_RETAIL_PLANS: EsimPlan[] = WEEBLE_TIER_DEFS.map((t) => ({
  id: t.id,
  providerId: t.preferredPackageTypeId,
  name: t.name,
  region: 'United States',
  countryCode: 'US',
  dataMb: t.targetDataMb,
  validityDays: 30,
  priceCents: t.retailPriceCents,
  currency: 'USD',
  description: t.description,
  popular: t.popular,
  isUs: true,
  features: [...t.features],
}));

export function listWeebleRetailPlans(): EsimPlan[] {
  return WEEBLE_RETAIL_PLANS.map((p) => ({ ...p, features: [...p.features] }));
}

export function getWeebleTierDef(id: string): WeebleTierDef | null {
  const providerId = id.startsWith('w-') ? id.slice(2) : id.startsWith('esimcard-') ? id.slice('esimcard-'.length) : id;
  return (
    WEEBLE_TIER_DEFS.find(
      (t) =>
        t.id === id ||
        t.id === providerId ||
        t.preferredPackageTypeId === id ||
        t.preferredPackageTypeId === providerId ||
        t.key === id
    ) || null
  );
}

export function getWeebleRetailPlan(id: string): EsimPlan | null {
  const tier = getWeebleTierDef(id);
  if (!tier) {
    const found = WEEBLE_RETAIL_PLANS.find(
      (p) => p.id === id || p.providerId === id || p.providerId === id.replace(/^(w-|esimcard-)/, '')
    );
    return found ? { ...found, features: [...found.features] } : null;
  }
  return {
    id: tier.id,
    providerId: tier.preferredPackageTypeId,
    name: tier.name,
    region: 'United States',
    countryCode: 'US',
    dataMb: tier.targetDataMb,
    validityDays: 30,
    priceCents: tier.retailPriceCents,
    currency: 'USD',
    description: tier.description,
    popular: tier.popular,
    isUs: true,
    features: [...tier.features],
  };
}

/**
 * Retail cents: keep sticky Weeble prices when they still cover wholesale (+small margin);
 * otherwise lift to wholesale × markup (default ~2x).
 */
export function retailCentsCoveringWholesale(
  stickyRetailCents: number,
  wholesaleCents: number,
  markupEnv?: string
): number {
  const markupRaw = Number(markupEnv ?? (process.env.PRICE_MARKUP || '2'));
  const markup = Number.isFinite(markupRaw) && markupRaw >= 1 ? markupRaw : 2;
  if (!Number.isFinite(wholesaleCents) || wholesaleCents <= 0) {
    return stickyRetailCents;
  }
  // Sticky is fine if it leaves ~5%+ margin over wholesale
  if (stickyRetailCents >= Math.ceil(wholesaleCents * 1.05)) {
    return stickyRetailCents;
  }
  return Math.max(stickyRetailCents, Math.round(wholesaleCents * markup));
}

export function buildWeeblePlanFromResolved(opts: {
  tier: WeebleTierDef;
  packageTypeId: string;
  wholesaleCents?: number;
  validityDays?: number;
  /** Override dataMb from live package when finite & positive; keep -1 for unlimited tier */
  liveDataMb?: number;
}): EsimPlan {
  const { tier, packageTypeId } = opts;
  const wholesale = opts.wholesaleCents ?? 0;
  const priceCents = retailCentsCoveringWholesale(tier.retailPriceCents, wholesale);
  const validityDays =
    Number.isFinite(opts.validityDays) && (opts.validityDays as number) > 0
      ? Math.round(opts.validityDays as number)
      : 30;

  let dataMb = tier.targetDataMb;
  if (tier.targetDataMb < 0) {
    dataMb = -1;
  } else if (Number.isFinite(opts.liveDataMb) && (opts.liveDataMb as number) > 0) {
    // Keep retail label via name; dataMb can reflect live package for ledger accuracy
    dataMb = Math.round(opts.liveDataMb as number);
  }

  return {
    id: tier.id,
    providerId: packageTypeId,
    name: tier.name,
    region: 'United States',
    countryCode: 'US',
    dataMb,
    validityDays,
    priceCents,
    currency: 'USD',
    description: tier.description,
    popular: tier.popular,
    isUs: true,
    features: [...tier.features],
  };
}
