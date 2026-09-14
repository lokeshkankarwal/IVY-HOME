import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, clearStoredToken } from "./api/client";

export type User = {
  id: string;
  email: string;
  name: string;
  role: "CUSTOMER" | "SELLER" | "SUPERADMIN";
  phone?: string | null;
  sellerStatus?: string | null;
};

type Ctx = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({ user: null, loading: true, refresh: async () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const data = await api.get<{ user: User }>("/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const logout = async () => {
    clearStoredToken();
    await api.post("/auth/logout");
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, loading, refresh, logout }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
