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
  const isUsGb = /^citrus-US-(\d+gb|unlimited)$/i.test(plan.id);
  const isCredit = !isUsGb && (/^citrus-/i.test(plan.id) || /credit/i.test(plan.name));

  return (
    <div className="px-5 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-5 lg:gap-16">
        <div className="space-y-6 lg:col-span-3">
          <Link
            href="/plans"
            className="text-sm text-white/45 hover:text-white transition"
          >
            ← All plans
          </Link>
          <div className="flex flex-wrap gap-2">
            <Badge tone="slate">{plan.region}</Badge>
            {plan.popular && <Badge tone="yellow">Popular</Badge>}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {plan.name}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-white/50">{plan.description}</p>
          <ul className="space-y-4 border-t border-white/10 pt-8">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-white/70">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-white/50" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        <Card className="h-fit border-white/15 lg:col-span-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
            {isCredit ? 'Est. data' : 'Data'}
          </p>
          <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {formatData(plan.dataMb)}
            {isCredit ? ' est.' : ''}
          </p>
          {isUsGb && (
            <p className="mt-3 text-sm text-white/45">Coverage: T-Mobile, AT&amp;T, Verizon</p>
          )}
          <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
            {isUsGb || isCredit ? 'Credit life' : 'Validity'}
          </p>
          <p className="mt-2 text-lg text-white/80">
            {isUsGb || isCredit ? 'Until credit runs out' : `${plan.validityDays} days`}
          </p>
          <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
            Price
          </p>
          <p className="mt-2 text-5xl font-semibold tracking-tight text-white">{price}</p>
          {(isUsGb || isCredit) && (
            <p className="mt-2 text-xs text-white/40">Includes eSIM setup + data credit</p>
          )}
          <div className="mt-10">
            {session ? (
              <PurchaseButton planId={plan.id} priceCents={plan.priceCents} />
            ) : (
              <Link
                href={`/auth?next=/plans/${plan.id}`}
                className="inline-flex w-full items-center justify-center bg-white px-4 py-3.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-black hover:bg-white/90 transition"
              >
                Sign in to order
              </Link>
            )}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-white/35">
            Checkout provisions your Weeble eSIM and funds data credit. QR appears in your dashboard.
          </p>
        </Card>
      </div>
    </div>
  );
}
