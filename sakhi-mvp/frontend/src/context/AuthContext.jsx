import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sakhi_user")) || null; } catch { return null; }
  });

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem("sakhi_token", data.token);
    localStorage.setItem("sakhi_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("sakhi_token");
    localStorage.removeItem("sakhi_user");
    setUser(null);
  };

  useEffect(() => {}, []);
  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
