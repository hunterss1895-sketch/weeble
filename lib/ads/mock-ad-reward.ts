import { prisma } from '@/lib/db/prisma';
import type { AdHistoryItem, AdRewardProvider, AdRewardResult } from './types';

function startOfUtcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export class MockAdRewardProvider implements AdRewardProvider {
  readonly name = 'DemoRewardedVideo';
  readonly dailyCap = 5;
  readonly minMb = 50;
  readonly maxMb = 100;

  async canWatch(userId: string) {
    const since = startOfUtcDay();
    const count = await prisma.adReward.count({
      where: { userId, createdAt: { gte: since } },
    });
    const remaining = Math.max(0, this.dailyCap - count);
    if (remaining <= 0) {
      return { allowed: false, remaining: 0, reason: 'Daily ad reward cap reached. Come back tomorrow!' };
    }
    return { allowed: true, remaining };
  }

  async grantReward(userId: string): Promise<AdRewardResult> {
    const check = await this.canWatch(userId);
    if (!check.allowed) {
      return { success: false, dataMb: 0, message: check.reason || 'Not allowed', remainingToday: 0 };
    }

    const dataMb = this.minMb + Math.floor(Math.random() * (this.maxMb - this.minMb + 1));

    await prisma.adReward.create({
      data: { userId, dataMb, adProvider: this.name },
    });

    // Credit the most recent active purchase if any; otherwise track as usage bonus ledger
    const purchase = await prisma.purchase.findFirst({
      where: { userId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    if (purchase) {
      await prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          dataRemainingMb: purchase.dataRemainingMb + dataMb,
          dataTotalMb: purchase.dataTotalMb + dataMb,
        },
      });
    }

    await prisma.usageRecord.create({
      data: {
        userId,
        mbUsed: -dataMb,
        source: 'ad_reward',
        note: `Earned ${dataMb} MB from rewarded ad`,
      },
    });

    return {
      success: true,
      dataMb,
      message: `You earned ${dataMb} MB!`,
      remainingToday: check.remaining - 1,
    };
  }

  async getHistory(userId: string): Promise<AdHistoryItem[]> {
    const rows = await prisma.adReward.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => ({
      id: r.id,
      dataMb: r.dataMb,
      adProvider: r.adProvider,
      createdAt: r.createdAt,
    }));
  }
}
