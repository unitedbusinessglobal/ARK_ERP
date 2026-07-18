// AE-26: append-only payment log against a Customer Bill. Bills themselves
// stay immutable (grandTotal never changes) -- balance due is always
// derived as grandTotal - sum(payments.amount), never stored/mutated on
// the bill. This is what powers the "top N pending balance" report (AE-27).
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { round2 } from "../lib/calc.js";

const router = Router();

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const { customerBillId } = req.query;
  const payments = await prisma.payment.findMany({
    where: customerBillId ? { customerBillId } : undefined,
    orderBy: { paymentDate: "desc" },
  });
  res.json(payments);
}));

router.post("/", requireAuth, requireRole("ADMIN", "BILLING"), asyncHandler(async (req, res) => {
  const { customerBillId, amount, paymentDate, method, note } = req.body || {};

  if (!customerBillId || amount === undefined || amount === null || !paymentDate) {
    return res.status(400).json({ error: "customerBillId, amount and paymentDate are required" });
  }
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return res.status(400).json({ error: "amount must be a positive number" });
  }

  const bill = await prisma.customerBill.findUnique({
    where: { id: customerBillId },
    include: { payments: true },
  });
  if (!bill) return res.status(404).json({ error: "Customer bill not found" });

  const alreadyPaid = bill.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = round2(Number(bill.grandTotal) - alreadyPaid);
  if (amountNum > balanceDue + 0.01) {
    return res.status(400).json({
      error: `Payment of ₹${amountNum} exceeds the remaining balance of ₹${balanceDue}`,
    });
  }

  const payment = await prisma.payment.create({
    data: {
      customerBillId,
      amount: round2(amountNum),
      paymentDate: new Date(paymentDate),
      method: method || null,
      note: note || null,
      recordedBy: req.user?.sub,
    },
  });
  res.status(201).json(payment);
}));

export default router;
