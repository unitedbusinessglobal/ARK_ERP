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
 * Sales bill calculation: gross - commission - vehicleFare - weighingCharges
 * - coolieCharges - marketFee = net payable. All five are modeled as
 * deductions, matching standard Coimbatore commission-agent (aaratdar)
 * practice (AE-12) as well as the BRD §11 assumption for commission/fare.
 * weighing/coolie/market default to 0 so bills that don't need them are
 * unaffected -- each is independently overridable per bill.
 */
export function computeSalesBillTotals({
  saleLines,
  vehicleFare,
  commissionPercent = DEFAULT_COMMISSION_PERCENT,
  commissionOverride,
  vehicleFareOverride,
  weighingCharges,
  coolieCharges,
  marketFee,
}) {
  const grossSalesAmount = sumSaleLines(saleLines);

  const commission =
    commissionOverride != null
      ? round2(Number(commissionOverride))
      : round2((grossSalesAmount * Number(commissionPercent)) / 100);

  const resolvedVehicleFare =
    vehicleFareOverride != null ? round2(Number(vehicleFareOverride)) : round2(Number(vehicleFare) || 0);

  const resolvedWeighingCharges = round2(Number(weighingCharges) || 0);
  const resolvedCoolieCharges = round2(Number(coolieCharges) || 0);
  const resolvedMarketFee = round2(Number(marketFee) || 0);

  const netPayableAmount = round2(
    grossSalesAmount -
      commission -
      resolvedVehicleFare -
      resolvedWeighingCharges -
      resolvedCoolieCharges -
      resolvedMarketFee
  );

  return {
    grossSalesAmount,
    commission,
    vehicleFare: resolvedVehicleFare,
    weighingCharges: resolvedWeighingCharges,
    coolieCharges: resolvedCoolieCharges,
    marketFee: resolvedMarketFee,
    netPayableAmount,
  };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
