// Bilingual Label Dictionary (BRD §12 / AE-19, AE-20) -- backs UI chrome and
// bill/report headers in Tamil or English. Rows live in labels_i18n
// (labelKey, lang, labelText). Seed data (prisma/seed.js) is drawn directly
// from the BRD's §12 dictionary as an initial baseline; the admin can edit
// or add entries later via the Translations settings page (PUT below) --
// this table is explicitly a store the business maintains, not a hardcoded
// bundle we redeploy to fix.
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router = Router();

// Any authenticated user can read (needed to render the app UI + bills in
// either language); only ADMIN can edit the dictionary.
router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const labels = await prisma.labelI18n.findMany({
      orderBy: [{ labelKey: "asc" }, { lang: "asc" }],
    });
    res.json(labels);
  })
);

// Body: { labels: [{ labelKey, lang, labelText }, ...] }
// Upserts each row; lang must be "EN" or "TA". Blank labelText is allowed
// (clears back to no translation) but labelKey/lang are required.
router.put(
  "/",
  requireAuth,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const rows = Array.isArray(req.body?.labels) ? req.body.labels : [];

    const invalid = rows.find(
      (r) => !r.labelKey || !["EN", "TA"].includes(r.lang) || typeof r.labelText !== "string"
    );
    if (invalid) {
      return res.status(400).json({ error: "Each label needs labelKey, lang (EN/TA), and labelText" });
    }

    const results = await prisma.$transaction(
      rows.map((r) =>
        prisma.labelI18n.upsert({
          where: { labelKey_lang: { labelKey: r.labelKey, lang: r.lang } },
          update: { labelText: r.labelText },
          create: { labelKey: r.labelKey, lang: r.lang, labelText: r.labelText },
        })
      )
    );

    res.json(results);
  })
);

export default router;
