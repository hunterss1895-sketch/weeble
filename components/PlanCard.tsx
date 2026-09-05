import Link from 'next/link';
import { Badge, Card } from './ui';
import { formatData, formatPrice } from '@/lib/utils';
import type { EsimPlan } from '@/lib/providers';

export function PlanCard({ plan }: { plan: EsimPlan }) {
  const price = formatPrice(plan.priceCents, plan.currency).replace('.00', '');
  const title = plan.name.replace(/^Weeble\s+/i, '');
  return (
    <Card
      className={`relative flex h-full flex-col overflow-hidden transition hover:-translate-y-1 hover:border-weeble-500/60 hover:shadow-[0_0_40px_rgba(245,197,24,0.12)] ${
        plan.popular ? 'border-weeble-500/70 ring-1 ring-weeble-500/40' : ''
      }`}
    >
      {plan.popular && (
        <div className="absolute right-4 top-4">
          <Badge tone="yellow">Popular</Badge>
        </div>
      )}
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-weeble-400">{plan.region}</p>
      <h3 className="mt-3 text-xl font-black tracking-tight text-ink-50 line-clamp-2">{title}</h3>
      <p className="mt-2 line-clamp-2 flex-1 text-sm text-ink-400">{plan.description}</p>

      <div className="mt-6">
        <p className="text-4xl font-black tracking-tight text-ink-50 sm:text-5xl">
          {formatData(plan.dataMb)}
        </p>
        <p className="mt-1 text-sm text-ink-500">{plan.validityDays}-day plan</p>
      </div>

      <div className="mt-6 flex items-end gap-1">
        <span className="text-3xl font-black text-weeble-400 sm:text-4xl">{price}</span>
        <span className="mb-1 text-sm font-medium text-ink-500">/ {plan.validityDays} days</span>
      </div>

      <Link
        href={`/plans/${plan.id}`}
        className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-weeble-500 px-4 py-3.5 text-sm font-bold text-ink-950 transition hover:bg-weeble-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-weeble-400 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900"
      >
        Choose plan
      </Link>
    </Card>
  );
}
