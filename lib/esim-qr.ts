/** Helpers for eSIM LPA strings vs Citrus/provider QR *images* (PNG data URLs). */

export function isQrImageUri(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  return v.startsWith('data:image') || /^https?:\/\//i.test(v);
}

/** Prefer LPA:1$... from activationCode; never treat a PNG data URL as an LPA. */
export function extractLpaString(
  activationCode?: string | null,
  qrPayload?: string | null
): string {
  const fromLines = (raw: string) => {
    const lines = raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    return lines.find((l) => l.startsWith('LPA:')) || '';
  };

  const fromActivation = fromLines(activationCode || '');
  if (fromActivation) return fromActivation;

  const qp = (qrPayload || '').trim();
  if (qp && !isQrImageUri(qp)) {
    if (qp.startsWith('LPA:')) return qp.split('\n')[0]!.trim();
    const nested = fromLines(qp);
    if (nested) return nested;
    if (qp.length <= 2000) return qp;
  }
  return '';
}

export function pickQrImage(
  qrImage?: string | null,
  qrPayload?: string | null
): string | null {
  if (qrImage && isQrImageUri(qrImage)) return qrImage.trim();
  if (qrPayload && isQrImageUri(qrPayload)) return qrPayload.trim();
  return null;
}

/** Safe to feed into react-native-qrcode-svg / QR encoders. */
export function isSafeQrCodeValue(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  if (!v) return false;
  if (v.startsWith('data:')) return false;
  if (v.length > 2000) return false;
  if (v.startsWith('{') || v.startsWith('[')) return false;
  return true;
}
