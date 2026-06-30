import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const health = await prisma.$queryRaw`
    SELECT
      1 AS ok,
      current_database() AS db,
      current_user AS "user",
      (SELECT count(*)::int FROM information_schema.tables WHERE table_schema = 'public') AS public_table_count
  `;
  console.log("CONNECTION_OK", JSON.stringify(health));

  const migrations = await prisma.$queryRaw`
    SELECT migration_name, finished_at
    FROM _prisma_migrations
    ORDER BY finished_at DESC NULLS LAST
    LIMIT 5
  `.catch(() => null);

  if (migrations) {
    console.log("MIGRATIONS", JSON.stringify(migrations));
  } else {
    console.log("MIGRATIONS", "none (_prisma_migrations table not found — run db:migrate)");
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("CONNECTION_FAILED", error.message);
  await prisma.$disconnect();
  process.exit(1);
});
