// AE-29: bulk historical backfill. Accepts rows already parsed client-side
// from the downloadable template (see src/pages/DataImport.jsx) and creates
// real AuctionEntry + SaleLine records -- the same shape live Auction Entry
// produces -- so every existing report/bill-generation flow works on
// imported data unmodified. Simplification: each row becomes its own
// AuctionEntry (with one SaleLine) rather than grouping same-vehicle/date/
// variety rows into a shared AuctionEntry the way live entry does; reports
// query at the SaleLine level so this doesn't affect any report's numbers,
// it just means a historical date's Auction Entry list may show more,
// smaller entries than a manually-entered day would.
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { computeSaleLineAmount } from "../lib/calc.js";

const router = Router();

router.post("/auction-entries", requireAuth, requireRole("ADMIN"), asyncHandler(async (req, res) => {
  const { rows } = req.body || {};
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "rows must be a non-empty array" });
  }
  if (rows.length > 5000) {
    return res.status(400).json({ error: "Max 5000 rows per import -- split into multiple uploads" });
  }

  let created = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = i + 2; // template row 1 is the header
    const row = rows[i] || {};
    try {
      await importRow(row);
      created += 1;
    } catch (err) {
      errors.push({ row: rowNum, message: err.message || "Unknown error" });
    }
  }

  res.json({ created, errorCount: errors.length, errors });
}));

async function importRow(row) {
  const auctionDate = row.auctionDate;
  const plantainTypeCode = String(row.plantainTypeCode || "").trim();
  const stockTypeCode = String(row.stockTypeCode || "").trim();
  const vehicleRef = String(row.vehicleRef || "").trim();
  const farmerAgentName = String(row.farmerAgentName || "").trim();
  const customerInitials = String(row.customerInitials || "").trim().toUpperCase();
  const customerName = String(row.customerName || "").trim();
  const rate = Number(row.rate);
  const quantity = Number(row.quantity);

  if (!auctionDate || isNaN(new Date(auctionDate).getTime())) {
    throw new Error("auctionDate is missing or not a valid date");
  }
  if (!plantainTypeCode) throw new Error("plantainTypeCode is required");
  if (!stockTypeCode) throw new Error("stockTypeCode is required");
  if (!vehicleRef) throw new Error("vehicleRef is required");
  if (!farmerAgentName) throw new Error("farmerAgentName is required");
  if (!customerInitials) throw new Error("customerInitials is required");
  if (!(rate > 0)) throw new Error("rate must be a positive number");
  if (!(quantity > 0)) throw new Error("quantity must be a positive number");

  const parsedDate = new Date(auctionDate);

  const [plantainType, stockType] = await Promise.all([
    prisma.plantainType.findUnique({ where: { code: plantainTypeCode } }),
    prisma.stockType.findUnique({ where: { code: stockTypeCode } }),
  ]);
  // Fixed, small taxonomy -- unlike vehicles/farmers/customers below, we
  // don't silently create new plantain/stock types from a typo in a
  // spreadsheet; that has to go through Masters deliberately.
  if (!plantainType) throw new Error(`Unknown plantain type code "${plantainTypeCode}"`);
  if (!stockType) throw new Error(`Unknown stock type code "${stockTypeCode}"`);

  let farmerAgent = await prisma.farmerAgent.findFirst({
    where: { name: { equals: farmerAgentName, mode: "insensitive" } },
  });
  if (!farmerAgent) {
    farmerAgent = await prisma.farmerAgent.create({
      data: { name: farmerAgentName, phone: row.farmerAgentPhone ? String(row.farmerAgentPhone).trim() : null },
    });
  }

  let vehicle = await prisma.vehicle.findUnique({ where: { vehicleRef } });
  if (!vehicle) {
    vehicle = await prisma.vehicle.create({
      data: { vehicleRef, farmerAgentId: farmerAgent.id, arrivalDate: parsedDate },
    });
  }

  let customer = await prisma.customer.findUnique({ where: { initials: customerInitials } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: { name: customerName || customerInitials, initials: customerInitials },
    });
  }

  await prisma.auctionEntry.create({
    data: {
      vehicleId: vehicle.id,
      auctionDate: parsedDate,
      plantainTypeId: plantainType.id,
      stockTypeId: stockType.id,
      createdBy: "import",
      saleLines: {
        create: [
          {
            customerId: customer.id,
            customerInitials: customer.initials,
            rate,
            quantity,
            amount: computeSaleLineAmount(rate, quantity),
            createdBy: "import",
          },
        ],
      },
    },
  });
}

export default router;
