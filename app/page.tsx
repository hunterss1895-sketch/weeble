import Link from 'next/link';
import { PlanCard } from '@/components/PlanCard';
import { CitrusProvider, getEsimProvider } from '@/lib/providers';
import { ensureSeeded } from '@/lib/db/seed-on-boot';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  await ensureSeeded();
  const provider = getEsimProvider();
  let popular =
    provider instanceof CitrusProvider
      ? await provider.listPopularWeebleTiers().catch(() => [])
      : (await provider.listPlans()).filter((p) => p.popular).slice(0, 4);

  if (!popular.length) {
    const all = await provider.listPlans();
    popular = all.filter((p) => p.isUs || p.popular).slice(0, 4);
  }

  return (
    <div className="space-y-16">
      <section className="rounded-lg border border-ink-800 bg-ink-950 px-6 py-16 sm:px-12 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex rounded-md border border-ink-700 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-ink-400">
            Pay-as-you-go eSIM
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Data credit. Anywhere.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-ink-400 sm:text-lg">
            Pick a country, fund your eSIM with $10–$100 of data credit, install with a QR. US first — 200+ destinations.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/plans"
              className="rounded-md bg-white px-7 py-3 text-sm font-semibold text-black hover:bg-ink-200 transition"
            >
              Browse countries
            </Link>
            <Link
              href="/auth"
              className="rounded-md border border-ink-700 px-7 py-3 text-sm font-semibold text-ink-300 hover:border-ink-500 hover:text-white transition"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <section id="plans">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-ink-500">United States</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Credit packs
          </h2>
          <p className="mt-3 text-ink-500">
            Retail price includes eSIM setup. Use credit until it runs out.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {popular.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/plans"
            className="inline-flex rounded-md border border-ink-700 px-5 py-2.5 text-sm font-medium text-ink-300 hover:border-ink-500 hover:text-white transition"
          >
            All countries →
          </Link>
        </div>
      </section>

      <section id="how" className="rounded-lg border border-ink-800 bg-ink-950 px-6 py-12 sm:px-10">
        <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">
          How Weeble works
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { n: '01', t: 'Choose credit', d: 'Pick a country and a $10 / $25 / $50 / $100 data credit pack.' },
            { n: '02', t: 'Get your eSIM', d: 'We provision instantly and show a QR plus install link in your dashboard.' },
            { n: '03', t: 'Stay connected', d: 'Data draws down from your credit at local rates until it runs out.' },
          ].map((f) => (
            <div key={f.n} className="rounded-lg border border-ink-800 bg-black p-5">
              <p className="text-xs font-medium text-ink-500">{f.n}</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{f.t}</h3>
              <p className="mt-2 text-sm text-ink-500">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-ink-800 bg-white px-8 py-12 text-center text-black">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ready when you are.</h2>
        <p className="mx-auto mt-3 max-w-lg text-ink-600">
          Join Weeble — travel data without the noise.
        </p>
        <Link
          href="/plans"
          className="mt-8 inline-flex rounded-md bg-black px-7 py-3 text-sm font-semibold text-white hover:bg-ink-900 transition"
        >
          Get started
        </Link>
      </section>
    </div>
  );
}
