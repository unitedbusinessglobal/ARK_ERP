import { useEffect, useState } from "react";
import api from "../lib/api.js";

export default function AuctionEntry() {
  const [vehicles, setVehicles] = useState([]);
  const [farmersAgents, setFarmersAgents] = useState([]);
  const [plantainTypes, setPlantainTypes] = useState([]);
  const [stockTypes, setStockTypes] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [newVehicle, setNewVehicle] = useState({ vehicleRef: "", farmerAgentId: "", arrivalDate: "" });
  const [entry, setEntry] = useState({
    vehicleId: "",
    auctionDate: new Date().toISOString().slice(0, 10),
    plantainTypeId: "",
    stockTypeId: "",
  });
  const [saleLines, setSaleLines] = useState([{ customerId: "", rate: "", quantity: "" }]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const [v, fa, pt, st, c] = await Promise.all([
      api.get("/vehicles"),
      api.get("/masters/farmers-agents"),
      api.get("/masters/plantain-types"),
      api.get("/masters/stock-types"),
      api.get("/masters/customers"),
    ]);
    setVehicles(v.data);
    setFarmersAgents(fa.data);
    setPlantainTypes(pt.data);
    setStockTypes(st.data);
    setCustomers(c.data);
  }

  async function handleAddVehicle(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/vehicles", newVehicle);
      setVehicles([data, ...vehicles]);
      setEntry({ ...entry, vehicleId: data.id });
      setNewVehicle({ vehicleRef: "", farmerAgentId: "", arrivalDate: "" });
    } catch (err) {
      setError(err.response?.data?.error || "Could not create vehicle");
    }
  }

  function updateLine(idx, field, value) {
    const next = [...saleLines];
    next[idx] = { ...next[idx], [field]: value };
    setSaleLines(next);
  }

  function addLine() {
    setSaleLines([...saleLines, { customerId: "", rate: "", quantity: "" }]);
  }

  function removeLine(idx) {
    setSaleLines(saleLines.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.post("/auction-entries", { ...entry, saleLines });
      setMessage("Auction entry saved.");
      setSaleLines([{ customerId: "", rate: "", quantity: "" }]);
    } catch (err) {
      setError(err.response?.data?.error || "Could not save auction entry");
    }
  }

  const total = saleLines.reduce(
    (sum, l) => sum + (Number(l.rate) || 0) * (Number(l.quantity) || 0),
    0
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-4">Auction Entry</h1>

        <details className="mb-4 bg-gray-50 p-4 rounded">
          <summary className="cursor-pointer font-medium">Add a new vehicle/arrival</summary>
          <form onSubmit={handleAddVehicle} className="flex gap-2 mt-3 flex-wrap">
            <input
              className="border p-2 rounded"
              placeholder="Vehicle ref (e.g. TN-01-AB-1234)"
              value={newVehicle.vehicleRef}
              onChange={(e) => setNewVehicle({ ...newVehicle, vehicleRef: e.target.value })}
            />
            <select
              className="border p-2 rounded"
              value={newVehicle.farmerAgentId}
              onChange={(e) => setNewVehicle({ ...newVehicle, farmerAgentId: e.target.value })}
            >
              <option value="">Farmer/Agent</option>
              {farmersAgents.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            <input
              className="border p-2 rounded"
              type="date"
              value={newVehicle.arrivalDate}
              onChange={(e) => setNewVehicle({ ...newVehicle, arrivalDate: e.target.value })}
            />
            <button className="bg-gray-700 text-white px-4 rounded">Add Vehicle</button>
          </form>
        </details>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <select
              className="border p-2 rounded"
              value={entry.vehicleId}
              onChange={(e) => setEntry({ ...entry, vehicleId: e.target.value })}
            >
              <option value="">Vehicle</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleRef} — {v.farmerAgent?.name}
                </option>
              ))}
            </select>
            <input
              className="border p-2 rounded"
              type="date"
              value={entry.auctionDate}
              onChange={(e) => setEntry({ ...entry, auctionDate: e.target.value })}
            />
            <select
              className="border p-2 rounded"
              value={entry.plantainTypeId}
              onChange={(e) => setEntry({ ...entry, plantainTypeId: e.target.value })}
            >
              <option value="">Plantain Type</option>
              {plantainTypes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameEn}
                </option>
              ))}
            </select>
            <select
              className="border p-2 rounded"
              value={entry.stockTypeId}
              onChange={(e) => setEntry({ ...entry, stockTypeId: e.target.value })}
            >
              <option value="">Stock Type</option>
              {stockTypes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h2 className="font-medium mb-2">Sale lines</h2>
            {saleLines.map((line, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <select
                  className="border p-2 rounded flex-1"
                  value={line.customerId}
                  onChange={(e) => updateLine(idx, "customerId", e.target.value)}
                >
                  <option value="">Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.initials})
                    </option>
                  ))}
                </select>
                <input
                  className="border p-2 rounded w-28"
                  type="number"
                  step="0.01"
                  placeholder="Rate"
                  value={line.rate}
                  onChange={(e) => updateLine(idx, "rate", e.target.value)}
                />
                <input
                  className="border p-2 rounded w-28"
                  type="number"
                  step="0.01"
                  placeholder="Qty"
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                />
                <span className="w-24 self-center text-right">
                  {((Number(line.rate) || 0) * (Number(line.quantity) || 0)).toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => removeLine(idx)}
                  className="text-red-600 px-2"
                >
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={addLine} className="text-green-700 text-sm">
              + Add sale line
            </button>
          </div>

          <p className="font-medium">Total: {total.toFixed(2)}</p>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-green-700 text-sm">{message}</p>}

          <button className="bg-green-700 text-white px-6 py-2 rounded">Save Auction Entry</button>
        </form>
      </div>
    </div>
  );
}
