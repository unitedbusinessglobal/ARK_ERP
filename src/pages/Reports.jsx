// AE-28: Reports dashboard -- sales trend, top pending-balance buyers,
// year-over-year sales comparison, PNL (mundy's commission+fee income)
// trend, and a per-variety price trend chart. Consumes the AE-27 endpoints.
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import api from "../lib/api.js";
import { getUser } from "../lib/api.js";
import { useLanguage } from "../lib/i18n.jsx";

const GROUP_OPTIONS = ["day", "week", "month", "year"];
const CHART_COLORS = ["#15803d", "#b45309", "#1d4ed8", "#be185d", "#0891b2", "#7c3aed", "#ca8a04", "#4d7c0f"];

function currency(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function Reports() {
  const user = getUser();
  const { t, lang } = useLanguage();

  function displayName(record, enField = "nameEn") {
    if (!record) return "";
    return lang === "TA" && record.nameTa ? record.nameTa : record[enField];
  }

  const groupByLabel = (g) =>
    ({
      day: t("reports.day", "Day"),
      week: t("reports.week", "Week"),
      month: t("reports.month", "Month"),
      year: t("reports.year", "Year"),
    }[g] || g);

  // ---- 1. Sales report --------------------------------------------
  const [salesGroupBy, setSalesGroupBy] = useState("month");
  const [salesFrom, setSalesFrom] = useState("");
  const [salesTo, setSalesTo] = useState("");
  const [salesData, setSalesData] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);

  function loadSales() {
    setSalesLoading(true);
    api
      .get("/reports/sales", { params: { groupBy: salesGroupBy, from: salesFrom || undefined, to: salesTo || undefined } })
      .then((r) => setSalesData(r.data.data))
      .finally(() => setSalesLoading(false));
  }
  useEffect(() => {
    loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesGroupBy]);

  // ---- 2. Top N pending balance from buyers -------------------------
  const [topN, setTopN] = useState(10);
  const [defaulters, setDefaulters] = useState([]);
  const [defaultersLoading, setDefaultersLoading] = useState(false);

  function loadDefaulters() {
    setDefaultersLoading(true);
    api
      .get("/reports/top-defaulters", { params: { n: topN } })
      .then((r) => setDefaulters(r.data.data))
      .finally(() => setDefaultersLoading(false));
  }
  useEffect(() => {
    loadDefaulters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- 3. Last-year vs current-year sales trend ----------------------
  const [yoyYear, setYoyYear] = useState(new Date().getFullYear());
  const [yoyData, setYoyData] = useState([]);
  const [yoyMeta, setYoyMeta] = useState({ year: yoyYear, previousYear: yoyYear - 1 });

  function loadYoy() {
    api.get("/reports/sales-yoy", { params: { year: yoyYear } }).then((r) => {
      setYoyData(r.data.data);
      setYoyMeta({ year: r.data.year, previousYear: r.data.previousYear });
    });
  }
  useEffect(() => {
    loadYoy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yoyYear]);

  // ---- 4. PNL trend (mundy's commission + fee income) ----------------
  const [pnlGroupBy, setPnlGroupBy] = useState("month");
  const [pnlData, setPnlData] = useState([]);

  function loadPnl() {
    api.get("/reports/pnl", { params: { groupBy: pnlGroupBy } }).then((r) => setPnlData(r.data.data));
  }
  useEffect(() => {
    loadPnl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pnlGroupBy]);

  // ---- 5. Price trend by variety --------------------------------------
  const [priceYears, setPriceYears] = useState(3);
  const [priceTrend, setPriceTrend] = useState({ periods: [], varieties: [], data: [] });

  function loadPriceTrend() {
    api.get("/reports/price-trend", { params: { years: priceYears } }).then((r) => setPriceTrend(r.data));
  }
  useEffect(() => {
    loadPriceTrend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceYears]);

  if (!["ADMIN", "BILLING", "AUDITOR"].includes(user?.role)) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-gray-600">{t("msg.onlyReportsRoles", "Reports are available to Admin, Billing and Auditor users.")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-10">
      <h1 className="text-2xl font-semibold">{t("nav.reports", "Reports")}</h1>

      {/* 1. Sales report */}
      <section>
        <h2 className="text-lg font-semibold mb-2">{t("reports.salesTitle", "Sales Report")}</h2>
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <div className="flex gap-1 border border-green-700 rounded overflow-hidden">
            {GROUP_OPTIONS.map((g) => (
              <button
                key={g}
                onClick={() => setSalesGroupBy(g)}
                className={`px-3 py-1 text-sm ${salesGroupBy === g ? "bg-green-700 text-white" : "bg-white text-green-800"}`}
              >
                {groupByLabel(g)}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t("reports.from", "From")}</label>
            <input className="border p-2 rounded" type="date" value={salesFrom} onChange={(e) => setSalesFrom(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t("reports.to", "To")}</label>
            <input className="border p-2 rounded" type="date" value={salesTo} onChange={(e) => setSalesTo(e.target.value)} />
          </div>
          <button onClick={loadSales} className="bg-green-700 text-white px-4 py-2 rounded text-sm">
            {t("action.apply", "Apply")}
          </button>
        </div>
        {salesLoading ? (
          <p className="text-sm text-gray-400">{t("page.loading", "Loading…")}</p>
        ) : salesData.length === 0 ? (
          <p className="text-sm text-gray-400">{t("reports.noData", "No data for this range.")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => currency(v)} />
              <Bar dataKey="total" name={t("reports.salesTotal", "Sales Total")} fill={CHART_COLORS[0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* 2. Top N pending balance from buyers */}
      <section>
        <h2 className="text-lg font-semibold mb-2">{t("reports.defaultersTitle", "Top Pending Balance — Buyers")}</h2>
        <div className="flex items-end gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t("reports.topN", "Show top")}</label>
            <input
              className="border p-2 rounded w-20"
              type="number"
              min={1}
              max={500}
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value) || 10)}
            />
          </div>
          <button onClick={loadDefaulters} className="bg-green-700 text-white px-4 py-2 rounded text-sm">
            {t("action.apply", "Apply")}
          </button>
        </div>
        {defaultersLoading ? (
          <p className="text-sm text-gray-400">{t("page.loading", "Loading…")}</p>
        ) : defaulters.length === 0 ? (
          <p className="text-sm text-gray-400">{t("reports.noOutstandingBalances", "No outstanding balances — every buyer is paid up.")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm min-w-[520px]">
              <thead>
                <tr className="text-left border-b text-gray-500">
                  <th className="py-1">{t("col.buyer", "Buyer")}</th>
                  <th className="text-right">{t("reports.billCount", "Bills")}</th>
                  <th className="text-right">{t("reports.totalBilled", "Total Billed")}</th>
                  <th className="text-right">{t("col.paidTotal", "Paid")}</th>
                  <th className="text-right">{t("col.balanceDue", "Balance Due")}</th>
                </tr>
              </thead>
              <tbody>
                {defaulters.map((d) => (
                  <tr key={d.customerId} className="border-b">
                    <td className="py-1">
                      {lang === "TA" && d.customerNameTa ? d.customerNameTa : d.customerName} ({d.initials})
                    </td>
                    <td className="text-right">{d.billCount}</td>
                    <td className="text-right">{currency(d.totalBilled)}</td>
                    <td className="text-right text-green-700">{currency(d.totalPaid)}</td>
                    <td className="text-right text-red-600 font-medium">{currency(d.balanceDue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 3. Last-year vs current-year sales trend */}
      <section>
        <h2 className="text-lg font-semibold mb-2">{t("reports.yoyTitle", "Year-over-Year Sales Trend")}</h2>
        <div className="flex items-end gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t("reports.year", "Year")}</label>
            <input
              className="border p-2 rounded w-28"
              type="number"
              value={yoyYear}
              onChange={(e) => setYoyYear(Number(e.target.value) || new Date().getFullYear())}
            />
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={yoyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => currency(v)} />
            <Legend />
            <Line type="monotone" dataKey="current" name={String(yoyMeta.year)} stroke={CHART_COLORS[0]} strokeWidth={2} />
            <Line type="monotone" dataKey="previous" name={String(yoyMeta.previousYear)} stroke={CHART_COLORS[1]} strokeWidth={2} strokeDasharray="4 3" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* 4. PNL trend */}
      <section>
        <h2 className="text-lg font-semibold mb-2">{t("reports.pnlTitle", "PNL Trend (Commission + Fee Income)")}</h2>
        <p className="text-xs text-gray-500 mb-3">
          {t(
            "reports.pnlNote",
            "This is a commission-agent business, not a buy/sell reseller -- there's no separate cost price. \"PNL\" here is the mundy's own income: commission plus vehicle fare, weighing, coolie and market fee collected."
          )}
        </p>
        <div className="flex gap-1 border border-green-700 rounded overflow-hidden mb-3 w-fit">
          {GROUP_OPTIONS.map((g) => (
            <button
              key={g}
              onClick={() => setPnlGroupBy(g)}
              className={`px-3 py-1 text-sm ${pnlGroupBy === g ? "bg-green-700 text-white" : "bg-white text-green-800"}`}
            >
              {groupByLabel(g)}
            </button>
          ))}
        </div>
        {pnlData.length === 0 ? (
          <p className="text-sm text-gray-400">{t("reports.noData", "No data for this range.")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={pnlData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => currency(v)} />
              <Line type="monotone" dataKey="total" name={t("reports.totalIncome", "Total Income")} stroke={CHART_COLORS[2]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* 5. Price trend by variety */}
      <section>
        <h2 className="text-lg font-semibold mb-2">{t("reports.priceTrendTitle", "Price Trend by Variety")}</h2>
        <div className="flex items-end gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">{t("reports.yearsBack", "Years")}</label>
            <input
              className="border p-2 rounded w-20"
              type="number"
              min={1}
              max={20}
              value={priceYears}
              onChange={(e) => setPriceYears(Number(e.target.value) || 3)}
            />
          </div>
          <button onClick={loadPriceTrend} className="bg-green-700 text-white px-4 py-2 rounded text-sm">
            {t("action.apply", "Apply")}
          </button>
        </div>
        {priceTrend.data.length === 0 ? (
          <p className="text-sm text-gray-400">
            {t(
              "reports.noPriceHistory",
              "No price history yet for this range -- backfill historical auction data via Data Import to populate this chart."
            )}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={priceTrend.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `₹${v}`} />
              <Legend />
              {priceTrend.varieties.map((v, i) => (
                <Line
                  key={v.code}
                  type="monotone"
                  dataKey={v.code}
                  name={displayName(v)}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>
    </div>
  );
}
