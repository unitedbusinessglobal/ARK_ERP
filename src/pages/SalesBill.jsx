import { useEffect, useRef, useState } from "react";
import api from "../lib/api.js";
import BillHeader from "../components/BillHeader.jsx";
import BillFooter from "../components/BillFooter.jsx";
import { downloadElementAsPdf } from "../lib/pdf.js";
import { useLanguage } from "../lib/i18n.jsx";

// Deduction fields on every sales bill (AE-12): commission + vehicle fare
// (existing) plus weighing/coolie/market charges, standard Coimbatore
// commission-agent (aaratdar) practice. All optional overrides -- blank
// means "use computed default". labelKey looks up the translated label;
// English text here is the fallback if a key is missing.
const DEDUCTION_FIELDS = [
  { name: "commissionOverride", labelKey: "form.commissionOverride", label: "Commission (override, ₹)" },
  { name: "vehicleFareOverride", labelKey: "form.vehicleFareOverride", label: "Vehicle Fare (₹)" },
  { name: "weighingCharges", labelKey: "form.weighingCharges", label: "Weighing Charges (₹)" },
  { name: "coolieCharges", labelKey: "form.coolieCharges", label: "Coolie / Labor Charges (₹)" },
  { name: "marketFee", labelKey: "form.marketFee", label: "Market Fee (₹)" },
];

