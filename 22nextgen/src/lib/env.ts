/** Central, typed access to environment variables. Never hardcode secrets. */

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export function supabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && anonKey ? { url, anonKey } : null;
}

export function isSupabaseConfigured(): boolean {
  return supabasePublicConfig() !== null;
}

export function gaMeasurementId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  return id && /^G-[A-Z0-9]+$/.test(id) ? id : null;
}

/** Server-only secrets. Importing this from a client component will fail the build via server-only. */
export function serverSecrets() {
  return {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
    jotformApiKey: process.env.JOTFORM_API_KEY || null,
    jotformApiBase: (process.env.JOTFORM_API_BASE || "https://api.jotform.com").replace(/\/$/, ""),
    jotformWebhookSecret: process.env.JOTFORM_WEBHOOK_SECRET || null,
  };
}
