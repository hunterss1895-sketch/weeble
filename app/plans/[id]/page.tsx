import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEsimProvider } from '@/lib/providers';
import { getSession } from '@/lib/auth';
import { Badge, Card } from '@/components/ui';
import { formatData, formatPrice } from '@/lib/utils';
import { ensureSeeded } from '@/lib/db/seed-on-boot';
import { PurchaseButton } from './PurchaseButton';

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureSeeded();
  const { id } = await params;
  const plan = await getEsimProvider().getPlan(id);
  if (!plan) notFound();
  const session = await getSession();

  return (
    <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <Link href="/plans" className="text-sm text-weeble-700 hover:underline">
          ← Back to plans
        </Link>
        <div className="flex flex-wrap gap-2">
          {plan.isUs ? <Badge>United States</Badge> : <Badge tone="slate">{plan.region}</Badge>}
          {plan.priceCents <= 0 && <Badge tone="green">Free</Badge>}
          {plan.popular && <Badge tone="green">Popular</Badge>}
        </div>
        <h1 className="text-3xl font-bold text-slate-900">{plan.name}</h1>
        <p className="text-slate-600">{plan.description}</p>
        <ul className="space-y-2">
          {plan.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-weeble-500" />
              {f}
            </li>
          ))}
        </ul>
      </div>
      <Card className="h-fit lg:col-span-2">
        <p className="text-sm text-slate-500">Data</p>
        <p className="text-3xl font-bold">{formatData(plan.dataMb)}</p>
        <p className="mt-3 text-sm text-slate-500">Validity</p>
        <p className="text-lg font-semibold">{plan.validityDays} days</p>
        <p className="mt-3 text-sm text-slate-500">Price</p>
        <p className="text-3xl font-bold text-weeble-700">{formatPrice(plan.priceCents, plan.currency)}</p>
        <div className="mt-6">
          {session ? (
            <PurchaseButton planId={plan.id} priceCents={plan.priceCents} />
          ) : (
            <Link
              href={`/auth?next=/plans/${plan.id}`}
              className="inline-flex w-full items-center justify-center rounded-xl bg-weeble-600 px-4 py-3 text-sm font-medium text-white hover:bg-weeble-700"
            >
              Sign in to purchase
            </Link>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          {plan.priceCents <= 0
            ? 'Free starter — claim a demo QR, then earn more MB via Watch ads.'
            : 'Checkout provisions an eSIM QR + ICCID. Mock/sandbox stays free for the owner.'}
        </p>
      </Card>
    </div>
  );
}
