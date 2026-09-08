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
  const blurb =
    plan.description.split('.')[0]?.trim() ||
    (isUsGb ? 'US mobile data credit' : plan.region);

  return (
    <article className="flex h-full flex-col rounded-2xl bg-zinc-900 p-7 sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">{title}</h3>
        {plan.popular && (
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
            Popular
          </span>
        )}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-white/50">{blurb}.</p>

      <div className="mt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">Price</p>
        <p className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {price}
          <span className="ml-1 text-base font-medium text-white/40">
            {isUsGb || isCredit ? 'incl. setup' : ''}
          </span>
        </p>
        <p className="mt-2 text-sm text-white/45">
          {isCredit ? `${formatData(plan.dataMb)} est.` : formatData(plan.dataMb)}
          {isUsGb && fromRate ? ` · ${fromRate}` : ''}
        </p>
      </div>

      <div className="mt-8 flex-1 border-t border-white/10 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
          Key features
        </p>
        <ul className="mt-4 space-y-3">
          {bullets.map((f) => (
            <li key={f} className="text-sm text-white/80">
              {f}
            </li>
          ))}
        </ul>
      </div>

      <Link
        href={`/plans/${plan.id}`}
        className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-[13px] font-semibold text-black hover:bg-white/90 transition"
      >
        Order
      </Link>
    </article>
  );
}
