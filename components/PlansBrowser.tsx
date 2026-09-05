'use client';

import { useMemo, useState } from 'react';
import { PlanCard } from '@/components/PlanCard';
import type { EsimPlan } from '@/lib/providers';

const PAGE_SIZE = 24;

export function PlansBrowser({
  plans,
  countries,
}: {
  plans: EsimPlan[];
  countries: Array<{ code: string; name: string }>;
}) {
  const [country, setCountry] = useState<string>('US');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const countryOptions = useMemo(() => {
    const fromApi = countries.length
      ? countries
      : Array.from(
          new Map(
            plans.map((p) => [
              p.countryCode || p.region,
              { code: p.countryCode || p.region, name: p.region },
            ])
          ).values()
        ).sort((a, b) => {
          if (a.code === 'US') return -1;
          if (b.code === 'US') return 1;
          return a.name.localeCompare(b.name);
        });
    return fromApi;
  }, [countries, plans]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return plans.filter((p) => {
      const matchCountry =
        country === 'ALL'
          ? true
          : country === 'US'
            ? p.isUs || p.countryCode === 'US' || /united states/i.test(p.region)
            : p.countryCode.toUpperCase() === country.toUpperCase() ||
              p.region.toLowerCase() === country.toLowerCase() ||
              p.region.toLowerCase().includes(
                (countryOptions.find((c) => c.code === country)?.name || '').toLowerCase()
              ) ||
              p.name.toLowerCase().includes(
                (countryOptions.find((c) => c.code === country)?.name || '').toLowerCase()
              );

      if (!matchCountry) return false;
      if (!query) return true;
      return (
        p.name.toLowerCase().includes(query) ||
        p.region.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.countryCode.toLowerCase().includes(query)
      );
    });
  }, [plans, country, q, countryOptions]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-ink-800 bg-ink-900/60 p-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1.5 text-sm text-ink-300">
            Country
            <select
              className="rounded-xl border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-50 outline-none focus:border-weeble-500 focus:ring-2 focus:ring-weeble-500/30"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">All countries</option>
              {countryOptions.map((c) => (
                <option key={c.code + c.name} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-[2] flex-col gap-1.5 text-sm text-ink-300">
            Search
            <input
              type="search"
              placeholder="Search plans, countries, data…"
              className="rounded-xl border border-ink-700 bg-ink-950 px-3 py-2.5 text-sm text-ink-50 placeholder:text-ink-500 outline-none focus:border-weeble-500 focus:ring-2 focus:ring-weeble-500/30"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
        <p className="text-sm text-ink-500">
          <span className="font-semibold text-weeble-400">{filtered.length.toLocaleString()}</span> plans
          {filtered.length !== plans.length ? (
            <span> of {plans.length.toLocaleString()}</span>
          ) : null}
        </p>
      </div>

      {pageItems.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink-700 bg-ink-900/40 p-10 text-center text-ink-400">
          No plans match. Try another country or clear search.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((p) => (
            <PlanCard key={p.id} plan={p} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-full border border-ink-700 px-4 py-2 text-sm font-semibold text-ink-200 disabled:opacity-40 hover:border-weeble-500/50"
          >
            Previous
          </button>
          <span className="text-sm text-ink-400">
            Page <span className="text-ink-50">{safePage}</span> / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-full border border-ink-700 px-4 py-2 text-sm font-semibold text-ink-200 disabled:opacity-40 hover:border-weeble-500/50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
