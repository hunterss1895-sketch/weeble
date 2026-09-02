import { DepinSimProvider } from './depinsim';
import { MockProvider } from './mock';
import type { EsimProvider } from './types';

export type { EsimPlan, EsimProvider, PurchaseResult, UsageSummary, ProviderDevice } from './types';
export { MockProvider } from './mock';
export { DepinSimProvider } from './depinsim';

export function getEsimProvider(): EsimProvider {
  const token = process.env.DEPINSIM_ACCESS_TOKEN?.trim();
  const forced = process.env.PROVIDER?.toLowerCase();

  if (forced === 'mock' || !token) {
    return new MockProvider();
  }
  if (forced === 'depinsim' || token) {
    return new DepinSimProvider(token);
  }
  return new MockProvider();
}

export function providerMeta() {
  const p = getEsimProvider();
  return { name: p.name, isDemo: p.isDemo };
}
