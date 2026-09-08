import { API_BASE_URL } from './config';
import { getToken, clearSession, type AuthUser } from './auth-store';

export type Plan = {
  id: string;
  providerId?: string;
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

export type Device = {
  id: string;
  nickname: string;
  status: string;
  iccid: string;
  /** Short LPA string safe for QRCode encoding (never a PNG data URL). */
  qrPayload: string | null;
  /** Same as qrPayload / activation LPA when present. */
  lpa?: string | null;
  lpaString?: string | null;
  lpa_string?: string | null;
  activationCode: string | null;
  /** Provider QR image (data:image/... or https) — render with Image, not QRCode. */
  qrImage?: string | null;
  qrCode?: string | null;
  qr_code?: string | null;
  installUrl: string | null;
  plan: { id: string; name: string; dataMb: number; region: string } | null;
  dataRemainingMb: number | null;
  dataTotalMb: number | null;
  expiresAt: string | null;
};

async function request<T>(
  path: string,
  opts: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...((opts.headers as Record<string, string>) || {}),
  };
  if (opts.auth !== false) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE_URL}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    await clearSession();
    throw new Error((data as { error?: string }).error || 'Unauthorized');
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  }
  return data as T;
}

export async function signIn(email: string, password: string) {
  return request<{ ok: boolean; token: string; user: AuthUser }>(
    '/api/auth',
    {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ mode: 'signin', email, password }),
    }
  );
}

export async function signUp(email: string, password: string, name?: string) {
  return request<{ ok: boolean; token: string; user: AuthUser }>(
    '/api/auth',
    {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ mode: 'signup', email, password, name }),
    }
  );
}

export async function signOut() {
  try {
    await request('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ mode: 'signout' }),
    });
  } catch {
    /* ignore */
  }
  await clearSession();
}

export async function fetchMe() {
  return request<{ ok: boolean; user: AuthUser }>('/api/me');
}

export async function fetchPlans(country = 'US') {
  const data = await request<{ ok: boolean; plans?: Plan[] | null }>(
    `/api/plans?country=${encodeURIComponent(country)}`,
    { auth: false }
  );
  return { ...data, plans: Array.isArray(data?.plans) ? data.plans : [] };
}

export async function fetchDevices() {
  const data = await request<{ ok: boolean; devices?: Device[] | null }>('/api/devices');
  return { ...data, devices: Array.isArray(data?.devices) ? data.devices : [] };
}

export async function purchasePlan(planId: string) {
  return request<{
    ok: boolean;
    purchaseId: string;
    iccid: string;
    qrPayload: string;
    activationCode: string;
    qrImage?: string | null;
  }>('/api/purchase', {
    method: 'POST',
    body: JSON.stringify({ planId }),
  });
}

export async function patchDevice(
  id: string,
  data: { nickname?: string; status?: string }
) {
  return request('/api/devices', {
    method: 'PATCH',
    body: JSON.stringify({ id, ...data }),
  });
}
