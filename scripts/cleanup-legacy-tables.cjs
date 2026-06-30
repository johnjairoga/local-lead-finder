const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DIRECT_URL } },
  });

  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "leads" CASCADE`);
  await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "treatment_pages" CASCADE`);

  console.log("Dropped legacy tables: leads, treatment_pages");
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
