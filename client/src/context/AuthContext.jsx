import { createContext, useContext, useEffect, useState } from "react";
import api, { TOKEN_KEY } from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // true while we check whether a saved token is still valid on first load
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    // Ask the backend who this token belongs to. The backend is the source of truth for the role.
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.data.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  // loginAs is "STUDENT" or "ADMIN" (the tab picked in the UI)
  async function login({ email, password, loginAs }) {
    const res = await api.post("/auth/login", { email, password, loginAs });
    const { token, user: loggedInUser } = res.data.data;
    localStorage.setItem(TOKEN_KEY, token);
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function register({ name, email, password, confirmPassword }) {
    const res = await api.post("/auth/register", { name, email, password, confirmPassword });
    const { token, user: newUser } = res.data.data;
    localStorage.setItem(TOKEN_KEY, token);
    setUser(newUser);
    return newUser;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    setUser, // used after a profile update
    isAuthenticated: Boolean(user),
    isStudent: user?.role === "STUDENT",
    isAdmin: user?.role === "ADMIN" || user?.role === "SUPER_ADMIN",
    isSuperAdmin: user?.role === "SUPER_ADMIN",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
