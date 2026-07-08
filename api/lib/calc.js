// Calculation engine (architecture §4 note + §10 open items).
//
// Open items from the architecture doc are resolved here with explicit,
// overridable defaults so Phase 1 is usable while the business confirms:
//   - Commission: percentage of gross (DEFAULT_COMMISSION_PERCENT), can be
//     overridden per sales bill via `commissionOverride`.
//   - Vehicle fare: taken from `vehicles.vehicle_fare` if set, otherwise 0,
//     can be overridden per sales bill via `vehicleFareOverride`.
//   - Bill numbering: daily-reset sequence, format CB-YYYYMMDD-#### / SB-YYYYMMDD-####.
// Changing these defaults only touches this file — schema is unaffected.

const DEFAULT_COMMISSION_PERCENT = Number(process.env.DEFAULT_COMMISSION_PERCENT ?? 5);

export function computeSaleLineAmount(rate, quantity) {
  return round2(Number(rate) * Number(quantity));
}

export function sumSaleLines(saleLines) {
  return round2(saleLines.reduce((sum, line) => sum + Number(line.amount), 0));
}

/**
 * Sales bill calculation: gross - commission - vehicleFare = net payable.
 * Both commission and vehicle fare are modeled as deductions (BRD §11 assumption).
 */
export function computeSalesBillTotals({
  saleLines,
  vehicleFare,
  commissionPercent = DEFAULT_COMMISSION_PERCENT,
  commissionOverride,
  vehicleFareOverride,
}) {
  const grossSalesAmount = sumSaleLines(saleLines);

  const commission =
    commissionOverride != null
      ? round2(Number(commissionOverride))
      : round2((grossSalesAmount * Number(commissionPercent)) / 100);

  const resolvedVehicleFare =
    vehicleFareOverride != null ? round2(Number(vehicleFareOverride)) : round2(Number(vehicleFare) || 0);

  const netPayableAmount = round2(grossSalesAmount - commission - resolvedVehicleFare);

  return {
    grossSalesAmount,
    commission,
    vehicleFare: resolvedVehicleFare,
    netPayableAmount,
  };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
