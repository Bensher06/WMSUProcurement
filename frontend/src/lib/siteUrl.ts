/**
 * Base URL for Supabase email redirects (confirm signup, recovery, etc.).
 * Prefer `VITE_SITE_URL` in env so links in email match production even when
 * the action is triggered from another origin.
 */
export function getSiteUrl(): string {
  const envValue =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL
      ? String(import.meta.env.VITE_SITE_URL).trim()
      : '';
  if (envValue) return envValue.replace(/\/+$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://wmsu-procurement.vercel.app';
}
