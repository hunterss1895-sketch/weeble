export const colors = {
  bg: '#000000',
  card: '#111111',
  cardAlt: '#181818',
  border: '#222222',
  borderLight: '#2a2a2a',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.5)',
  muted2: 'rgba(255,255,255,0.35)',
  accent: '#ffffff',
  danger: '#ef4444',
  success: '#34d399',
  amber: '#fbbf24',
};

export function formatData(mb: number): string {
  if (!Number.isFinite(mb) || mb < 0 || mb >= 500000) return 'Unlimited';
  if (mb >= 1024) return (mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1) + ' GB';
  return mb + ' MB';
}

export function formatPrice(cents: number, currency = 'USD'): string {
  if (cents <= 0) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}
