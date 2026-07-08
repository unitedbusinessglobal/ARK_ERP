import { useEffect, useState } from "react";
import api from "../lib/api.js";

export default function SalesBill() {
  const [vehicles, setVehicles] = useState([]);
  const [vehicleId, setVehicleId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [bill, setBill] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/vehicles").then((r) => setVehicles(r.data));
  }, []);

  async function handleGenerate() {
    setError("");
    setBill(null);
    try {
      const { data } = await api.post("/sales-bills", {
        vehicleId,
        salePeriodFrom: date,
        salePeriodTo: date,
      });
      setBill(data);
    } catch (err) {
      setError(err.response?.data?.error || "Could not generate sales bill");
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4 no-print">Farmer/Agent Sales Bill</h1>

      <div className="flex gap-2 mb-4 no-print">
        <select
          className="border p-2 rounded flex-1"
          value={vehicleId}
          onChange={(e) => setVehicleId(e.target.value)}
        >
          <option value="">Select vehicle</option>
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
        <button
          disabled={!vehicleId}
          onClick={handleGenerate}
          className="bg-green-700 text-white px-4 rounded disabled:opacity-40"
        >
          Generate
        </button>
      </div>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {bill && (
        <div className="border p-6 rounded">
          <div className="flex justify-between mb-4">
            <h2 className="text-lg font-semibold">Sales Bill — {bill.billNo}</h2>
            <button onClick={() => window.print()} className="no-print text-sm underline">
              Print
            </button>
          </div>
          <p>Farmer/Agent: {bill.farmerAgent?.name}</p>
          <p>Vehicle: {bill.vehicle?.vehicleRef}</p>
          <p>
            Period: {new Date(bill.salePeriodFrom).toLocaleDateString()} –{" "}
            {new Date(bill.salePeriodTo).toLocaleDateString()}
          </p>
          <table className="w-full mt-4 mb-2">
            <tbody>
              <tr>
                <td className="py-1">Gross Sales Amount</td>
                <td className="text-right">{bill.grossSalesAmount}</td>
              </tr>
              <tr>
                <td className="py-1">Commission (deducted)</td>
                <td className="text-right">- {bill.commission}</td>
              </tr>
              <tr>
                <td className="py-1">Vehicle Fare (deducted)</td>
                <td className="text-right">- {bill.vehicleFare}</td>
              </tr>
              <tr className="border-t font-bold">
                <td className="py-2">Net Payable</td>
                <td className="text-right py-2">{bill.netPayableAmount}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
