import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEsimProvider } from '@/lib/providers';
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
  const plan = await getEsimProvider().getPlan(id);
  if (!plan) notFound();
  const session = await getSession();
  const price = formatPrice(plan.priceCents, plan.currency).replace('.00', '');
  const isCredit = /^citrus-/i.test(plan.id) || /credit/i.test(plan.name);

  return (
    <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-5">
      <div className="space-y-5 lg:col-span-3">
        <Link href="/plans" className="text-sm font-medium text-ink-400 hover:text-white">
          ← All plans
        </Link>
        <div className="flex flex-wrap gap-2">
          <Badge tone="slate">{plan.region}</Badge>
          {plan.popular && <Badge tone="yellow">Popular</Badge>}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{plan.name}</h1>
        <p className="text-base text-ink-400">{plan.description}</p>
        <ul className="space-y-3 pt-2">
          {plan.features.map((f) => (
            <li key={f} className="flex items-center gap-3 text-ink-300">
              <span className="flex h-5 w-5 items-center justify-center rounded-sm border border-ink-700 text-[10px] font-bold text-white">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>
      <Card className="h-fit border-ink-700 lg:col-span-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-500">
          {isCredit ? 'Est. data' : 'Data'}
        </p>
        <p className="mt-2 text-3xl font-semibold text-white">{formatData(plan.dataMb)}{isCredit ? ' est.' : ''}</p>
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-ink-500">
          {isCredit ? 'Credit life' : 'Validity'}
        </p>
        <p className="mt-2 text-lg font-medium text-ink-100">
          {isCredit ? 'Until credit runs out' : `${plan.validityDays} days`}
        </p>
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-ink-500">Price</p>
        <p className="mt-2 text-3xl font-semibold text-white">{price}</p>
        {isCredit && (
          <p className="mt-1 text-xs text-ink-600">Includes eSIM setup + data credit</p>
        )}
        <div className="mt-8">
          {session ? (
            <PurchaseButton planId={plan.id} priceCents={plan.priceCents} />
          ) : (
            <Link
              href={`/auth?next=/plans/${plan.id}`}
              className="inline-flex w-full items-center justify-center rounded-md bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-ink-200 transition"
            >
              Sign in to purchase
            </Link>
          )}
        </div>
        <p className="mt-4 text-xs text-ink-600">
          Checkout provisions your Weeble eSIM and funds data credit. QR appears in your dashboard.
        </p>
      </Card>
    </div>
  );
}
