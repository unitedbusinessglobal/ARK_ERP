// Farmer/agent sales bill generation + calculation engine (FR-003, AE-8).
// Phase 1 = single-day (salePeriodFrom === salePeriodTo); Phase 2 adds
// multi-day consolidation per vehicle (BR-005) on top of the same schema.
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { computeSalesBillTotals } from "../lib/calc.js";
import { nextBillNumber } from "../lib/billNumber.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { vehicleId, farmerAgentId } = req.query;
  const where = {};
  if (vehicleId) where.vehicleId = vehicleId;
  if (farmerAgentId) where.farmerAgentId = farmerAgentId;

  const bills = await prisma.salesBill.findMany({
    where,
    include: { vehicle: true, farmerAgent: true },
    orderBy: { generatedAt: "desc" },
  });
  res.json(bills);
});

router.get("/:id", requireAuth, async (req, res) => {
  const bill = await prisma.salesBill.findUnique({
    where: { id: req.params.id },
    include: {
      vehicle: true,
      farmerAgent: true,
      lines: {
        include: {
          saleLine: {
            include: { customer: true, auctionEntry: { include: { plantainType: true, stockType: true } } },
          },
        },
      },
    },
  });
  if (!bill) return res.status(404).json({ error: "Sales bill not found" });
  res.json(bill);
});

// Generate for a single vehicle/date range (Phase 1: single day, salePeriodFrom = salePeriodTo).
router.post("/", requireAuth, requireRole("ADMIN", "BILLING"), async (req, res) => {
  const {
    vehicleId,
    salePeriodFrom,
    salePeriodTo,
    language,
    commissionPercent,
    commissionOverride,
    vehicleFareOverride,
  } = req.body || {};

  if (!vehicleId || !salePeriodFrom) {
    return res.status(400).json({ error: "vehicleId and salePeriodFrom are required" });
  }
  const periodTo = salePeriodTo || salePeriodFrom;

  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return res.status(400).json({ error: "Unknown vehicleId" });

  const from = new Date(salePeriodFrom);
  const to = new Date(periodTo);
  to.setDate(to.getDate() + 1);

  const auctionEntries = await prisma.auctionEntry.findMany({
    where: { vehicleId, auctionDate: { gte: from, lt: to } },
    include: { saleLines: true },
  });
  const saleLines = auctionEntries.flatMap((e) => e.saleLines);

  if (saleLines.length === 0) {
    return res.status(400).json({ error: "No sale lines found for this vehicle/period" });
  }

  const saleLineIds = saleLines.map((l) => l.id);
  const alreadyBilled = await prisma.salesBillLine.findFirst({
    where: { saleLineId: { in: saleLineIds } },
  });
  if (alreadyBilled) {
    return res.status(409).json({ error: "One or more sale lines are already on a sales bill" });
  }

  const totals = computeSalesBillTotals({
    saleLines,
    vehicleFare: vehicle.vehicleFare,
    commissionPercent,
    commissionOverride,
    vehicleFareOverride,
  });

  const billNo = await nextBillNumber(prisma, {
    prefix: "SB",
    date: salePeriodFrom,
    model: prisma.salesBill,
  });

  const bill = await prisma.salesBill.create({
    data: {
      billNo,
      vehicleId,
      farmerAgentId: vehicle.farmerAgentId,
      salePeriodFrom: from,
      salePeriodTo: new Date(periodTo),
      grossSalesAmount: totals.grossSalesAmount,
      commission: totals.commission,
      vehicleFare: totals.vehicleFare,
      netPayableAmount: totals.netPayableAmount,
      language: language === "TA" ? "TA" : "EN",
      generatedBy: req.user?.sub,
      lines: { create: saleLineIds.map((saleLineId) => ({ saleLineId })) },
    },
    include: { lines: true, vehicle: true, farmerAgent: true },
  });

  res.status(201).json(bill);
});

export default router;
