// Admin-editable organization/letterhead settings (AE-12) backing the
// Customer Bill / Sales Bill print layout -- singleton row, id "default".
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();

const EDITABLE_FIELDS = [
  "companyName",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "pincode",
  "phone",
  "email",
  "gstin",
  "apmcLicenseNo",
  "bankName",
  "bankAccountNo",
  "bankIfsc",
  "footerNote",
];

// Any authenticated user can read settings (needed to render bills);
// only ADMIN can change them.
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const settings = await prisma.organizationSettings.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default" },
    });
    res.json(settings);
  })
);

router.put(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in (req.body || {})) data[field] = req.body[field] || null;
    }
    data.updatedBy = req.user?.sub;

    const settings = await prisma.organizationSettings.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", ...data },
    });
    res.json(settings);
  })
);

export default router;
