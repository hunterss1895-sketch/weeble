import { PlanCard } from '@/components/PlanCard';
import { getEsimProvider } from '@/lib/providers';
import { ensureSeeded } from '@/lib/db/seed-on-boot';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PlansPage() {
  await ensureSeeded();
  const plans = await getEsimProvider().listPlans();

  return (
    <div className="space-y-10">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-weeble-400">Weeble plans</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-ink-50 sm:text-5xl">
          Simple pricing. Four plans.
        </h1>
        <p className="mt-4 text-lg text-ink-400">
          United States coverage. Instant eSIM. No catalog clutter — just the Weeble lineup.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} />
        ))}
      </div>
    </div>
  );
}
