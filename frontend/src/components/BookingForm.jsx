import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { useAuthContext } from "../contexts/AuthContext";

export default function BookingForm({ service, serviceId, onCreated }) {
  const auth = useAuthContext();
  const navigate = useNavigate();
  const [form, setForm] = useState({ scheduled_at: "", notes: "", lat: "", lon: "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [isOwnService, setIsOwnService] = useState(false);
  const [locationError, setLocationError] = useState(null);

  useEffect(() => {
    async function resolveOwnership() {
      if (!auth.isAuthenticated) {
        setIsOwnService(false);
        return;
      }
      if (auth.role !== "provider") {
        setIsOwnService(false);
        return;
      }
      setIsOwnService(false);
    }
    resolveOwnership();
  }, [auth.isAuthenticated, auth.role]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setLocationError(null);

    if (!auth.isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    const hasCoords = form.lat !== "" && form.lon !== "";
    if (!hasCoords && !form.address.trim()) {
      setLocationError("Provide either latitude/longitude or an address.");
      return;
    }

    setSubmitting(true);
    try {
      const scheduled = form.scheduled_at
        ? new Date(form.scheduled_at).toISOString()
        : new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const payload = {
        service_id: null,
        global_service_id: Number(serviceId),
        provider_id: null,
        scheduled_at: scheduled,
        notes: form.notes ? form.notes : null,
        user_lat: hasCoords ? Number(form.lat) : null,
        user_lon: hasCoords ? Number(form.lon) : null,
        user_address: form.address ? form.address : null,
      };

      if (import.meta.env.DEV) {
        console.log("FINAL BOOKING PAYLOAD", payload);
      }
      const res = await API.post("/bookings", payload);
      setMessage("Request sent to nearby providers. First to accept will be assigned.");
      setForm({ scheduled_at: "", notes: "", lat: "", lon: "", address: "" });
      onCreated?.(res.data, null);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      const detail = err.response?.data?.detail;
      setMessage(detail || "Could not create booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const disableSubmit = submitting || !auth.isAuthenticated || isOwnService;

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <h3 className="text-lg font-bold text-slate-800 mb-4">Request booking</h3>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        Your request will be sent to nearby verified providers. The first to accept will be assigned.
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="booking-when">
          Preferred time
        </label>
        <input
          id="booking-when"
          type="datetime-local"
          className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          value={form.scheduled_at}
          onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
          disabled={disableSubmit}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="booking-notes">
          Notes for provider
        </label>
        <textarea
          id="booking-notes"
          className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all min-h-[100px] resize-y disabled:opacity-50 disabled:cursor-not-allowed"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Describe your request"
          disabled={disableSubmit}
        />
      </div>

      <div className="space-y-3 border border-slate-200 rounded-lg p-3 bg-white">
        <div className="text-sm font-semibold text-slate-700">Job location (required)</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Latitude</label>
            <input
              type="number"
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              step="any"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Longitude</label>
            <input
              type="number"
              value={form.lon}
              onChange={(e) => setForm({ ...form, lon: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              step="any"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Address (optional if lat/lon given)</label>
          <textarea
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all min-h-[80px]"
            placeholder="House/Flat, Street, Area, City"
          />
        </div>
        {locationError && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
            {locationError}
          </div>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${message.includes("sent")
              ? "text-green-600 bg-green-50 border border-green-200"
              : "text-red-600 bg-red-50 border border-red-200"
            }`}
        >
          {message}
        </div>
      )}

      {isOwnService && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-lg">
          You cannot book your own service.
        </div>
      )}

      <button
        type="submit"
        className="btn-gradient w-full disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disableSubmit}
      >
        {submitting ? "Sending…" : auth.isAuthenticated ? "Find & assign provider" : "Login to book"}
      </button>
      {!auth.isAuthenticated && (
        <div className="text-sm text-slate-600 text-center">
          You need to log in before sending booking requests.
        </div>
      )}
    </form>
  );
}

