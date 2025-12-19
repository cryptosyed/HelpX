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
    <div className="min-h-screen flex items-center justify-center px-5 py-10 relative bg-gradient-hero">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-primary-start/10 rounded-full blur-3xl animate-hover-float"></div>
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-accent-purple/10 rounded-full blur-3xl animate-hover-float" style={{ animationDelay: '1s' }}></div>
      </div>
      <form className="glass-strong rounded-2xl p-8 w-full max-w-md shadow-2xl border border-slate-200/50 relative z-10 animate-fade-in-up" onSubmit={handleSubmit}>
        <h1 className="text-3xl font-bold mb-2 text-gradient">
          Create account
        </h1>
        <p className="text-slate-600 mb-8">
          Join HelpX to get started
        </p>

        <div className="space-y-6">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-semibold mb-3 text-slate-700">
              Sign up as
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, role: "customer" })}
                className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all ${form.role === "customer"
                  ? "bg-gradient-primary text-white shadow-md"
                  : "bg-white border-2 border-slate-200 text-slate-700 hover:border-primary-start"
                  }`}
              >
                Sign up as Customer
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, role: "provider" })}
                className={`flex-1 px-4 py-3 rounded-lg font-medium text-sm transition-all ${form.role === "provider"
                  ? "bg-gradient-primary text-white shadow-md"
                  : "bg-white border-2 border-slate-200 text-slate-700 hover:border-primary-start"
                  }`}
              >
                Sign up as Provider
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {form.role === "provider"
                ? "Providers can create and manage services"
                : "Customers can book services"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="reg-name">
              Full name
            </label>
            <input
              id="reg-name"
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="reg-email">
              Email
            </label>
            <input
              id="reg-email"
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="reg-password">
              Password
            </label>
            <input
              id="reg-password"
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              required
            />
          </div>
          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${messageType === "error"
                ? "text-red-600 bg-red-50 border border-red-200"
                : "text-green-600 bg-green-50 border border-green-200"
                }`}
            >
              {message}
            </div>
          )}
          <button
            type="submit"
            className="btn-gradient w-full disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
            style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff' }}
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </div>
        <p className="text-center mt-6 text-sm text-slate-600">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-primary-start font-semibold hover:underline"
          >
            Sign in
          </a>
        </p>
      </form>
    </div>
  );
}
