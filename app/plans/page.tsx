import Link from 'next/link';
import { PlanCard } from '@/components/PlanCard';
import { PlansBrowser } from '@/components/PlansBrowser';
import { CitrusProvider, getEsimProvider } from '@/lib/providers';
import { ensureSeeded } from '@/lib/db/seed-on-boot';
import { formatData, formatPrice } from '@/lib/utils';

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
  const highlight = usPlans.filter((p) =>
    ['citrus-US-10gb', 'citrus-US-50gb', 'citrus-US-unlimited'].includes(p.id)
  );
  const threeUp = highlight.length === 3 ? highlight : usPlans.slice(0, 3);

  return (
    <div>
      <section className="px-5 pb-10 pt-20 sm:px-8 sm:pt-28">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Service Plans
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-white/50">
            United States eSIM data{rateNote ? ` — ${rateNote}` : ''}. Coverage on T-Mobile, AT&amp;T,
            and Verizon.
          </p>
        </div>
      </section>

      {threeUp.length > 0 && (
        <section className="px-5 pb-12 sm:px-8">
          <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
            {threeUp.map((p) => (
              <PlanCard key={`hi-${p.id}`} plan={p} />
            ))}
          </div>
        </section>
      )}

      {usPlans.length > 0 && (
        <section className="px-5 py-12 sm:px-8 sm:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-2xl bg-zinc-900 p-6 sm:p-10">
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                United States
              </h2>
              <p className="mt-2 text-sm text-white/50">Best for phones and travel in the US</p>
              <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
                Key features
              </p>
              <ul className="mt-4 space-y-2 text-sm text-white/80">
                <li>Instant eSIM + QR install</li>
                <li>T-Mobile, AT&amp;T, Verizon coverage</li>
                <li>Pay-as-you-go until credit runs out</li>
                <li>Live wholesale rates{rateNote ? ` (${rateNote})` : ''}</li>
              </ul>
              <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
                Data plans
              </p>
              <ul className="mt-4 divide-y divide-white/10">
                {usPlans.map((p) => {
                  const title = p.name.replace(/^Weeble\s+/i, '');
                  const price = formatPrice(p.priceCents, p.currency).replace('.00', '');
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-4 py-4">
                      <div>
                        <Link
                          href={`/plans/${p.id}`}
                          className="text-base font-medium text-white hover:underline"
                        >
                          {title}
                        </Link>
                        <p className="mt-0.5 text-sm text-white/40">
                          {formatData(p.dataMb)}
                          {p.dataMb < 0 ? ' high-use credit' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold text-white">{price}</p>
                        <Link
                          href={`/plans/${p.id}`}
                          className="mt-1 inline-block text-xs font-semibold text-white/50 hover:text-white"
                        >
                          Order →
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-white/5 px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-7xl space-y-10">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              International
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
