// AE-29: admin-only bulk historical backfill. Download a template, fill it
// in (one row = one sale line), upload it back -- parsed entirely
// client-side with the `xlsx` (SheetJS) library, then posted as JSON rows
// to POST /api/import/auction-entries. Chosen over parsing server-side so
// the preview step (before committing anything to the database) is free.
import { useState } from "react";
import * as XLSX from "xlsx";
import api from "../lib/api.js";
import { getUser } from "../lib/api.js";
import { useLanguage } from "../lib/i18n.jsx";

const TEMPLATE_HEADERS = [
  "Auction Date (YYYY-MM-DD)",
  "Plantain Type Code",
  "Stock Type Code",
  "Vehicle Ref",
  "Farmer/Agent Name",
  "Farmer/Agent Phone",
  "Customer Initials",
  "Customer Name",
  "Rate",
  "Quantity",
];
const TEMPLATE_EXAMPLE = ["2024-01-15", "NEN", "BUN", "TN-001", "Ramasamy", "", "AB", "A.B. Traders", "32.50", "120"];

function normalizeDate(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v ?? "").trim();
}

export default function DataImport() {
  const user = getUser();
  const { t } = useLanguage();

  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [parseError, setParseError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { created, errorCount, errors }
  const [submitError, setSubmitError] = useState("");

  if (user?.role !== "ADMIN") {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-gray-600">{t("msg.onlyAdminImport", "Only Admin users can bulk-import historical data.")}</p>
      </div>
    );
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, TEMPLATE_EXAMPLE]);
    ws["!cols"] = TEMPLATE_HEADERS.map(() => ({ wch: 24 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historical Data");
    XLSX.writeFile(wb, "ark-historical-data-template.xlsx");
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    setResult(null);
    setSubmitError("");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
        const dataRows = aoa.slice(1).filter((r) => r.some((cell) => String(cell).trim() !== ""));

        const rows = dataRows.map((r) => ({
          auctionDate: normalizeDate(r[0]),
          plantainTypeCode: String(r[1] ?? "").trim(),
          stockTypeCode: String(r[2] ?? "").trim(),
          vehicleRef: String(r[3] ?? "").trim(),
          farmerAgentName: String(r[4] ?? "").trim(),
          farmerAgentPhone: String(r[5] ?? "").trim(),
          customerInitials: String(r[6] ?? "").trim(),
          customerName: String(r[7] ?? "").trim(),
          rate: r[8],
          quantity: r[9],
        }));
        setParsedRows(rows);
        if (rows.length === 0) {
          setParseError(t("msg.noRowsFound", "No data rows found in the sheet (only a header row, or the sheet is empty)."));
        }
      } catch (err) {
        setParseError(err.message || "Could not parse this file");
        setParsedRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    setSubmitting(true);
    setSubmitError("");
    setResult(null);
    try {
      const { data } = await api.post("/import/auction-entries", { rows: parsedRows });
      setResult(data);
    } catch (err) {
      setSubmitError(err.response?.data?.error || "Import failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-semibold mb-2">{t("nav.dataImport", "Data Import")}</h1>
      <p className="text-sm text-gray-500 mb-6">
        {t(
          "page.dataImportIntro",
          "Bulk-upload historical auction transactions to backfill reports (e.g. the price trend chart) with data from before this system was in use. Each row becomes a real transaction, exactly like manual Auction Entry -- Plantain Type and Stock Type codes must already exist in Masters; vehicles, farmers/agents and customers not already in Masters are created automatically."
        )}
      </p>

      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={downloadTemplate} className="bg-gray-100 border px-4 py-2 rounded text-sm">
          {t("action.downloadTemplate", "Download Template (.xlsx)")}
        </button>
      </div>

      <div className="border rounded p-4 mb-6">
        <label className="block text-sm font-medium mb-2">{t("action.uploadFilledTemplate", "Upload filled-in template")}</label>
        <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="text-sm" />
        {fileName && <p className="text-xs text-gray-500 mt-1">{fileName}</p>}
        {parseError && <p className="text-red-600 text-sm mt-2">{parseError}</p>}
      </div>

      {parsedRows.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-600 mb-2">
            {t("reports.previewRows", "Preview")} ({parsedRows.length} {t("reports.rowsFound", "rows found")})
          </h2>
          <div className="overflow-x-auto border rounded mb-3">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-left">
                <tr>
                  {TEMPLATE_HEADERS.map((h) => (
                    <th key={h} className="p-2 font-medium text-gray-600 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2 whitespace-nowrap">{r.auctionDate}</td>
                    <td className="p-2">{r.plantainTypeCode}</td>
                    <td className="p-2">{r.stockTypeCode}</td>
                    <td className="p-2">{r.vehicleRef}</td>
                    <td className="p-2">{r.farmerAgentName}</td>
                    <td className="p-2">{r.farmerAgentPhone}</td>
                    <td className="p-2">{r.customerInitials}</td>
                    <td className="p-2">{r.customerName}</td>
                    <td className="p-2 text-right">{r.rate}</td>
                    <td className="p-2 text-right">{r.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {parsedRows.length > 10 && (
            <p className="text-xs text-gray-400 mb-3">
              {t("reports.previewTruncated", "Showing first 10 of")} {parsedRows.length}.
            </p>
          )}
          <button
            disabled={submitting}
            onClick={handleImport}
            className="bg-green-700 text-white px-6 py-2 rounded disabled:opacity-40"
          >
            {submitting ? t("reports.importing", "Importing…") : t("action.import", "Import")}
          </button>
        </div>
      )}

      {submitError && <p className="text-red-600 text-sm mb-4">{submitError}</p>}

      {result && (
        <div className="border rounded p-4">
          <p className="text-sm mb-2">
            <span className="text-green-700 font-semibold">
              {result.created} {t("reports.rowsImported", "rows imported")}
            </span>
            {result.errorCount > 0 && (
              <span className="text-red-600 font-semibold ml-3">
                {result.errorCount} {t("reports.rowsFailed", "rows failed")}
              </span>
            )}
          </p>
          {result.errors?.length > 0 && (
            <div className="overflow-y-auto max-h-64 border rounded">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="p-2">{t("reports.rowNum", "Row")}</th>
                    <th className="p-2">{t("reports.errorMessage", "Error")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.errors.map((e, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{e.row}</td>
                      <td className="p-2 text-red-600">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
