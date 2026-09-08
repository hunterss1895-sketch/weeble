export const colors = {
  bg: '#050505',
  bgElevated: '#0a0a0a',
  card: 'rgba(255,255,255,0.06)',
  cardSolid: '#121212',
  cardAlt: 'rgba(255,255,255,0.04)',
  glass: 'rgba(255,255,255,0.08)',
  glassBorder: 'rgba(255,255,255,0.15)',
  border: 'rgba(255,255,255,0.10)',
  borderLight: 'rgba(255,255,255,0.18)',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.55)',
  muted2: 'rgba(255,255,255,0.38)',
  accent: '#ffffff',
  danger: '#ef4444',
  success: '#34d399',
  amber: '#fbbf24',
  shadow: 'rgba(0,0,0,0.45)',
};

export function formatData(mb: number | null | undefined): string {
  if (mb == null || !Number.isFinite(mb) || mb < 0 || mb >= 500000) return 'Unlimited';
  if (mb >= 1024) return (mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1) + ' GB';
  return mb + ' MB';
}

export function formatPrice(cents: number | null | undefined, currency = 'USD'): string {
  if (cents == null || !Number.isFinite(cents) || cents <= 0) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}
