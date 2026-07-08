// Phase 2 stub (day-wise customer report, registers, search/reprint by
// date/customer/farmer/vehicle — architecture §9 Phase 2). Included now as a
// thin placeholder so the frontend/API shape is stable when Phase 2 starts.
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/day-wise-customer", requireAuth, async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date query param is required" });

  const start = new Date(date);
  const end = new Date(date);
  end.setDate(end.getDate() + 1);

  const saleLines = await prisma.saleLine.findMany({
    where: { auctionEntry: { auctionDate: { gte: start, lt: end } } },
    include: { customer: true },
  });

  const byCustomer = {};
  for (const line of saleLines) {
    const key = line.customerId;
    byCustomer[key] ??= { customer: line.customer, total: 0, lineCount: 0 };
    byCustomer[key].total += Number(line.amount);
    byCustomer[key].lineCount += 1;
  }

  res.json({ date, customers: Object.values(byCustomer) });
});

export default router;
