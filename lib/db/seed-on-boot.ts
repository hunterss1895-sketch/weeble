import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

const plans = [
  { id: 'mock-us-1gb', providerId: 'mock-us-1gb', name: 'USA Lite', region: 'United States', countryCode: 'US', dataMb: 1024, validityDays: 7, priceCents: 499, description: 'Perfect for a short US trip — maps, messaging, and light browsing.', popular: false, isUs: true, features: JSON.stringify(['4G/5G','Hotspot','Instant QR']) },
  { id: 'mock-us-5gb', providerId: 'mock-us-5gb', name: 'USA Traveler', region: 'United States', countryCode: 'US', dataMb: 5120, validityDays: 15, priceCents: 1299, description: 'Our most popular US plan for two-week trips.', popular: true, isUs: true, features: JSON.stringify(['4G/5G','Hotspot','Instant QR','24/7 support']) },
  { id: 'mock-us-10gb', providerId: 'mock-us-10gb', name: 'USA Unlimited Week', region: 'United States', countryCode: 'US', dataMb: 10240, validityDays: 30, priceCents: 2499, description: 'High-data US plan for remote work and streaming.', popular: true, isUs: true, features: JSON.stringify(['4G/5G','Hotspot','Instant QR','Priority network']) },
  { id: 'mock-us-20gb', providerId: 'mock-us-20gb', name: 'USA Power', region: 'United States', countryCode: 'US', dataMb: 20480, validityDays: 30, priceCents: 3999, description: 'Maximum US data for creators and heavy users.', popular: false, isUs: true, features: JSON.stringify(['4G/5G','Hotspot','Instant QR']) },
  { id: 'mock-us-3gb', providerId: 'mock-us-3gb', name: 'USA Weekend', region: 'United States', countryCode: 'US', dataMb: 3072, validityDays: 3, priceCents: 799, description: 'Quick weekend getaway coverage across the US.', popular: false, isUs: true, features: JSON.stringify(['4G/5G','Instant QR']) },
  { id: 'mock-eu-5gb', providerId: 'mock-eu-5gb', name: 'Europe Explorer', region: 'Europe', countryCode: 'EU', dataMb: 5120, validityDays: 15, priceCents: 1499, description: 'Roam across 30+ European countries on one eSIM.', popular: true, isUs: false, features: JSON.stringify(['30+ countries','4G/5G','Hotspot']) },
  { id: 'mock-uk-3gb', providerId: 'mock-uk-3gb', name: 'UK City', region: 'United Kingdom', countryCode: 'GB', dataMb: 3072, validityDays: 14, priceCents: 999, description: 'London and beyond — reliable UK coverage.', popular: false, isUs: false, features: JSON.stringify(['4G/5G','Hotspot']) },
  { id: 'mock-asia-5gb', providerId: 'mock-asia-5gb', name: 'Asia Connect', region: 'Asia', countryCode: 'AS', dataMb: 5120, validityDays: 15, priceCents: 1599, description: 'Japan, Korea, Singapore, Thailand and more.', popular: false, isUs: false, features: JSON.stringify(['Multi-country','4G/5G']) },
  { id: 'mock-latam-3gb', providerId: 'mock-latam-3gb', name: 'LatAm Pass', region: 'Latin America', countryCode: 'LA', dataMb: 3072, validityDays: 14, priceCents: 1199, description: 'Mexico, Brazil, Argentina, Chile coverage.', popular: false, isUs: false, features: JSON.stringify(['Multi-country','4G']) },
  { id: 'mock-global-5gb', providerId: 'mock-global-5gb', name: 'Global Nomad', region: 'Global', countryCode: 'GL', dataMb: 5120, validityDays: 30, priceCents: 2999, description: '100+ countries for the true digital nomad.', popular: true, isUs: false, features: JSON.stringify(['100+ countries','4G/5G','Hotspot']) },
];

let seeded = false;

export async function ensureSeeded() {
  if (seeded) return;
  try {
    const count = await prisma.plan.count();
    if (count === 0) {
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
