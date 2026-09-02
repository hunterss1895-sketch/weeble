'use client';

import { useEffect, useState } from 'react';
import { Button } from './ui';

const DURATION = 20; // seconds simulated rewarded video

export function AdPlayer({
  onComplete,
  disabled,
  remaining,
}: {
  onComplete: () => Promise<void> | void;
  disabled?: boolean;
  remaining: number;
}) {
  const [playing, setPlaying] = useState(false);
  const [left, setLeft] = useState(DURATION);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (left <= 0) {
      (async () => {
        setBusy(true);
        try {
          await onComplete();
        } finally {
          setBusy(false);
          setPlaying(false);
          setLeft(DURATION);
        }
      })();
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [playing, left, onComplete]);

  if (playing) {
    const pct = ((DURATION - left) / DURATION) * 100;
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 text-white shadow-lg">
        <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-weeble-800 via-slate-900 to-emerald-900">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 30% 40%, #33a1ff 0, transparent 40%), radial-gradient(circle at 70% 60%, #34d399 0, transparent 35%)' }} />
          <div className="relative z-10 text-center">
            <p className="text-xs uppercase tracking-widest text-weeble-200">Demo rewarded video</p>
            <p className="mt-2 text-4xl font-bold tabular-nums">{left}s</p>
            <p className="mt-1 text-sm text-slate-300">Watch to earn free data</p>
          </div>
        </div>
        <div className="h-2 bg-slate-800">
          <div className="h-full bg-weeble-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="p-3 text-center text-xs text-slate-400">
          {busy ? 'Crediting your balance…' : 'Please keep this tab open until the ad finishes.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-weeble-200 bg-weeble-50/50 p-6 text-center">
      <p className="text-sm text-slate-600">
        Simulated 15–30s rewarded video. Earn <strong>75–150 MB</strong> per view.
      </p>
      <p className="mt-1 text-xs text-slate-500">{remaining} rewards left today</p>
      <Button className="mt-4" disabled={disabled || remaining <= 0} onClick={() => setPlaying(true)} size="lg">
        Watch ad for data
      </Button>
    </div>
  );
}
