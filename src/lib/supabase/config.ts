/**
 * Supabase configuration — loaded from environment variables.
 * Database access uses Prisma (DATABASE_URL + DIRECT_URL).
 * API keys are available for future Supabase client features.
 */

const PLACEHOLDER_MARKERS = ["YOUR_PROJECT_REF", "YOUR_PASSWORD", "your-anon-key", "your-service-role-key"];

function isPlaceholder(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  return PLACEHOLDER_MARKERS.some((marker) => value.includes(marker));
}

export function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    databaseUrl: process.env.DATABASE_URL ?? "",
    directUrl: process.env.DIRECT_URL ?? "",
  };
}

export function assertSupabaseEnv(): void {
  const config = getSupabaseConfig();
  const missing: string[] = [];

  if (isPlaceholder(config.url)) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (isPlaceholder(config.anonKey)) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (isPlaceholder(config.serviceRoleKey)) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (isPlaceholder(config.databaseUrl)) missing.push("DATABASE_URL");
  if (isPlaceholder(config.directUrl)) missing.push("DIRECT_URL");

  if (missing.length > 0) {
    throw new Error(
      `Missing or placeholder Supabase env vars: ${missing.join(", ")}. ` +
        "Copy .env.example to .env and fill in values from the Supabase dashboard."
    );
  }

  if (!config.databaseUrl.includes("supabase.com")) {
    throw new Error(
      "DATABASE_URL must point to Supabase (pooler). Local PostgreSQL is not supported."
    );
  }
}

export function isSupabaseConfigured(): boolean {
  try {
    assertSupabaseEnv();
    return true;
  } catch {
    return false;
  }
}
