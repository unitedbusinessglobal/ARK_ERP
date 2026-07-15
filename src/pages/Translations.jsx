import { useEffect, useMemo, useState } from "react";
import api, { getUser } from "../lib/api.js";
import { useLanguage } from "../lib/i18n.jsx";

// Translations admin page (AE-19/AE-20): the labels_i18n table is the single
// source of Tamil text for the whole app -- seeded from the BRD's §12
// dictionary as a starting point, but meant to be corrected/extended here
// without a deploy. Every row shows the English reference text (read-only,
// since English is the anchor language the BRD keys off) with an editable
// Tamil field next to it.
export default function Translations() {
  const user = getUser();
  const { refreshLabels, t } = useLanguage();
  const [rows, setRows] = useState([]); // [{ labelKey, en, ta, taOriginal }]
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get("/labels");
      const byKey = {};
      for (const row of data) {
        if (!byKey[row.labelKey]) byKey[row.labelKey] = { labelKey: row.labelKey, en: "", ta: "" };
        if (row.lang === "EN") byKey[row.labelKey].en = row.labelText;
        if (row.lang === "TA") byKey[row.labelKey].ta = row.labelText;
      }
      const list = Object.values(byKey)
        .map((r) => ({ ...r, taOriginal: r.ta }))
        .sort((a, b) => a.labelKey.localeCompare(b.labelKey));
      setRows(list);
    } catch (err) {
      setError(err.response?.data?.error || "Could not load translations");
    } finally {
      setLoading(false);
    }
  }

  function updateTa(labelKey, value) {
    setRows((prev) => prev.map((r) => (r.labelKey === labelKey ? { ...r, ta: value } : r)));
  }

  const dirtyRows = useMemo(() => rows.filter((r) => r.ta !== r.taOriginal), [rows]);

  async function handleSave() {
    setError("");
    setMessage("");
    if (dirtyRows.length === 0) {
      setMessage(t("msg.nothingToSave", "Nothing to save."));
      return;
    }
    try {
      const labels = dirtyRows.map((r) => ({ labelKey: r.labelKey, lang: "TA", labelText: r.ta }));
      await api.put("/labels", { labels });
      await refreshLabels();
      setMessage(`Saved ${dirtyRows.length} translation${dirtyRows.length === 1 ? "" : "s"}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "Could not save translations");
    }
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-gray-600">{t("msg.onlyAdminTranslations", "Only Admin users can edit translations.")}</p>
      </div>
    );
  }

  const visibleRows = filter
    ? rows.filter(
        (r) =>
          r.labelKey.toLowerCase().includes(filter.toLowerCase()) ||
          r.en.toLowerCase().includes(filter.toLowerCase())
      )
    : rows;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-semibold mb-2">{t("nav.translations", "Translations")}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {t(
          "page.translationsIntro",
          "English text is the reference (seeded from the BRD's bilingual label dictionary) and can't be changed here. Edit the Tamil column and save -- the change applies everywhere immediately, no deploy needed."
        )}
      </p>

      <input
        className="border p-2 rounded w-full mb-4"
        placeholder={t("page.searchPlaceholder", "Search by key or English text…")}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {loading ? (
        <p className="text-sm text-gray-500">{t("page.loading", "Loading…")}</p>
      ) : (
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-2 font-medium text-gray-600">{t("page.keyColumn", "Key")}</th>
                <th className="p-2 font-medium text-gray-600">{t("page.englishColumn", "English")}</th>
                <th className="p-2 font-medium text-gray-600">{t("page.tamilColumn", "Tamil")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.labelKey} className="border-t">
                  <td className="p-2 align-top text-xs text-gray-400 font-mono whitespace-nowrap">
                    {r.labelKey}
                  </td>
                  <td className="p-2 align-top text-gray-700">{r.en}</td>
                  <td className="p-2 align-top">
                    <input
                      className={`border p-1.5 rounded w-full lang-ta ${
                        r.ta !== r.taOriginal ? "border-amber-400 bg-amber-50" : ""
                      }`}
                      value={r.ta}
                      onChange={(e) => updateTa(r.labelKey, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-gray-400">
                    {t("page.noLabelsMatch", "No labels match")} "{filter}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={handleSave}
          disabled={dirtyRows.length === 0}
          className="bg-green-700 text-white px-6 py-2 rounded disabled:opacity-40"
        >
          {t("action.save", "Save")} {dirtyRows.length > 0 ? `(${dirtyRows.length})` : ""}
        </button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {message && <p className="text-green-700 text-sm">{message}</p>}
      </div>
    </div>
  );
}
