import Link from 'next/link';
import { Badge, Card } from './ui';
import { formatData, formatPrice } from '@/lib/utils';
import type { EsimPlan } from '@/lib/providers';

export function PlanCard({ plan }: { plan: EsimPlan }) {
  const price = formatPrice(plan.priceCents, plan.currency).replace('.00', '');
  const title = plan.name.replace(/^Weeble\s+/i, '');
  const isCredit = /^citrus-/i.test(plan.id) || /credit/i.test(plan.name);
  return (
    <Card
      className={`relative flex h-full flex-col transition hover:border-ink-600 ${
        plan.popular ? 'border-ink-500' : ''
      }`}
    >
      {plan.popular && (
        <div className="absolute right-4 top-4">
          <Badge tone="slate">Popular</Badge>
        </div>
      )}
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-500">{plan.region}</p>
      <h3 className="mt-3 text-lg font-semibold tracking-tight text-ink-50 line-clamp-2">{title}</h3>
      <p className="mt-2 line-clamp-2 flex-1 text-sm text-ink-500">{plan.description}</p>

      <div className="mt-6">
        <p className="text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
          {isCredit ? formatData(plan.dataMb) + ' est.' : formatData(plan.dataMb)}
        </p>
        <p className="mt-1 text-sm text-ink-600">
          {isCredit ? 'Pay-as-you-go credit' : `${plan.validityDays}-day plan`}
        </p>
      </div>

      <div className="mt-6 flex items-end gap-1">
        <span className="text-2xl font-semibold text-white sm:text-3xl">{price}</span>
        <span className="mb-1 text-sm font-medium text-ink-600">
          {isCredit ? 'incl. setup' : `/ ${plan.validityDays} days`}
        </span>
      </div>

      <Link
        href={`/plans/${plan.id}`}
        className="mt-8 inline-flex w-full items-center justify-center rounded-md bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-ink-200"
      >
        {isCredit ? 'Choose credit' : 'Choose plan'}
      </Link>
    </Card>
  );
}
