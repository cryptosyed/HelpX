import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import PageHeader from "../components/PageHeader";
import StatsCard from "../components/StatsCard";
import Badge from "../components/Badge";
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

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "",
  price: "",
  lat: "",
  lon: "",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, role, isLoading: authLoading, isAuthenticated } = useAuth();
  const normalizedRole = (role || user?.role || "").toLowerCase();
  const isProvider = normalizedRole === "provider";
  const isAdmin = normalizedRole === "admin";
  const [activeTab, setActiveTab] = useState("services");
  const [bookingTab, setBookingTab] = useState("pending");
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [actioningId, setActioningId] = useState(null);
  const [earningsSummary, setEarningsSummary] = useState({
    total_earnings: 0,
    total_bookings: 0,
    monthly: [],
  });
  const [providerId, setProviderId] = useState(null);
  const [ratingSummary, setRatingSummary] = useState(null);
  const [calendar, setCalendar] = useState([]);
  const [payoutSettings, setPayoutSettings] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [payoutForm, setPayoutForm] = useState({
    upi_id: "",
    bank_acc_no: "",
    bank_ifsc: "",
  });
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
    try {
      const [svcRes, bookingRes, earningsRes, calendarRes, payoutRes] = await Promise.all([
        API.get("/services/provider/"),
        API.get("/bookings/provider/"),
        API.get("/providers/earnings").catch(() => ({ data: { total_earnings: 0, total_bookings: 0, monthly: [] } })),
        API.get("/provider/calendar").catch(() => ({ data: [] })),
        API.get("/provider/payout").catch(() => ({ data: null })),
      ]);
      setServices(svcRes.data || []);
      setBookings(bookingRes.data || []);
      setEarningsSummary(earningsRes.data || { total_earnings: 0, total_bookings: 0, monthly: [] });
      setCalendar(calendarRes.data || []);
      setPayoutSettings(payoutRes.data);
      if (payoutRes.data) {
        setPayoutForm({
          upi_id: payoutRes.data.upi_id || "",
          bank_acc_no: payoutRes.data.bank_acc_no || "",
          bank_ifsc: payoutRes.data.bank_ifsc || "",
        });
      }

      // Derive provider ID (from services first, fallback to bookings) to fetch rating summary
      const derivedProviderId =
        (svcRes.data && svcRes.data.length > 0 && svcRes.data[0].provider_id) ||
        (bookingRes.data && bookingRes.data.length > 0 && bookingRes.data[0].provider_id) ||
        null;
      setProviderId(derivedProviderId);

      if (derivedProviderId) {
        loadRatingSummary(derivedProviderId);
      } else {
        setRatingSummary(null);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard data.");
    } finally {
      setPageLoading(false);
    }
  }

  function startEdit(service) {
    setEditingId(service.id);
    setForm({
      title: service.title || "",
      description: service.description || "",
      category: service.category || "",
      price: service.price ?? "",
      lat: service.lat ?? "",
      lon: service.lon ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function saveEdit(id) {
    if (!form.title.trim()) {
      alert("Title is required");
      return;
    }
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description,
        category: form.category,
        price: form.price !== "" ? Number(form.price) : null,
        lat: form.lat !== "" ? Number(form.lat) : null,
        lon: form.lon !== "" ? Number(form.lon) : null,
      };
      await API.put(`/services/${id}/`, payload);
      cancelEdit();
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to update service");
    }
  }

  async function deleteService(id) {
    if (!window.confirm("Delete this service?")) return;
    try {
      await API.delete(`/services/${id}/`);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  }

  async function updateBookingStatus(id, status) {
    const prev = bookings;
    setActioningId(id);
    setBookings((current) =>
      current.map((b) => (b.id === id ? { ...b, status } : b))
    );
    try {
      const res = await API.put(`/bookings/${id}/status`, { status });
      if (import.meta.env.DEV) {
        console.log("ProviderDashboard: status update", { id, status, response: res.data });
      }
    } catch (err) {
      console.error(err);
      alert("Could not update booking.");
      setBookings(prev);
    } finally {
      setActioningId(null);
    }
  }

  async function updatePayoutSettings() {
    try {
      await API.put("/provider/payout", payoutForm);
      alert("Payout settings updated!");
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to update payout settings");
    }
  }

  async function loadRatingSummary(pid) {
    try {
      const res = await API.get(`/providers/${pid}/rating-summary`);
      setRatingSummary(res.data || null);
    } catch (err) {
      console.error("Failed to load rating summary", err);
      setRatingSummary(null);
    }
  }

  const stats = useMemo(() => {
    const total = services.length;
    const avgPrice =
      total === 0
        ? 0
        : services.reduce(
          (sum, s) => sum + (s.price ? Number(s.price) : 0),
          0
        ) / total;
    const pending = bookings.filter((b) => (b.status || "").toLowerCase() === "pending").length;
    return { total, avgPrice, pending };
  }, [services, bookings]);

  const pendingBookings = bookings.filter((b) => (b.status || "").toLowerCase() === "pending");
  const acceptedBookings = bookings.filter((b) => (b.status || "").toLowerCase() === "accepted");
  const rejectedBookings = bookings.filter((b) => (b.status || "").toLowerCase() === "rejected");

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

  const tabs = [
    { id: "services", label: "Services" },
    { id: "bookings", label: "Bookings" },
    { id: "earnings", label: "Earnings" },
    { id: "calendar", label: "Calendar" },
    { id: "payout", label: "Payout Settings" },
  ];

  const earningsChartData = (earningsSummary.monthly || []).map((e) => ({
    name: e.month,
    value: e.amount,
  }));

  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const thisMonth = (earningsSummary.monthly || []).find((m) => m.month === thisMonthKey);
  const thisMonthEarnings = thisMonth ? thisMonth.amount : 0;

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

      {isProvider && (
        <div className="mb-4 text-slate-700">
          {ratingSummary && ratingSummary.avg_rating != null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-lg leading-none">⭐ {Number(ratingSummary.avg_rating).toFixed(1)}</span>
              <span className="text-sm text-slate-500">
                ({ratingSummary.total_reviews} jobs completed)
              </span>
            </div>
          ) : (
            <div className="text-sm text-slate-500">No ratings yet</div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium text-sm transition-all ${activeTab === tab.id
              ? "text-primary-start border-b-2 border-primary-start"
              : "text-slate-600 hover:text-slate-800"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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

      {/* Stats Cards */}
      {activeTab === "services" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass rounded-xl p-6 border border-slate-200/50 shadow-md">
            <h4 className="text-sm font-semibold text-slate-600 mb-2">Total services</h4>
            <strong className="text-3xl font-bold text-gradient">{stats.total}</strong>
          </div>
          <div className="glass rounded-xl p-6 border border-slate-200/50 shadow-md">
            <h4 className="text-sm font-semibold text-slate-600 mb-2">Average price</h4>
            <strong className="text-3xl font-bold text-gradient">
              ₹{Number(stats.avgPrice || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </strong>
          </div>
          <div className="glass rounded-xl p-6 border border-slate-200/50 shadow-md">
            <h4 className="text-sm font-semibold text-slate-600 mb-2">Pending bookings</h4>
            <strong className="text-3xl font-bold text-gradient">{stats.pending}</strong>
          </div>
        </div>
      )}

      {/* Services Tab */}
      {activeTab === "services" && (
        <section className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">My services</h2>
          {services.length === 0 && (
            <div className="text-slate-600 text-center py-8">No services yet. Create one from the Services page.</div>
          )}
          <div className="space-y-4">
            {services.map((svc) => (
              <article key={svc.id} className="glass rounded-xl p-5 border border-slate-200/50 shadow-md">
                {editingId === svc.id ? (
                  <div className="space-y-4">
                    <input
                      className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Title"
                    />
                    <textarea
                      className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all min-h-[100px] resize-y"
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      placeholder="Description"
                    />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <input
                        className="px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
                        value={form.category}
                        onChange={(e) =>
                          setForm({ ...form, category: e.target.value })
                        }
                        placeholder="Category"
                      />
                      <input
                        className="px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
                        type="number"
                        min="0"
                        value={form.price}
                        onChange={(e) =>
                          setForm({ ...form, price: e.target.value })
                        }
                        placeholder="Price"
                      />
                      <input
                        className="px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
                        value={form.lat}
                        onChange={(e) =>
                          setForm({ ...form, lat: e.target.value })
                        }
                        placeholder="Latitude"
                      />
                      <input
                        className="px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
                        value={form.lon}
                        onChange={(e) =>
                          setForm({ ...form, lon: e.target.value })
                        }
                        placeholder="Longitude"
                      />
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        type="button"
                        className="btn-gradient text-sm"
                        onClick={() => saveEdit(svc.id)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn-ghost text-sm"
                        onClick={cancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
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
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-ghost text-sm"
                        onClick={() => startEdit(svc)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-red-600 bg-red-50 border-2 border-red-200 hover:bg-red-100 transition-all"
                        onClick={() => deleteService(svc.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Bookings Tab */}
      {activeTab === "bookings" &&
        (() => {
          const bookingsByTab = {
            pending: pendingBookings,
            accepted: acceptedBookings,
            rejected: rejectedBookings,
          };
          const current = bookingsByTab[bookingTab] || [];
          return (
            <section className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl mb-8">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
                <h2 className="text-2xl font-bold text-slate-800">Bookings</h2>
                <div className="flex gap-2">
                  {["pending", "accepted", "rejected"].map((id) => (
                    <button
                      key={id}
                      onClick={() => setBookingTab(id)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${bookingTab === id
                        ? "bg-gradient-primary text-white shadow"
                        : "bg-white border border-slate-200 text-slate-700 hover:border-primary-start"
                        }`}
                    >
                      {id.charAt(0).toUpperCase() + id.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {current.length === 0 ? (
                <div className="text-slate-600 text-center py-8">
                  {bookingTab === "pending"
                    ? "No pending bookings."
                    : bookingTab === "accepted"
                      ? "No accepted bookings."
                      : "No rejected bookings."}
                </div>
              ) : (
                <div className="space-y-4">
                  {current.map((booking) => {
                    const normalizedStatus = (booking.status || "").toLowerCase();
                    const isPending = normalizedStatus === "pending";
                    return (
                      <div key={booking.id} className="glass rounded-xl p-5 border border-slate-200/50 shadow-md">
                        <header className="flex justify-between items-start gap-4 mb-3">
                          <div className="flex-1">
                            <strong className="text-lg font-semibold text-slate-800 block mb-1">
                              {booking.service?.title || "Service"}
                            </strong>
                            <div className="text-sm text-slate-600">
                              <strong>When:</strong> {formatDateTime(booking.scheduled_at)}
                            </div>
                            <div className="text-sm text-slate-600">
                              <strong>User ID:</strong> #{booking.user_id}
                            </div>
                          </div>
                          <Badge variant={statusVariant(booking.status)}>{booking.status}</Badge>
                        </header>
                        {booking.notes && (
                          <p className="text-sm text-slate-600 mb-3">
                            <strong>Notes:</strong> {booking.notes}
                          </p>
                        )}
                        {isPending && (
                          <div className="flex gap-2 mt-4">
                            <button
                              type="button"
                              className="btn-gradient text-sm"
                              onClick={() => updateBookingStatus(booking.id, "accepted")}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="btn-ghost text-sm"
                              onClick={() => updateBookingStatus(booking.id, "rejected")}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })()}

      {/* Earnings Tab */}
      {activeTab === "earnings" && (
        <section className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Earnings Overview</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatsCard title="Total Earnings" value={`₹${Number(earningsSummary.total_earnings || 0).toLocaleString("en-IN")}`} icon="💰" />
            <StatsCard title="This Month" value={`₹${Number(thisMonthEarnings || 0).toLocaleString("en-IN")}`} icon="📆" />
            <StatsCard title="Completed Bookings" value={earningsSummary.booking_count || 0} icon="✅" />
          </div>

          {(earningsSummary.monthly || []).length === 0 ? (
            <div className="text-slate-600 text-center py-8">No earnings data available</div>
          ) : (
            <>
              <div className="mb-6 h-80">
                <BarChartComponent data={earningsChartData} dataKey="value" nameKey="name" />
              </div>
              <div className="space-y-3">
                {earningsSummary.monthly.map((e) => (
                  <div
                    key={e.month}
                    className="flex justify-between items-center p-4 bg-slate-50 rounded-lg"
                  >
                    <span className="font-semibold text-slate-800">{e.month}</span>
                    <div className="text-right">
                      <div className="font-bold text-gradient">₹{Number(e.amount || 0).toLocaleString("en-IN")}</div>
                      <div className="text-sm text-slate-600">Accepted bookings only</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Calendar Tab */}
      {activeTab === "calendar" && (
        <section className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Booking Calendar</h2>
          {calendar.length === 0 ? (
            <div className="text-slate-600 text-center py-8">No upcoming bookings</div>
          ) : (
            <div className="space-y-4">
              {calendar.map((event) => (
                <div
                  key={event.id}
                  className="glass rounded-xl p-5 border border-slate-200/50 shadow-md"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">
                        {event.service_title}
                      </h3>
                      <p className="text-sm text-slate-600 mb-1">
                        <strong>When:</strong> {event.scheduled_at ? new Date(event.scheduled_at).toLocaleString() : "—"}
                      </p>
                      {event.user_name && (
                        <p className="text-sm text-slate-600 mb-1">
                          <strong>Customer:</strong> {event.user_name}
                        </p>
                      )}
                      {event.notes && (
                        <p className="text-sm text-slate-600 mb-2">
                          <strong>Notes:</strong> {event.notes}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${event.status === "accepted" ? "bg-green-100 text-green-700" :
                      event.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                      {event.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Payout Settings Tab */}
      {activeTab === "payout" && (
        <section className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Payout Settings</h2>
          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                UPI ID
              </label>
              <input
                className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
                value={payoutForm.upi_id}
                onChange={(e) =>
                  setPayoutForm({ ...payoutForm, upi_id: e.target.value })
                }
                placeholder="yourname@upi"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                Bank Account Number
              </label>
              <input
                className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
                value={payoutForm.bank_acc_no}
                onChange={(e) =>
                  setPayoutForm({ ...payoutForm, bank_acc_no: e.target.value })
                }
                placeholder="Account number"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                IFSC Code
              </label>
              <input
                className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
                value={payoutForm.bank_ifsc}
                onChange={(e) =>
                  setPayoutForm({ ...payoutForm, bank_ifsc: e.target.value })
                }
                placeholder="IFSC code"
              />
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={updatePayoutSettings} className="btn-gradient">
                Save Settings
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
