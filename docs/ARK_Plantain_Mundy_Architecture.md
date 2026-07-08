# ARK Plantain Mundy Billing Application — Initial Architecture & Serverless Deployment (Neon)

Based on: `ARK_Plantain_Mundy_Requirements_document.docx` and `ARK_Plantain_Mundy_Billing_Application_BRD_Bilingual_Tamil_English.docx`

---

## 1. Architecture Goals (mapped from the BRD)

| Requirement | Architectural Response |
|---|---|
| Daily manual auction-note data entry (FR-001) | Guided, dropdown-driven entry form; server-side validation before save |
| Customer Bill / Sales Bill / Day-wise Report (FR-002/003/005) | Server-rendered calculation + PDF generation service, driven from normalized transactional data |
| Multi-day consolidation per vehicle (FR-004, BR-005) | Vehicle is a first-class entity; sales bill query aggregates all sale lines across dates for a vehicle |
| Bilingual Tamil/English everywhere (FR-011–015) | i18n at UI layer + bilingual label dictionary table in DB + Unicode-safe PDF font embedding |
| Role-based access (Admin/Data Entry/Billing/Auditor) | JWT auth + role claims, enforced in API middleware |
| Audit trail (FR-010, BR-008) | Append-only audit log table + soft corrections (no hard deletes on finalized bills) |
| Search/reprint (FR-007) | Indexed queries by date, customer, farmer/agent, vehicle; bills are immutable once generated, reprint re-renders from stored data |
| Performance for daily volume, low ops overhead | Serverless functions + Neon serverless Postgres (autoscale, scale-to-zero) |

---

## 2. Tech Stack (consistent with your existing Vercel/Neon pattern)

- **Frontend:** React 18 (Vite or CRA), Tailwind CSS, deployed on Vercel
- **i18n:** `react-i18next` with `en` and `ta` resource bundles; Tamil-capable web font (Noto Sans Tamil) loaded for screen + print
- **Backend:** Node.js + Express, packaged as Vercel Serverless Functions (`/api`)
- **Database:** Neon PostgreSQL (serverless, autoscaling, branching for dev/staging)
- **ORM/Migrations:** Prisma (or Drizzle) — recommend **Prisma** for schema clarity and migration history
- **Auth:** JWT-based auth, bcrypt password hashing, role claims in token payload
- **PDF/Print generation:** `pdf-lib` or Puppeteer-in-a-serverless-function (see §7 note on Vercel limits) with embedded Unicode Tamil font
- **Export:** `exceljs` for Excel export (bills/reports)
- **Repo:** GitHub, `unitedbusinessglobal/ark-plantain-mundy` (suggested), CLAUDE.md included for session context
- **Hosting:** Vercel (frontend + API), Neon (DB) — same split you use for TestItNow

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel (Frontend)                        │
│   React 18 SPA — Tailwind — react-i18next (EN/TA)                │
│   Screens: Auction Entry | Customer Bill | Sales Bill |          │
│            Day-wise Report | Masters | Admin/RBAC | Audit        │
└───────────────────────────┬───────────────────────────────────-─┘
                            │ HTTPS (fetch/axios)
