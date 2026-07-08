# ARK Plantain Mundy Billing Application

Phase 1 (core transactional flow) of the billing application described in
`ARK_Plantain_Mundy_Architecture.md` — masters, auction entry, customer bill,
and farmer/agent sales bill, English only. Built against Jira project **AE**
(epic AE-1, stories AE-4 through AE-8).

## Stack

- Frontend: React 18 + Vite + Tailwind CSS
- Backend: Node.js + Express, deployed as a single Vercel Serverless Function at `/api`
- Database: PostgreSQL (Neon in production), via Prisma ORM
- Auth: JWT + bcrypt, role claims (ADMIN / DATA_ENTRY / BILLING / AUDITOR)

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL / DIRECT_URL from your Neon project
npm run prisma:generate
npm run prisma:migrate   # creates tables from prisma/schema.prisma
npm run prisma:seed      # seeds an admin user + starter plantain/stock types
npm run dev               # runs API (port 4000) + Vite dev server together
```

Seeded login: `admin@arkplantainmundy.local` / `changeme123` (change immediately in any real deployment).

## Local development without Neon

Point `DATABASE_URL`/`DIRECT_URL` at any Postgres instance (e.g. `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16`) — the schema has no Neon-specific SQL, only the connection driver differs in production.

## Deploying

1. Push this repo to GitHub.
2. Import into Vercel; set `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` as environment variables (see `.env.example`).
3. Vercel builds the frontend (`npm run build` → `dist/`) and deploys `api/index.js` as the *only* file in `/api` (everything it needs lives in `/server` — Vercel treats every file directly under `/api` as its own function, so keeping the folder to one file avoids hitting the Hobby plan's 12-function-per-deployment cap); `vercel.json` rewrites all `/api/*` traffic to it.
4. Run `npx prisma migrate deploy` against the production `DATABASE_URL` (or the `-pooler` + `DIRECT_URL` pair) before first use.

## What's implemented (Phase 1 / Epic AE-1)

| Story | Scope |
|---|---|
| AE-4 | Prisma schema matching the architecture doc's ERD |
| AE-5 | Masters CRUD: customers, farmers/agents, plantain types, stock types |
| AE-6 | Vehicle + auction entry with customer-wise sale lines |
| AE-7 | Customer bill generation (single-day), fetch/reprint |
| AE-8 | Sales bill generation with commission + vehicle fare deductions |

## Open items carried over from the architecture doc (§10)

These are resolved with overridable defaults in `server/lib/calc.js` and `server/lib/billNumber.js` so Phase 1 works today, but should be confirmed with the business:

- **Commission**: defaults to `DEFAULT_COMMISSION_PERCENT` (5%) of gross, overridable per sales bill via `commissionOverride` in the API request.
- **Vehicle fare**: read from `vehicles.vehicle_fare` if set, overridable per sales bill via `vehicleFareOverride`.
- **Bill numbering**: daily-reset (`CB-YYYYMMDD-####` / `SB-YYYYMMDD-####`). Set `BILL_NUMBERING_MODE=continuous` for a non-resetting sequence.
- **Default output language**: English (`DEFAULT_BILL_LANGUAGE=EN`); Tamil UI/PDF is Phase 3.
- **Tax/GST**: out of scope, per BRD §4.2.

## Not yet built (later phases, per architecture §9)

- Phase 2: multi-day consolidation per vehicle, day-wise customer report (stub only in `server/routes/reports.js`), search/reprint UI, registers.
- Phase 3: bilingual Tamil/English UI (`react-i18next`), `labels_i18n`-backed labels, Tamil PDF/Excel export.
- Phase 4: full RBAC enforcement in the UI (API middleware exists — `requireRole` — but the UI doesn't yet hide unauthorized actions) and the audit-log correction workflow (table exists, nothing writes to it yet).
- Phase 5: additional registers (customer bill register, sales register, vehicle-wise consolidation, plantain-type sales report).
- PDF/Excel bill export (`pdf-lib`, `exceljs` are in `package.json` but not wired up — bills currently render as HTML for browser printing only).
