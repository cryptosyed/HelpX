import React, { useEffect, useMemo, useState } from "react";
import { getUserBookings, cancelBookingUser } from "../api/endpoints";
import { showToast } from "../utils/toast";

type Booking = {
  id: number;
  service_title?: string | null;
  provider_id?: number | null;
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

const UserBookings: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getUserBookings();
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

  const pendingIds = useMemo(
    () => new Set(bookings.filter((b) => (b.status || "").toLowerCase() === "pending").map((b) => b.id)),
    [bookings]
  );

  const startCancel = (id: number) => {
    setCancelId(id);
    setReason("");
  };

  const submitCancel = async () => {
    if (!cancelId) return;
    setSaving(true);
    try {
      await cancelBookingUser(cancelId, reason || undefined);
      setBookings((prev) => prev.map((b) => (b.id === cancelId ? { ...b, status: "cancelled" } : b)));
      setCancelId(null);
      setReason("");
      showToast("Booking cancelled.", "success");
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || "Could not cancel booking.";
      setError(detail);
      showToast(detail, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-transition max-w-4xl mx-auto py-6 px-4">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
        <p className="text-slate-600 text-sm">View and manage your bookings.</p>
      </div>

      {loading && (
        <div className="text-slate-600 text-sm flex items-center gap-2">
          <span className="h-4 w-4 border-2 border-slate-300 border-t-primary-start rounded-full animate-spin" />
          Loading bookings…
        </div>
      )}
      {error && !loading && <div className="text-red-600 text-sm mb-3">{error}</div>}

      {!loading && bookings.length === 0 && (
        <div className="text-slate-600 text-sm">No bookings yet.</div>
      )}

      {!loading && bookings.length > 0 && (
        <div className="grid gap-3">
          {bookings.map((b) => (
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
                  Provider: {b.provider_id ? `#${b.provider_id}` : "TBD"}
                </div>
                <div className="text-sm text-slate-600">
                  When: {b.scheduled_at ? new Date(b.scheduled_at).toLocaleString() : "—"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColor(b.status)}`}>
                  {b.status}
                </span>
                {pendingIds.has(b.id) && (
                  <button
                    onClick={() => startCancel(b.id)}
                    className="rounded-lg border border-red-200 text-red-700 px-3 py-2 text-sm hover:bg-red-50 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {cancelId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-5 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-slate-900">Cancel booking</h3>
            <p className="text-sm text-slate-600">
              Please provide a brief reason (optional). This helps the provider understand the change.
            </p>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-start"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional)"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setCancelId(null);
                  setReason("");
                }}
                className="text-sm px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
              >
                Close
              </button>
              <button
                onClick={submitCancel}
                disabled={saving}
                className="text-sm px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-60"
              >
                {saving ? "Cancelling…" : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserBookings;

