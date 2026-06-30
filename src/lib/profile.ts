import { prisma } from "@/lib/db";

const DEFAULT_USER_ID = process.env.SUPABASE_DEFAULT_USER_ID;

export async function ensureDefaultProfile(): Promise<string> {
  if (!DEFAULT_USER_ID) {
    throw new Error(
      "SUPABASE_DEFAULT_USER_ID is required. Copy a user UUID from Supabase → Authentication → Users into .env"
    );
  }

  await prisma.profile.upsert({
    where: { id: DEFAULT_USER_ID },
    create: { id: DEFAULT_USER_ID },
    update: {},
  });

  return DEFAULT_USER_ID;
}
