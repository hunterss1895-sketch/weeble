import Link from 'next/link';
import { PlanCard } from '@/components/PlanCard';
import { CitrusProvider, getEsimProvider } from '@/lib/providers';
import { ensureSeeded } from '@/lib/db/seed-on-boot';
import { formatPrice } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  await ensureSeeded();
  const provider = getEsimProvider();
  let usPlans =
    provider instanceof CitrusProvider
      ? await provider.listPopularWeebleTiers().catch(() => [])
      : (await provider.listPlans()).filter((p) => p.isUs || p.popular).slice(0, 8);

  if (!usPlans.length) {
    const all = await provider.listPlans();
    usPlans = all.filter((p) => p.isUs || p.popular).slice(0, 8);
  }

  let rateNote = '';
  let perGbNum: number | null = null;
  if (provider instanceof CitrusProvider) {
    perGbNum = await provider.getUsCheapestPerGb().catch(() => null);
    if (perGbNum) rateNote = `from $${perGbNum.toFixed(2)}/GB`;
  }

  const featuredIds = ['citrus-US-10gb', 'citrus-US-50gb', 'citrus-US-unlimited'];
  const featured = featuredIds
    .map((id) => usPlans.find((p) => p.id === id))
    .filter(Boolean) as typeof usPlans;
  const featuredFallback = featured.length === 3 ? featured : usPlans.slice(0, 3);

  const starting = usPlans.find((p) => p.id === 'citrus-US-1gb') || usPlans[0];
  const startingPrice = starting
    ? formatPrice(starting.priceCents, starting.currency).replace('.00', '')
    : null;

  return (
    <div>
      <section className="hero-gradient relative flex min-h-[88vh] flex-col justify-center px-5 py-28 sm:px-8 lg:min-h-[92vh]">
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl">
              Fast, clear US data
            </h1>
            <p className="mt-5 text-lg text-white/60 sm:text-xl">
              Instant eSIM. 1 GB to Unlimited{rateNote ? ` — ${rateNote}` : ''}.
            </p>
            {startingPrice && (
              <div className="mt-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
                  Plans starting at
                </p>
                <p className="mt-2 text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                  {startingPrice}
                </p>
              </div>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/plans"
                className="rounded-xl bg-white px-6 py-3 text-[13px] font-semibold text-black hover:bg-white/90 transition"
              >
                Get Started
              </Link>
              <Link
                href="/#plans"
                className="rounded-xl bg-white/10 px-6 py-3 text-[13px] font-semibold text-white hover:bg-white/15 transition"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="plans" className="section-pad bg-black">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-xl text-center">
            <div className="inline-flex rounded-full bg-zinc-900 p-1">
              <span className="rounded-full bg-zinc-700 px-4 py-1.5 text-[12px] font-semibold text-white">
                United States
              </span>
              <Link
                href="/plans"
                className="rounded-full px-4 py-1.5 text-[12px] font-semibold text-white/50 hover:text-white transition"
              >
                International
              </Link>
            </div>
            <h2 className="mt-8 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Choose your plan
            </h2>
            <p className="mt-4 text-sm text-white/50">
              Featured US tiers. Full lineup on the plans page — T-Mobile, AT&amp;T, Verizon coverage.
            </p>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {featuredFallback.map((p) => (
              <PlanCard key={p.id} plan={p} />
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/plans"
              className="text-sm font-medium text-white/65 underline-offset-4 hover:text-white hover:underline transition"
            >
              See all US tiers (1–100 GB + Unlimited) →
            </Link>
          </div>
        </div>
      </section>

      <section id="coverage" className="section-pad border-t border-white/5">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">
              Coverage
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Major US networks
            </h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-white/50">
            Connect across the United States on T-Mobile, AT&amp;T, and Verizon. Funded data credit —
            use it until it runs out.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-7xl gap-4 sm:grid-cols-3">
          {['T-Mobile', 'AT&T', 'Verizon'].map((n) => (
            <div key={n} className="rounded-2xl bg-zinc-900 px-8 py-12 text-center">
              <p className="text-xl font-semibold tracking-tight text-white">{n}</p>
              <p className="mt-2 text-sm text-white/40">US coverage</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="section-pad border-t border-white/5">
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/40">Process</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            How Weeble works
          </h2>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              {
                n: '01',
                t: 'Select a tier',
                d: 'Pick 1–100 GB or Unlimited for the US. International destinations stay in the catalog.',
              },
              {
                n: '02',
                t: 'Install your eSIM',
                d: 'We provision instantly. Scan the QR or use the install link in your dashboard.',
              },
              {
                n: '03',
                t: 'Stay online',
                d: 'Data draws down from your funded credit at local rates until it runs out.',
              },
            ].map((f) => (
              <div key={f.n} className="rounded-2xl bg-zinc-900 p-8">
                <p className="text-[11px] font-semibold tracking-[0.2em] text-white/35">{f.n}</p>
                <h3 className="mt-4 text-xl font-semibold text-white">{f.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/50">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-white px-5 py-24 text-black sm:px-8 sm:py-32">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-4xl font-semibold tracking-tight sm:text-6xl">Ready to connect.</h2>
          <p className="mx-auto mt-6 max-w-lg text-base text-black/55">
            Order a Weeble US plan in minutes. Instant eSIM. No contracts.
          </p>
          <Link
            href="/plans"
            className="mt-10 inline-flex rounded-xl bg-black px-6 py-3 text-[13px] font-semibold text-white hover:bg-black/85 transition"
          >
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
