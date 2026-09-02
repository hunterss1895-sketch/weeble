import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const plans = [
  { providerId: 'mock-us-1gb', name: 'USA Lite', region: 'United States', countryCode: 'US', dataMb: 1024, validityDays: 7, priceCents: 499, description: 'Perfect for a short US trip — maps, messaging, and light browsing.', popular: false, isUs: true, features: JSON.stringify(['4G/5G','Hotspot','Instant QR']) },
  { providerId: 'mock-us-5gb', name: 'USA Traveler', region: 'United States', countryCode: 'US', dataMb: 5120, validityDays: 15, priceCents: 1299, description: 'Our most popular US plan for two-week trips.', popular: true, isUs: true, features: JSON.stringify(['4G/5G','Hotspot','Instant QR','24/7 support']) },
  { providerId: 'mock-us-10gb', name: 'USA Unlimited Week', region: 'United States', countryCode: 'US', dataMb: 10240, validityDays: 30, priceCents: 2499, description: 'High-data US plan for remote work and streaming.', popular: true, isUs: true, features: JSON.stringify(['4G/5G','Hotspot','Instant QR','Priority network']) },
  { providerId: 'mock-us-20gb', name: 'USA Power', region: 'United States', countryCode: 'US', dataMb: 20480, validityDays: 30, priceCents: 3999, description: 'Maximum US data for creators and heavy users.', popular: false, isUs: true, features: JSON.stringify(['4G/5G','Hotspot','Instant QR']) },
  { providerId: 'mock-eu-5gb', name: 'Europe Explorer', region: 'Europe', countryCode: 'EU', dataMb: 5120, validityDays: 15, priceCents: 1499, description: 'Roam across 30+ European countries on one eSIM.', popular: true, isUs: false, features: JSON.stringify(['30+ countries','4G/5G','Hotspot']) },
  { providerId: 'mock-uk-3gb', name: 'UK City', region: 'United Kingdom', countryCode: 'GB', dataMb: 3072, validityDays: 14, priceCents: 999, description: 'London and beyond — reliable UK coverage.', popular: false, isUs: false, features: JSON.stringify(['4G/5G','Hotspot']) },
  { providerId: 'mock-asia-5gb', name: 'Asia Connect', region: 'Asia', countryCode: 'AS', dataMb: 5120, validityDays: 15, priceCents: 1599, description: 'Japan, Korea, Singapore, Thailand and more.', popular: false, isUs: false, features: JSON.stringify(['Multi-country','4G/5G']) },
  { providerId: 'mock-latam-3gb', name: 'LatAm Pass', region: 'Latin America', countryCode: 'LA', dataMb: 3072, validityDays: 14, priceCents: 1199, description: 'Mexico, Brazil, Argentina, Chile coverage.', popular: false, isUs: false, features: JSON.stringify(['Multi-country','4G']) },
  { providerId: 'mock-global-5gb', name: 'Global Nomad', region: 'Global', countryCode: 'GL', dataMb: 5120, validityDays: 30, priceCents: 2999, description: '100+ countries for the true digital nomad.', popular: true, isUs: false, features: JSON.stringify(['100+ countries','4G/5G','Hotspot']) },
  { providerId: 'mock-us-3gb', name: 'USA Weekend', region: 'United States', countryCode: 'US', dataMb: 3072, validityDays: 3, priceCents: 799, description: 'Quick weekend getaway coverage across the US.', popular: false, isUs: true, features: JSON.stringify(['4G/5G','Instant QR']) },
];

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.providerId },
      update: plan,
      create: { id: plan.providerId, ...plan },
    });
  }

  const hash = await bcrypt.hash('demo1234', 10);
  await prisma.user.upsert({
    where: { email: 'demo@weeble.com' },
    update: {},
    create: { email: 'demo@weeble.com', passwordHash: hash, name: 'Demo User' },
  });

  console.log('Seeded', plans.length, 'plans and demo user demo@weeble.com / demo1234');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
