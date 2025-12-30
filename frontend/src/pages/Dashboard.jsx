import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api";
import PageHeader from "../components/PageHeader";
import { useAuthContext } from "../context/AuthContext";
import { showToast } from "../utils/toast";
// import { loadProviderProfile } from "./ProviderProfile";

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
  const { user, role, isLoading: authLoading, isAuthenticated } = useAuthContext();
  const normalizedRole = (role || user?.role || "").toLowerCase();
  const isProvider = normalizedRole === "provider";
  const isAdmin = normalizedRole === "admin";
  // const cachedProfile = loadProviderProfile ? loadProviderProfile() : null;
  // const profileIncomplete = isProvider && (!cachedProfile || !cachedProfile.phone);
  const profileIncomplete = isProvider;
  const [providerServices, setProviderServices] = useState([]);
  const [globalServices, setGlobalServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [actionErrors, setActionErrors] = useState({});
  const [serviceActionLoading, setServiceActionLoading] = useState({});
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
    const servicesPromise = API.get("/provider/services")
      .then((res) => {
        setProviderServices(res.data || []);
      })
      .catch((err) => {
        console.error(err);
        setError((prev) => prev ?? "Failed to load services.");
      });

    const globalPromise = API.get("/services/global")
      .then((res) => setGlobalServices(res.data || []))
      .catch((err) => console.error(err));

    const bookingsPromise = API.get("/bookings/provider")
      .then((res) => {
        setBookings(res.data || []);
      })
      .catch((err) => {
        console.error(err);
        setError((prev) => prev ?? "Failed to load bookings.");
      });

    try {
      await Promise.all([servicesPromise, bookingsPromise, globalPromise]);
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
  const incomingRequests = pendingBookings.filter((b) => !b.provider_id);
  const assignedPending = pendingBookings.filter((b) => !!b.provider_id);

  const globalById = globalServices.reduce((acc, g) => {
    acc[g.id] = g;
    return acc;
  }, {});

  const toggleProviderService = async (id, current) => {
    setServiceActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await API.put(`/provider/services/${id}`, { is_active: !current });
      setProviderServices((prev) =>
        prev.map((svc) => (svc.id === id ? { ...svc, is_active: !current } : svc))
      );
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.detail || "Could not update service.", "error");
    } finally {
      setServiceActionLoading((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

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
          <div className="flex gap-2">
            <Link to="/dashboard/profile" className="btn-ghost text-sm">
              Profile
            </Link>
            <button type="button" className="btn-ghost text-sm" onClick={loadData}>
              Refresh
            </button>
          </div>
        }
      />
      {/* {profileIncomplete && (
        <div className="glass rounded-xl p-4 border border-amber-200 bg-amber-50 text-amber-800 mb-4">
          Complete your profile to receive bookings. <Link className="underline font-semibold" to="/dashboard/profile">Update profile</Link>
        </div>
      )} */}

      {pageLoading && (
        <div className="glass rounded-xl p-6 text-center text-slate-600 mb-6">
          Loading dashboard…
        </div>
      )}
      {error && (
        <div className="glass rounded-xl p-6 text-center text-red-600 bg-red-50 border border-red-200 mb-6">
          <div className="mb-3">{error}</div>
          <button className="btn-ghost text-sm" onClick={loadData}>
            Retry
          </button>
        </div>
      )}

      {/* Incoming Requests (unassigned) */}
      <TaskSection
        title="Incoming Requests"
        emptyText="No nearby requests right now."
        bookings={incomingRequests}
        showActions
        actionLoading={actionLoading}
        actionErrors={actionErrors}
        onAccept={(b) => updateBookingStatus(b.id, "accepted")}
        onReject={(b) => updateBookingStatus(b.id, "rejected")}
      />

      {/* Active Jobs (accepted) */}
      <TaskSection
        title="Active Jobs"
        emptyText="No active jobs."
        bookings={activeJobs}
        showActions={false}
      />

      {/* Completed Jobs */}
      <TaskSection
        title="Completed Jobs"
        emptyText="No completed jobs."
        bookings={completedJobs}
        showActions={false}
      />

      <section className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl mb-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h2 className="text-2xl font-bold text-slate-800">My Services</h2>
          {isProvider && (
            <Link to="/create" className="btn-gradient text-sm">
              + Offer a Service
            </Link>
          )}
        </div>
        {providerServices.length === 0 ? (
          <div className="text-slate-600 text-center py-8">No services yet.</div>
        ) : (
          <div className="space-y-4">
            {providerServices.map((svc) => {
              const global = globalById[svc.service_id];
              return (
                <article key={svc.id} className="glass rounded-xl p-5 border border-slate-200/50 shadow-md">
                  <div className="flex justify-between items-start gap-4 flex-wrap">
                    <div className="flex-1 space-y-1">
                      <h3 className="text-xl font-bold text-slate-800 mb-1">{global?.title || "Service"}</h3>
                      <p className="text-sm text-slate-600">Price: ₹{svc.price ? Number(svc.price).toLocaleString("en-IN") : "—"}</p>
                      <p className="text-sm text-slate-600">Radius: {svc.service_radius_km ?? "—"} km</p>
                      <p className="text-sm text-slate-600">Experience: {svc.experience_years ?? "—"} yrs</p>
                      <p className="text-xs text-slate-500">Global category: {global?.category || "—"}</p>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${svc.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                          }`}
                      >
                        {svc.is_active ? "Active" : "Inactive"}
                      </span>
                      <button
                        type="button"
                        className="btn-ghost text-sm"
                        onClick={() => toggleProviderService(svc.id, svc.is_active)}
                        disabled={Boolean(serviceActionLoading[svc.id])}
                      >
                        {serviceActionLoading[svc.id]
                          ? "Updating..."
                          : svc.is_active
                            ? "Deactivate"
                            : "Activate"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function TaskSection({
  title,
  bookings,
  emptyText,
  showActions = false,
  onAccept,
  onReject,
  actionLoading = {},
  actionErrors = {},
}) {
  return (
    <section className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl mb-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      </div>
      {bookings.length === 0 ? (
        <div className="text-slate-600 text-center py-8">{emptyText}</div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              showActions={showActions}
              actionLoading={actionLoading}
              actionErrors={actionErrors}
              onAccept={onAccept}
              onReject={onReject}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function BookingCard({ booking, showActions, actionLoading, actionErrors, onAccept, onReject }) {
  const [expanded, setExpanded] = useState(false);
  const userLabel = booking.user_name || booking.user?.name || (booking.user_id ? `User #${booking.user_id}` : "Customer");
  const location =
    booking.user_address ||
    [booking.address?.line1, booking.address?.line2, booking.address?.city, booking.address?.pincode]
      .filter(Boolean)
      .join(", ") ||
    booking.location ||
    (booking.lat && booking.lon ? `${booking.lat}, ${booking.lon}` : "—");
  const price =
    booking.price !== undefined && booking.price !== null ? `₹${Number(booking.price).toLocaleString("en-IN")}` : "—";

  return (
    <div className="glass rounded-xl p-5 border border-slate-200/50 shadow-md">
      <header className="flex justify-between items-start gap-4 mb-3">
        <div className="flex-1 space-y-1">
          <strong className="text-lg font-semibold text-slate-800 block">
            {booking.service_title || booking.service?.title || "Service"}
          </strong>
          {booking.notes && (
            <p className="text-sm text-slate-600 line-clamp-2">
              <strong>Notes:</strong> {booking.notes}
            </p>
          )}
        </div>
        {renderStatusBadge(booking.status)}
      </header>
      <div className="mt-2 space-y-2 text-sm text-slate-700">
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
      </div>
      {showActions && (
        <div className="flex flex-col gap-2 mt-4">
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-gradient text-sm disabled:opacity-60"
              onClick={() => onAccept?.(booking)}
              disabled={Boolean(actionLoading[booking.id])}
            >
              {actionLoading[booking.id] === "accepted" ? "Accepting..." : "Accept"}
            </button>
            <button
              type="button"
              className="btn-ghost text-sm disabled:opacity-60"
              onClick={() => onReject?.(booking)}
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
