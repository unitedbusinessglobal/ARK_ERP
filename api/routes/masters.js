// Masters: customers, farmers/agents, plantain types, stock types (AE-5).
// English only for Phase 1 — name_ta columns exist in the schema for Phase 3 but are optional here.
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();

function crud(resourceName, model, { uniqueField, buildData }) {
  const sub = Router();

  sub.get(
    "/",
    requireAuth,
    asyncHandler(async (req, res) => {
      const records = await model.findMany({ orderBy: { name: "asc" } }).catch(() =>
        model.findMany()
      );
      res.json(records);
    })
  );

  sub.post(
    "/",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(async (req, res) => {
      try {
        const data = buildData(req.body);
        const record = await model.create({ data });
        res.status(201).json(record);
      } catch (err) {
        handleWriteError(res, err, uniqueField);
      }
    })
  );

  sub.put(
    "/:id",
    requireAuth,
    requireRole("ADMIN"),
    asyncHandler(async (req, res) => {
      try {
        const data = buildData(req.body);
        const record = await model.update({ where: { id: req.params.id }, data });
        res.json(record);
      } catch (err) {
        handleWriteError(res, err, uniqueField);
      }
    })
  );

  return sub;
}

function handleWriteError(res, err, uniqueField) {
  if (err.code === "P2002") {
    return res.status(409).json({ error: `${uniqueField} must be unique` });
  }
  if (err.code === "P2025") {
    return res.status(404).json({ error: "Record not found" });
  }
  console.error(err);
  res.status(500).json({ error: "Unexpected error" });
}

router.use(
  "/customers",
  crud("customers", prisma.customer, {
    uniqueField: "initials",
    buildData: (b) => ({ name: b.name, nameTa: b.nameTa ?? null, initials: b.initials }),
  })
);

router.use(
  "/farmers-agents",
  crud("farmers_agents", prisma.farmerAgent, {
    uniqueField: "name",
    buildData: (b) => ({ name: b.name, nameTa: b.nameTa ?? null, phone: b.phone ?? null }),
  })
);

router.use(
  "/plantain-types",
  crud("plantain_types", prisma.plantainType, {
    uniqueField: "code",
    buildData: (b) => ({ code: b.code, nameEn: b.nameEn, nameTa: b.nameTa ?? null }),
  })
);

router.use(
  "/stock-types",
  crud("stock_types", prisma.stockType, {
    uniqueField: "code",
    buildData: (b) => ({ code: b.code, nameEn: b.nameEn, nameTa: b.nameTa ?? null }),
  })
);

export default router;
