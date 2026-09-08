import Link from 'next/link';
import { formatData, formatPrice } from '@/lib/utils';
import type { EsimPlan } from '@/lib/providers';

export function PlanCard({ plan }: { plan: EsimPlan }) {
  const price = formatPrice(plan.priceCents, plan.currency).replace('.00', '');
  const title = plan.name.replace(/^Weeble\s+/i, '');
  const isUsGb = /^citrus-US-(\d+gb|unlimited)$/i.test(plan.id);
  const isCredit = !isUsGb && (/^citrus-/i.test(plan.id) || /credit/i.test(plan.name));
  const perGbMatch = plan.description.match(/from \$([0-9.]+)\/GB/i);
  const fromRate = perGbMatch ? `From $${perGbMatch[1]}/GB` : null;

  const bullets = (plan.features || []).slice(0, 4);

  return (
    <article
      className={`flex h-full flex-col border border-white/10 bg-black p-6 sm:p-8 ${
        plan.popular ? 'border-white/40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
          {plan.region}
        </p>
        {plan.popular && (
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Popular
          </span>
        )}
      </div>

      <h3 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
        {title}
      </h3>

      <p className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{price}</p>
      <p className="mt-2 text-sm text-white/45">
        {isUsGb
          ? fromRate
            ? `${fromRate} · incl. setup`
            : 'Includes eSIM setup'
          : isCredit
            ? 'Credit pack · incl. setup'
            : `${plan.validityDays}-day plan`}
      </p>

      <p className="mt-6 text-sm font-medium text-white/80">
        {isCredit ? `${formatData(plan.dataMb)} est.` : formatData(plan.dataMb)}
        {isUsGb ? ' data' : ''}
      </p>

      <ul className="mt-6 flex-1 space-y-2.5 border-t border-white/10 pt-6">
        {bullets.map((f) => (
          <li key={f} className="flex gap-2 text-sm text-white/55">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/50" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link
        href={`/plans/${plan.id}`}
        className="mt-8 inline-flex w-full items-center justify-center bg-white px-4 py-3.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-black hover:bg-white/90 transition"
      >
        Order
      </Link>
    </article>
  );
}
