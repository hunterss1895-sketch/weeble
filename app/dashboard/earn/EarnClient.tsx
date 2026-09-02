'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { AdPlayer } from '@/components/AdPlayer';

export function EarnClient({
  remaining,
  allowed,
  reason,
}: {
  remaining: number;
  allowed: boolean;
  reason?: string;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const [left, setLeft] = useState(remaining);

  const onComplete = useCallback(async () => {
    const res = await fetch('/api/ads/reward', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      setMsg(data.message);
      setLeft(data.remainingToday);
      router.refresh();
    } else {
      setMsg(data.message || data.error || 'Could not grant reward');
    }
  }, [router]);

  return (
    <div className="space-y-3">
      {!allowed && reason && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{reason}</p>
      )}
      {msg && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</p>
      )}
      <AdPlayer remaining={left} disabled={!allowed && left <= 0} onComplete={onComplete} />
    </div>
  );
}
