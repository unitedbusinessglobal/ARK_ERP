import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// AE-18: previously a 401 (missing/expired token) just rejected silently --
// no page attached a .catch to its api.get(...) calls, so every list stayed
// at its empty initial state. That looked exactly like "all my data is
// gone" when the session had simply gone stale. Force a clean re-login
// instead. Skip this for the /auth/login call itself so a wrong password
// still shows its own inline error rather than bouncing the page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginRequest = error.config?.url?.includes("/auth/login");
    if (status === 401 && !isLoginRequest && typeof window !== "undefined") {
      clearSession();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login?expired=1";
      }
    }
    return Promise.reject(error);
  }
);

export function saveSession(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export default api;
