import Link from 'next/link';
import { PlanCard } from '@/components/PlanCard';
import { listWeebleRetailPlans } from '@/lib/plans/weeble-plans';
import { ensureSeeded } from '@/lib/db/seed-on-boot';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  await ensureSeeded();
  const plans = listWeebleRetailPlans();

  return (
    <div className="space-y-20">
      {/* Bold MVNO hero */}
      <section className="relative overflow-hidden rounded-[2rem] border border-ink-800 bg-gradient-to-b from-ink-900 via-ink-950 to-ink-950 px-6 py-16 sm:px-12 sm:py-24">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-weeble-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-weeble-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex rounded-full border border-weeble-500/40 bg-weeble-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-weeble-400">
            US prepaid wireless
          </p>
          <h1 className="text-balance text-5xl font-black tracking-tight text-ink-50 sm:text-6xl lg:text-7xl">
            Wireless that&apos;s <span className="text-weeble-400">simple</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-ink-400 sm:text-xl">
            Four Weeble plans. Clear prices. Instant eSIM. No fine print maze — just pick your data and go.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/plans"
              className="rounded-full bg-weeble-500 px-8 py-4 text-base font-bold text-ink-950 hover:bg-weeble-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-weeble-400"
            >
              See plans
            </Link>
            <Link
              href="/auth"
              className="rounded-full border border-weeble-500/50 px-8 py-4 text-base font-bold text-weeble-400 hover:bg-weeble-500/10 transition"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Big plan grid */}
      <section id="plans">
        <div className="mb-10 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-weeble-400">Plans</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-ink-50 sm:text-5xl">
            Pick your data.
          </h2>
          <p className="mt-3 text-ink-400">Exactly four Weeble plans. United States coverage.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="rounded-[2rem] border border-ink-800 bg-ink-900/50 px-6 py-12 sm:px-10">
        <h2 className="text-center text-3xl font-black text-ink-50 sm:text-4xl">
          How <span className="text-weeble-400">Weeble</span> works
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { n: '01', t: 'Choose a plan', d: '5 GB, 10 GB, 50 GB, or Unlimited — all US, all clear.' },
            { n: '02', t: 'Get your eSIM', d: 'Buy and install with a QR code in minutes on a compatible phone.' },
            { n: '03', t: 'Stay connected', d: 'Manage devices and data from your Weeble dashboard.' },
          ].map((f) => (
            <div key={f.n} className="rounded-2xl border border-ink-800 bg-ink-950/60 p-6">
              <p className="text-sm font-black text-weeble-400">{f.n}</p>
              <h3 className="mt-2 text-xl font-bold text-ink-50">{f.t}</h3>
              <p className="mt-2 text-sm text-ink-400">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="rounded-[2rem] bg-weeble-500 px-8 py-14 text-center text-ink-950">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Ready when you are.</h2>
        <p className="mx-auto mt-3 max-w-lg text-ink-950/80">
          Join Weeble — prepaid wireless without the noise.
        </p>
        <Link
          href="/plans"
          className="mt-8 inline-flex rounded-full bg-ink-950 px-8 py-4 text-base font-bold text-weeble-400 hover:bg-ink-900 transition"
        >
          Get started
        </Link>
      </section>
    </div>
  );
}
