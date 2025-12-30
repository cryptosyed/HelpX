import React, { useEffect, useMemo, useState } from "react";
import {
  getProviderBookings,
  acceptBooking,
  cancelBookingProvider,
  completeBooking,
} from "../api/endpoints";
import { showToast } from "../utils/toast";

type Booking = {
  id: number;
  service_title?: string | null;
  user_name?: string | null;
  scheduled_at: string;
  status: string;
};

const statusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s === "pending") return "bg-amber-100 text-amber-800";
  if (s === "accepted") return "bg-blue-100 text-blue-800";
  if (s === "completed") return "bg-emerald-100 text-emerald-800";
  if (s === "cancelled") return "bg-gray-100 text-gray-700";
  if (s === "rejected") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-800";
};

const ProviderBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getProviderBookings();
        setBookings(res || []);
      } catch (err: any) {
        const detail = err?.response?.data?.detail || err?.message || "Failed to load bookings.";
        setError(detail);
        showToast(detail, "error");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const grouped = useMemo(() => {
    const byStatus: Record<string, Booking[]> = {
      pending: [],
      accepted: [],
      completed: [],
      cancelled: [],
      rejected: [],
    };
    for (const b of bookings) {
      const key = (b.status || "").toLowerCase();
      if (!byStatus[key]) byStatus[key] = [];
      byStatus[key].push(b);
    }
    return byStatus;
  }, [bookings]);

  const handleAccept = async (id: number) => {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await acceptBooking(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: res.status } : b)));
      showToast("Booking accepted.", "success");
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Could not accept booking.";
      setActionError(detail);
      showToast(detail, "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleCancel = async (id: number) => {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await cancelBookingProvider(id, undefined);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: res.status } : b)));
      showToast("Booking cancelled.", "success");
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Could not cancel booking.";
      setActionError(detail);
      showToast(detail, "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleComplete = async (id: number) => {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await completeBooking(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: res.status } : b)));
      showToast("Booking completed.", "success");
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Could not complete booking.";
      setActionError(detail);
      showToast(detail, "error");
    } finally {
      setBusyId(null);
    }
  };

  const renderList = (items: Booking[], title: string) => (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {items.length === 0 && <div className="text-sm text-slate-500">No bookings.</div>}
      {items.map((b) => {
        const s = (b.status || "").toLowerCase();
        return (
          <div
            key={b.id}
            className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="text-sm text-slate-600">Service</div>
              <div className="text-lg font-semibold text-slate-900">
                {b.service_title || "Service"}
              </div>
              <div className="text-sm text-slate-600">
                Customer: {b.user_name || "Customer"}
              </div>
              <div className="text-sm text-slate-600">
                When: {b.scheduled_at ? new Date(b.scheduled_at).toLocaleString() : "—"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor(b.status)}`}>
                {b.status}
              </span>
              {s === "pending" && (
                <button
                  disabled={busyId === b.id}
                  onClick={() => handleAccept(b.id)}
                  className="rounded-lg bg-blue-600 text-white px-3 py-2 text-sm hover:bg-blue-700 transition disabled:opacity-60"
                >
                  {busyId === b.id ? "Working…" : "Accept"}
                </button>
              )}
              {s === "accepted" && (
                <>
                  <button
                    disabled={busyId === b.id}
                    onClick={() => handleComplete(b.id)}
                    className="rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm hover:bg-emerald-700 transition disabled:opacity-60"
                  >
                    {busyId === b.id ? "Working…" : "Complete"}
                  </button>
                  <button
                    disabled={busyId === b.id}
                    onClick={() => handleCancel(b.id)}
                    className="rounded-lg border border-red-200 text-red-700 px-3 py-2 text-sm hover:bg-red-50 transition disabled:opacity-60"
                  >
                    {busyId === b.id ? "Working…" : "Cancel"}
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="page-transition max-w-5xl mx-auto py-6 px-4 space-y-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Provider Bookings</h1>
        <p className="text-slate-600 text-sm">
          Manage incoming and active jobs. Only allowed actions are shown per status.
        </p>
      </div>

      {loading && (
        <div className="text-slate-600 text-sm flex items-center gap-2">
          <span className="h-4 w-4 border-2 border-slate-300 border-t-primary-start rounded-full animate-spin" />
          Loading bookings…
        </div>
      )}
      {error && !loading && <div className="text-red-600 text-sm">{error}</div>}
      {actionError && <div className="text-red-600 text-sm">{actionError}</div>}

      {!loading && (
        <div className="space-y-6">
          {renderList(grouped.pending || [], "Pending")}
          {renderList(grouped.accepted || [], "Accepted")}
          {renderList(grouped.completed || [], "Completed")}
          {renderList(grouped.cancelled || [], "Cancelled")}
          {renderList(grouped.rejected || [], "Rejected")}
        </div>
      )}
    </div>
  );
};

export default ProviderBookings;

