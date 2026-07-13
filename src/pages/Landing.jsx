import { Link } from "react-router-dom";

const MODULES = [
  {
    icon: "🚚",
    title: "Auction Entry",
    body: "Guided, dropdown-driven daily auction-note entry — vehicle, plantain type, stock type, and customer-wise sale lines in one flow.",
  },
  {
    icon: "🧾",
    title: "Customer Bills",
    body: "Generate itemized bills straight from recorded sale lines. Immutable once issued, with reprint that always re-renders from stored data.",
  },
  {
    icon: "🌾",
    title: "Farmer / Agent Sales Bills",
    body: "Automatic commission and vehicle-fare deductions, net payable computed instantly — no spreadsheets, no manual arithmetic.",
  },
  {
    icon: "📋",
    title: "Masters",
    body: "Customers, farmers & agents, plantain types, and stock types — the reference data every entry and bill is built from.",
  },
];

const STATS = [
  { value: "100%", label: "Digital auction notes" },
  { value: "2", label: "Bill types generated" },
  { value: "0", label: "Manual spreadsheets" },
  { value: "EN", label: "Phase 1 · Tamil next" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-bold" style={{ color: "#1A56DB" }}>
            ARK Plantain Mundy
          </span>
          <Link
            to="/login"
            className="px-4 py-2 rounded text-white text-sm font-medium"
            style={{ backgroundColor: "#1A56DB" }}
          >
            Sign in
          </Link>
        </div>
      </nav>

      <header className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <p
          className="inline-block text-xs font-semibold tracking-wide uppercase px-3 py-1 rounded-full mb-6"
          style={{ backgroundColor: "#EBF1FE", color: "#1A56DB" }}
        >
          Auction-Note Billing, Digitized
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-6">
          Enter it once. <span style={{ color: "#1A56DB" }}>Bill it right.</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10">
          ARK Plantain Mundy turns daily auction-note entries into accurate customer
          bills and farmer/agent sales bills — automatically, from a single source
          of truth.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            to="/login"
            className="px-6 py-3 rounded-lg text-white font-semibold"
            style={{ backgroundColor: "#1A56DB" }}
          >
            Sign in to your mundy
          </Link>
          <a
            href="#modules"
            className="px-6 py-3 rounded-lg font-semibold border border-gray-300"
          >
            See what it does
          </a>
        </div>
      </header>

      <section className="border-y bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-extrabold" style={{ color: "#1A56DB" }}>
                {s.value}
              </div>
              <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="modules" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">
          One flow. Every bill.
        </h2>
        <p className="text-center text-gray-600 mb-12">
          Everything below is built on the same auction-entry data — nothing is ever
          re-typed twice.
        </p>
        <div className="grid sm:grid-cols-2 gap-6">
          {MODULES.map((m) => (
            <div key={m.title} className="border rounded-xl p-6 hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">{m.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{m.title}</h3>
              <p className="text-gray-600 text-sm">{m.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="text-white" style={{ backgroundColor: "#1A56DB" }}>
        <div className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to enter today's auction?
          </h2>
          <p className="mb-8 opacity-90">Sign in and get the day's bills out in minutes.</p>
          <Link
            to="/login"
            className="inline-block px-6 py-3 rounded-lg font-semibold bg-white"
            style={{ color: "#1A56DB" }}
          >
            Sign in
          </Link>
        </div>
      </section>

      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} ARK Plantain Mundy. All rights reserved.
          </p>
          <a
            href="https://www.ainformatiq.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-gray-600 border rounded-full px-4 py-2 hover:border-gray-400 transition-colors"
          >
            <img src="https://www.ainformatiq.com/logo.png" alt="AInformatIQ" className="h-5 w-auto" />
            <span>
              Powered by <span className="font-semibold" style={{ color: "#1A56DB" }}>AInformatIQ</span>
            </span>
          </a>
        </div>
      </footer>
    </div>
  );
}
