import { useEffect, useState } from "react";
import api from "../lib/api.js";
import { useLanguage } from "../lib/i18n.jsx";

// labelKey/tabLabelKey drive translated display text; label/label (tab)
// are the English fallback if a key is missing.
const TABS = [
  {
    key: "customers",
    label: "Customers",
    tabLabelKey: "masters.tabCustomers",
    fields: [
      { name: "name", label: "Name", labelKey: "form.name" },
      { name: "initials", label: "Initials", labelKey: "form.initials" },
      { name: "nameTa", label: "Tamil Name", labelKey: "form.tamilName", lang: "ta" },
    ],
  },
  {
    key: "farmers-agents",
    label: "Farmers / Agents",
    tabLabelKey: "masters.tabFarmersAgents",
    fields: [
      { name: "name", label: "Name", labelKey: "form.name" },
      { name: "phone", label: "Phone", labelKey: "form.phone" },
      { name: "nameTa", label: "Tamil Name", labelKey: "form.tamilName", lang: "ta" },
    ],
  },
  {
    key: "plantain-types",
    label: "Plantain Types",
    tabLabelKey: "masters.tabPlantainTypes",
    fields: [
      { name: "code", label: "Code", labelKey: "form.code" },
      { name: "nameEn", label: "Name", labelKey: "form.name" },
      { name: "nameTa", label: "Tamil Name", labelKey: "form.tamilName", lang: "ta" },
    ],
  },
  {
    key: "stock-types",
    label: "Stock Types",
    tabLabelKey: "masters.tabStockTypes",
    fields: [
      { name: "code", label: "Code", labelKey: "form.code" },
      { name: "nameEn", label: "Name", labelKey: "form.name" },
      { name: "nameTa", label: "Tamil Name", labelKey: "form.tamilName", lang: "ta" },
    ],
  },
];

export default function Masters() {
  const { t } = useLanguage();
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
      <h1 className="text-2xl font-semibold mb-4">{t("nav.masters", "Masters")}</h1>
      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded ${
              tab.key === activeTab.key ? "bg-green-700 text-white" : "bg-gray-200"
            }`}
          >
            {t(tab.tabLabelKey, tab.label)}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-6 flex-wrap">
        {activeTab.fields.map((f) => (
          <input
            key={f.name}
            className={`border p-2 rounded ${f.lang === "ta" ? "lang-ta" : ""}`}
            placeholder={t(f.labelKey, f.label)}
            value={form[f.name] || ""}
            onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
          />
        ))}
        <button className="bg-green-700 text-white px-4 rounded">{t("action.add", "Add")}</button>
      </form>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b">
            {activeTab.fields.map((f) => (
              <th key={f.name} className="py-2 pr-4">
                {t(f.labelKey, f.label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b">
              {activeTab.fields.map((f) => (
                <td key={f.name} className={`py-2 pr-4 ${f.lang === "ta" ? "lang-ta" : ""}`}>
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
