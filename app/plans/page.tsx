import { PlanCard } from '@/components/PlanCard';
import { PlansBrowser } from '@/components/PlansBrowser';
import { CitrusProvider, getEsimProvider } from '@/lib/providers';
import { ensureSeeded } from '@/lib/db/seed-on-boot';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PlansPage() {
  await ensureSeeded();
  const provider = getEsimProvider();

  let usPlans: Awaited<ReturnType<typeof provider.listPlans>> = [];
  let countries: Array<{ code: string; name: string }> = [];
  let rateNote = '';

  if (provider instanceof CitrusProvider) {
    try {
      usPlans = await provider.listPopularWeebleTiers();
    } catch {
      usPlans = [];
    }
    try {
      countries = await provider.listCountries();
    } catch {
      countries = [];
    }
    const perGb = await provider.getUsCheapestPerGb().catch(() => null);
    if (perGb) rateNote = `from $${perGb.toFixed(2)}/GB`;
  }

  const plans = await provider.listPlans();
  if (!(provider instanceof CitrusProvider)) {
    usPlans = plans.filter((p) => p.isUs).slice(0, 8);
    if (!usPlans.length) usPlans = plans.filter((p) => p.popular).slice(0, 4);
  }

  // International / searchable catalog — exclude US GB tiers already shown above
  const usIds = new Set(usPlans.map((p) => p.id));
  const catalogPlans = plans.filter((p) => !usIds.has(p.id));

  return (
    <div className="space-y-12">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink-500">Weeble plans</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          US data plans
        </h1>
        <p className="mt-4 text-base text-ink-400">
          Full United States lineup{rateNote ? ` — ${rateNote}` : ''}. Coverage on T-Mobile, AT&amp;T,
          and Verizon. International destinations below.
        </p>
      </div>

      {usPlans.length > 0 && (
        <section className="space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-500">United States</p>
            <h2 className="mt-1 text-xl font-semibold text-white">All US tiers</h2>
            <p className="mt-1 text-sm text-ink-500">
              1 GB · 3 GB · 5 GB · 10 GB · 20 GB · 50 GB · 100 GB · Unlimited
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {usPlans.map((p) => (
              <PlanCard key={`us-${p.id}`} plan={p} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-500">International</p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            More countries{catalogPlans.length ? ` · ${catalogPlans.length.toLocaleString()} packs` : ''}
          </h2>
          <p className="mt-1 text-sm text-ink-500">
            Searchable credit packs. Defaults to United States filter — switch country to browse.
          </p>
        </div>
        <PlansBrowser plans={catalogPlans.length ? catalogPlans : plans} countries={countries} defaultCountry="ALL" />
      </section>
    </div>
  );
}
