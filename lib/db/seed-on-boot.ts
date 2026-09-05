import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

/** Budget retail catalog — kept in sync on boot (upsert prices). */
const plans = [
  {
    id: 'mock-free-starter',
    providerId: 'mock-free-starter',
    name: 'Free Starter',
    region: 'United States',
    countryCode: 'US',
    dataMb: 100,
    validityDays: 3,
    priceCents: 0,
    description: 'Try Weeble free — unlock via Watch ads for data (no paid purchase required).',
    popular: false,
    isUs: true,
    features: JSON.stringify(['Ads unlock', 'Demo QR', 'No card needed']),
  },
  {
    id: 'mock-us-1gb',
    providerId: 'mock-us-1gb',
    name: 'USA Lite',
    region: 'United States',
    countryCode: 'US',
    dataMb: 1024,
    validityDays: 7,
    priceCents: 199,
    description: 'Perfect for a short US trip — maps, messaging, and light browsing.',
    popular: false,
    isUs: true,
    features: JSON.stringify(['4G/5G', 'Hotspot', 'Instant QR']),
  },
  {
    id: 'mock-us-3gb',
    providerId: 'mock-us-3gb',
    name: 'USA Traveler',
    region: 'United States',
    countryCode: 'US',
    dataMb: 3072,
    validityDays: 15,
    priceCents: 399,
    description: 'Our most popular US plan for two-week trips.',
    popular: true,
    isUs: true,
    features: JSON.stringify(['4G/5G', 'Hotspot', 'Instant QR', '24/7 support']),
  },
  {
    id: 'mock-us-5gb',
    providerId: 'mock-us-5gb',
    name: 'USA Month',
    region: 'United States',
    countryCode: 'US',
    dataMb: 5120,
    validityDays: 30,
    priceCents: 599,
    description: 'Budget US month pass for remote work and streaming.',
    popular: true,
    isUs: true,
    features: JSON.stringify(['4G/5G', 'Hotspot', 'Instant QR']),
  },
  {
    id: 'mock-us-10gb',
    providerId: 'mock-us-10gb',
    name: 'USA Power',
    region: 'United States',
    countryCode: 'US',
    dataMb: 10240,
    validityDays: 30,
    priceCents: 999,
    description: 'High-data US plan still under $10.',
    popular: true,
    isUs: true,
    features: JSON.stringify(['4G/5G', 'Hotspot', 'Instant QR', 'Priority network']),
  },
  {
    id: 'mock-eu-3gb',
    providerId: 'mock-eu-3gb',
    name: 'Europe Explorer',
    region: 'Europe',
    countryCode: 'EU',
    dataMb: 3072,
    validityDays: 15,
    priceCents: 449,
    description: 'Roam across 30+ European countries on one eSIM.',
    popular: true,
    isUs: false,
    features: JSON.stringify(['30+ countries', '4G/5G', 'Hotspot']),
  },
  {
    id: 'mock-uk-2gb',
    providerId: 'mock-uk-2gb',
    name: 'UK City',
    region: 'United Kingdom',
    countryCode: 'GB',
    dataMb: 2048,
    validityDays: 14,
    priceCents: 249,
    description: 'London and beyond — reliable UK coverage.',
    popular: false,
    isUs: false,
    features: JSON.stringify(['4G/5G', 'Hotspot']),
  },
  {
    id: 'mock-asia-5gb',
    providerId: 'mock-asia-5gb',
    name: 'Asia Connect',
    region: 'Asia',
    countryCode: 'AS',
    dataMb: 5120,
    validityDays: 15,
    priceCents: 699,
    description: 'Japan, Korea, Singapore, Thailand and more.',
    popular: false,
    isUs: false,
    features: JSON.stringify(['Multi-country', '4G/5G']),
  },
  {
    id: 'mock-latam-3gb',
    providerId: 'mock-latam-3gb',
    name: 'LatAm Pass',
    region: 'Latin America',
    countryCode: 'LA',
    dataMb: 3072,
    validityDays: 14,
    priceCents: 399,
    description: 'Mexico, Brazil, Argentina, Chile coverage.',
    popular: false,
    isUs: false,
    features: JSON.stringify(['Multi-country', '4G']),
  },
  {
    id: 'mock-global-5gb',
    providerId: 'mock-global-5gb',
    name: 'Global Nomad',
    region: 'Global',
    countryCode: 'GL',
    dataMb: 5120,
    validityDays: 30,
    priceCents: 1199,
    description: '100+ countries for the true digital nomad — still under $12.',
    popular: true,
    isUs: false,
    features: JSON.stringify(['100+ countries', '4G/5G', 'Hotspot']),
  },
];

let seeded = false;

function useLiveEsimCard(): boolean {
  const forced = (process.env.PROVIDER || '').toLowerCase().trim();
  const hasToken = Boolean(process.env.ESIMCARD_TOKEN?.trim());
  return forced === 'esimcard' && hasToken;
}

export async function ensureSeeded() {
  if (seeded) return;
  try {
    if (useLiveEsimCard()) {
      // Live eSIMCard storefront: purge seeded mock catalog so MockProvider cannot leak DB rows.
      const deleted = await prisma.plan.deleteMany({ where: { id: { startsWith: 'mock-' } } });
      if (deleted.count) {
        console.info(`[seed] purged ${deleted.count} mock-* plans (PROVIDER=esimcard)`);
      }
    } else {
      for (const plan of plans) {
        await prisma.plan.upsert({ where: { id: plan.id }, update: plan, create: plan });
      }
    }
    const demo = await prisma.user.findUnique({ where: { email: 'demo@weeble.com' } });
    if (!demo) {
      const passwordHash = await bcrypt.hash('demo1234', 10);
      await prisma.user.create({
        data: { email: 'demo@weeble.com', passwordHash, name: 'Demo User' },
      });
    }
    seeded = true;
  } catch (e) {
    console.warn('ensureSeeded failed (db may not be ready yet)', e);
  }
}
