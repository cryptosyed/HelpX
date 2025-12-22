import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../hooks/useAuth";
import { showToast } from "../utils/toast";

const statusVariant = (status) => {
  const normalized = (status || "").toLowerCase();
  if (normalized === "pending") return "pending";
  if (normalized === "accepted") return "accepted";
  if (normalized === "rejected" || normalized === "declined") return "danger";
  return "default";
};

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch (e) {
    return value;
  }
};

const renderStatusBadge = (status) => {
  const normalized = (status || "").toLowerCase();
  const base = "px-3 py-1 rounded-full text-xs font-semibold";
  if (normalized === "pending") return <span className={`${base} bg-yellow-100 text-yellow-700`}>Pending</span>;
  if (normalized === "accepted") return <span className={`${base} bg-blue-100 text-blue-700`}>Accepted</span>;
  if (normalized === "completed") return <span className={`${base} bg-green-100 text-green-700`}>Completed</span>;
  if (normalized === "cancelled") return <span className={`${base} bg-red-100 text-red-700`}>Cancelled</span>;
  return <span className={`${base} bg-slate-100 text-slate-600`}>{status || "Unknown"}</span>;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, role, isLoading: authLoading, isAuthenticated } = useAuth();
  const normalizedRole = (role || user?.role || "").toLowerCase();
  const isProvider = normalizedRole === "provider";
  const isAdmin = normalizedRole === "admin";
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [actionErrors, setActionErrors] = useState({});
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Check if user is provider or admin
    if (!isProvider && !isAdmin) {
      showToast("Only providers can access this dashboard.", "error");
      navigate("/");
      return;
    }

    loadData();
  }, [authLoading, isAuthenticated, isProvider, isAdmin, navigate]);

  async function loadData() {
    setPageLoading(true);
    setError(null);
    const servicesPromise = API.get("/services/provider")
      .then((res) => {
        setServices(res.data || []);
      })
      .catch((err) => {
        console.error(err);
        setError((prev) => prev ?? "Failed to load services.");
      });

    const bookingsPromise = API.get("/bookings/provider")
      .then((res) => {
        setBookings(res.data || []);
      })
      .catch((err) => {
        console.error(err);
        setError((prev) => prev ?? "Failed to load bookings.");
      });

    try {
      await Promise.all([servicesPromise, bookingsPromise]);
    } finally {
      setPageLoading(false);
    }
  }

  async function updateBookingStatus(id, status) {
    const previous = bookings;
    setActionErrors((prev) => ({ ...prev, [id]: null }));
    setActionLoading((prev) => ({ ...prev, [id]: status }));
    setBookings((current) => current.map((b) => (b.id === id ? { ...b, status } : b)));
    try {
      const res = await API.put(`/bookings/${id}/status`, { status });
      if (import.meta.env.DEV) {
        console.log("ProviderDashboard: status update", { id, status, response: res.data });
      }
    } catch (err) {
      console.error(err);
      const message = err.response?.data?.detail || "Could not update booking.";
      setActionErrors((prev) => ({ ...prev, [id]: message }));
      setBookings(previous);
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  const pendingBookings = bookings.filter((b) => (b.status || "").toLowerCase() === "pending");
  const activeJobs = bookings.filter((b) => (b.status || "").toLowerCase() === "accepted");
  const completedJobs = bookings.filter((b) => (b.status || "").toLowerCase() === "completed");

  const renderBookingsSection = (title, items, { showActions = false, emptyText = "No items." } = {}) => (
    <section className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl mb-8">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">{title}</h2>
      {items.length === 0 ? (
        <div className="text-slate-600 text-center py-8">{emptyText}</div>
      ) : (
        <div className="space-y-4">
          {items.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              showActions={showActions}
              actionLoading={actionLoading}
              actionErrors={actionErrors}
              onUpdate={updateBookingStatus}
            />
          ))}
        </div>
      )}
    </section>
  );

  if (authLoading) {
    return (
      <div className="glass rounded-xl p-6 text-center text-slate-600">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || (role !== "provider" && role !== "admin")) {
    return (
      <div className="glass rounded-xl p-6 text-center text-slate-600">
        <p>Access denied. Provider account required.</p>
      </div>
    );
  }

  return (
    <div className="page-transition">
      <PageHeader
        title="Provider Dashboard"
        action={
          <button type="button" className="btn-ghost text-sm" onClick={loadData}>
            Refresh
          </button>
        }
      />

      {pageLoading && (
        <div className="glass rounded-xl p-6 text-center text-slate-600 mb-6">
          Loading dashboard…
        </div>
      )}
      {error && (
        <div className="glass rounded-xl p-6 text-center text-red-600 bg-red-50 border border-red-200 mb-6">
          {error}
        </div>
      )}

      {renderBookingsSection("Pending Requests", pendingBookings, {
        showActions: true,
        emptyText: "No pending requests.",
      })}

      {renderBookingsSection("Active Jobs", activeJobs, {
        emptyText: "No active jobs.",
      })}

      {renderBookingsSection("Completed Jobs", completedJobs, {
        emptyText: "No completed jobs.",
      })}

      <section className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl mb-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h2 className="text-2xl font-bold text-slate-800">My Services</h2>
          {isProvider && (
            <Link to="/create" className="btn-gradient text-sm">
              + Create Service
            </Link>
          )}
        </div>
        {services.length === 0 ? (
          <div className="text-slate-600 text-center py-8">No services yet.</div>
        ) : (
          <div className="space-y-4">
            {services.map((svc) => (
              <article key={svc.id} className="glass rounded-xl p-5 border border-slate-200/50 shadow-md">
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{svc.title}</h3>
                    <p className="text-sm text-slate-600 mb-1">
                      {svc.category || "General"} • ₹
                      {svc.price ? Number(svc.price).toLocaleString("en-IN") : "—"}
                    </p>
                    <p className="text-xs text-slate-500">
                      Lat: {svc.lat ?? "n/a"} · Lon: {svc.lon ?? "n/a"}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function BookingCard({ booking, showActions, actionLoading, actionErrors, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const userLabel = booking.user_name || booking.user?.name || (booking.user_id ? `User #${booking.user_id}` : "Customer");
  const location =
    [booking.address?.line1, booking.address?.line2, booking.address?.city, booking.address?.pincode]
      .filter(Boolean)
      .join(", ") ||
    booking.location ||
    booking.address ||
    (booking.lat && booking.lon ? `${booking.lat}, ${booking.lon}` : "—");
  const price =
    booking.price !== undefined && booking.price !== null ? `₹${Number(booking.price).toLocaleString("en-IN")}` : "—";

  return (
    <div className="glass rounded-xl p-5 border border-slate-200/50 shadow-md">
      <header className="flex justify-between items-start gap-4 mb-3">
        <div className="flex-1 space-y-1">
          <strong className="text-lg font-semibold text-slate-800 block">
            {booking.service?.title || "Service"}{" "}
            {booking.provider_id && (
              <Link
                to={`/providers/${booking.provider_id}`}
                className="text-primary-start text-sm font-semibold hover:underline ml-1"
              >
                View provider
              </Link>
            )}
          </strong>
        </div>
        {renderStatusBadge(booking.status)}
      </header>
      <button
        type="button"
        className="text-sm text-primary-start hover:underline"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "Hide details" : "View details"}
      </button>
      {expanded && (
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <div>
            <strong>Customer:</strong> {userLabel}
          </div>
          <div>
            <strong>Address:</strong> {location}
          </div>
          <div>
            <strong>When:</strong> {formatDateTime(booking.scheduled_at)}
          </div>
          <div>
            <strong>Price:</strong> {price}
          </div>
          {booking.notes && (
            <div>
              <strong>Notes:</strong> {booking.notes}
            </div>
          )}
        </div>
      )}
      {showActions && (
        <div className="flex flex-col gap-2 mt-4">
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-gradient text-sm disabled:opacity-60"
              onClick={() => onUpdate(booking.id, "accepted")}
              disabled={Boolean(actionLoading[booking.id])}
            >
              {actionLoading[booking.id] === "accepted" ? "Accepting..." : "Accept"}
            </button>
            <button
              type="button"
              className="btn-ghost text-sm disabled:opacity-60"
              onClick={() => onUpdate(booking.id, "rejected")}
              disabled={Boolean(actionLoading[booking.id])}
            >
              {actionLoading[booking.id] === "rejected" ? "Rejecting..." : "Reject"}
            </button>
          </div>
          {actionErrors[booking.id] && <div className="text-xs text-red-600">{actionErrors[booking.id]}</div>}
        </div>
      )}
    </div>
  );
}
