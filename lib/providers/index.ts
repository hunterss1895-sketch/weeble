import { DepinSimProvider } from './depinsim';
import { FirstyProvider } from './firsty';
import { MockProvider } from './mock';
import type { EsimProvider } from './types';

export type { EsimPlan, EsimProvider, PurchaseResult, UsageSummary, ProviderDevice } from './types';
export { MockProvider } from './mock';
export { DepinSimProvider } from './depinsim';
export { FirstyProvider } from './firsty';

/**
 * PROVIDER=firsty|mock|depinsim
 * Default: mock. Prefer Firsty when credentials are present.
 * DepinSim remains optional legacy.
 */
export function getEsimProvider(): EsimProvider {
  const forced = process.env.PROVIDER?.toLowerCase().trim();
  const hasFirsty = FirstyProvider.hasCredentials();
  const depinToken = process.env.DEPINSIM_ACCESS_TOKEN?.trim();

  if (forced === 'mock') {
    return new MockProvider();
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

  // Auto: prefer Firsty → legacy DepinSim → Mock
  if (hasFirsty) return new FirstyProvider();
  if (depinToken) return new DepinSimProvider(depinToken);
  return new MockProvider();
}

export function providerMeta() {
  const p = getEsimProvider();
  return { name: p.name, isDemo: p.isDemo };
}
