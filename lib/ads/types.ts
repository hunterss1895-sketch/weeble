export type AdRewardResult = {
  success: boolean;
  dataMb: number;
  message: string;
  remainingToday: number;
};

export type AdHistoryItem = {
  id: string;
  dataMb: number;
  adProvider: string;
  createdAt: Date;
};

export interface AdRewardProvider {
  readonly name: string;
  readonly dailyCap: number;
  readonly minMb: number;
  readonly maxMb: number;
  canWatch(userId: string): Promise<{ allowed: boolean; remaining: number; reason?: string }>;
  grantReward(userId: string): Promise<AdRewardResult>;
  getHistory(userId: string): Promise<AdHistoryItem[]>;
}
