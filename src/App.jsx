import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Masters from "./pages/Masters.jsx";
import AuctionEntry from "./pages/AuctionEntry.jsx";
import CustomerBill from "./pages/CustomerBill.jsx";
import SalesBill from "./pages/SalesBill.jsx";
import { getUser, clearSession } from "./lib/api.js";

function RequireAuth({ children }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  return children;
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
        <span className="ml-auto text-sm">{user?.name}</span>
        <button onClick={handleLogout} className="text-sm underline">
          Logout
        </button>
      </nav>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout>
                <Routes>
                  <Route path="/" element={<Navigate to="/auction-entry" replace />} />
                  <Route path="/auction-entry" element={<AuctionEntry />} />
                  <Route path="/customer-bill" element={<CustomerBill />} />
                  <Route path="/sales-bill" element={<SalesBill />} />
                  <Route path="/masters" element={<Masters />} />
                </Routes>
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
