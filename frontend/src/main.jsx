import './index.css';
import './custom.css';
import 'leaflet/dist/leaflet.css';

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, NavLink, useNavigate, Link } from "react-router-dom";
import Services from "./pages/Services";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ServiceDetail from "./pages/ServiceDetail";
import CreateService from "./pages/CreateService";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import BookingDetail from "./pages/BookingDetail";
import ProviderProfile from "./pages/ProviderProfile";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuthContext, AuthProvider } from "./context/AuthContext";
import MatchProviders from "./pages/MatchProviders";
import CreateBooking from "./pages/CreateBooking";
import UserBookings from "./pages/UserBookings";
import ProviderBookings from "./pages/ProviderBookings";
import Footer from "./components/Footer";

// --- NAV COMPONENT ---
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
      <header className="sticky top-0 z-50 glass border-b border-white/20 transition-all duration-300" role="banner">
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between gap-5 flex-wrap">
          <div>
            <p className="text-2xl font-bold text-gradient m-0 tracking-tight">HelpX</p>
          </div>
          <nav className="flex gap-2 items-center flex-wrap" aria-label="Primary">
            <div className="px-4 py-2 text-slate-400 text-sm animate-pulse">Loading...</div>
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
    <header className="sticky top-0 z-50 glass border-b border-white/20 transition-all duration-300" role="banner">
      <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between gap-5 flex-wrap">
        <Link to="/" className="group">
          <p className="text-2xl font-bold text-gradient m-0 tracking-tight group-hover:opacity-80 transition-opacity">HelpX</p>
          <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase m-0 -mt-1 hidden sm:block">Local Services</p>
        </Link>

        <nav className="flex gap-3 items-center flex-wrap" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                  ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}

          <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block" />

          {isAuthed ? (
            <button
              onClick={() => {
                auth.logout();
                navigate("/login", { replace: true });
              }}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200
              text-slate-600 hover:bg-red-50 hover:text-red-600 hover:shadow-sm"
            >
              Sign out
            </button>
          ) : (
            <>
              <NavLink
                to="/login"
                className="px-5 py-2 rounded-lg font-medium text-sm transition-all duration-200 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
              >
                Log in
              </NavLink>
              <NavLink
                to="/register"
                className="btn-gradient px-5 py-2 rounded-lg font-semibold text-sm shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30"
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
  return <AppContent />;
}

function AppContent() {
  return (
    <div className="min-h-screen bg-gradient-hero">
      <Nav />
      <main className="max-w-7xl mx-auto px-5 py-8 pb-16 w-full">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/services" element={<Services />} />
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
          <Route path="/booking/:bookingId" element={<BookingDetail />} />
          <Route path="/bookings/:bookingId" element={<BookingDetail />} />
          <Route
            path="/match"
            element={
              <ProtectedRoute allowedRoles={["customer", "user", "provider", "admin"]}>
                <MatchProviders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/book"
            element={
              <ProtectedRoute allowedRoles={["customer", "user", "provider", "admin"]}>
                <CreateBooking />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookings"
            element={
              <ProtectedRoute allowedRoles={["customer", "user", "provider", "admin"]}>
                <UserBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/provider/bookings"
            element={
              <ProtectedRoute allowedRoles={["provider"]}>
                <ProviderBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/profile"
            element={
              <ProtectedRoute allowedRoles={["provider"]}>
                <ProviderProfile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);