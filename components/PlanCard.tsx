import Link from 'next/link';
import { Badge, Card } from './ui';
import { formatData, formatPrice } from '@/lib/utils';
import type { EsimPlan } from '@/lib/providers';

export function PlanCard({ plan }: { plan: EsimPlan }) {
  return (
    <Card className="flex h-full flex-col transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-weeble-600">
            {plan.isUs ? 'United States' : plan.region}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{plan.name}</h3>
        </div>
        <div className="flex flex-col items-end gap-1">
          {plan.popular && <Badge tone="green">Popular</Badge>}
          {plan.isUs ? <Badge>US</Badge> : <Badge tone="slate">Intl</Badge>}
        </div>
      </div>
      <p className="mb-4 line-clamp-2 flex-1 text-sm text-slate-500">{plan.description}</p>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-slate-900">{formatData(plan.dataMb)}</p>
          <p className="text-xs text-slate-500">{plan.validityDays} days validity</p>
        </div>
        <p className="text-xl font-semibold text-weeble-700">{formatPrice(plan.priceCents, plan.currency)}</p>
      </div>
      <Link
        href={`/plans/${plan.id}`}
        className="inline-flex w-full items-center justify-center rounded-xl bg-weeble-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-weeble-700"
      >
        View plan
      </Link>
    </Card>
  );
}
