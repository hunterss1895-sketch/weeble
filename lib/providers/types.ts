export type EsimPlan = {
  id: string;
  providerId: string;
  name: string;
  region: string;
  countryCode: string;
  dataMb: number;
  validityDays: number;
  priceCents: number;
  currency: string;
  description: string;
  popular: boolean;
  isUs: boolean;
  features: string[];
};

export type PurchaseResult = {
  purchaseId: string;
  iccid: string;
  /** LPA activation string (and optional install URL lines). */
  activationCode: string;
  /** Short string safe to encode in a QR (usually LPA:1$...). Never a PNG data URL. */
  qrPayload: string;
  /** Optional provider-rendered QR image (data:image/... or https URL). */
  qrImage?: string | null;
  dataTotalMb: number;
  expiresAt: Date;
};

export type UsageSummary = {
  dataRemainingMb: number;
  dataTotalMb: number;
  activePlans: number;
};

export type ProviderDevice = {
  iccid: string;
  nickname?: string;
  status: string;
};

export interface EsimProvider {
  readonly name: string;
  readonly isDemo: boolean;
  listPlans(): Promise<EsimPlan[]>;
  getPlan(id: string): Promise<EsimPlan | null>;
  purchase(planId: string, userId: string): Promise<PurchaseResult>;
  getUsage(userId: string): Promise<UsageSummary>;
  getDevices(userId: string): Promise<ProviderDevice[]>;
}
