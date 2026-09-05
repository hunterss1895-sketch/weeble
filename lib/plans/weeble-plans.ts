import type { EsimPlan } from '@/lib/providers/types';

/**
 * Weeble fixed US retail catalog (exactly 4 tiers).
 * Storefront shows ONLY these plans — never the full upstream catalog.
 *
 * Internal eSIMCard package_type_id mapping (comments only — never shown in UI):
 *   5 GB      → 019c9954-75ca-7104-985d-c08d3a1e31cc  (5GB / 30 Days US V2, wholesale ~$5.00)
 *   10 GB     → 019c9954-7670-72cc-bd00-c071e84ca5e2  (10GB / 30 Days US V2, wholesale ~$9.08)
 *   50 GB     → 019c9954-770a-7033-a9cf-4242ceb23faf  (50GB / 30 Days US V2, wholesale ~$34.39)
 *   Unlimited → 019c9959-5778-7388-8a8d-03a9a5e31c40  (Unlimited Plus / 30 Days US V2 — highest US unlimited)
 *
 * Retail prices include markup over wholesale for a prepaid MVNO look.
 * dataMb = -1 means Unlimited in UI helpers.
 */
export const WEEBLE_RETAIL_PLANS: EsimPlan[] = [
  {
    id: 'weeble-us-5gb',
    providerId: '019c9954-75ca-7104-985d-c08d3a1e31cc',
    name: 'Weeble 5 GB',
    region: 'United States',
    countryCode: 'US',
    dataMb: 5 * 1024,
    validityDays: 30,
    priceCents: 1500,
    currency: 'USD',
    description: 'Light US data for messaging, maps, and everyday browsing. Instant eSIM with Weeble.',
    popular: false,
    isUs: true,
    features: ['United States coverage', '4G/5G', 'Hotspot OK', 'Instant QR', 'Weeble eSIM'],
  },
  {
    id: 'weeble-us-10gb',
    providerId: '019c9954-7670-72cc-bd00-c071e84ca5e2',
    name: 'Weeble 10 GB',
    region: 'United States',
    countryCode: 'US',
    dataMb: 10 * 1024,
    validityDays: 30,
    priceCents: 2500,
    currency: 'USD',
    description: 'Our most popular US plan — streaming, social, and remote work without sweat.',
    popular: true,
    isUs: true,
    features: ['United States coverage', '4G/5G', 'Hotspot OK', 'Instant QR', 'Weeble eSIM'],
  },
  {
    id: 'weeble-us-50gb',
    providerId: '019c9954-770a-7033-a9cf-4242ceb23faf',
    name: 'Weeble 50 GB',
    region: 'United States',
    countryCode: 'US',
    dataMb: 50 * 1024,
    validityDays: 30,
    priceCents: 4500,
    currency: 'USD',
    description: 'Heavy US data for creators, households, and always-on devices.',
    popular: false,
    isUs: true,
    features: ['United States coverage', '4G/5G', 'Hotspot OK', 'Instant QR', 'Weeble eSIM'],
  },
  {
    id: 'weeble-us-unlimited',
    providerId: '019c9959-5778-7388-8a8d-03a9a5e31c40',
    name: 'Weeble Unlimited',
    region: 'United States',
    countryCode: 'US',
    dataMb: -1,
    validityDays: 30,
    priceCents: 6500,
    currency: 'USD',
    description: 'Unlimited US data for the month. One plan, zero data anxiety — powered by Weeble.',
    popular: true,
    isUs: true,
    features: ['United States coverage', 'Unlimited data', '4G/5G', 'Hotspot OK', 'Instant QR', 'Weeble eSIM'],
  },
];

export function listWeebleRetailPlans(): EsimPlan[] {
  return WEEBLE_RETAIL_PLANS.map((p) => ({ ...p, features: [...p.features] }));
}

export function getWeebleRetailPlan(id: string): EsimPlan | null {
  const providerId = id.startsWith('esimcard-') ? id.slice('esimcard-'.length) : id;
  const found = WEEBLE_RETAIL_PLANS.find(
    (p) => p.id === id || p.providerId === id || p.providerId === providerId || p.id === providerId
  );
  return found ? { ...found, features: [...found.features] } : null;
}
