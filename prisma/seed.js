// Minimal seed data to make Phase 1 usable out of the box.
// Run with: npm run prisma:seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("changeme123", 10);

  await prisma.user.upsert({
    where: { email: "admin@arkplantainmundy.local" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@arkplantainmundy.local",
      passwordHash,
      role: "ADMIN",
    },
  });

  const plantainTypes = [
    { code: "NENDRAN", nameEn: "Nendran" },
    { code: "ROBUSTA", nameEn: "Robusta" },
    { code: "POOVAN", nameEn: "Poovan" },
    { code: "RED_BANANA", nameEn: "Red Banana" },
  ];
  for (const pt of plantainTypes) {
    await prisma.plantainType.upsert({
      where: { code: pt.code },
      update: {},
      create: pt,
    });
  }

  const stockTypes = [
    { code: "BUNCH", nameEn: "Bunch" },
    { code: "HAND", nameEn: "Hand" },
    { code: "BOX", nameEn: "Box" },
  ];
  for (const st of stockTypes) {
    await prisma.stockType.upsert({
      where: { code: st.code },
      update: {},
      create: st,
    });
  }

  console.log("Seed complete. Admin login: admin@arkplantainmundy.local / changeme123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
