import { Suspense } from 'react';
import { getEsimProvider } from '@/lib/providers';
import { PlanCard } from '@/components/PlanCard';
import { RegionFilter } from '@/components/RegionFilter';
import { ensureSeeded } from '@/lib/db/seed-on-boot';

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ region?: string }>;
}) {
  await ensureSeeded();
  const { region } = await searchParams;
  const provider = getEsimProvider();
  let plans = await provider.listPlans();

  const r = (region || 'us').toLowerCase();
  if (r === 'us') {
    plans = plans.filter((p) => p.isUs);
  } else if (r === 'international') {
    plans = plans.filter((p) => !p.isUs);
  } else {
    plans = plans.filter((p) => p.region.toLowerCase() === r || p.countryCode.toLowerCase() === r);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">eSIM plans</h1>
          <p className="mt-1 text-slate-500">
            US plans are shown by default. Use the region dropdown for international coverage.
          </p>
        </div>
        <Suspense fallback={null}>
          <RegionFilter />
        </Suspense>
      </div>
      {plans.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
          No plans in this region. Try United States or International.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      )}
    </div>
  );
}
