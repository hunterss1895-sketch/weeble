import Link from 'next/link';
import { getEsimProvider, providerMeta } from '@/lib/providers';
import { PlanCard } from '@/components/PlanCard';
import { Badge } from '@/components/ui';
import { ensureSeeded } from '@/lib/db/seed-on-boot';

export default async function HomePage() {
  await ensureSeeded();
  const provider = getEsimProvider();
  const meta = providerMeta();
  const plans = await provider.listPlans();
  const usOnly = plans.filter((p) => p.isUs);
  // If no US plans from provider, show first 3 plans as homepage fallback.
  const usPlans = (usOnly.length ? usOnly : plans).slice(0, 3);

  return (
    <div className="space-y-16">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-weeble-700 via-weeble-600 to-emerald-600 px-8 py-14 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative max-w-2xl">
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge tone="amber">US plans first</Badge>
            {meta.isDemo && <Badge tone="amber">Demo provider</Badge>}
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Stay connected in the US — and everywhere else.
          </h1>
          <p className="mt-4 text-lg text-weeble-50/90">
            Weeble is the US-first eSIM marketplace with instant QR activation, device management,
            and a built-in watch-ads-for-data reward loop.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/plans" className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-weeble-800 hover:bg-weeble-50">
              Browse US plans
            </Link>
            <Link href="/plans?region=international" className="rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
              International plans
            </Link>
            <Link href="/dashboard/earn" className="rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">
              Earn free data
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Top US plans</h2>
            <p className="text-sm text-slate-500">Front-and-center coverage for the United States.</p>
          </div>
          <Link href="/plans" className="text-sm font-medium text-weeble-700 hover:underline">
            See all →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {usPlans.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { t: 'Instant QR eSIM', d: 'Buy a plan and install via QR or activation code in minutes.' },
          { t: 'Watch ads, earn MB', d: 'Demo rewarded videos credit 50–100 MB with a daily cap.' },
          { t: 'One dashboard', d: 'Balance, devices, usage history, and top-ups in a single place.' },
        ].map((f) => (
          <div key={f.t} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="font-semibold text-slate-900">{f.t}</h3>
            <p className="mt-2 text-sm text-slate-500">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
