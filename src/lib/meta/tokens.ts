/**
 * Check if a token is expiring soon (within 7 days).
 * Page tokens (from long-lived user tokens) never expire, so this is mainly
 * for user tokens (~60 days).
 */
export function isTokenExpiringSoon(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const expiryDate = new Date(expiresAt);
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  return expiryDate <= sevenDaysFromNow;
}

/**
 * Calculate the expiry date from an expires_in value (in seconds).
 */
export function calculateExpiryDate(expiresInSeconds: number): string {
  const date = new Date();
  date.setSeconds(date.getSeconds() + expiresInSeconds);
  return date.toISOString();
}
