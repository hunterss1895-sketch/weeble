import { PlanCard } from '@/components/PlanCard';
import { PlansBrowser } from '@/components/PlansBrowser';
import { EsimCardProvider, getEsimProvider } from '@/lib/providers';
import { ensureSeeded } from '@/lib/db/seed-on-boot';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PlansPage() {
  await ensureSeeded();
  const provider = getEsimProvider();

  let popular: Awaited<ReturnType<typeof provider.listPlans>> = [];
  let countries: Array<{ code: string; name: string }> = [];
  if (provider instanceof EsimCardProvider) {
    try {
      popular = await provider.listPopularWeebleTiers();
    } catch {
      popular = [];
    }
    try {
      countries = await provider.listCountries();
    } catch {
      countries = [];
    }
  }

  const plans = await provider.listPlans();
  if (!(provider instanceof EsimCardProvider)) {
    popular = plans.filter((p) => p.popular).slice(0, 4);
  }

  return (
    <div className="space-y-12">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-weeble-400">Weeble plans</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-ink-50 sm:text-5xl">
          Destinations worldwide.
        </h1>
        <p className="mt-4 text-lg text-ink-400">
          Live Weeble eSIM catalog — browse by country or search. US plans first, then the world.
        </p>
      </div>

      {popular.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-weeble-400">Popular US</p>
              <h2 className="mt-1 text-2xl font-black text-ink-50">Quick picks</h2>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {popular.map((p) => (
              <PlanCard key={`popular-${p.id}`} plan={p} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-weeble-400">Full catalog</p>
          <h2 className="mt-1 text-2xl font-black text-ink-50">
            {plans.length.toLocaleString()} live plans
          </h2>
        </div>
        <PlansBrowser plans={plans} countries={countries} />
      </section>
    </div>
  );
}
