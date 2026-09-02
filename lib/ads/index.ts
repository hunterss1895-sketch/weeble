import { MockAdRewardProvider } from './mock-ad-reward';
import type { AdRewardProvider } from './types';

export type { AdRewardProvider, AdRewardResult, AdHistoryItem } from './types';
export { MockAdRewardProvider } from './mock-ad-reward';

export function getAdRewardProvider(): AdRewardProvider {
  return new MockAdRewardProvider();
}
