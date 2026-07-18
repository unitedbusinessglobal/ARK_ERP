import { useEffect, useRef, useState } from "react";
import api from "../lib/api.js";
import BillHeader from "../components/BillHeader.jsx";
import BillFooter from "../components/BillFooter.jsx";
import { downloadElementAsPdf } from "../lib/pdf.js";
import { useLanguage } from "../lib/i18n.jsx";

export default function CustomerBill() {
  const { t, lang } = useLanguage();
  // AE-25: master records (customer/plantain/stock) carry an optional
  // nameTa -- show it in TA mode wherever the record is displayed,
  // including inside the printed bill itself, falling back to English.
  function displayName(record, enField = "nameEn") {
    if (!record) return "";
    return lang === "TA" && record.nameTa ? record.nameTa : record[enField];
  }
  const [settings, setSettings] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState([]);
  const [selectedLineIds, setSelectedLineIds] = useState([]);
  const [bill, setBill] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const printRef = useRef(null);

  // AE-26: payment recording against the currently-viewed bill. Bills stay
  // immutable -- this posts to the independent payments log and re-fetches
  // the bill (and history) so paidTotal/balanceDue reflect the new total.
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    method: "",
    note: "",
  });
  const [paymentError, setPaymentError] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);

  useEffect(() => {
    api.get("/masters/customers").then((r) => setCustomers(r.data));
    api.get("/settings").then((r) => setSettings(r.data));
    loadHistory();
  }, []);

  function loadHistory() {
    api.get("/customer-bills").then((r) => setHistory(r.data));
  }

  useEffect(() => {
    setBill(null);
    setSelectedLineIds([]);
    if (date) {
      api.get("/auction-entries", { params: { date } }).then((r) => setEntries(r.data));
    }
  }, [date]);

  const availableLines = entries.flatMap((e) =>
    e.saleLines
      .filter((l) => !customerId || l.customerId === customerId)
      .map((l) => ({ ...l, entry: e }))
  );

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
      // Re-fetch with full itemized line details for the printed bill.
      const full = await api.get(`/customer-bills/${data.id}`);
      setBill(full.data);
      loadHistory();
    } catch (err) {
      if (err.response?.status === 409) {
        setError(
          t(
            "msg.billAlreadyExistsCustomer",
            "One or more of these sale lines are already on a bill — see Bill History below to view it."
          )
        );
      } else {
        setError(err.response?.data?.error || "Could not generate bill");
      }
    }
  }

  async function viewBill(id) {
    setError("");
    const full = await api.get(`/customer-bills/${id}`);
    setBill(full.data);
    setPaymentForm({ amount: "", paymentDate: new Date().toISOString().slice(0, 10), method: "", note: "" });
    setPaymentError("");
  }

  function handleDownload() {
    downloadElementAsPdf(printRef.current, `CustomerBill-${bill.billNo}.pdf`);
  }

  async function recordPayment() {
    setPaymentError("");
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      setPaymentError(t("msg.enterValidAmount", "Enter a valid payment amount."));
      return;
    }
    setPaymentSaving(true);
    try {
      await api.post("/payments", {
        customerBillId: bill.id,
        amount: paymentForm.amount,
        paymentDate: paymentForm.paymentDate,
        method: paymentForm.method || undefined,
        note: paymentForm.note || undefined,
      });
      await viewBill(bill.id);
      loadHistory();
    } catch (err) {
      setPaymentError(err.response?.data?.error || "Could not record payment");
    } finally {
      setPaymentSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-semibold mb-4 no-print">{t("label.customerBill", "Customer Bill")}</h1>

      <div className="flex flex-col sm:flex-row gap-2 mb-4 no-print">
        <select
          className="border p-2 rounded"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
        >
          <option value="">{t("form.selectCustomer", "Select customer")}</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {displayName(c, "name")} ({c.initials})
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
          <div className="overflow-x-auto mb-4">
            <table className="w-full border-collapse min-w-[520px]">
              <thead>
                <tr className="text-left border-b">
                  <th></th>
                  <th className="py-2">{t("bill.vehicleLabel", "Vehicle")}</th>
                  <th>{t("col.plantain", "Plantain")}</th>
                  <th>{t("label.rate", "Rate")}</th>
                  <th>{t("form.qty", "Qty")}</th>
                  <th>{t("label.amount", "Amount")}</th>
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
                    <td>{displayName(l.entry.plantainType)}</td>
                    <td>{l.rate}</td>
                    <td>{l.quantity}</td>
                    <td>{l.amount}</td>
                  </tr>
                ))}
                {availableLines.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-gray-400 py-4">
                      {t("msg.noUnbilledLines", "No unbilled sale lines for this customer/date.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <button
            disabled={!customerId || selectedLineIds.length === 0}
            onClick={handleGenerate}
            className="bg-green-700 text-white px-6 py-2 rounded disabled:opacity-40"
          >
            {t("action.generateBill", "Generate Bill")}
          </button>

          <div className="pt-6">
            <h2 className="text-sm font-semibold text-gray-600 mb-2">{t("page.billHistory", "Bill History")}</h2>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400">{t("msg.noCustomerBillsYet", "No customer bills generated yet.")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm min-w-[480px]">
                  <thead>
                    <tr className="text-left border-b text-gray-500">
                      <th className="py-1">{t("label.billNo", "Bill No")}</th>
                      <th>{t("col.buyer", "Buyer")}</th>
                      <th>{t("label.date", "Date")}</th>
                      <th className="text-right">{t("label.grandTotal", "Grand Total")}</th>
                      <th className="text-right">{t("col.balanceDue", "Balance Due")}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} className="border-b">
                        <td className="py-1">{h.billNo}</td>
                        <td>
                          {displayName(h.customer, "name")}
                          {h.customer?.initials && ` (${h.customer.initials})`}
                        </td>
                        <td>{new Date(h.billDate).toLocaleDateString("en-IN")}</td>
                        <td className="text-right">₹{h.grandTotal}</td>
                        <td className={`text-right ${Number(h.balanceDue) > 0 ? "text-red-600 font-medium" : "text-green-700"}`}>
                          ₹{h.balanceDue}
                        </td>
                        <td className="text-right">
                          <button onClick={() => viewBill(h.id)} className="text-green-700 underline text-xs">
                            {t("action.view", "View")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {bill && (
        <div className="border p-4 sm:p-6 rounded bg-white">
          <div className="flex justify-end gap-4 mb-2 no-print">
            <button onClick={() => window.print()} className="text-sm underline">
              {t("action.print", "Print")}
            </button>
            <button onClick={handleDownload} className="text-sm underline">
              {t("action.downloadPdf", "Download PDF")}
            </button>
          </div>

          <div ref={printRef}>
            <BillHeader
              settings={settings}
              title={t("label.customerBill", "Customer Bill")}
              billNo={bill.billNo}
              date={new Date(bill.billDate).toLocaleDateString("en-IN")}
            />

            <p className="text-sm mb-3">
              <span className="text-gray-500">{t("bill.buyerLabel", "Buyer")}: </span>
              <span className="font-semibold">{displayName(bill.customer, "name")}</span>
              {bill.customer?.initials && ` (${bill.customer.initials})`}
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm mb-4 min-w-[560px]">
                <thead>
                  <tr className="text-left border-y-2 border-black">
                    <th className="py-1">#</th>
                    <th>{t("bill.vehicleLabel", "Vehicle")}</th>
                    <th>{t("col.plantain", "Plantain")}</th>
                    <th>{t("col.stock", "Stock")}</th>
                    <th className="text-right">{t("form.qty", "Qty")}</th>
                    <th className="text-right">{t("label.rate", "Rate")}</th>
                    <th className="text-right">{t("label.amount", "Amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.lines?.map((l, i) => (
                    <tr key={l.id} className="border-b">
                      <td className="py-1">{i + 1}</td>
                      <td>{l.saleLine?.auctionEntry?.vehicle?.vehicleRef}</td>
                      <td>{displayName(l.saleLine?.auctionEntry?.plantainType)}</td>
                      <td>{displayName(l.saleLine?.auctionEntry?.stockType)}</td>
                      <td className="text-right">{l.saleLine?.quantity}</td>
                      <td className="text-right">{l.saleLine?.rate}</td>
                      <td className="text-right">{l.saleLine?.amount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-black font-bold">
                    <td colSpan={6} className="text-right py-2">
                      {t("label.grandTotal", "Grand Total")}
                    </td>
                    <td className="text-right py-2">₹{bill.grandTotal}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <BillFooter
              settings={settings}
              companyLabel={t("bill.forTheFirm", "For the Firm")}
              partyLabel={t("bill.buyerSignature", "Buyer Signature")}
            />
          </div>

          {/* AE-26: payment tracking lives outside the printed bill itself --
              the bill (and its grandTotal) never changes; payments are a
              separate, running log against it. */}
          <div className="no-print mt-6 border-t pt-4">
            <h2 className="text-sm font-semibold text-gray-600 mb-2">{t("page.payments", "Payments")}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm mb-3">
              <p>
                <span className="text-gray-500">{t("label.grandTotal", "Grand Total")}: </span>
                <span className="font-semibold">₹{bill.grandTotal}</span>
              </p>
              <p>
                <span className="text-gray-500">{t("col.paidTotal", "Paid")}: </span>
                <span className="font-semibold text-green-700">₹{bill.paidTotal}</span>
              </p>
              <p>
                <span className="text-gray-500">{t("col.balanceDue", "Balance Due")}: </span>
                <span className={`font-semibold ${Number(bill.balanceDue) > 0 ? "text-red-600" : "text-green-700"}`}>
                  ₹{bill.balanceDue}
                </span>
              </p>
            </div>

            {bill.payments?.length > 0 && (
              <table className="w-full border-collapse text-sm mb-3">
                <thead>
                  <tr className="text-left border-b text-gray-500">
                    <th className="py-1">{t("label.date", "Date")}</th>
                    <th className="text-right">{t("label.amount", "Amount")}</th>
                    <th>{t("col.method", "Method")}</th>
                    <th>{t("col.note", "Note")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.payments.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="py-1">{new Date(p.paymentDate).toLocaleDateString("en-IN")}</td>
                      <td className="text-right">₹{p.amount}</td>
                      <td>{p.method || "—"}</td>
                      <td>{p.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {Number(bill.balanceDue) > 0 && (
              <div className="flex flex-wrap items-end gap-2 bg-gray-50 rounded p-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t("label.amount", "Amount")}</label>
                  <input
                    className="border p-2 rounded w-28"
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t("label.date", "Date")}</label>
                  <input
                    className="border p-2 rounded"
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">{t("col.method", "Method")}</label>
                  <input
                    className="border p-2 rounded w-28"
                    placeholder={t("form.methodPlaceholder", "Cash/UPI/…")}
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs text-gray-600 mb-1">{t("col.note", "Note")}</label>
                  <input
                    className="border p-2 rounded w-full"
                    value={paymentForm.note}
                    onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                  />
                </div>
                <button
                  disabled={paymentSaving}
                  onClick={recordPayment}
                  className="bg-green-700 text-white px-4 py-2 rounded disabled:opacity-40"
                >
                  {t("action.recordPayment", "Record Payment")}
                </button>
              </div>
            )}
            {paymentError && <p className="text-red-600 text-sm mt-2">{paymentError}</p>}
          </div>

          <button
            onClick={() => setBill(null)}
            className="no-print mt-6 text-sm underline text-gray-500"
          >
            {t("action.backToHistory", "Back to Generate / History")}
          </button>
        </div>
      )}
    </div>
  );
}
