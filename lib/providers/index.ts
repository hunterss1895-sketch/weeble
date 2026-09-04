import { DepinSimProvider } from './depinsim';
import { EsimCardProvider } from './esimcard';
import { FirstyProvider } from './firsty';
import { MockProvider } from './mock';
import { TelnyxProvider } from './telnyx';
import type { EsimProvider } from './types';

export type { EsimPlan, EsimProvider, PurchaseResult, UsageSummary, ProviderDevice } from './types';
export { MockProvider } from './mock';
export { DepinSimProvider } from './depinsim';
export { EsimCardProvider } from './esimcard';
export { FirstyProvider } from './firsty';
export { TelnyxProvider } from './telnyx';

/**
 * PROVIDER=esimcard|telnyx|firsty|mock|depinsim
 * Default: mock. Prefer eSIMCard when ESIMCARD_TOKEN is present (custom SPN reseller).
 * Telnyx / Firsty / DepinSim remain optional.
 */
export function getEsimProvider(): EsimProvider {
  const forced = process.env.PROVIDER?.toLowerCase().trim();
  const hasEsimCard = EsimCardProvider.hasCredentials();
  const hasTelnyx = TelnyxProvider.hasCredentials();
  const hasFirsty = FirstyProvider.hasCredentials();
  const depinToken = process.env.DEPINSIM_ACCESS_TOKEN?.trim();

  if (forced === 'mock') {
    return new MockProvider();
  }
  if (forced === 'esimcard') {
    if (!hasEsimCard) {
      console.warn('[providers] PROVIDER=esimcard but no ESIMCARD_TOKEN; using MockProvider (Demo)');
      return new MockProvider();
    }
    return new EsimCardProvider();
  }
  if (forced === 'telnyx') {
    if (!hasTelnyx) {
      console.warn('[providers] PROVIDER=telnyx but no TELNYX_API_KEY; using MockProvider (Demo)');
      return new MockProvider();
    }
    return new TelnyxProvider();
  }
  if (forced === 'firsty') {
    if (!hasFirsty) {
      console.warn('[providers] PROVIDER=firsty but no Firsty credentials; using MockProvider (Demo)');
      return new MockProvider();
    }
    return new FirstyProvider();
  }
  if (forced === 'depinsim') {
    if (!depinToken) {
      console.warn('[providers] PROVIDER=depinsim but no DEPINSIM_ACCESS_TOKEN; using MockProvider (Demo)');
      return new MockProvider();
    }
    return new DepinSimProvider(depinToken);
  }

  // Auto: prefer eSIMCard (custom SPN) → Telnyx → Firsty → DepinSim → Mock
  if (hasEsimCard) return new EsimCardProvider();
  if (hasTelnyx) return new TelnyxProvider();
  if (hasFirsty) return new FirstyProvider();
  if (depinToken) return new DepinSimProvider(depinToken);
  return new MockProvider();
}

export function providerMeta() {
  const p = getEsimProvider();
  return { name: p.name, isDemo: p.isDemo };
}
