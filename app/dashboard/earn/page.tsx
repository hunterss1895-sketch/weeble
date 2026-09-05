import { getSession } from '@/lib/auth';
import { getAdRewardProvider } from '@/lib/ads';
import { ensureSeeded } from '@/lib/db/seed-on-boot';
import { Card } from '@/components/ui';
import { formatData, formatDate } from '@/lib/utils';
import { EarnClient } from './EarnClient';

export default async function EarnPage() {
  await ensureSeeded();
  const session = await getSession();
  if (!session) return null;

  const ads = getAdRewardProvider();
  const status = await ads.canWatch(session.id);
  const history = await ads.getHistory(session.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-ink-50">Earn free data</h2>
        <p className="text-sm text-ink-400">
          Watch a short demo rewarded video to credit {ads.minMb}–{ads.maxMb} MB.
          Daily cap: {ads.dailyCap} rewards.
        </p>
      </div>

      <EarnClient remaining={status.remaining} allowed={status.allowed} reason={status.reason} />

      <Card>
        <h3 className="mb-3 font-semibold text-ink-50">Reward history</h3>
        {history.length === 0 ? (
          <p className="text-sm text-ink-400">No rewards yet — watch an ad to get started.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-emerald-700">+{formatData(h.dataMb)}</p>
                  <p className="text-xs text-ink-500">{h.adProvider}</p>
                </div>
                <span className="text-xs text-ink-400">{formatDate(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
