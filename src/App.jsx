import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Masters from "./pages/Masters.jsx";
import AuctionEntry from "./pages/AuctionEntry.jsx";
import CustomerBill from "./pages/CustomerBill.jsx";
import SalesBill from "./pages/SalesBill.jsx";
import Settings from "./pages/Settings.jsx";
import { getUser, clearSession } from "./lib/api.js";

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

  function handleLogout() {
    clearSession();
    navigate("/login");
  }

  return (
    <div>
      <nav className="bg-green-800 text-white px-6 py-3 flex gap-6 items-center no-print">
        <span className="font-semibold">ARK Plantain Mundy</span>
        <Link to="/auction-entry">Auction Entry</Link>
        <Link to="/customer-bill">Customer Bill</Link>
        <Link to="/sales-bill">Sales Bill</Link>
        <Link to="/masters">Masters</Link>
        {user?.role === "ADMIN" && <Link to="/settings">Billing Settings</Link>}
        <span className="ml-auto text-sm">{user?.name}</span>
        <button onClick={handleLogout} className="text-sm underline">
          Logout
        </button>
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
                </Routes>
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
