import { useEffect, useState } from "react";
import api from "../lib/api.js";

export default function CustomerBill() {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState([]);
  const [selectedLineIds, setSelectedLineIds] = useState([]);
  const [bill, setBill] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/masters/customers").then((r) => setCustomers(r.data));
  }, []);

  useEffect(() => {
    setBill(null);
    setSelectedLineIds([]);
    if (date) {
      api.get("/auction-entries", { params: { date } }).then((r) => setEntries(r.data));
    }
  }, [date]);

  const availableLines = entries
    .flatMap((e) =>
      e.saleLines
        .filter((l) => !customerId || l.customerId === customerId)
        .map((l) => ({ ...l, entry: e }))
    )
    .filter((l) => l.customerBillLines === undefined || true);

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
      setBill(data);
    } catch (err) {
      setError(err.response?.data?.error || "Could not generate bill");
    }
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
        </div>
      )}

      {bill && (
        <div className="border p-6 rounded">
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-semibold">Customer Bill — {bill.billNo}</h2>
            <button onClick={() => window.print()} className="no-print text-sm underline">
              Print
            </button>
          </div>
          <p>Customer: {bill.customer?.name}</p>
          <p>Date: {new Date(bill.billDate).toLocaleDateString()}</p>
          <p className="text-xl font-bold mt-4">Grand Total: {bill.grandTotal}</p>
          <button
            onClick={() => setBill(null)}
            className="no-print mt-4 text-sm underline text-gray-500"
          >
            New bill
          </button>
        </div>
      )}
    </div>
  );
}
