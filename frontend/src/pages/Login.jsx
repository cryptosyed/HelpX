import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api";
import { useAuthContext } from "../context/AuthContext";

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
    <div className="min-h-screen flex w-full">
      {/* Visual Side (Left) - Hidden on Mobile */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/20 rounded-full blur-[120px] animate-hover-float" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] animate-hover-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 max-w-lg text-white space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 text-sm font-medium">
            ✨ New way to find help
          </div>
          <h1 className="text-5xl font-bold leading-tight">
            Professional services, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">simplified.</span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            Join thousands of users who trust HelpX for their home service needs. From cleaning to repairs, we've got you covered.
          </p>

          <div className="pt-8">
            <div className="flex -space-x-4 mb-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-12 h-12 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                  User
                </div>
              ))}
              <div className="w-12 h-12 rounded-full border-2 border-slate-900 bg-indigo-600 flex items-center justify-center text-xs font-bold">
                +2k
              </div>
            </div>
            <p className="text-slate-400 text-sm font-medium">Join 2,000+ verified users today</p>
          </div>
        </div>
      </div>

      {/* Form Side (Right) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white relative">
        <div className="w-full max-w-md space-y-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900">Welcome back</h2>
            <p className="mt-2 text-slate-600">Please enter your details to sign in.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="login-email">
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </div>
                  <input
                    id="login-email"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 focus:bg-white transition-all font-medium placeholder:text-slate-400"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="login-password">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  </div>
                  <input
                    id="login-password"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 focus:bg-white transition-all font-medium placeholder:text-slate-400"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl text-sm text-red-600 bg-red-50 border border-red-100 animate-slide-in">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-gradient w-full py-4 rounded-xl text-base shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 disabled:opacity-70 disabled:cursor-not-allowed group"
              disabled={loading}
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? "Signing in..." : "Sign in to Account"}
                {!loading && <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>}
              </span>
            </button>
          </form>

          <p className="text-center text-sm text-slate-600">
            Don't have an account?{" "}
            <a href="/register" className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition-all">
              Create an account
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
