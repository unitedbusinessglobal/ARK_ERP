import { useEffect, useState } from "react";
import api from "../lib/api.js";
import { useLanguage } from "../lib/i18n.jsx";

const NEW_OPTION = "__new__";

export default function AuctionEntry() {
  const { t, lang } = useLanguage();
  // AE-24: master records (plantain/stock types, farmers/agents, customers)
  // now carry an optional nameTa -- show it in TA mode wherever the record
  // is listed, falling back to the English field if no Tamil name was set.
  function displayName(record, enField = "nameEn") {
    if (!record) return "";
    return lang === "TA" && record.nameTa ? record.nameTa : record[enField];
  }
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

  // Inline "add new master value" (AE-16): quick-add forms so a missing
  // Farmer/Agent, Customer, Plantain Type, or Stock Type never sends the
  // user away to Masters mid-entry.
  const [addingFarmerAgent, setAddingFarmerAgent] = useState(false);
  const [newFarmerAgent, setNewFarmerAgent] = useState({ name: "", phone: "" });
  const [addingPlantainType, setAddingPlantainType] = useState(false);
  const [newPlantainType, setNewPlantainType] = useState({ code: "", nameEn: "" });
  const [addingStockType, setAddingStockType] = useState(false);
  const [newStockType, setNewStockType] = useState({ code: "", nameEn: "" });
  const [addingCustomerForLine, setAddingCustomerForLine] = useState(null); // sale line index, or null
  const [newCustomer, setNewCustomer] = useState({ name: "", initials: "" });

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
    if (!newVehicle.farmerAgentId) {
      setError(t("msg.pickFarmerAgentFirst", "Pick or add a Farmer/Agent first."));
      return;
    }
    try {
      const { data } = await api.post("/vehicles", newVehicle);
      setVehicles([data, ...vehicles]);
      setEntry({ ...entry, vehicleId: data.id });
      setNewVehicle({ vehicleRef: "", farmerAgentId: "", arrivalDate: "" });
    } catch (err) {
      setError(err.response?.data?.error || "Could not create vehicle");
    }
  }

  async function handleAddFarmerAgent(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/masters/farmers-agents", newFarmerAgent);
      setFarmersAgents((prev) => [...prev, data]);
      setNewVehicle((v) => ({ ...v, farmerAgentId: data.id }));
      setNewFarmerAgent({ name: "", phone: "" });
      setAddingFarmerAgent(false);
    } catch (err) {
      setError(err.response?.data?.error || "Could not add farmer/agent");
    }
  }

  async function handleAddPlantainType(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/masters/plantain-types", newPlantainType);
      setPlantainTypes((prev) => [...prev, data]);
      setEntry((en) => ({ ...en, plantainTypeId: data.id }));
      setNewPlantainType({ code: "", nameEn: "" });
      setAddingPlantainType(false);
    } catch (err) {
      setError(err.response?.data?.error || "Could not add plantain type");
    }
  }

  async function handleAddStockType(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/masters/stock-types", newStockType);
      setStockTypes((prev) => [...prev, data]);
      setEntry((en) => ({ ...en, stockTypeId: data.id }));
      setNewStockType({ code: "", nameEn: "" });
      setAddingStockType(false);
    } catch (err) {
      setError(err.response?.data?.error || "Could not add stock type");
    }
  }

  async function handleAddCustomer(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/masters/customers", newCustomer);
      setCustomers((prev) => [...prev, data]);
      if (addingCustomerForLine !== null) {
        updateLine(addingCustomerForLine, "customerId", data.id);
      }
      setNewCustomer({ name: "", initials: "" });
      setAddingCustomerForLine(null);
    } catch (err) {
      setError(err.response?.data?.error || "Could not add customer");
    }
  }

  function updateLine(idx, field, value) {
    const next = [...saleLines];
    next[idx] = { ...next[idx], [field]: value };
    setSaleLines(next);
  }

  function handleCustomerSelect(idx, value) {
    if (value === NEW_OPTION) {
      setAddingCustomerForLine(idx);
      return;
    }
    updateLine(idx, "customerId", value);
  }

  function addLine() {
    setSaleLines([...saleLines, { customerId: "", rate: "", quantity: "" }]);
  }

  function removeLine(idx) {
    setSaleLines(saleLines.filter((_, i) => i !== idx));
    if (addingCustomerForLine === idx) setAddingCustomerForLine(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.post("/auction-entries", { ...entry, saleLines });
      setMessage(t("msg.auctionEntrySaved", "Auction entry saved."));
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
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold mb-4">{t("nav.auctionEntry", "Auction Entry")}</h1>

        <details className="mb-4 bg-gray-50 p-4 rounded">
          <summary className="cursor-pointer font-medium">
            {t("page.addVehicleArrival", "Add a new vehicle/arrival")}
          </summary>
          <form onSubmit={handleAddVehicle} className="flex flex-col sm:flex-row gap-2 mt-3 flex-wrap">
            <input
              className="border p-2 rounded"
              placeholder="Vehicle ref (e.g. TN-01-AB-1234)"
              value={newVehicle.vehicleRef}
              onChange={(e) => setNewVehicle({ ...newVehicle, vehicleRef: e.target.value })}
            />
            <select
              className="border p-2 rounded"
              value={newVehicle.farmerAgentId}
              onChange={(e) => {
                if (e.target.value === NEW_OPTION) {
                  setAddingFarmerAgent(true);
                  return;
                }
                setNewVehicle({ ...newVehicle, farmerAgentId: e.target.value });
              }}
            >
              <option value="">{t("form.farmerAgent", "Farmer/Agent")}</option>
              {farmersAgents.map((f) => (
                <option key={f.id} value={f.id}>
                  {displayName(f, "name")}
                </option>
              ))}
              <option value={NEW_OPTION}>{t("action.addFarmerAgent", "+ Add new Farmer/Agent…")}</option>
            </select>
            <input
              className="border p-2 rounded"
              type="date"
              value={newVehicle.arrivalDate}
              onChange={(e) => setNewVehicle({ ...newVehicle, arrivalDate: e.target.value })}
            />
            <button className="bg-gray-700 text-white px-4 py-2 rounded">{t("action.addVehicle", "Add Vehicle")}</button>
          </form>

          {addingFarmerAgent && (
            <form
              onSubmit={handleAddFarmerAgent}
              className="flex flex-col sm:flex-row gap-2 mt-3 bg-white border rounded p-3"
            >
              <input
                className="border p-2 rounded flex-1"
                placeholder={t("form.farmerAgentName", "Farmer/Agent name")}
                value={newFarmerAgent.name}
                onChange={(e) => setNewFarmerAgent({ ...newFarmerAgent, name: e.target.value })}
                required
              />
              <input
                className="border p-2 rounded"
                placeholder={t("form.phoneOptional", "Phone (optional)")}
                value={newFarmerAgent.phone}
                onChange={(e) => setNewFarmerAgent({ ...newFarmerAgent, phone: e.target.value })}
              />
              <div className="flex gap-2">
                <button className="bg-green-700 text-white px-3 rounded text-sm">{t("action.save", "Save")}</button>
                <button
                  type="button"
                  onClick={() => setAddingFarmerAgent(false)}
                  className="text-gray-500 text-sm underline"
                >
                  {t("action.cancel", "Cancel")}
                </button>
              </div>
            </form>
          )}
        </details>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <select
              className="border p-2 rounded"
              value={entry.vehicleId}
              onChange={(e) => setEntry({ ...entry, vehicleId: e.target.value })}
            >
              <option value="">{t("form.vehicle", "Vehicle")}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicleRef} — {displayName(v.farmerAgent, "name")}
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
              onChange={(e) => {
                if (e.target.value === NEW_OPTION) {
                  setAddingPlantainType(true);
                  return;
                }
                setEntry({ ...entry, plantainTypeId: e.target.value });
              }}
            >
              <option value="">{t("label.plantainType", "Plantain Type")}</option>
              {plantainTypes.map((p) => (
                <option key={p.id} value={p.id}>
                  {displayName(p)}
                </option>
              ))}
              <option value={NEW_OPTION}>{t("action.addPlantainType", "+ Add new Plantain Type…")}</option>
            </select>
            <select
              className="border p-2 rounded"
              value={entry.stockTypeId}
              onChange={(e) => {
                if (e.target.value === NEW_OPTION) {
                  setAddingStockType(true);
                  return;
                }
                setEntry({ ...entry, stockTypeId: e.target.value });
              }}
            >
              <option value="">{t("form.stockType", "Stock Type")}</option>
              {stockTypes.map((s) => (
                <option key={s.id} value={s.id}>
                  {displayName(s)}
                </option>
              ))}
              <option value={NEW_OPTION}>{t("action.addStockType", "+ Add new Stock Type…")}</option>
            </select>
          </div>

          {addingPlantainType && (
            <form
              onSubmit={handleAddPlantainType}
              className="flex flex-col sm:flex-row gap-2 bg-gray-50 border rounded p-3"
            >
              <input
                className="border p-2 rounded"
                placeholder="Code (e.g. MONTHAN)"
                value={newPlantainType.code}
                onChange={(e) => setNewPlantainType({ ...newPlantainType, code: e.target.value.toUpperCase() })}
                required
              />
              <input
                className="border p-2 rounded flex-1"
                placeholder="Display name (e.g. Monthan)"
                value={newPlantainType.nameEn}
                onChange={(e) => setNewPlantainType({ ...newPlantainType, nameEn: e.target.value })}
                required
              />
              <div className="flex gap-2">
                <button className="bg-green-700 text-white px-3 rounded text-sm">{t("action.save", "Save")}</button>
                <button
                  type="button"
                  onClick={() => setAddingPlantainType(false)}
                  className="text-gray-500 text-sm underline"
                >
                  {t("action.cancel", "Cancel")}
                </button>
              </div>
            </form>
          )}

          {addingStockType && (
            <form
              onSubmit={handleAddStockType}
              className="flex flex-col sm:flex-row gap-2 bg-gray-50 border rounded p-3"
            >
              <input
                className="border p-2 rounded"
                placeholder="Code (e.g. CRATE)"
                value={newStockType.code}
                onChange={(e) => setNewStockType({ ...newStockType, code: e.target.value.toUpperCase() })}
                required
              />
              <input
                className="border p-2 rounded flex-1"
                placeholder="Display name (e.g. Crate)"
                value={newStockType.nameEn}
                onChange={(e) => setNewStockType({ ...newStockType, nameEn: e.target.value })}
                required
              />
              <div className="flex gap-2">
                <button className="bg-green-700 text-white px-3 rounded text-sm">{t("action.save", "Save")}</button>
                <button
                  type="button"
                  onClick={() => setAddingStockType(false)}
                  className="text-gray-500 text-sm underline"
                >
                  {t("action.cancel", "Cancel")}
                </button>
              </div>
            </form>
          )}

          <div>
            <h2 className="font-medium mb-2">{t("page.saleLines", "Sale lines")}</h2>
            {saleLines.map((line, idx) => (
              <div key={idx} className="mb-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    className="border p-2 rounded flex-1"
                    value={line.customerId}
                    onChange={(e) => handleCustomerSelect(idx, e.target.value)}
                  >
                    <option value="">{t("form.customer", "Customer")}</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {displayName(c, "name")} ({c.initials})
                      </option>
                    ))}
                    <option value={NEW_OPTION}>{t("action.addCustomer", "+ Add new Customer…")}</option>
                  </select>
                  <input
                    className="border p-2 rounded w-full sm:w-28"
                    type="number"
                    step="0.01"
                    placeholder={t("label.rate", "Rate")}
                    value={line.rate}
                    onChange={(e) => updateLine(idx, "rate", e.target.value)}
                  />
                  <input
                    className="border p-2 rounded w-full sm:w-28"
                    type="number"
                    step="0.01"
                    placeholder={t("form.qty", "Qty")}
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                  />
                  <span className="sm:w-24 self-center text-right">
                    {((Number(line.rate) || 0) * (Number(line.quantity) || 0)).toFixed(2)}
                  </span>
                  <button type="button" onClick={() => removeLine(idx)} className="text-red-600 px-2">
                    ✕
                  </button>
                </div>

                {addingCustomerForLine === idx && (
                  <form
                    onSubmit={handleAddCustomer}
                    className="flex flex-col sm:flex-row gap-2 mt-2 bg-gray-50 border rounded p-3"
                  >
                    <input
                      className="border p-2 rounded flex-1"
                      placeholder={t("form.customerName", "Customer name")}
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      required
                    />
                    <input
                      className="border p-2 rounded w-full sm:w-32"
                      placeholder="Initials (e.g. ST)"
                      value={newCustomer.initials}
                      onChange={(e) => setNewCustomer({ ...newCustomer, initials: e.target.value.toUpperCase() })}
                      required
                    />
                    <div className="flex gap-2">
                      <button className="bg-green-700 text-white px-3 rounded text-sm">{t("action.save", "Save")}</button>
                      <button
                        type="button"
                        onClick={() => setAddingCustomerForLine(null)}
                        className="text-gray-500 text-sm underline"
                      >
                        {t("action.cancel", "Cancel")}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
            <button type="button" onClick={addLine} className="text-green-700 text-sm">
              {t("action.addSaleLine", "+ Add sale line")}
            </button>
          </div>

          <p className="font-medium">
            {t("page.total", "Total")}: {total.toFixed(2)}
          </p>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-green-700 text-sm">{message}</p>}

          <button className="bg-green-700 text-white px-6 py-2 rounded">
            {t("action.saveAuctionEntry", "Save Auction Entry")}
          </button>
        </form>
      </div>
    </div>
  );
}
