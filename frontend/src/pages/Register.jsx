import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "customer" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null); // "success" | "error"

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setMessageType(null);
    try {
      // Send registration with role
      const payload = {
        email: form.email,
        password: form.password,
        name: form.name,
        role: form.role, // Send role to backend
      };
      await API.post("/auth/register", payload);
      setMessage("Account created successfully! Redirecting to login...");
      setMessageType("success");

      // Redirect to login after a brief delay
      setTimeout(() => {
        navigate("/login", { state: { message: "Registration successful! Please sign in." } });
      }, 1500);
    } catch (err) {
      console.error("Registration error:", err);

      let errorMsg = "Registration failed.";
      if (err.response?.data?.detail) {
        errorMsg = Array.isArray(err.response.data.detail)
          ? err.response.data.detail[0]?.msg || "Registration failed."
          : err.response.data.detail;
      } else if (err.message) {
        errorMsg = err.message;
      } else if (err.code === "ECONNREFUSED" || err.code === "ERR_NETWORK") {
        errorMsg = "Cannot connect to server. Is the backend running?";
      }
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex w-full">
      {/* Visual Side (Left) - Hidden on Mobile */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 z-0">
          {/* Different gradient animation for register page */}
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-sky-500/20 rounded-full blur-[120px] animate-hover-float" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[100px] animate-hover-float" style={{ animationDelay: '1.5s' }} />
        </div>

        <div className="relative z-10 max-w-lg text-white space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-200 border border-sky-500/30 text-sm font-medium">
            🚀 Join the network
          </div>
          <h1 className="text-5xl font-bold leading-tight">
            Start your journey <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400">with HelpX today.</span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed">
            Whether you're looking for help or offering your skills, we provide the platform you need to succeed.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-2xl mb-2">🤝</div>
              <h3 className="font-bold">Trusted Community</h3>
              <p className="text-sm text-slate-400">Verified providers and users</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="font-bold">Fast Booking</h3>
              <p className="text-sm text-slate-400">Get help in minutes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Side (Right) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white relative">
        <div className="w-full max-w-md space-y-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900">Create account</h2>
            <p className="mt-2 text-slate-600">Join HelpX to get started</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Role Selection */}
            <div className="p-1 bg-slate-100/80 rounded-2xl flex gap-1 relative">
              <button
                type="button"
                onClick={() => setForm({ ...form, role: "customer" })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${form.role === "customer"
                    ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5"
                    : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, role: "provider" })}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${form.role === "provider"
                    ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5"
                    : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                Provider
              </button>
            </div>

            <p className="text-xs text-center text-slate-500 -mt-2">
              {form.role === "provider"
                ? "Providers can create and manage services"
                : "Customers can book services"}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="reg-name">
                  Full name
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                  </div>
                  <input
                    id="reg-name"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 focus:bg-white transition-all font-medium placeholder:text-slate-400"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="reg-email">
                  Email
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </div>
                  <input
                    id="reg-email"
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 focus:bg-white transition-all font-medium placeholder:text-slate-400"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="reg-password">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  </div>
                  <input
                    id="reg-password"
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

            {message && (
              <div
                className={`flex items-center gap-3 p-4 rounded-xl text-sm animate-slide-in ${messageType === "error"
                  ? "text-red-600 bg-red-50 border border-red-100"
                  : "text-green-600 bg-green-50 border border-green-100"
                  }`}
              >
                {messageType === "error" ? (
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                ) : (
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                )}
                {message}
              </div>
            )}

            <button
              type="submit"
              className="btn-gradient w-full py-4 rounded-xl text-base shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 disabled:opacity-70 disabled:cursor-not-allowed group"
              disabled={loading}
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? "Creating account..." : "Create Account"}
                {!loading && <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>}
              </span>
            </button>
          </form>

          <p className="text-center text-sm text-slate-600">
            Already have an account?{" "}
            <a href="/login" className="font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition-all">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
