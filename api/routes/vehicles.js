// Vehicles are a first-class entity (architecture §1, BR-005) so multi-day
// consolidation in Phase 2 can aggregate sale lines across dates per vehicle.
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../lib/auth.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { farmerAgentId } = req.query;
  const vehicles = await prisma.vehicle.findMany({
    where: farmerAgentId ? { farmerAgentId } : undefined,
    include: { farmerAgent: true },
    orderBy: { arrivalDate: "desc" },
  });
  res.json(vehicles);
});

router.post("/", requireAuth, requireRole("ADMIN", "DATA_ENTRY"), async (req, res) => {
  const { vehicleRef, farmerAgentId, arrivalDate, vehicleFare } = req.body || {};
  if (!vehicleRef || !farmerAgentId || !arrivalDate) {
    return res
      .status(400)
      .json({ error: "vehicleRef, farmerAgentId and arrivalDate are required" });
  }

  try {
    const vehicle = await prisma.vehicle.create({
      data: {
        vehicleRef,
        farmerAgentId,
        arrivalDate: new Date(arrivalDate),
        vehicleFare: vehicleFare ?? null,
        createdBy: req.user?.sub,
      },
    });
    res.status(201).json(vehicle);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "vehicleRef must be unique" });
    }
    console.error(err);
    res.status(500).json({ error: "Unexpected error" });
  }
});

export default router;
