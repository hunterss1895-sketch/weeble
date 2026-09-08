import { NextResponse } from 'next/server';
import { CitrusProvider, getEsimProvider, providerMeta } from '@/lib/providers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const meta = providerMeta();
  const provider = getEsimProvider();
  let wallet: { balance_usd?: number; currency?: string } | null = null;
  let walletOk = false;
  let ratesSample: Array<{ iso2: string; name: string; perGb: number | null }> = [];

  if (provider instanceof CitrusProvider) {
    try {
      wallet = await provider.getWalletBalance();
      walletOk = true;
    } catch (e) {
      wallet = { balance_usd: undefined };
      console.warn('[health] wallet check failed', e instanceof Error ? e.message : e);
    }
    try {
      const countries = await provider.fetchCountries();
      ratesSample = countries
        .filter((c) => c.has_data !== false)
        .sort((a, b) => ((a.iso2 || '') === 'US' ? -1 : (b.iso2 || '') === 'US' ? 1 : 0))
        .slice(0, 5)
        .map((c) => ({
          iso2: (c.iso2 || '').toUpperCase(),
          name: c.name || '',
          perGb: Number(c.cheapest_per_gb_usd) || null,
        }));
    } catch {
      ratesSample = [];
    }
  }

  return NextResponse.json({
    ok: true,
    provider: meta.name,
    isDemo: meta.isDemo,
    walletOk,
    walletBalanceUsd: walletOk ? wallet?.balance_usd : null,
    currency: wallet?.currency || 'USD',
    ratesSample,
  });
}
