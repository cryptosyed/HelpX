import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { decodeJWT } from "../utils/jwt";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [email, setEmail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  async function fetchUserInfo() {
    try {
      const response = await API.get("/auth/me");
      setUser(response.data);
      setRole(response.data.role);
      setEmail(response.data.email);
    } catch (err) {
      console.error("Failed to fetch user info:", err);
      // Token might be invalid, clear it
      API.clearToken();
      setUser(null);
      setRole(null);
      setEmail(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem("token");
    if (token && token !== "null") {
      const decoded = decodeJWT(token);
      if (decoded) {
        setRole(decoded.role || null);
        setEmail(decoded.email || null);
        // Fetch full user info from backend
        fetchUserInfo();
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function signIn(token) {
    API.setToken(token);
    const decoded = decodeJWT(token);
    if (decoded) {
      // Immediately set auth state to trigger re-render
      setRole(decoded.role);
      setEmail(decoded.email);
      setUser({ role: decoded.role, email: decoded.email }); // Set minimal user object immediately
      setIsLoading(true);
      // Then fetch full user info
      fetchUserInfo();
    }
  }

  function signOut() {
    API.clearToken();
    setUser(null);
    setRole(null);
    setEmail(null);
    navigate("/");
  }

  const isAuthenticated = Boolean(user || (role && email));

  return {
    user,
    role,
    email,
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    refreshUser: fetchUserInfo,
  };
}

