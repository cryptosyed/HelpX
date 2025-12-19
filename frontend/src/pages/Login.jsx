import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api";
import { useAuthContext } from "../contexts/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const auth = useAuthContext();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const redirectByRole = (role) => {
    const normalized = (role || "").toLowerCase();
    switch (normalized) {
      case "provider":
        navigate("/dashboard", { replace: true });
        return;
      case "admin":
        navigate("/admin", { replace: true });
        return;
      case "customer":
      case "user":
      default:
        navigate("/", { replace: true });
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await API.post("/auth/login", {
        email: form.email,
        password: form.password,
      });
      const token = res.data?.access_token;
      if (token) {
        let profile = res.data?.user || null;

        // Always ensure we have a fresh profile with role
        if (!profile) {
          try {
            // ensure header set for subsequent request
            API.setToken(token);
            const userRes = await API.get("/auth/me");
            profile = userRes.data;
          } catch (fetchErr) {
            console.error("Failed to fetch user profile:", fetchErr);
            API.clearToken();
            setError("Login successful but failed to load profile. Please try again.");
            return;
          }
        }

        auth.login(token, profile);
        redirectByRole(profile?.role);
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);

      let errorMsg = "Login failed";
      if (err.response?.data?.detail) {
        errorMsg = Array.isArray(err.response.data.detail)
          ? err.response.data.detail[0]?.msg || "Login failed"
          : err.response.data.detail;
      } else if (err.message) {
        errorMsg = err.message;
      } else if (err.code === "ECONNREFUSED" || err.code === "ERR_NETWORK") {
        errorMsg = "Cannot connect to server. Is the backend running?";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10 relative bg-gradient-hero">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary-start/10 rounded-full blur-3xl animate-hover-float"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent-purple/10 rounded-full blur-3xl animate-hover-float" style={{ animationDelay: '1s' }}></div>
      </div>
      <form className="glass-strong rounded-2xl p-8 w-full max-w-md shadow-2xl border border-slate-200/50 relative z-10 animate-fade-in-up" onSubmit={handleSubmit}>
        <h1 className="text-3xl font-bold mb-2 text-gradient">
          Welcome back
        </h1>
        <p className="text-slate-600 mb-8">
          Sign in to your account
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <div className="text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          <button
            type="submit"
            className="btn-gradient w-full disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
            style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </div>
        <p className="text-center mt-6 text-sm text-slate-600">
          Don't have an account?{" "}
          <a
            href="/register"
            className="text-primary-start font-semibold hover:underline"
          >
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}
