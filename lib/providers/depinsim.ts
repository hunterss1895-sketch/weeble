/**
 * DepinSimProvider — LEGACY optional provider. Prefer EsimCardProvider (lib/providers/esimcard.ts) for custom SPN.
 * Docs: https://depinsim-api.gitbook.io/depinsim-api
 * Auth: Bearer DEPINSIM_ACCESS_TOKEN (request via DePinSim support).
 *
 * When the live API is unavailable or returns errors, methods fall back
 * to MockProvider behavior so the demo keeps working.
 */
import { MockProvider } from './mock';
import type { EsimPlan, EsimProvider, ProviderDevice, PurchaseResult, UsageSummary } from './types';

const BASE = process.env.DEPINSIM_API_BASE || 'https://api.depinsim.com/v1';

export class DepinSimProvider implements EsimProvider {
  readonly name = 'DepinSimProvider';
  readonly isDemo = false;
  private token: string;
  private fallback = new MockProvider();

  constructor(token: string) {
    this.token = token;
  }

  private async api<T>(path: string, init?: RequestInit): Promise<T | null> {
    try {
      const res = await fetch(BASE + path, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
        cache: 'no-store',
      });
      if (!res.ok) {
        console.warn('[DepinSim]', path, res.status);
        return null;
      }
      return (await res.json()) as T;
    } catch (e) {
      console.warn('[DepinSim] request failed, using mock fallback', e);
      return null;
    }
  }

  async listPlans(): Promise<EsimPlan[]> {
    const data = await this.api<{ plans?: Array<Record<string, unknown>> }>('/plans');
    if (!data?.plans?.length) return this.fallback.listPlans();
    return data.plans.map((p, i) => ({
      id: String(p.id ?? p.plan_id ?? `depinsim-${i}`),
      providerId: String(p.id ?? p.plan_id ?? `depinsim-${i}`),
      name: String(p.name ?? 'DePinSim Plan'),
      region: String(p.region ?? p.coverage ?? 'International'),
      countryCode: String(p.country_code ?? p.countryCode ?? 'GL'),
      dataMb: Number(p.data_mb ?? p.dataMb ?? p.data_amount ?? 1024),
      validityDays: Number(p.validity_days ?? p.validityDays ?? p.days ?? 7),
      priceCents: Math.round(Number(p.price_cents ?? (Number(p.price ?? 0) * 100))),
      currency: String(p.currency ?? 'USD'),
      description: String(p.description ?? ''),
      popular: Boolean(p.popular),
      isUs: String(p.country_code ?? p.region ?? '').toUpperCase().includes('US'),
      features: Array.isArray(p.features) ? (p.features as string[]) : ['DePinSim network'],
    }));
  }

  async getPlan(id: string): Promise<EsimPlan | null> {
    const data = await this.api<Record<string, unknown>>(`/plans/${id}`);
    if (!data) return this.fallback.getPlan(id);
    const plans = await this.listPlans();
    return plans.find((p) => p.id === id) || null;
  }

  async purchase(planId: string, userId: string): Promise<PurchaseResult> {
    const data = await this.api<{
      order_id?: string;
      iccid?: string;
      activation_code?: string;
      qr_code?: string;
      data_mb?: number;
      expires_at?: string;
    }>('/orders', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId, user_ref: userId }),
    });
    if (!data?.iccid) return this.fallback.purchase(planId, userId);
    return {
      purchaseId: String(data.order_id ?? crypto.randomUUID()),
      iccid: String(data.iccid),
      activationCode: String(data.activation_code ?? ''),
      qrPayload: String(data.qr_code ?? `LPA:1$depinsim$${data.activation_code}`),
      dataTotalMb: Number(data.data_mb ?? 0),
      expiresAt: data.expires_at ? new Date(data.expires_at) : new Date(Date.now() + 7 * 86400000),
    };
  }

  async getUsage(userId: string): Promise<UsageSummary> {
    const data = await this.api<{ remaining_mb?: number; total_mb?: number; active?: number }>(
      `/usage?user_ref=${encodeURIComponent(userId)}`
    );
    if (!data) return this.fallback.getUsage(userId);
    return {
      dataRemainingMb: Number(data.remaining_mb ?? 0),
      dataTotalMb: Number(data.total_mb ?? 0),
      activePlans: Number(data.active ?? 0),
    };
  }

  async getDevices(userId: string): Promise<ProviderDevice[]> {
    const data = await this.api<{ devices?: Array<{ iccid: string; nickname?: string; status?: string }> }>(
      `/devices?user_ref=${encodeURIComponent(userId)}`
    );
    if (!data?.devices) return this.fallback.getDevices(userId);
    return data.devices.map((d) => ({
      iccid: d.iccid,
      nickname: d.nickname,
      status: d.status || 'active',
    }));
  }
}
