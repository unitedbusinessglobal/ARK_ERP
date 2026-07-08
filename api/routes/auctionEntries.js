// Guided, dropdown-driven auction-note entry (FR-001, AE-6).
// One auction entry (vehicle + date + plantain/stock type) fans out into
// customer-wise sale_lines, which are the atomic transaction everything else derives from.
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { computeSaleLineAmount } from "../lib/calc.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const { date, vehicleId } = req.query;
  const where = {};
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.auctionDate = { gte: start, lt: end };
  }
  if (vehicleId) where.vehicleId = vehicleId;

  const entries = await prisma.auctionEntry.findMany({
    where,
    include: {
      vehicle: { include: { farmerAgent: true } },
      plantainType: true,
      stockType: true,
      saleLines: { include: { customer: true } },
    },
    orderBy: { auctionDate: "desc" },
  });
  res.json(entries);
}));

router.get("/:id", requireAuth, asyncHandler(async (req, res) => {
  const entry = await prisma.auctionEntry.findUnique({
    where: { id: req.params.id },
    include: {
      vehicle: { include: { farmerAgent: true } },
      plantainType: true,
      stockType: true,
      saleLines: { include: { customer: true } },
    },
  });
  if (!entry) return res.status(404).json({ error: "Auction entry not found" });
  res.json(entry);
}));

// Validation before save (architecture §1, FR-001): vehicle/plantain/stock type
// must exist, and every sale line needs a customer, rate and quantity > 0.
router.post("/", requireAuth, requireRole("ADMIN", "DATA_ENTRY"), asyncHandler(async (req, res) => {
  const { vehicleId, auctionDate, plantainTypeId, stockTypeId, saleLines } = req.body || {};

  if (!vehicleId || !auctionDate || !plantainTypeId || !stockTypeId) {
    return res.status(400).json({
      error: "vehicleId, auctionDate, plantainTypeId and stockTypeId are required",
    });
  }
  if (!Array.isArray(saleLines) || saleLines.length === 0) {
    return res.status(400).json({ error: "At least one sale line is required" });
  }
  for (const [i, line] of saleLines.entries()) {
    if (!line.customerId || !(Number(line.rate) > 0) || !(Number(line.quantity) > 0)) {
      return res.status(400).json({
        error: `Sale line ${i + 1}: customerId, rate > 0 and quantity > 0 are required`,
      });
    }
  }

  const [vehicle, plantainType, stockType] = await Promise.all([
    prisma.vehicle.findUnique({ where: { id: vehicleId } }),
    prisma.plantainType.findUnique({ where: { id: plantainTypeId } }),
    prisma.stockType.findUnique({ where: { id: stockTypeId } }),
  ]);
  if (!vehicle) return res.status(400).json({ error: "Unknown vehicleId" });
  if (!plantainType) return res.status(400).json({ error: "Unknown plantainTypeId" });
  if (!stockType) return res.status(400).json({ error: "Unknown stockTypeId" });

  const entry = await prisma.auctionEntry.create({
    data: {
      vehicleId,
      auctionDate: new Date(auctionDate),
      plantainTypeId,
      stockTypeId,
      createdBy: req.user?.sub,
      saleLines: {
        create: saleLines.map((line) => ({
          customerId: line.customerId,
          customerInitials: line.customerInitials || "",
          rate: line.rate,
          quantity: line.quantity,
          amount: computeSaleLineAmount(line.rate, line.quantity),
          createdBy: req.user?.sub,
        })),
      },
    },
    include: { saleLines: true },
  });

  res.status(201).json(entry);
}));

export default router;
