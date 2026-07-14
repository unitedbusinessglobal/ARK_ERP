import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Masters from "./pages/Masters.jsx";
import AuctionEntry from "./pages/AuctionEntry.jsx";
import CustomerBill from "./pages/CustomerBill.jsx";
import SalesBill from "./pages/SalesBill.jsx";
import Settings from "./pages/Settings.jsx";
import Translations from "./pages/Translations.jsx";
import { getUser, clearSession } from "./lib/api.js";
import { useLanguage } from "./lib/i18n.jsx";

function RequireAuth({ children }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Public landing page at "/" (AE-10). Signed-in users skip straight to the
// app instead of seeing marketing content again.
function HomeRoute() {
  const user = getUser();
  if (user) return <Navigate to="/auction-entry" replace />;
  return <Landing />;
}

function Layout({ children }) {
  const navigate = useNavigate();
  const user = getUser();
  const { lang, setLang, t } = useLanguage();
  // Mobile nav (AE-14): the old single-row flex nav overflowed off-screen on
  // narrow viewports, making Logout unreachable without horizontal scroll.
  // Below sm, links + Logout collapse behind this toggle instead.
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  // AE-19: toggle controls UI chrome text + the default language new bills
  // are generated in (per the user's clarification). It does NOT alter any
  // already-issued bill -- those keep rendering in whatever language was
  // selected when they were created (FR-013, stored on the bill record).
  const languageToggle = (
    <div className="flex items-center gap-1 text-xs border border-green-600 rounded overflow-hidden">
      <button
        onClick={() => setLang("EN")}
        className={`px-2 py-1 ${lang === "EN" ? "bg-white text-green-800 font-semibold" : "text-green-100"}`}
      >
        EN
      </button>
      <button
        onClick={() => setLang("TA")}
        className={`px-2 py-1 ${lang === "TA" ? "bg-white text-green-800 font-semibold" : "text-green-100"}`}
      >
        TA
      </button>
    </div>
  );

  const navLinks = (
    <>
      <Link to="/auction-entry" onClick={() => setMenuOpen(false)}>
        {t("nav.auctionEntry", "Auction Entry")}
      </Link>
      <Link to="/customer-bill" onClick={() => setMenuOpen(false)}>
        {t("nav.customerBill", "Customer Bill")}
      </Link>
      <Link to="/sales-bill" onClick={() => setMenuOpen(false)}>
        {t("nav.salesBill", "Sales Bill")}
      </Link>
      <Link to="/masters" onClick={() => setMenuOpen(false)}>
        {t("nav.masters", "Masters")}
      </Link>
      {user?.role === "ADMIN" && (
        <Link to="/settings" onClick={() => setMenuOpen(false)}>
          {t("nav.settings", "Settings")} (Billing)
        </Link>
      )}
      {user?.role === "ADMIN" && (
        <Link to="/translations" onClick={() => setMenuOpen(false)}>
          {t("nav.translations", "Translations")}
        </Link>
      )}
    </>
  );

  return (
    <div>
      <nav className="bg-green-800 text-white px-4 sm:px-6 py-3 no-print">
        <div className="flex items-center gap-4">
          <span className="font-semibold">{t("nav.appTitle", "ARK Plantain Mundy")}</span>
          <div className="hidden sm:flex gap-6 items-center">{navLinks}</div>
          <div className="hidden sm:flex ml-auto items-center gap-4">
            {languageToggle}
            <span className="text-sm">{user?.name}</span>
            <button onClick={handleLogout} className="text-sm underline">
              {t("nav.logout", "Logout")}
            </button>
          </div>
          <div className="sm:hidden ml-auto flex items-center gap-2">
            {languageToggle}
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="text-sm border border-green-600 rounded px-3 py-1"
              aria-label="Toggle navigation menu"
            >
              {menuOpen ? t("nav.close", "Close") : t("nav.menu", "Menu")}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="sm:hidden mt-3 pt-3 border-t border-green-700 flex flex-col gap-3 text-sm pb-1">
            {navLinks}
            <div className="pt-2 mt-1 border-t border-green-700 flex items-center justify-between">
              <span className="text-green-200">{user?.name}</span>
              <button onClick={handleLogout} className="underline">
                {t("nav.logout", "Logout")}
              </button>
            </div>
          </div>
        )}
      </nav>
      {children}
      <footer className="no-print text-center text-xs text-gray-400 py-6">
        <a
          href="https://www.ainformatiq.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-600"
        >
          Powered by AInformatIQ
        </a>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout>
                <Routes>
                  <Route path="/auction-entry" element={<AuctionEntry />} />
                  <Route path="/customer-bill" element={<CustomerBill />} />
                  <Route path="/sales-bill" element={<SalesBill />} />
                  <Route path="/masters" element={<Masters />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/translations" element={<Translations />} />
                </Routes>
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
