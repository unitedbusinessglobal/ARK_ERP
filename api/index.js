// Single Express app mounted at /api. Deployed as one Vercel Serverless
// Function via the rewrite in vercel.json (pragmatic alternative to one
// file per resource — keeps local dev and Vercel deploy in sync). See
// CLAUDE.md for why this differs slightly from the architecture doc's
// per-resource file layout.
//
// IMPORTANT: route/lib modules live under /server, NOT /api. Vercel's
// zero-config Node builder treats every .js file directly under /api as
// its own Serverless Function — with helpers alongside index.js that blew
// past the Hobby plan's 12-function-per-deployment cap (13 files -> ERROR
// "exceeded_serverless_functions_per_deployment"). Keeping only index.js
// in /api means exactly one function gets created, regardless of how many
// route/lib files it imports from elsewhere.
import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "../server/routes/auth.js";
import mastersRoutes from "../server/routes/masters.js";
import vehiclesRoutes from "../server/routes/vehicles.js";
import auctionEntriesRoutes from "../server/routes/auctionEntries.js";
import customerBillsRoutes from "../server/routes/customerBills.js";
import salesBillsRoutes from "../server/routes/salesBills.js";
import reportsRoutes from "../server/routes/reports.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/masters", mastersRoutes);
app.use("/api/vehicles", vehiclesRoutes);
app.use("/api/auction-entries", auctionEntriesRoutes);
app.use("/api/customer-bills", customerBillsRoutes);
app.use("/api/sales-bills", salesBillsRoutes);
app.use("/api/reports", reportsRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// Local dev: run `node api/index.js` to start a listening server.
// On Vercel, the default export is used as the serverless function handler.
if (process.env.VERCEL !== "1") {
  const port = process.env.API_PORT || 4000;
  app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
}

export default app;
