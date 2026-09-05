import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWeebleRetailPlan } from '@/lib/plans/weeble-plans';
import { getSession } from '@/lib/auth';
import { Badge, Card } from '@/components/ui';
import { formatData, formatPrice } from '@/lib/utils';
import { ensureSeeded } from '@/lib/db/seed-on-boot';
import { PurchaseButton } from './PurchaseButton';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureSeeded();
  const { id } = await params;
  const plan = getWeebleRetailPlan(id);
  if (!plan) notFound();
  const session = await getSession();
  const price = formatPrice(plan.priceCents, plan.currency).replace('.00', '');

  return (
    <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-5">
      <div className="space-y-5 lg:col-span-3">
        <Link href="/plans" className="text-sm font-semibold text-weeble-400 hover:text-weeble-300">
          ← All plans
        </Link>
        <div className="flex flex-wrap gap-2">
          <Badge tone="yellow">United States</Badge>
          {plan.popular && <Badge tone="yellow">Popular</Badge>}
        </div>
        <h1 className="text-4xl font-black tracking-tight text-ink-50 sm:text-5xl">{plan.name}</h1>
        <p className="text-lg text-ink-400">{plan.description}</p>
        <ul className="space-y-3 pt-2">
          {plan.features.map((f) => (
            <li key={f} className="flex items-center gap-3 text-ink-200">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-weeble-500 text-xs font-black text-ink-950">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>
      <Card className="h-fit border-weeble-500/40 lg:col-span-2">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-weeble-400">Data</p>
        <p className="mt-2 text-4xl font-black text-ink-50">{formatData(plan.dataMb)}</p>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-weeble-400">Validity</p>
        <p className="mt-2 text-xl font-bold text-ink-50">{plan.validityDays} days</p>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-weeble-400">Price</p>
        <p className="mt-2 text-4xl font-black text-weeble-400">{price}</p>
        <div className="mt-8">
          {session ? (
            <PurchaseButton planId={plan.id} priceCents={plan.priceCents} />
          ) : (
            <Link
              href={`/auth?next=/plans/${plan.id}`}
              className="inline-flex w-full items-center justify-center rounded-full bg-weeble-500 px-4 py-3.5 text-sm font-bold text-ink-950 hover:bg-weeble-400 transition"
            >
              Sign in to purchase
            </Link>
          )}
        </div>
        <p className="mt-4 text-xs text-ink-500">
          Checkout provisions your Weeble eSIM with a QR code and ICCID.
        </p>
      </Card>
    </div>
  );
}
