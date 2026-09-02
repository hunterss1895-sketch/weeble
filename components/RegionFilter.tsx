'use client';

import { useRouter, useSearchParams } from 'next/navigation';

const REGIONS = [
  { value: 'us', label: 'United States' },
  { value: 'international', label: 'International' },
  { value: 'Europe', label: 'Europe' },
  { value: 'United Kingdom', label: 'UK' },
  { value: 'Asia', label: 'Asia' },
  { value: 'Latin America', label: 'LatAm' },
  { value: 'Global', label: 'Global' },
];

export function RegionFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get('region') || 'us';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-sm font-medium text-slate-600" htmlFor="region">
        Region
      </label>
      <select
        id="region"
        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-weeble-400 focus:ring-2 focus:ring-weeble-100"
        value={current}
        onChange={(e) => {
          const v = e.target.value;
          const q = new URLSearchParams(params.toString());
          if (v === 'us') q.delete('region');
          else q.set('region', v);
          router.push(`/plans?${q.toString()}`);
        }}
      >
        {REGIONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
    </div>
  );
}
