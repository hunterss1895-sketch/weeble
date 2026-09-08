import Link from 'next/link';
import { PlanCard } from '@/components/PlanCard';
import { CitrusProvider, getEsimProvider } from '@/lib/providers';
import { ensureSeeded } from '@/lib/db/seed-on-boot';

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
  if (provider instanceof CitrusProvider) {
    const perGb = await provider.getUsCheapestPerGb().catch(() => null);
    if (perGb) rateNote = `from $${perGb.toFixed(2)}/GB`;
  }

  // Featured strip: highlight a few mid tiers + unlimited for cinematic home
  const featured =
    usPlans.filter((p) =>
      ['citrus-US-5gb', 'citrus-US-10gb', 'citrus-US-50gb', 'citrus-US-unlimited'].includes(p.id)
    ).length >= 2
      ? usPlans.filter((p) =>
          ['citrus-US-5gb', 'citrus-US-10gb', 'citrus-US-50gb', 'citrus-US-unlimited'].includes(p.id)
        )
      : usPlans.slice(0, 4);

  return (
    <div>
      {/* Full-bleed cinematic hero */}
      <section className="hero-gradient relative flex min-h-[88vh] flex-col justify-end px-5 pb-20 pt-28 sm:px-8 sm:pb-28 lg:min-h-[92vh]">
        <div className="mx-auto w-full max-w-7xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/50">
            United States eSIM
          </p>
          <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl">
            Data that
            <br />
            just works.
          </h1>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-white/55 sm:text-lg">
            Clear GB plans for the US{rateNote ? ` — ${rateNote}` : ''}. Instant eSIM. Coverage on
            T-Mobile, AT&amp;T, and Verizon.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/plans"
              className="bg-white px-8 py-3.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-black hover:bg-white/90 transition"
            >
              Order now
            </Link>
            <Link
              href="/#plans"
              className="border border-white/25 px-8 py-3.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white hover:border-white/60 transition"
            >
              View plans
            </Link>
          </div>
        </div>
      </section>

      {/* Featured service tiers */}
      <section id="plans" className="section-rule px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
              Service
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Choose your plan
            </h2>
            <p className="mt-5 text-base text-white/50">
              Full US lineup from 1 GB to Unlimited. Priced from live wholesale rates. Includes eSIM
              setup.
            </p>
          </div>
          <div className="mt-14 grid gap-px bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
            {featured.map((p) => (
              <PlanCard key={p.id} plan={p} />
            ))}
          </div>
          <div className="mt-10">
            <Link
              href="/plans"
              className="inline-flex text-sm font-medium text-white/70 underline-offset-4 hover:text-white hover:underline transition"
            >
              See all US tiers &amp; international →
            </Link>
          </div>
        </div>
      </section>

      {/* Coverage band */}
      <section id="coverage" className="section-rule px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
              Coverage
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Major US networks
            </h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-white/50">
            Connect across the United States on T-Mobile, AT&amp;T, and Verizon. Your plan funds data
            credit — use it until it runs out. Weeble never shows upstream reseller names in the
            product UI.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-7xl gap-px border border-white/10 bg-white/10 sm:grid-cols-3">
          {['T-Mobile', 'AT&T', 'Verizon'].map((n) => (
            <div key={n} className="bg-black px-8 py-12 text-center">
              <p className="text-xl font-semibold tracking-tight text-white">{n}</p>
              <p className="mt-2 text-sm text-white/40">US coverage</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="section-rule px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/40">
            Process
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            How Weeble works
          </h2>
          <div className="mt-16 grid gap-12 md:grid-cols-3">
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
              <div key={f.n} className="border-t border-white/15 pt-8">
                <p className="text-[11px] font-semibold tracking-[0.2em] text-white/35">{f.n}</p>
                <h3 className="mt-4 text-xl font-semibold text-white">{f.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/50">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="section-rule bg-white px-5 py-24 text-black sm:px-8 sm:py-32">
        <div className="mx-auto max-w-7xl text-center">
          <h2 className="text-4xl font-semibold tracking-tight sm:text-6xl">Ready to connect.</h2>
          <p className="mx-auto mt-6 max-w-lg text-base text-black/55">
            Order a Weeble US plan in minutes. Instant eSIM. No contracts.
          </p>
          <Link
            href="/plans"
            className="mt-10 inline-flex bg-black px-8 py-3.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-white hover:bg-black/85 transition"
          >
            Order now
          </Link>
        </div>
      </section>
    </div>
  );
}
