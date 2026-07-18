// Reports (AE-27, Epic 2). The Phase-2 day-wise-customer stub below predates
// this expansion and is kept as-is; everything else here is new aggregation
// endpoints for the Reports dashboard (AE-28). All grouping/aggregation is
// done in-memory (fetch + reduce) rather than raw SQL, matching the existing
// day-wise-customer style -- a single mundy's dataset doesn't warrant it.
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { round2 } from "../lib/calc.js";

const router = Router();

// AE-28's new report endpoints below are for ADMIN/BILLING/AUDITOR only
// (DATA_ENTRY's job is entering the day's auction, not reading back
// trends/balances) -- matches the frontend nav-link gating in App.jsx.
const requireReportsRole = requireRole("ADMIN", "BILLING", "AUDITOR");

router.get("/day-wise-customer", requireAuth, asyncHandler(async (req, res) => {
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
}));

// ---- shared date-bucketing helpers ----------------------------------

function startOfWeek(d) {
  // Monday-start week bucket, keyed by that Monday's date -- simpler and
  // avoids ISO week-number edge cases at year boundaries. "Week of <date>"
  // reads fine on a chart axis without needing a week-number lookup table.
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - day);
  return date;
}

function bucketKey(date, groupBy) {
  const d = new Date(date);
  switch (groupBy) {
    case "week":
      return startOfWeek(d).toISOString().slice(0, 10);
    case "month":
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    case "year":
      return `${d.getUTCFullYear()}`;
    case "day":
    default:
      return d.toISOString().slice(0, 10);
  }
}

function parseGroupBy(groupBy) {
  return ["day", "week", "month", "year"].includes(groupBy) ? groupBy : "month";
}

function dateRangeWhere(from, to) {
  const where = {};
  if (from) where.gte = new Date(from);
  if (to) {
    const end = new Date(to);
    end.setDate(end.getDate() + 1); // inclusive of the "to" day
    where.lt = end;
  }
  return Object.keys(where).length ? where : undefined;
}

// ---- Sales report: daily/weekly/monthly/yearly totals ----------------

router.get("/sales", requireAuth, requireReportsRole, asyncHandler(async (req, res) => {
  const groupBy = parseGroupBy(req.query.groupBy);
  const auctionDate = dateRangeWhere(req.query.from, req.query.to);

  const saleLines = await prisma.saleLine.findMany({
    where: auctionDate ? { auctionEntry: { auctionDate } } : undefined,
    select: { amount: true, auctionEntry: { select: { auctionDate: true } } },
  });

  const buckets = {};
  for (const line of saleLines) {
    const key = bucketKey(line.auctionEntry.auctionDate, groupBy);
    buckets[key] ??= { period: key, total: 0, lineCount: 0 };
    buckets[key].total += Number(line.amount);
    buckets[key].lineCount += 1;
  }

  const data = Object.values(buckets)
    .map((b) => ({ ...b, total: round2(b.total) }))
    .sort((a, b) => a.period.localeCompare(b.period));

  res.json({ groupBy, data });
}));

// ---- Last-year-vs-current-year sales trend (monthly) ------------------

