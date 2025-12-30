import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api";
import { useAuthContext } from "../context/AuthContext";

/**
 * Service detail modal with embedded OpenStreetMap iframe and quick booking CTA.
 */
export default function MapModal({ service, onClose }) {
  const navigate = useNavigate();
  const auth = useAuthContext();
  const [bookingState, setBookingState] = useState({
    loading: false,
    message: null,
    error: null,
  });

  if (!service) {
    return (
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-5 z-50 animate-fade-in-up"
        role="dialog"
        aria-modal="true"
        aria-label="Service details"
        onClick={onClose}
      >
        <div
          className="glass-strong rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200/50 p-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-slate-700">Service details are not available.</p>
          <button type="button" className="btn-gradient mt-4" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const latNum = Number(service.lat);
  const lonNum = Number(service.lon);
  const hasCoords = Number.isFinite(latNum) && Number.isFinite(lonNum);

  const mapUrl = useMemo(() => {
    if (!hasCoords) return null;
    const delta = 0.01;
    const bbox = `${lonNum - delta},${latNum - delta},${lonNum + delta},${latNum + delta}`;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latNum},${lonNum}`;
  }, [hasCoords, latNum, lonNum]);

  const priceLabel =
    service.price != null
      ? `₹${Number(service.price).toLocaleString("en-IN")}`
      : "—";
  const categoryLabel = service.category || "General";
  const description = service.description || "No description available.";

  async function handleBook() {
    if (!service?.id) {
      setBookingState({
        loading: false,
        message: null,
        error: "Service unavailable. Please retry.",
      });
      return;
    }

    if (!auth.isAuthenticated) {
      navigate("/login");
      return;
    }

    setBookingState({ loading: true, message: null, error: null });
    const scheduledAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // auto-set a near-term slot

    try {
      await API.post("/bookings/", {
        service_id: service.id,
        provider_id: service.provider_id,
        scheduled_at: scheduledAt,
        notes: "Quick booking from service modal",
      });
      const msg = "Booking request sent! We will confirm shortly.";
      setBookingState({ loading: false, message: msg, error: null });
      if (typeof window !== "undefined" && window.alert) {
        window.alert(msg);
      }
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Could not create booking. Please try again.";
      setBookingState({ loading: false, message: null, error: detail });
    }
  }

  const bookLabel = bookingState.loading
    ? "Booking…"
    : auth.isAuthenticated
    ? "Book Service"
    : "Login to book";

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-5 z-50 animate-fade-in-up"
      role="dialog"
      aria-modal="true"
      aria-label="Service details"
      onClick={onClose}
    >
      <div
        className="glass-strong rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200/50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              {categoryLabel}
            </div>
            <span className="font-bold text-xl text-slate-900">{service.title}</span>
          </div>
          <button
            type="button"
            className="btn-ghost text-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-3xl font-bold text-gradient">{priceLabel}</div>
            <button
              type="button"
              onClick={handleBook}
              disabled={bookingState.loading}
              className={`btn-gradient text-sm px-4 py-2 min-w-[140px] ${
                bookingState.loading ? "opacity-80 cursor-not-allowed" : ""
              }`}
            >
              {bookLabel}
            </button>
          </div>

          <div className="text-slate-700 text-sm leading-relaxed bg-white/60 rounded-lg p-4 border border-slate-200/60">
            {description}
          </div>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-700">Location</div>
            {hasCoords && mapUrl ? (
              <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                <iframe
                  title="Service location map"
                  src={mapUrl}
                  className="w-full"
                  height="260"
                  loading="lazy"
                  style={{ border: 0 }}
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : (
              <div className="w-full min-h-[120px] rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-slate-600 text-sm">
                Location available on booking confirmation
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600">
            <div className="bg-white/70 border border-slate-200 rounded-lg p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Category</div>
              <div className="text-slate-800 font-semibold">{categoryLabel}</div>
            </div>
            <div className="bg-white/70 border border-slate-200 rounded-lg p-3">
              <div className="text-xs uppercase tracking-wide text-slate-500">Service ID</div>
              <div className="text-slate-800 font-semibold">#{service.id}</div>
            </div>
          </div>

          {(bookingState.message || bookingState.error) && (
            <div
              className={`p-3 rounded-lg text-sm ${
                bookingState.error
                  ? "text-red-700 bg-red-50 border border-red-200"
                  : "text-green-700 bg-green-50 border border-green-200"
              }`}
            >
              {bookingState.error || bookingState.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
