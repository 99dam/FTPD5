// Public, client-visible configuration only. Anything here ships in the
// JavaScript bundle and must never be a secret.
const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

function looksLikeSecret(value: string): boolean {
  if (value.startsWith('sb_secret_')) return true;
  // Legacy JWT keys: refuse to run with a service_role key in the browser.
  const parts = value.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload?.role === 'service_role';
    } catch {
      return false;
    }
  }
  return false;
}

export const env = {
  supabaseUrl: url,
  supabaseKey: key,
  idleTimeoutMinutes: Math.max(5, Number(import.meta.env.VITE_IDLE_TIMEOUT_MINUTES) || 30),
  isConfigured: Boolean(url && key) && !looksLikeSecret(key),
  hasSecretKey: looksLikeSecret(key),
};