router.get("/sales-yoy", requireAuth, requireReportsRole, asyncHandler(async (req, res) => {
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  const prevYear = year - 1;

  const saleLines = await prisma.saleLine.findMany({
    where: {
      auctionEntry: {
        auctionDate: { gte: new Date(Date.UTC(prevYear, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) },
      },
    },
    select: { amount: true, auctionEntry: { select: { auctionDate: true } } },
  });

  const totals = {}; // "YYYY-MM" -> total
  for (const line of saleLines) {
    const d = new Date(line.auctionEntry.auctionDate);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    totals[key] = (totals[key] || 0) + Number(line.amount);
  }

  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const data = monthNames.map((label, i) => ({
    month: label,
    current: round2(totals[`${year}-${i}`] || 0),
    previous: round2(totals[`${prevYear}-${i}`] || 0),
  }));

  res.json({ year, previousYear: prevYear, data });
}));

// ---- Top N pending balance from buyers (AE-26 payments) ---------------

router.get("/top-defaulters", requireAuth, requireReportsRole, asyncHandler(async (req, res) => {
  const n = req.query.n ? Math.max(1, Math.min(500, Number(req.query.n))) : 10;

  const bills = await prisma.customerBill.findMany({
    include: { customer: true, payments: true },
  });

  const byCustomer = {};
  for (const bill of bills) {
    const paid = bill.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = Number(bill.grandTotal) - paid;
    const key = bill.customerId;
    byCustomer[key] ??= {
      customerId: key,
      customerName: bill.customer.name,
      customerNameTa: bill.customer.nameTa,
      initials: bill.customer.initials,
      totalBilled: 0,
      totalPaid: 0,
      balanceDue: 0,
      billCount: 0,
    };
    byCustomer[key].totalBilled += Number(bill.grandTotal);
    byCustomer[key].totalPaid += paid;
    byCustomer[key].balanceDue += balance;
    byCustomer[key].billCount += 1;
  }

  const data = Object.values(byCustomer)
    .filter((c) => c.balanceDue > 0.01)
    .map((c) => ({
      ...c,
      totalBilled: round2(c.totalBilled),
      totalPaid: round2(c.totalPaid),
      balanceDue: round2(c.balanceDue),
    }))
    .sort((a, b) => b.balanceDue - a.balanceDue)
    .slice(0, n);

  res.json({ n, data });
}));

// ---- PNL trend: the mundy's own commission + fee income ---------------
// Business decision (2026-07-18): this is a commission-agent model with no
// separate cost-price concept, so "PNL" here is the mundy's own income --
// commission + vehicleFare + weighing/coolie/market fees collected per
// period, from SalesBill (bucketed by salePeriodFrom, its transaction date).

router.get("/pnl", requireAuth, requireReportsRole, asyncHandler(async (req, res) => {
  const groupBy = parseGroupBy(req.query.groupBy);
  const salePeriodFrom = dateRangeWhere(req.query.from, req.query.to);

  const salesBills = await prisma.salesBill.findMany({
    where: salePeriodFrom ? { salePeriodFrom } : undefined,
    select: {
      salePeriodFrom: true,
      commission: true,
      vehicleFare: true,
      weighingCharges: true,
      coolieCharges: true,
      marketFee: true,
    },
  });

  const buckets = {};
  for (const bill of salesBills) {
    const key = bucketKey(bill.salePeriodFrom, groupBy);
    buckets[key] ??= {
      period: key,
      commission: 0,
      vehicleFare: 0,
      weighingCharges: 0,
      coolieCharges: 0,
      marketFee: 0,
      total: 0,
    };
    const b = buckets[key];
    b.commission += Number(bill.commission);
    b.vehicleFare += Number(bill.vehicleFare);
    b.weighingCharges += Number(bill.weighingCharges);
    b.coolieCharges += Number(bill.coolieCharges);
    b.marketFee += Number(bill.marketFee);
    b.total += Number(bill.commission) + Number(bill.vehicleFare) + Number(bill.weighingCharges) + Number(bill.coolieCharges) + Number(bill.marketFee);
  }

  const data = Object.values(buckets)
    .map((b) => ({
      ...b,
      commission: round2(b.commission),
      vehicleFare: round2(b.vehicleFare),
      weighingCharges: round2(b.weighingCharges),
      coolieCharges: round2(b.coolieCharges),
      marketFee: round2(b.marketFee),
      total: round2(b.total),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  res.json({ groupBy, data });
}));

// ---- Price trend: average rate per plantain variety, by month ---------
// Unweighted average of SaleLine.rate (not volume-weighted by quantity) --
// this represents the market price paid per unit, not a spend-weighted
// average that would skew toward whichever buyer purchased the most.

router.get("/price-trend", requireAuth, requireReportsRole, asyncHandler(async (req, res) => {
  const years = req.query.years ? Math.max(1, Math.min(20, Number(req.query.years))) : 3;
  const currentYear = new Date().getUTCFullYear();
  const fromYear = currentYear - years + 1;

  const saleLines = await prisma.saleLine.findMany({
    where: { auctionEntry: { auctionDate: { gte: new Date(Date.UTC(fromYear, 0, 1)) } } },
    select: {
      rate: true,
      auctionEntry: { select: { auctionDate: true, plantainType: true } },
    },
  });

  const varietiesByCode = {};
  const sums = {}; // "YYYY-MM" -> { [code]: { sum, count } }
  for (const line of saleLines) {
    const pt = line.auctionEntry.plantainType;
    varietiesByCode[pt.code] ??= { code: pt.code, nameEn: pt.nameEn, nameTa: pt.nameTa };
    const d = new Date(line.auctionEntry.auctionDate);
    const period = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    sums[period] ??= {};
    sums[period][pt.code] ??= { sum: 0, count: 0 };
    sums[period][pt.code].sum += Number(line.rate);
    sums[period][pt.code].count += 1;
  }

  const periods = Object.keys(sums).sort();
  const varieties = Object.values(varietiesByCode).sort((a, b) => a.nameEn.localeCompare(b.nameEn));
  const data = periods.map((period) => {
    const row = { period };
    for (const v of varieties) {
      const cell = sums[period][v.code];
      row[v.code] = cell ? round2(cell.sum / cell.count) : null;
    }
    return row;
  });

  res.json({ years, periods, varieties, data });
}));

export default router;
