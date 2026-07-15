import { useEffect, useState } from "react";
import api, { getUser } from "../lib/api.js";
import { useLanguage } from "../lib/i18n.jsx";

// Admin Billing Settings (AE-12): letterhead + footer details used to render
// Customer Bill / Sales Bill in the standard Coimbatore commission-agent
// format. Backs the OrganizationSettings singleton row. labelKey drives
// translated display text; label is the English fallback.
const FIELDS = [
  { name: "companyName", label: "Firm Name", labelKey: "settings.firmName" },
  { name: "addressLine1", label: "Address Line 1", labelKey: "settings.addressLine1" },
  { name: "addressLine2", label: "Address Line 2", labelKey: "settings.addressLine2" },
  { name: "city", label: "City", labelKey: "settings.city" },
  { name: "state", label: "State", labelKey: "settings.state" },
  { name: "pincode", label: "Pincode", labelKey: "settings.pincode" },
  { name: "phone", label: "Phone", labelKey: "form.phone" },
  { name: "email", label: "Email", labelKey: "settings.email" },
  { name: "gstin", label: "GSTIN", labelKey: "settings.gstin" },
  { name: "apmcLicenseNo", label: "APMC / Market Licence No.", labelKey: "settings.apmcLicenseNo" },
  { name: "bankName", label: "Bank Name", labelKey: "settings.bankName" },
  { name: "bankAccountNo", label: "Bank Account No.", labelKey: "settings.bankAccountNo" },
  { name: "bankIfsc", label: "Bank IFSC", labelKey: "settings.bankIfsc" },
];

export default function Settings() {
  const { t } = useLanguage();
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
      setMessage(t("msg.billingSettingsSaved", "Billing settings saved."));
    } catch (err) {
      setError(err.response?.data?.error || "Could not save settings");
    }
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <p className="text-gray-600">{t("msg.onlyAdminBilling", "Only Admin users can edit billing settings.")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">{t("page.billingSettings", "Billing Settings")}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {t(
          "page.billingSettingsNote",
          "This letterhead and footer text appears on every printed Customer Bill and Sales Bill."
        )}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          {FIELDS.map((f) => (
            <div key={f.name}>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                {t(f.labelKey, f.label)}
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
            {t("page.footerNoteLabel", "Footer Note / Terms (printed at the bottom of every bill)")}
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

        <button className="bg-green-700 text-white px-6 py-2 rounded">
          {t("action.saveSettings", "Save Settings")}
        </button>
      </form>
    </div>
  );
}
