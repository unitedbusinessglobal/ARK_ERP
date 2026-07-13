import { useEffect, useState } from "react";
import api from "../lib/api.js";
import BillHeader from "../components/BillHeader.jsx";
import BillFooter from "../components/BillFooter.jsx";

export default function CustomerBill() {
  const [settings, setSettings] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState([]);
  const [selectedLineIds, setSelectedLineIds] = useState([]);
  const [bill, setBill] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    api.get("/masters/customers").then((r) => setCustomers(r.data));
    api.get("/settings").then((r) => setSettings(r.data));
    loadHistory();
  }, []);

  function loadHistory() {
    api.get("/customer-bills").then((r) => setHistory(r.data));
  }

  useEffect(() => {
    setBill(null);
    setSelectedLineIds([]);
    if (date) {
      api.get("/auction-entries", { params: { date } }).then((r) => setEntries(r.data));
    }
  }, [date]);

  const availableLines = entries.flatMap((e) =>
    e.saleLines
      .filter((l) => !customerId || l.customerId === customerId)
      .map((l) => ({ ...l, entry: e }))
  );

  function toggleLine(id) {
    setSelectedLineIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleGenerate() {
    setError("");
    try {
      const { data } = await api.post("/customer-bills", {
        customerId,
        billDate: date,
        saleLineIds: selectedLineIds,
      });
      // Re-fetch with full itemized line details for the printed bill.
      const full = await api.get(`/customer-bills/${data.id}`);
      setBill(full.data);
      loadHistory();
    } catch (err) {
      if (err.response?.status === 409) {
        setError(
          "One or more of these sale lines are already on a bill — see Bill History below to view it."
        );
      } else {
        setError(err.response?.data?.error || "Could not generate bill");
      }
    }
  }

  async function viewBill(id) {
    setError("");
    const full = await api.get(`/customer-bills/${id}`);
    setBill(full.data);
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4 no-print">Customer Bill</h1>

      <div className="flex gap-2 mb-4 no-print">
        <select
          className="border p-2 rounded"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="">Select customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.initials})
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

      {!bill && (
        <div className="no-print">
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="text-left border-b">
                <th></th>
                <th className="py-2">Vehicle</th>
                <th>Plantain</th>
                <th>Rate</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {availableLines.map((l) => (
                <tr key={l.id} className="border-b">
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedLineIds.includes(l.id)}
                      onChange={() => toggleLine(l.id)}
                    />
                  </td>
                  <td className="py-2">{l.entry.vehicle?.vehicleRef}</td>
                  <td>{l.entry.plantainType?.nameEn}</td>
                  <td>{l.rate}</td>
                  <td>{l.quantity}</td>
                  <td>{l.amount}</td>
                </tr>
              ))}
              {availableLines.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-gray-400 py-4">
                    No unbilled sale lines for this customer/date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <button
            disabled={!customerId || selectedLineIds.length === 0}
            onClick={handleGenerate}
            className="bg-green-700 text-white px-6 py-2 rounded disabled:opacity-40"
          >
            Generate Bill
          </button>

          <div className="pt-6">
            <h2 className="text-sm font-semibold text-gray-600 mb-2">Bill History</h2>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400">No customer bills generated yet.</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left border-b text-gray-500">
                    <th className="py-1">Bill No</th>
                    <th>Buyer</th>
                    <th>Date</th>
                    <th className="text-right">Grand Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-b">
                      <td className="py-1">{h.billNo}</td>
                      <td>
                        {h.customer?.name}
                        {h.customer?.initials && ` (${h.customer.initials})`}
                      </td>
                      <td>{new Date(h.billDate).toLocaleDateString("en-IN")}</td>
                      <td className="text-right">₹{h.grandTotal}</td>
                      <td className="text-right">
                        <button onClick={() => viewBill(h.id)} className="text-green-700 underline text-xs">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {bill && (
        <div className="border p-6 rounded bg-white">
          <div className="flex justify-end mb-2 no-print">
            <button onClick={() => window.print()} className="text-sm underline">
              Print
            </button>
          </div>

          <BillHeader
            settings={settings}
            title="Customer Bill"
            billNo={bill.billNo}
            date={new Date(bill.billDate).toLocaleDateString("en-IN")}
          />

          <p className="text-sm mb-3">
            <span className="text-gray-500">Buyer: </span>
            <span className="font-semibold">{bill.customer?.name}</span>
            {bill.customer?.initials && ` (${bill.customer.initials})`}
          </p>

          <table className="w-full border-collapse text-sm mb-4">
            <thead>
              <tr className="text-left border-y-2 border-black">
                <th className="py-1">#</th>
                <th>Vehicle</th>
                <th>Plantain</th>
                <th>Stock</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Rate</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bill.lines?.map((l, i) => (
                <tr key={l.id} className="border-b">
                  <td className="py-1">{i + 1}</td>
                  <td>{l.saleLine?.auctionEntry?.vehicle?.vehicleRef}</td>
                  <td>{l.saleLine?.auctionEntry?.plantainType?.nameEn}</td>
                  <td>{l.saleLine?.auctionEntry?.stockType?.nameEn}</td>
                  <td className="text-right">{l.saleLine?.quantity}</td>
                  <td className="text-right">{l.saleLine?.rate}</td>
                  <td className="text-right">{l.saleLine?.amount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black font-bold">
                <td colSpan={6} className="text-right py-2">
                  Grand Total
                </td>
                <td className="text-right py-2">₹{bill.grandTotal}</td>
              </tr>
            </tfoot>
          </table>

          <BillFooter settings={settings} companyLabel="For the Firm" partyLabel="Buyer Signature" />

          <button
            onClick={() => setBill(null)}
            className="no-print mt-6 text-sm underline text-gray-500"
          >
            Back to Generate / History
          </button>
        </div>
      )}
    </div>
  );
}