┌───────────────────────────▼──────────────────────────────────-──┐
│              Vercel Serverless Functions (/api/*)                │
│  ─ auth (login, refresh)                                         │
│  ─ auction-entries (CRUD, validation)                             │
│  ─ customer-bills (generate, fetch, reprint)                      │
│  ─ sales-bills (generate w/ consolidation, fetch, reprint)         │
│  ─ reports (day-wise customer report, registers)                  │
│  ─ masters (customers, farmers/agents, plantain/stock types)      │
│  ─ documents (PDF/Excel render, bilingual)                        │
│  ─ audit (read-only trail)                                        │
└───────────────────────────┬──────────────────────────────────---─┘
                            │ Pooled Postgres connection
                            │ (@neondatabase/serverless / Prisma + pgBouncer)
┌───────────────────────────▼──────────────────────────────────---─┐
│                      Neon PostgreSQL (Serverless)                │
│  Tables: users, customers, farmers_agents, plantain_types,       │
│  stock_types, vehicles, auction_entries, sale_lines,              │
│  customer_bills, customer_bill_lines, sales_bills,                 │
│  sales_bill_lines, day_reports_cache, labels_i18n, audit_log       │
│  Branching: main (prod) → dev/staging branches for safe testing   │
└────────────────────────────────────────────────────────────────-─┘
```

---

## 4. Data Model (Initial ERD)

Core design principle: **auction note → auction_entries → sale_lines** is the single source of truth. Customer bills, sales bills, and reports are all *derived views* over `sale_lines`, never re-entered data — this is what makes multi-day consolidation (BR-005) and reprint (FR-007) reliable.

```
users ──< audit_log
customers ──< sale_lines
farmers_agents ──< vehicles ──< auction_entries ──< sale_lines
plantain_types ──< auction_entries
stock_types ──< auction_entries
sale_lines >── customer_bill_lines >── customer_bills
sale_lines >── sales_bill_lines >── sales_bills
labels_i18n (standalone lookup, keyed by label_key + lang)
```

### Key tables

**`vehicles`**
`id, vehicle_ref (unique, human-readable), farmer_agent_id FK, arrival_date, vehicle_fare, created_by, created_at`

**`auction_entries`** (one per auction-note line item, per date)
`id, vehicle_id FK, auction_date, plantain_type_id FK, stock_type_id FK, created_by, created_at, updated_by, updated_at`

**`sale_lines`** (customer-wise sale within an auction entry — the atomic transaction)
`id, auction_entry_id FK, customer_id FK, customer_initials, rate NUMERIC(10,2), quantity NUMERIC(10,2), amount NUMERIC(12,2) GENERATED = rate*quantity, created_by, created_at`

**`customers`**
`id, name, name_ta, initials (unique), created_at`

**`farmers_agents`**
`id, name, name_ta, phone, created_at`

**`plantain_types`** / **`stock_types`**
`id, code, name_en, name_ta`

**`customer_bills`**
`id, bill_no (CB-YYYYMMDD-####), customer_id FK, bill_date, language (EN/TA), grand_total, status (FINAL/REPRINTED), generated_by, generated_at`

**`customer_bill_lines`**
`id, customer_bill_id FK, sale_line_id FK` — link table; totals always recomputed from linked `sale_lines`, never stored redundantly except on the bill header (immutability snapshot)

**`sales_bills`**
`id, bill_no (SB-YYYYMMDD-####), vehicle_id FK, farmer_agent_id FK, sale_period_from, sale_period_to, gross_sales_amount, commission, vehicle_fare, net_payable_amount, language, generated_by, generated_at`

**`sales_bill_lines`**
`id, sales_bill_id FK, sale_line_id FK` — captures which sale lines (potentially across multiple auction dates) were consolidated

**`labels_i18n`**
`label_key, lang (EN/TA), label_text` — backs the Bilingual Label Dictionary (BRD §12) so labels are data, not hardcoded strings, and can be corrected without a deploy

**`audit_log`**
`id, entity_type, entity_id, action, old_value JSONB, new_value JSONB, reason, user_id FK, created_at`

**`users`**
`id, name, email, password_hash, role (ADMIN/DATA_ENTRY/BILLING/AUDITOR), created_at`

> Note on the open BRD item: `commission` and `vehicle_fare` are modeled as **deductions** from `gross_sales_amount` per the BRD's stated assumption (§11). If the business confirms otherwise, only the `sales_bills` calculation function changes — the schema doesn't need to.

---

## 5. API Design (initial)

| Endpoint | Method | Purpose | Role |
|---|---|---|---|
| `/api/auth/login` | POST | Authenticate, issue JWT | All |
| `/api/masters/customers` | GET/POST/PUT | Manage customer master | Admin |
| `/api/masters/farmers-agents` | GET/POST/PUT | Manage farmer/agent master | Admin |
| `/api/masters/plantain-types`, `/stock-types` | GET/POST/PUT | Manage dropdown masters | Admin |
| `/api/vehicles` | GET/POST | Create vehicle/arrival record | Data Entry |
| `/api/auction-entries` | GET/POST/PUT | Enter/edit daily auction-note data + sale lines | Data Entry |
| `/api/customer-bills` | POST | Generate a customer bill (selected sale lines) | Billing |
| `/api/customer-bills/:id` | GET | Fetch/reprint a bill | Billing/Auditor |
| `/api/sales-bills` | POST | Generate consolidated sales bill for a vehicle/farmer-agent | Billing |
| `/api/sales-bills/:id` | GET | Fetch/reprint | Billing/Auditor |
| `/api/reports/day-wise-customer` | GET `?date=` | Day-wise customer report | Billing/Auditor |
| `/api/reports/registers` | GET | Customer bill register, sales register, vehicle consolidation, plantain-type report | Auditor |
| `/api/documents/:type/:id/pdf` | GET `?lang=EN|TA` | Bilingual PDF render | Billing |
| `/api/documents/:type/:id/excel` | GET | Excel export | Billing/Auditor |
| `/api/audit` | GET | Read audit trail | Auditor/Admin |

All list/detail endpoints support `lang=EN|TA` to control label language without touching stored data (BR-010).

---

## 6. Bilingual (Tamil/English) Approach

1. **UI layer:** `react-i18next`, resource files `en.json` / `ta.json` seeded directly from the BRD §12 Bilingual Label Dictionary.
2. **Data layer:** master data (`customers.name_ta`, `farmers_agents.name_ta`, `plantain_types.name_ta`, etc.) stores Tamil natively as UTF-8; Postgres/Neon handles Unicode natively — no special config needed beyond ensuring the DB and connection use `UTF8` (Neon default).
3. **Document generation:** PDF templates embed a Unicode Tamil font (e.g., Noto Sans Tamil `.ttf`) into the PDF at generation time — this is the part most likely to break, so it's called out explicitly as a build-time asset dependency (FR-015, NFR "Font Support").
4. **Excel export:** `exceljs` writes Unicode strings directly; no extra handling needed if the font is installed client-side for viewing.
5. **Language selection is per-document, not per-user session** (FR-013) — passed as a parameter at bill/report generation time, stored on the bill record so a reprint renders in the language it was originally issued.

---

## 7. Serverless Deployment on Vercel + Neon

### 7.1 Environment setup
- **Neon project** with a `main` branch for production and a `dev` branch for active development (Neon's branching gives you instant, cheap copies of prod data structure for testing — recommended given the bilingual/consolidation logic needs real-world validation).
- **Vercel project** connected to the GitHub repo, auto-deploy on push to `main`; preview deployments per PR/branch.
- **Environment variables** (Vercel dashboard, not committed):
  - `DATABASE_URL` — Neon pooled connection string (use the `-pooler` host for serverless functions)
  - `JWT_SECRET`
  - `NODE_ENV`

### 7.2 Connection handling (important for Neon + serverless)
Serverless functions spin up/down per request, so use one of:
- **`@neondatabase/serverless`** driver (HTTP-based, no persistent TCP connection — best fit for Vercel Functions), or
- **Prisma** with Neon's pooled connection string (`?pgbouncer=true`) if you prefer Prisma's schema/migration tooling.

Given your existing pattern (Prisma isn't yet confirmed in your other projects), a pragmatic starting point: **Prisma for schema + migrations**, **`@neondatabase/serverless`** (or Prisma's Neon adapter) for the actual query execution path in each function, to avoid connection-pool exhaustion.

### 7.3 PDF generation note
Puppeteer-based PDF generation is heavy for a standard Vercel serverless function (cold start + binary size). Two options:
- **Lightweight path (recommended to start):** `pdf-lib` with hand-built bilingual templates matching BRD §13 — smaller, faster, fully within default Vercel function limits.
- **Fidelity path (if pixel-perfect print layout matters):** `@sparticuz/chromium` + `puppeteer-core` on a Vercel Function with increased memory/duration config — more setup, slower cold starts.

### 7.4 Suggested repo structure
```
ark-plantain-mundy/
├── api/                        # Vercel serverless functions
│   ├── auth/
│   ├── auction-entries/
│   ├── customer-bills/
│   ├── sales-bills/
│   ├── reports/
│   ├── masters/
│   └── documents/
├── src/                        # React frontend
│   ├── components/
│   ├── pages/
│   ├── i18n/ (en.json, ta.json)
│   └── lib/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── assets/fonts/NotoSansTamil.ttf
├── CLAUDE.md
└── vercel.json
```

---

## 8. Role-Based Access (from BRD §5)

| Role | Access |
|---|---|
| Admin | Full — masters, users, all bills/reports |
| Data Entry Operator | Create/edit auction entries only |
| Billing/Cashier | Generate/print/export bills (customer + sales), day-wise report |
| Auditor/Accountant | Read-only on bills, reports, audit log |
| Farmer/Agent, Customer | No system login — receive printed/exported bills only (BRD treats these as external roles) |

Enforced via JWT role claim checked in each `/api` function's middleware; UI also hides unauthorized actions, but the API is the actual enforcement boundary.

---

## 9. Phased Build Plan

1. **Phase 1 — Core transactional flow:** masters, auction entry, customer bill, sales bill (single-day), English only
2. **Phase 2 — Consolidation + reports:** multi-day sales bill consolidation, day-wise customer report, search/reprint
3. **Phase 3 — Bilingual layer:** i18n UI, `labels_i18n` table, Tamil PDF/Excel export, language selection at document level
4. **Phase 4 — RBAC + audit:** role enforcement, audit log, correction workflow
5. **Phase 5 — Additional registers:** customer bill register, sales register, vehicle-wise consolidation report, plantain-type sales report

---

## 10. Open Items to Confirm Before Build (carried over from BRD §16)

- Commission: fixed amount, percentage, or manual entry per sales bill?
- Vehicle fare: fixed, per-vehicle, or manual entry?
- Bill numbering: daily reset or continuous sequence?
- Default output language: Tamil or English?
- Tax/GST applicability (currently out of scope per BRD §4.2)

These affect the calculation function and a couple of form fields, not the core architecture — safe to start building against the schema above while these are being confirmed.
