# CLAUDE.md — session context for ARK Plantain Mundy

## What this project is

Billing application for a plantain (banana) commission-agent mundy (auction
house): daily auction-note entry → customer bills (to buyers) and sales bills
(payouts to farmers/agents), eventually bilingual Tamil/English.

Source documents (not in this repo, referenced by the architecture doc):
`ARK_Plantain_Mundy_Requirements_document.docx` and
`ARK_Plantain_Mundy_Billing_Application_BRD_Bilingual_Tamil_English.docx`.
The architecture doc (`ARK_Plantain_Mundy_Architecture.md`, in the project
knowledge) is the authoritative design reference — read it before making
structural changes.

## Tracking

- Jira project: **AE** ("ARK_ERP") at ainformatiq.atlassian.net
- Epics: AE-1 (Core Transactional Flow — this phase), AE-2 (Consolidation/Reports), AE-3 (Bilingual)
- AE-1 stories: AE-4 (schema), AE-5 (masters), AE-6 (auction entry), AE-7 (customer bill), AE-8 (sales bill)

## Deliberate deviations from the architecture doc

1. **Single Express app instead of one file per API resource.** The doc's
   §7.4 structure shows `api/auth/`, `api/auction-entries/`, etc. as separate
   Vercel functions. This repo instead has one `api/index.js` Express app
   with `api/routes/*.js` routers, deployed as a single Vercel function via
   the `vercel.json` rewrite. Reasoning: far simpler local dev (one process,
   one port) and avoids duplicating Prisma client init per function. If cold
   start or function size ever becomes a problem, split by resource then.
2. **`sale_lines.amount` is computed in application code**, not a Postgres
   `GENERATED ALWAYS AS` column — Prisma migrate doesn't model those cleanly.
   Computed in `api/lib/calc.js#computeSaleLineAmount`.
3. **PDF/Excel generation not implemented yet** — bills render as HTML/print
   only for now. `pdf-lib` and `exceljs` are dependencies, unused until that
   work is picked up.

## Open business decisions (see README "Open items")

Commission %, vehicle fare source, bill numbering mode, and default language
are all confirmed defaults in `api/lib/calc.js` / `api/lib/billNumber.js`,
overridable via env vars or per-request fields — not hardcoded assumptions
baked into the schema. Check with the business before changing the defaults
silently; do change the env var / override rather than editing the function
signature if the answer turns out to be "it varies."

## Conventions

- All money fields are `Decimal(10,2)` or `Decimal(12,2)` in Postgres; round
  to 2dp in JS with the `round2` helper in `calc.js`, never rely on float
  arithmetic for totals.
- Bills are immutable once created — no PUT/PATCH endpoints on
  `customer-bills` or `sales-bills`. A sale line can only be attached to one
  bill of each type (enforced at write time, not yet at the DB level via a
  unique constraint — consider adding one if this becomes a real bug source).
