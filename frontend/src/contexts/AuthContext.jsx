import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import API from "../api";

const TOKEN_STORAGE_KEY = "token";
const USER_STORAGE_KEY = "user";
const AuthContext = createContext(null);

function normalizeUser(data) {
  if (!data) return null;
  const { id = null, email = null, role = null, ...rest } = data;
  return { id, email, role, ...rest };
}

function persistUser(user) {
  if (!user) {
    localStorage.removeItem(USER_STORAGE_KEY);
    return;
  }
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const savedUserRaw = localStorage.getItem(USER_STORAGE_KEY);

    if (savedToken && savedToken !== "null") {
      try {
        API.setToken(savedToken); // ensure axios header + storage
        setToken(savedToken);

        const parsedUser = savedUserRaw ? normalizeUser(JSON.parse(savedUserRaw)) : null;
        if (parsedUser) {
          setUser(parsedUser);
          setIsLoading(false);
        } else {
          fetchUserProfile();
        }
      } catch (e) {
        console.error("Failed to restore auth state:", e);
        clearAuth();
      }
    } else {
      clearAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchUserProfile() {
    setIsLoading(true);
    try {
      const response = await API.get("/auth/me");
      const userData = normalizeUser(response.data);
      setUser(userData);
      persistUser(userData);
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      if (err.response?.status === 401) {
        clearAuth();
      }
    } finally {
      setIsLoading(false);
    }
  }

  function login(tokenValue, userData = null) {
    if (!tokenValue) {
      clearAuth();
      return;
    }

    API.setToken(tokenValue); // writes header + storage
    setToken(tokenValue);

    if (userData) {
      const normalizedUser = normalizeUser(userData);
      setUser(normalizedUser);
      persistUser(normalizedUser);
      setIsLoading(false);
    } else {
      fetchUserProfile();
    }
  }

  function logout() {
    clearAuth();
  }

  function updateUser(userData) {
    const normalizedUser = normalizeUser(userData);
    setUser(normalizedUser);
    persistUser(normalizedUser);
  }

  function clearAuth() {
    setToken(null);
    setUser(null);
    API.clearToken(); // clears axios header + storage
    persistUser(null);
    setIsLoading(false);
  }

  const role = user?.role ?? null;
  const isAuthenticated = Boolean(token && user);
  const value = useMemo(
    () => ({
      user,
      token,
      role,
      login,
      logout,
      setUser: updateUser,
      isAuthenticated,
      isLoggedIn: isAuthenticated, // backwards compatibility
      isProvider: role === "provider" || role === "admin",
      isAdmin: role === "admin",
      isLoading,
    }),
    [user, token, role, isAuthenticated, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}

