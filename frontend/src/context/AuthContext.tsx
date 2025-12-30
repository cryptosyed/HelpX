import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Role = "customer" | "provider" | "admin" | "user";

type AuthState = {
  token: string | null;
  role: Role | null;
  userId: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

function decodeToken(token: string): { role: Role | null; sub: number | null } {
  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(atob(payload));
    return {
      role: (decoded.role?.toLowerCase() as Role) || null,
      sub: decoded.sub ? Number(decoded.sub) : null,
    };
  } catch {
    return { role: null, sub: null };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("token");
    if (stored) {
      applyToken(stored);
    } else {
      setIsLoading(false);
    }
  }, []);

  const applyToken = (tok: string) => {
    const decoded = decodeToken(tok);
    setToken(tok);
    setRole(decoded.role);
    setUserId(decoded.sub);
    localStorage.setItem("token", tok);
    setIsLoading(false);
  };

  const login = (tok: string) => {
    applyToken(tok);
  };

  const logout = () => {
    setToken(null);
    setRole(null);
    setUserId(null);
    localStorage.removeItem("token");
  };

  const value = useMemo(
    () => ({
      token,
      role,
      userId,
      isAuthenticated: Boolean(token),
      isLoading,
      login,
      logout,
    }),
    [token, role, userId, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuthContext(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return ctx;
}