import './index.css';
import './custom.css';
import 'leaflet/dist/leaflet.css';

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from "react-router-dom";
import Services from "./pages/Services";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ServiceDetail from "./pages/ServiceDetail";
import CreateService from "./pages/CreateService";
import Dashboard from "./pages/Dashboard";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuthContext } from "./contexts/AuthContext";
import { AuthProvider } from "./contexts/AuthContext";

function Nav() {
  const auth = useAuthContext();
  const navigate = useNavigate();

  const normalizeRole = (role) => {
    const r = (role || "").toLowerCase();
    return r === "customer" ? "user" : r;
  };

  const role = normalizeRole(auth.role);
  const isAuthed = auth.isAuthenticated;

  // Show loading state briefly to avoid flicker (only on initial load)
  if (auth.isLoading && !auth.user) {
    return (
      <header className="sticky top-0 z-50 glass-strong border-b border-slate-200/50 shadow-sm" role="banner">
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between gap-5 flex-wrap">
          <div>
            <p className="text-2xl font-bold text-gradient m-0">HelpX</p>
            <p className="text-xs text-slate-500 m-0 mt-0.5">Local services marketplace MVP</p>
          </div>
          <nav className="flex gap-2 items-center flex-wrap" aria-label="Primary">
            <div className="px-4 py-2 text-slate-400 text-sm">Loading...</div>
          </nav>
        </div>
      </header>
    );
  }

  const links = [
    { to: "/", label: "Home", end: true, show: true },
    { to: "/user/dashboard", label: "My Bookings", show: role === "user" },
    { to: "/dashboard", label: "Dashboard", show: role === "provider" },
    { to: "/admin", label: "Admin", show: role === "admin" },
  ].filter((link) => link.show);

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-slate-200/50 shadow-sm" role="banner">
      <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between gap-5 flex-wrap">
        <div>
          <p className="text-2xl font-bold text-gradient m-0">HelpX</p>
          <p className="text-xs text-slate-500 m-0 mt-0.5">Local services marketplace MVP</p>
        </div>
        <nav className="flex gap-2 items-center flex-wrap" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `px-4 py-2 h-10 rounded-lg font-medium text-sm transition-colors duration-150
                border border-slate-200 bg-white text-slate-800 shadow-sm
                hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-start
                ${isActive ? "ring-1 ring-primary-start/50" : ""}`
              }
            >
              {link.label}
            </NavLink>
          ))}
          {isAuthed ? (
            <button
              onClick={() => {
                auth.logout();
                navigate("/login", { replace: true });
              }}
              className="px-4 py-2 h-10 rounded-lg font-medium text-sm transition-colors duration-150
              border border-slate-200 bg-white text-slate-800 shadow-sm
              hover:bg-red-50 hover:text-red-600 active:bg-red-100
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-400"
            >
              Sign out
            </button>
          ) : (
            <>
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `px-4 py-2 h-10 rounded-lg font-medium text-sm transition-colors duration-150
                border border-slate-200 bg-white text-slate-800 shadow-sm
                hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-start
                ${isActive ? "ring-1 ring-primary-start/50" : ""}`
              }
            >
              Login
            </NavLink>
            <NavLink
              to="/register"
              className={({ isActive }) =>
                `px-4 py-2 h-10 rounded-lg font-semibold text-sm transition-colors duration-150
                bg-indigo-600 text-white shadow-sm
                hover:bg-indigo-500 active:bg-indigo-700
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-400
                ${isActive ? "ring-2 ring-offset-2 ring-indigo-400" : ""}`
              }
            >
              Register
            </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

// --- SINGLE App component (only one) ---
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <Nav />
      <main className="max-w-7xl mx-auto px-5 py-8 pb-16 w-full">
        <Routes>
          <Route path="/" element={<Services />} />
          <Route
            path="/create"
            element={
              <ProtectedRoute allowedRoles={["provider"]}>
                <CreateService />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["provider"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/dashboard"
            element={
              <ProtectedRoute allowedRoles={["customer", "user", "provider", "admin"]}>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/service/:id" element={<ServiceDetail />} />
        </Routes>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);