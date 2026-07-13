import { useEffect, useState } from "react";
import api, { getUser } from "../lib/api.js";

// Admin Billing Settings (AE-12): letterhead + footer details used to render
// Customer Bill / Sales Bill in the standard Coimbatore commission-agent
// format. Backs the OrganizationSettings singleton row.
const FIELDS = [
  { name: "companyName", label: "Firm Name" },
  { name: "addressLine1", label: "Address Line 1" },
  { name: "addressLine2", label: "Address Line 2" },
  { name: "city", label: "City" },
  { name: "state", label: "State" },
  { name: "pincode", label: "Pincode" },
  { name: "phone", label: "Phone" },
  { name: "email", label: "Email" },
  { name: "gstin", label: "GSTIN" },
  { name: "apmcLicenseNo", label: "APMC / Market Licence No." },
  { name: "bankName", label: "Bank Name" },
  { name: "bankAccountNo", label: "Bank Account No." },
  { name: "bankIfsc", label: "Bank IFSC" },
];

export default function Settings() {
  const user = getUser();
  const [form, setForm] = useState({});
  const [footerNote, setFooterNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/settings").then((r) => {
      setForm(r.data);
      setFooterNote(r.data.footerNote || "");
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const { data } = await api.put("/settings", { ...form, footerNote });
      setForm(data);
      setMessage("Billing settings saved.");
    } catch (err) {
      setError(err.response?.data?.error || "Could not save settings");
    }
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-gray-600">Only Admin users can edit billing settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Billing Settings</h1>
      <p className="text-sm text-gray-500 mb-6">
        This letterhead and footer text appears on every printed Customer Bill and
        Sales Bill.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {FIELDS.map((f) => (
            <div key={f.name}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {f.label}
              </label>
              <input
                className="border p-2 rounded w-full"
                value={form[f.name] || ""}
                onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Footer Note / Terms (printed at the bottom of every bill)
          </label>
          <textarea
            className="border p-2 rounded w-full"
            rows={3}
            value={footerNote}
            onChange={(e) => setFooterNote(e.target.value)}
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {message && <p className="text-green-700 text-sm">{message}</p>}

        <button className="bg-green-700 text-white px-6 py-2 rounded">Save Settings</button>
      </form>
    </div>
  );
}
