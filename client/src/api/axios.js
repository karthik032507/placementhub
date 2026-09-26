import axios from "axios";

export const TOKEN_KEY = "placementhub_token";

// One shared Axios instance for the whole app.
// In development the Vite proxy forwards /api to the Express server.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Attach the JWT to every request automatically.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If the server says the token is invalid/expired, clear it and send the user to login.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const isLoginCall = url.includes("/auth/login") || url.includes("/auth/register");
    if (status === 401 && !isLoginCall && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.location.assign("/login");
    }
    return Promise.reject(error);
  }
);

// Turns any Axios error into a friendly message. Never shows raw stack traces.
export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  if (!error.response) return "Unable to reach the server. Please check your connection.";
  return error.response.data?.message || fallback;
}

export default api;
