import { PlanCard } from '@/components/PlanCard';
import { PlansBrowser } from '@/components/PlansBrowser';
import { CitrusProvider, getEsimProvider } from '@/lib/providers';
import { ensureSeeded } from '@/lib/db/seed-on-boot';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PlansPage() {
  await ensureSeeded();
  const provider = getEsimProvider();

  let popular: Awaited<ReturnType<typeof provider.listPlans>> = [];
  let countries: Array<{ code: string; name: string }> = [];
  if (provider instanceof CitrusProvider) {
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
  if (!(provider instanceof CitrusProvider)) {
    popular = plans.filter((p) => p.popular).slice(0, 4);
  }

  return (
    <div className="space-y-12">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink-500">Weeble plans</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Countries & data credit
        </h1>
        <p className="mt-4 text-base text-ink-400">
          Browse by country. Each pack funds your eSIM wallet — pay-as-you-go until credit runs out.
        </p>
      </div>

      {popular.length > 0 && (
        <section className="space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-500">Popular US</p>
            <h2 className="mt-1 text-xl font-semibold text-white">United States credit</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {popular.map((p) => (
              <PlanCard key={`popular-${p.id}`} plan={p} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-500">Catalog</p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            {plans.length.toLocaleString()} credit packs
          </h2>
        </div>
        <PlansBrowser plans={plans} countries={countries} />
      </section>
    </div>
  );
}
