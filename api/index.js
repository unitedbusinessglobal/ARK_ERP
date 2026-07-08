// Single Express app mounted at /api. Deployed as one Vercel Serverless
// Function via the rewrite in vercel.json (pragmatic alternative to one
// file per resource — keeps local dev and Vercel deploy in sync). See
// CLAUDE.md for why this differs slightly from the architecture doc's
// per-resource file layout.
import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import mastersRoutes from "./routes/masters.js";
import vehiclesRoutes from "./routes/vehicles.js";
import auctionEntriesRoutes from "./routes/auctionEntries.js";
import customerBillsRoutes from "./routes/customerBills.js";
import salesBillsRoutes from "./routes/salesBills.js";
import reportsRoutes from "./routes/reports.js";

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
