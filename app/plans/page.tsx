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

  const usIds = new Set(usPlans.map((p) => p.id));
  const catalogPlans = plans.filter((p) => !usIds.has(p.id));

  return (
    <div>
      <section className="hero-gradient px-5 pb-16 pt-20 sm:px-8 sm:pb-20 sm:pt-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">
            Weeble plans
          </p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
            US data plans
          </h1>
          <p className="mt-6 max-w-xl text-base text-white/50 sm:text-lg">
            Full United States lineup{rateNote ? ` — ${rateNote}` : ''}. Coverage on T-Mobile,
            AT&amp;T, and Verizon. International destinations below.
          </p>
        </div>
      </section>

      {usPlans.length > 0 && (
        <section className="section-rule px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
                  United States
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  All US tiers
                </h2>
              </div>
              <p className="text-sm text-white/40">
                1 · 3 · 5 · 10 · 20 · 50 · 100 GB · Unlimited
              </p>
            </div>
            <div className="mt-12 grid gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
              {usPlans.map((p) => (
                <PlanCard key={`us-${p.id}`} plan={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section-rule px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl space-y-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
              International
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              More countries
              {catalogPlans.length ? (
                <span className="text-white/35"> · {catalogPlans.length.toLocaleString()}</span>
              ) : null}
            </h2>
            <p className="mt-3 max-w-xl text-sm text-white/45">
              Searchable credit packs for destinations worldwide.
            </p>
          </div>
          <PlansBrowser
            plans={catalogPlans.length ? catalogPlans : plans}
            countries={countries}
            defaultCountry="ALL"
          />
        </div>
      </section>
    </div>
  );
}