export default function SalesBill() {
  const { t } = useLanguage();
  const [settings, setSettings] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [deductions, setDeductions] = useState({});
  const [bill, setBill] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const printRef = useRef(null);

  useEffect(() => {
    api.get("/vehicles").then((r) => setVehicles(r.data));
    api.get("/settings").then((r) => setSettings(r.data));
    loadHistory();
  }, []);

  function loadHistory() {
    api.get("/sales-bills").then((r) => setHistory(r.data));
  }

  async function handleGenerate() {
    setError("");
    setBill(null);
    try {
      const payload = { vehicleId, salePeriodFrom: date, salePeriodTo: date };
      for (const f of DEDUCTION_FIELDS) {
        if (deductions[f.name] !== undefined && deductions[f.name] !== "") {
          payload[f.name] = deductions[f.name];
        }
      }
      const { data } = await api.post("/sales-bills", payload);
      // Re-fetch with full itemized line details for the printed bill.
      const full = await api.get(`/sales-bills/${data.id}`);
      setBill(full.data);
      loadHistory();
    } catch (err) {
      if (err.response?.status === 409) {
        setError(
          t(
            "msg.billAlreadyExistsSales",
            "This vehicle's sale lines for this date are already on a sales bill — see Bill History below to view it."
          )
        );
      } else {
        setError(err.response?.data?.error || "Could not generate sales bill");
      }
    }
  }

  async function viewBill(id) {
    setError("");
    const full = await api.get(`/sales-bills/${id}`);
    setBill(full.data);
  }

  function handleDownload() {
    downloadElementAsPdf(printRef.current, `SalesBill-${bill.billNo}.pdf`);
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-semibold mb-4 no-print">{t("label.salesBill", "Farmer / Agent Sales Bill")}</h1>

      {!bill && (
        <div className="no-print space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              className="border p-2 rounded flex-1"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">{t("form.selectVehicle", "Select vehicle")}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleRef} — {v.farmerAgent?.name}
                </option>
              ))}
            </select>
            <input
              className="border p-2 rounded"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <details className="bg-gray-50 rounded p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {t("page.deductionsOptional", "Deductions (optional overrides — leave blank to use defaults)")}
            </summary>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              {DEDUCTION_FIELDS.map((f) => (
                <div key={f.name}>
                  <label className="block text-xs text-gray-600 mb-1">{t(f.labelKey, f.label)}</label>
                  <input
                    className="border p-2 rounded w-full"
                    type="number"
                    step="0.01"
                    value={deductions[f.name] || ""}
                    onChange={(e) => setDeductions({ ...deductions, [f.name]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          </details>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            disabled={!vehicleId}
            onClick={handleGenerate}
            className="bg-green-700 text-white px-6 py-2 rounded disabled:opacity-40"
          >
            {t("action.generateSalesBill", "Generate Sales Bill")}
          </button>

          <div className="pt-6">
            <h2 className="text-sm font-semibold text-gray-600 mb-2">{t("page.billHistory", "Bill History")}</h2>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400">{t("msg.noSalesBillsYet", "No sales bills generated yet.")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm min-w-[560px]">
                  <thead>
                    <tr className="text-left border-b text-gray-500">
                      <th className="py-1">{t("label.billNo", "Bill No")}</th>
                      <th>{t("bill.vehicleLabel", "Vehicle")}</th>
                      <th>{t("form.farmerAgent", "Farmer/Agent")}</th>
                      <th>{t("col.period", "Period")}</th>
                      <th className="text-right">{t("col.netPayable", "Net Payable")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} className="border-b">
                        <td className="py-1">{h.billNo}</td>
                        <td>{h.vehicle?.vehicleRef}</td>
                        <td>{h.farmerAgent?.name}</td>
                        <td>
                          {new Date(h.salePeriodFrom).toLocaleDateString("en-IN")} –{" "}
                          {new Date(h.salePeriodTo).toLocaleDateString("en-IN")}
                        </td>
                        <td className="text-right">₹{h.netPayableAmount}</td>
                        <td className="text-right">
                          <button onClick={() => viewBill(h.id)} className="text-green-700 underline text-xs">
                            {t("action.view", "View")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {bill && (
        <div className="border p-4 sm:p-6 rounded bg-white">
          <div className="flex justify-end gap-4 mb-2 no-print">
            <button onClick={() => window.print()} className="text-sm underline">
              {t("action.print", "Print")}
            </button>
            <button onClick={handleDownload} className="text-sm underline">
              {t("action.downloadPdf", "Download PDF")}
            </button>
          </div>

          <div ref={printRef}>
            <BillHeader
              settings={settings}
              title={t("label.salesBill", "Farmer / Agent Sales Bill") + " (Patti)"}
              billNo={bill.billNo}
              date={new Date(bill.generatedAt).toLocaleDateString("en-IN")}
            />

            <div className="grid sm:grid-cols-2 gap-2 text-sm mb-3">
              <p>
                <span className="text-gray-500">{t("bill.farmerAgentLabel", "Farmer / Agent")}: </span>
                <span className="font-semibold">{bill.farmerAgent?.name}</span>
              </p>
              <p>
                <span className="text-gray-500">{t("bill.vehicleLabel", "Vehicle")}: </span>
                <span className="font-semibold">{bill.vehicle?.vehicleRef}</span>
              </p>
              <p>
                <span className="text-gray-500">{t("label.salePeriod", "Sale Period")}: </span>
                {new Date(bill.salePeriodFrom).toLocaleDateString("en-IN")} –{" "}
                {new Date(bill.salePeriodTo).toLocaleDateString("en-IN")}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm mb-4 min-w-[560px]">
                <thead>
                  <tr className="text-left border-y-2 border-black">
                    <th className="py-1">#</th>
                    <th>{t("form.customer", "Customer")}</th>
                    <th>{t("col.plantain", "Plantain")}</th>
                    <th>{t("col.stock", "Stock")}</th>
                    <th className="text-right">{t("form.qty", "Qty")}</th>
                    <th className="text-right">{t("label.rate", "Rate")}</th>
                    <th className="text-right">{t("label.amount", "Amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.lines?.map((l, i) => (
                    <tr key={l.id} className="border-b">
                      <td className="py-1">{i + 1}</td>
                      <td>{l.saleLine?.customer?.name}</td>
                      <td>{l.saleLine?.auctionEntry?.plantainType?.nameEn}</td>
                      <td>{l.saleLine?.auctionEntry?.stockType?.nameEn}</td>
                      <td className="text-right">{l.saleLine?.quantity}</td>
                      <td className="text-right">{l.saleLine?.rate}</td>
                      <td className="text-right">{l.saleLine?.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <table className="w-full sm:ml-auto sm:max-w-xs text-sm mb-2">
              <tbody>
                <tr>
                  <td className="py-1">{t("label.grossSalesAmount", "Gross Sales Amount")}</td>
                  <td className="text-right">₹{bill.grossSalesAmount}</td>
                </tr>
                <tr>
                  <td className="py-1">{t("label.lessCommission", "Less: Commission")}</td>
                  <td className="text-right">- ₹{bill.commission}</td>
                </tr>
                <tr>
                  <td className="py-1">{t("label.lessVehicleFare", "Less: Vehicle Fare")}</td>
                  <td className="text-right">- ₹{bill.vehicleFare}</td>
                </tr>
                {Number(bill.weighingCharges) > 0 && (
                  <tr>
                    <td className="py-1">{t("bill.lessWeighingCharges", "Less: Weighing Charges")}</td>
                    <td className="text-right">- ₹{bill.weighingCharges}</td>
                  </tr>
                )}
                {Number(bill.coolieCharges) > 0 && (
                  <tr>
                    <td className="py-1">{t("bill.lessCoolieCharges", "Less: Coolie Charges")}</td>
                    <td className="text-right">- ₹{bill.coolieCharges}</td>
                  </tr>
                )}
                {Number(bill.marketFee) > 0 && (
                  <tr>
                    <td className="py-1">{t("bill.lessMarketFee", "Less: Market Fee")}</td>
                    <td className="text-right">- ₹{bill.marketFee}</td>
                  </tr>
                )}
                <tr className="border-t-2 border-black font-bold">
                  <td className="py-2">{t("col.netPayable", "Net Payable")}</td>
                  <td className="text-right py-2">₹{bill.netPayableAmount}</td>
                </tr>
              </tbody>
            </table>

            <BillFooter
              settings={settings}
              companyLabel={t("bill.forTheFirm", "For the Firm")}
              partyLabel={t("bill.farmerAgentSignature", "Farmer / Agent Signature")}
            />
          </div>

          <button
            onClick={() => setBill(null)}
            className="no-print mt-6 text-sm underline text-gray-500"
          >
            {t("action.backToHistory", "Back to Generate / History")}
          </button>
        </div>
      )}
    </div>
  );
}
