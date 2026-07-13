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

  // Starter customers and farmers/agents (AE-11) -- without these the
  // Auction Entry dropdowns are empty on first run and submitting the form
  // fails validation with no clue why. `initials` is unique on Customer so
  // it upserts cleanly; FarmerAgent has no unique field, so guard with a
  // findFirst check to stay idempotent on repeat seed runs.
  const customers = [
    { name: "Sample Traders", initials: "ST" },
    { name: "City Wholesale", initials: "CW" },
  ];
  for (const c of customers) {
    await prisma.customer.upsert({
      where: { initials: c.initials },
      update: {},
      create: c,
    });
  }

  const farmersAgents = [{ name: "Sample Farmer", phone: null }];
  for (const fa of farmersAgents) {
    const existing = await prisma.farmerAgent.findFirst({ where: { name: fa.name } });
    if (!existing) {
      await prisma.farmerAgent.create({ data: fa });
    }
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
