import { PrismaClient } from "@prisma/client";

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  console.error("DIRECT_URL missing");
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url: directUrl } } });

async function main() {
  const result = await prisma.$queryRaw`
    SELECT 1 AS ok, current_database() AS db, current_user AS "user"
  `;
  console.log("DIRECT_OK", JSON.stringify(result));

  const tables = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `;
  console.log("TABLES", JSON.stringify(tables));

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("DIRECT_FAILED", error.message);
  await prisma.$disconnect();
  process.exit(1);
});
