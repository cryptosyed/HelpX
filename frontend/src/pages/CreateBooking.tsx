import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createBooking } from "../api/endpoints";
import { showToast } from "../utils/toast";

type LocationState = {
  providerId?: number;
  globalServiceId?: number;
};

const CreateBooking: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  const [globalServiceId, setGlobalServiceId] = useState<number | null>(
    state.globalServiceId ?? null
  );
  const [providerId, setProviderId] = useState<number | null>(
    state.providerId ?? null
  );
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !!globalServiceId && !!scheduledAt && lat.trim() !== "" && lon.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      await createBooking({
        global_service_id: globalServiceId,
        provider_id: providerId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        notes: notes || null,
        user_lat: Number(lat),
        user_lon: Number(lon),
        user_address: null,
        service_id: null,
      });
      showToast("Booking created successfully.", "success");
      navigate("/bookings");
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Could not create booking.";
      setError(detail);
      showToast(detail, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-transition max-w-xl mx-auto py-6 px-4">
      <div className="flex flex-col gap-2 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Create Booking</h1>
        <p className="text-slate-600 text-sm">
          Pick a time and optionally target a provider. If no provider is selected, we will auto-assign the best match.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Global Service ID
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-start"
            type="number"
            value={globalServiceId ?? ""}
            onChange={(e) => setGlobalServiceId(e.target.value ? Number(e.target.value) : null)}
            placeholder="e.g. 1"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Provider ID (optional)
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-start"
            type="number"
            value={providerId ?? ""}
            onChange={(e) => setProviderId(e.target.value ? Number(e.target.value) : null)}
            placeholder="Leave empty to auto-assign"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Date & Time
          </label>
          <input
            type="datetime-local"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-start"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Latitude
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-start"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="12.9716"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Longitude
            </label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-start"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              placeholder="77.5946"
              inputMode="decimal"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-start"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Share any details for the provider"
            rows={3}
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="rounded-lg bg-primary-start text-white px-4 py-2 text-sm font-medium hover:bg-primary-end transition disabled:opacity-60"
        >
          {submitting ? "Booking…" : "Book"}
        </button>
      </form>
    </div>
  );
};

export default CreateBooking;

