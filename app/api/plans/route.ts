import { NextRequest } from 'next/server';
import { CitrusProvider, getEsimProvider } from '@/lib/providers';
import { ensureSeeded } from '@/lib/db/seed-on-boot';
import { jsonCors, optionsCors } from '@/lib/cors';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req: NextRequest) {
  return optionsCors(req);
}

export async function GET(req: NextRequest) {
  await ensureSeeded();
  const country = (req.nextUrl.searchParams.get('country') || 'US').toUpperCase();
  const provider = getEsimProvider();

  try {
    let plans: Awaited<ReturnType<typeof provider.listPlans>> = [];

    if (provider instanceof CitrusProvider) {
      if (country === 'US' || country === 'USA' || country === 'ALL' || !country) {
        try {
          plans = await provider.listPopularWeebleTiers();
        } catch {
          plans = [];
        }
        if (!plans.length) {
          const all = await provider.listPlans();
          plans = all.filter((p) => p.isUs || p.countryCode === 'US');
        }
      } else {
        const all = await provider.listPlans();
        plans = all.filter(
          (p) =>
            p.countryCode?.toUpperCase() === country ||
            p.region?.toUpperCase().includes(country)
        );
        if (!plans.length) {
          // Credit packs for that ISO if present
          plans = all.filter((p) => p.id.toLowerCase().includes(country.toLowerCase()));
        }
      }
    } else {
      const all = await provider.listPlans();
      if (country === 'US' || country === 'USA' || !country) {
        plans = all.filter((p) => p.isUs);
        if (!plans.length) plans = all.filter((p) => p.popular).slice(0, 8);
      } else if (country === 'ALL') {
        plans = all;
      } else {
        plans = all.filter(
          (p) =>
            p.countryCode?.toUpperCase() === country ||
            p.region?.toUpperCase().includes(country)
        );
      }
    }

    return jsonCors({ ok: true, country, plans }, undefined, req);
  } catch (e) {
    return jsonCors(
      { error: e instanceof Error ? e.message : 'Failed to load plans', plans: [] },
      { status: 500 },
      req
    );
  }
}
