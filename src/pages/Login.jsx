import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { saveSession } from "../lib/api.js";

export default function Login() {
  const [email, setEmail] = useState("admin@arkplantainmundy.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  // AE-18: surfaced when api.js's response interceptor redirects here after
  // a 401, so an expired session reads as "please sign in again" instead of
  // silently dropping the user back at the login form with no explanation.
  const sessionExpired =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("expired") === "1";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      saveSession(data.token, data.user);
      navigate("/auction-entry");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="bg-white shadow p-8 rounded w-80 space-y-4">
        <h1 className="text-xl font-semibold text-center">ARK Plantain Mundy</h1>
        {sessionExpired && (
          <p className="text-amber-700 bg-amber-50 border border-amber-200 text-sm rounded p-2">
            Your session expired. Please sign in again.
          </p>
        )}
        <input
          className="border w-full p-2 rounded"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          className="border w-full p-2 rounded"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button className="bg-green-700 text-white w-full py-2 rounded">Sign in</button>
        <p className="text-xs text-gray-400 text-center">
          Seeded admin: admin@arkplantainmundy.local / changeme123
        </p>
      </form>
    </div>
  );
}
