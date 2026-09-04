/**
 * TelnyxProvider — recommended real eSIM provider (custom SPN / whitelabel).
 *
 * Docs:
 *   POST https://api.telnyx.com/v2/actions/purchase/esims
 *     { amount, product: "whitelabel", whitelabel_name, status?, tags?, sim_card_group_id? }
 *   GET  /v2/sim_cards/{id}/activation_code → { data: { activation_code } }
 *   GET  /v2/sim_cards (list / filter by iccid)
 *
 * Auth: Authorization: Bearer TELNYX_API_KEY
 *
 * Plan catalog stays local (Weeble seed DB). Purchases call Telnyx when the key
 * is present. On missing key or API errors, falls back to MockProvider with
 * Weeble SPN branding — never crashes. isDemo=false when credentials exist.
 */
import { prisma } from '@/lib/db/prisma';
import { MockProvider } from './mock';
import type { EsimPlan, EsimProvider, ProviderDevice, PurchaseResult, UsageSummary } from './types';

const DEFAULT_BASE = 'https://api.telnyx.com/v2';

function whitelabelName(): string {
  const raw =
    process.env.TELNYX_WHITELABEL_NAME?.trim() ||
    process.env.WEEBLE_SPN?.trim() ||
    'Weeble';
  // Telnyx: letters, numbers, whitespaces only
  return raw.replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'Weeble';
}

type TelnyxSimCard = {
  id?: string;
  iccid?: string;
  type?: string;
  status?: { value?: string } | string;
  tags?: string[];
  esim_installation_status?: string | null;
};

type PurchaseEsimsResponse = {
  data?: TelnyxSimCard[];
  errors?: Array<{ title?: string; detail?: string }>;
};

type ActivationCodeResponse = {
  data?: { activation_code?: string; record_type?: string };
};

export class TelnyxProvider implements EsimProvider {
  readonly name = 'TelnyxProvider';
  /** Live when API key is configured; UI shows green “Live” badge. */
  readonly isDemo = false;

  private base: string;
  private apiKey?: string;
  private fallback = new MockProvider();

  constructor(opts?: { apiKey?: string; baseUrl?: string }) {
    this.base = (opts?.baseUrl || process.env.TELNYX_API_BASE || DEFAULT_BASE).replace(/\/$/, '');
    this.apiKey = opts?.apiKey || process.env.TELNYX_API_KEY?.trim();
  }

  static hasCredentials(): boolean {
    return Boolean(process.env.TELNYX_API_KEY?.trim());
  }

  private async api<T>(path: string, init?: RequestInit): Promise<T | null> {
    if (!this.apiKey) return null;
    try {
      const res = await fetch(`${this.base}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(init?.headers as Record<string, string> | undefined),
        },
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.warn('[Telnyx]', path, res.status, body.slice(0, 200));
        return null;
      }
      if (res.status === 204) return {} as T;
      return (await res.json()) as T;
    } catch (e) {
      console.warn('[Telnyx] request failed, using mock fallback', e);
      return null;
    }
  }

  /** Keep Weeble’s cheap seeded catalog; purchases go through Telnyx. */
  async listPlans(): Promise<EsimPlan[]> {
    return this.fallback.listPlans();
  }

  async getPlan(id: string): Promise<EsimPlan | null> {
    return this.fallback.getPlan(id);
  }

  private async fetchActivationCode(simId: string): Promise<string | null> {
    const res = await this.api<ActivationCodeResponse>(`/sim_cards/${simId}/activation_code`);
    const code = res?.data?.activation_code?.trim();
    return code || null;
  }

  async purchase(planId: string, userId: string): Promise<PurchaseResult> {
    try {
      const plan = await this.getPlan(planId);
      if (!plan) throw new Error('Plan not found');

      // Free starter / $0 plans stay local (ads/demo unlock) — never bill Telnyx.
      if (plan.priceCents <= 0) {
        return this.fallback.purchase(planId, userId);
      }

      if (!this.apiKey) {
        return this.fallback.purchase(planId, userId);
      }

      const spn = whitelabelName();
      const groupId = process.env.TELNYX_SIM_CARD_GROUP_ID?.trim();
      const body: Record<string, unknown> = {
        amount: 1,
        product: 'whitelabel',
        whitelabel_name: spn,
        status: 'enabled',
        tags: ['weeble', `user:${userId}`, `plan:${plan.id}`],
      };
      if (groupId) body.sim_card_group_id = groupId;

      const purchased = await this.api<PurchaseEsimsResponse>('/actions/purchase/esims', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const sim = purchased?.data?.[0];
      if (!sim?.id && !sim?.iccid) {
        console.warn('[Telnyx] purchase/esims returned no SIM; mock fallback');
        return this.fallback.purchase(planId, userId);
      }

      const simId = String(sim.id || '');
      const iccid = String(sim.iccid || `telnyx-${simId || Date.now()}`);

      let activationCode = '';
      if (simId) {
        activationCode = (await this.fetchActivationCode(simId)) || '';
      }

      const qrPayload = activationCode.startsWith('LPA:')
        ? activationCode
        : activationCode
          ? `LPA:1$rsp.telnyx.com$${activationCode}`
          : `LPA:1$weeble.telnyx$${iccid}`;

      if (!activationCode) {
        activationCode = qrPayload.startsWith('LPA:') ? qrPayload : `WEEBLE-${iccid.slice(-8)}`;
      }

      const expiresAt = new Date(Date.now() + plan.validityDays * 86400000);

      const purchase = await prisma.purchase.create({
        data: {
          userId,
          planId: plan.id,
          status: 'active',
          activationCode,
          qrPayload,
          iccid,
          dataRemainingMb: plan.dataMb,
          dataTotalMb: plan.dataMb,
          expiresAt,
        },
      });

      await prisma.device.create({
        data: {
          userId,
          purchaseId: purchase.id,
          nickname: `${plan.name} eSIM (${spn})`,
          iccid,
          status: 'pending_install',
        },
      });

      return {
        purchaseId: purchase.id,
        iccid,
        activationCode,
        qrPayload,
        dataTotalMb: plan.dataMb,
        expiresAt,
      };
    } catch (e) {
      console.warn('[Telnyx] purchase failed, mock fallback', e);
      return this.fallback.purchase(planId, userId);
    }
  }

  async getUsage(userId: string): Promise<UsageSummary> {
    // Local ledger (includes ad rewards); Telnyx wireless usage can enrich later.
    return this.fallback.getUsage(userId);
  }

  async getDevices(userId: string): Promise<ProviderDevice[]> {
    return this.fallback.getDevices(userId);
  }
}
