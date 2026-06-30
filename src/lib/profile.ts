import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns the authenticated user's ID and ensures their profile row exists.
 * Falls back to SUPABASE_DEFAULT_USER_ID for background worker contexts
 * (scraper process) where there is no HTTP session.
 */
export async function ensureDefaultProfile(): Promise<string> {
  // Try to get user from active session first
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
      await prisma.profile.upsert({
        where: { id: user.id },
        create: { id: user.id },
        update: {},
      });
      return user.id;
    }
  } catch {
    // No HTTP context (background worker) — fall through to env var
  }

  // Background worker fallback
  const fallbackId = process.env.SUPABASE_DEFAULT_USER_ID;
  if (!fallbackId) {
    throw new Error(
      "No authenticated user and SUPABASE_DEFAULT_USER_ID is not set. " +
        "Add it to .env with your Supabase auth user UUID."
    );
  }

  await prisma.profile.upsert({
    where: { id: fallbackId },
    create: { id: fallbackId },
    update: {},
  });

  return fallbackId;
}
