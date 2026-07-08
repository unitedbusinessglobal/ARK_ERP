// Customer bill generation (FR-002, AE-7). Bills are immutable once generated;
// GET re-renders from the stored bill + linked sale_lines (never re-entered data).
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { sumSaleLines } from "../lib/calc.js";
import { nextBillNumber } from "../lib/billNumber.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { customerId, date } = req.query;
  const where = {};
  if (customerId) where.customerId = customerId;
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.billDate = { gte: start, lt: end };
  }
  const bills = await prisma.customerBill.findMany({
    where,
    include: { customer: true },
    orderBy: { generatedAt: "desc" },
  });
  res.json(bills);
});

// Fetch/reprint — re-renders from stored data (FR-007).
router.get("/:id", requireAuth, async (req, res) => {
  const bill = await prisma.customerBill.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true,
      lines: {
        include: {
          saleLine: {
            include: {
              auctionEntry: {
                include: { vehicle: { include: { farmerAgent: true } }, plantainType: true, stockType: true },
              },
            },
          },
        },
      },
    },
  });
  if (!bill) return res.status(404).json({ error: "Customer bill not found" });
  res.json(bill);
});

router.post("/:id/reprint", requireAuth, requireRole("ADMIN", "BILLING", "AUDITOR"), async (req, res) => {
  const bill = await prisma.customerBill.update({
    where: { id: req.params.id },
    data: { status: "REPRINTED" },
  });
  res.json(bill);
});

// Generate: pick existing sale_lines for a customer/date, snapshot the total (FR-002).
router.post("/", requireAuth, requireRole("ADMIN", "BILLING"), async (req, res) => {
  const { customerId, billDate, saleLineIds, language } = req.body || {};

  if (!customerId || !billDate || !Array.isArray(saleLineIds) || saleLineIds.length === 0) {
    return res.status(400).json({
      error: "customerId, billDate and a non-empty saleLineIds array are required",
    });
  }

  const saleLines = await prisma.saleLine.findMany({
    where: { id: { in: saleLineIds }, customerId },
  });
  if (saleLines.length !== saleLineIds.length) {
    return res.status(400).json({
      error: "One or more saleLineIds were not found or do not belong to this customer",
    });
  }

  const alreadyBilled = await prisma.customerBillLine.findFirst({
    where: { saleLineId: { in: saleLineIds } },
  });
  if (alreadyBilled) {
    return res.status(409).json({ error: "One or more sale lines are already on a bill" });
  }

  const grandTotal = sumSaleLines(saleLines);
  const billNo = await nextBillNumber(prisma, {
    prefix: "CB",
    date: billDate,
    model: prisma.customerBill,
  });

  const bill = await prisma.customerBill.create({
    data: {
      billNo,
      customerId,
      billDate: new Date(billDate),
      language: language === "TA" ? "TA" : "EN",
      grandTotal,
      generatedBy: req.user?.sub,
      lines: { create: saleLineIds.map((saleLineId) => ({ saleLineId })) },
    },
    include: { lines: true, customer: true },
  });

  res.status(201).json(bill);
});

export default router;
