import { useEffect, useState } from "react";
import api from "../lib/api.js";

const TABS = [
  {
    key: "customers",
    label: "Customers",
    fields: [
      { name: "name", label: "Name" },
      { name: "initials", label: "Initials" },
    ],
  },
  {
    key: "farmers-agents",
    label: "Farmers / Agents",
    fields: [
      { name: "name", label: "Name" },
      { name: "phone", label: "Phone" },
    ],
  },
  {
    key: "plantain-types",
    label: "Plantain Types",
    fields: [
      { name: "code", label: "Code" },
      { name: "nameEn", label: "Name" },
    ],
  },
  {
    key: "stock-types",
    label: "Stock Types",
    fields: [
      { name: "code", label: "Code" },
      { name: "nameEn", label: "Name" },
    ],
  },
];

export default function Masters() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    load();
    setForm({});
    setError("");
  }, [activeTab]);

  async function load() {
    const { data } = await api.get(`/masters/${activeTab.key}`);
    setRecords(data);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/masters/${activeTab.key}`, form);
      setForm({});
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Save failed");
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Masters</h1>
      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded ${
              tab.key === activeTab.key ? "bg-green-700 text-white" : "bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6 flex-wrap">
        {activeTab.fields.map((f) => (
          <input
            key={f.name}
            className="border p-2 rounded"
            placeholder={f.label}
            value={form[f.name] || ""}
            onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
          />
        ))}
        <button className="bg-green-700 text-white px-4 rounded">Add</button>
      </form>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b">
            {activeTab.fields.map((f) => (
              <th key={f.name} className="py-2 pr-4">
                {f.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b">
              {activeTab.fields.map((f) => (
                <td key={f.name} className="py-2 pr-4">
                  {r[f.name]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
