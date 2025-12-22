import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { useAuthContext } from "../contexts/AuthContext";
import Badge from "./Badge";

export default function BookingForm({ service, serviceId, serviceProviderId, onCreated }) {
  const auth = useAuthContext();
  const navigate = useNavigate();
  const [form, setForm] = useState({ scheduled_at: "", notes: "", lat: "", lon: "", address: "" });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [isOwnService, setIsOwnService] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState(serviceProviderId || null);
  const [providers, setProviders] = useState([]);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState(null);
  const [autoAssign, setAutoAssign] = useState(true);
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
      try {
        const providerProfile = await API.get("/provider/profile");
        const providerId = providerProfile.data?.id;
        setIsOwnService(Boolean(providerId && providerId === serviceProviderId));
      } catch (err) {
        console.error("Failed to resolve provider ownership", err);
        setIsOwnService(false);
      }
    }
    resolveOwnership();
  }, [auth.isAuthenticated, auth.role, serviceProviderId]);

  useEffect(() => {
    let active = true;
    async function loadProviders() {
      setProvidersLoading(true);
      setProvidersError(null);
      try {
        const baseProviderId = serviceProviderId || service?.provider_id;
        if (!baseProviderId) {
          setProviders([]);
          return;
        }

        const ratingRes = await API.get(`/providers/${baseProviderId}/rating-summary`).catch(() => ({ data: null }));
        const base = {
          id: baseProviderId,
          name: service?.provider_name || `Provider #${baseProviderId}`,
          price: service?.price,
          lat: service?.lat,
          lon: service?.lon,
          rating: ratingRes.data?.avg_rating ?? null,
          total_reviews: ratingRes.data?.total_reviews ?? 0,
        };
        if (!active) return;
        setProviders([base]);
        setSelectedProviderId(baseProviderId);
      } catch (err) {
        console.error(err);
        if (!active) return;
        setProvidersError("Unable to load providers for this service.");
        setProviders([]);
      } finally {
        if (active) setProvidersLoading(false);
      }
    }
    loadProviders();
    return () => {
      active = false;
    };
  }, [service, serviceProviderId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setLocationError(null);

    if (!auth.isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    if (!form.scheduled_at) {
      setMessage("Select a preferred date/time.");
      return;
    }

    const hasCoords = form.lat !== "" && form.lon !== "";
    if (!hasCoords && !form.address.trim()) {
      setLocationError("Provide either latitude/longitude or an address.");
      return;
    }

    if (!autoAssign && !selectedProviderId) {
      setMessage("Select a provider to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        service_id: serviceId,
        provider_id: autoAssign ? null : selectedProviderId,
        scheduled_at: form.scheduled_at,
        notes: form.notes || undefined,
        lat: hasCoords ? Number(form.lat) : undefined,
        lon: hasCoords ? Number(form.lon) : undefined,
        address: form.address || undefined,
      };

      if (import.meta.env.DEV) {
        console.log("BookingForm: creating booking payload", payload);
      }
      const res = await API.post("/bookings/", payload);
      setMessage("Booking request sent!");
      setForm({ scheduled_at: "", notes: "", lat: "", lon: "", address: "" });
      onCreated?.(res.data, null);
    } catch (err) {
      console.error(err);
      setMessage("Could not create booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const disableSubmit = submitting || !auth.isAuthenticated || isOwnService;

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <h3 className="text-lg font-bold text-slate-800 mb-4">Request booking</h3>

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
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">Select a provider</div>
          {providersLoading && <div className="text-xs text-slate-500">Loading…</div>}
        </div>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-1 text-primary-start focus:ring-primary-start"
            checked={autoAssign}
            onChange={(e) => setAutoAssign(e.target.checked)}
          />
          <span>
            Auto-assign best provider
            <div className="text-xs text-slate-500">
              We’ll pick the closest available provider. Uncheck to choose manually.
            </div>
          </span>
        </label>
        {providersError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
            {providersError}
          </div>
        )}
        {!providersLoading && !providersError && providers.length === 0 && (
          <div className="text-sm text-slate-600">No providers available for this service.</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {providers.map((p) => {
            const isSelected = selectedProviderId === p.id;
            const disabled = autoAssign;
            return (
              <article
                key={p.id}
                className={`rounded-lg border p-4 transition ${
                  isSelected ? "border-primary-start shadow-lg bg-primary-start/5" : "border-slate-200 bg-white shadow-sm"
                } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-semibold text-slate-800">{p.name}</div>
                    <div className="text-sm text-slate-600">ID: #{p.id}</div>
                  </div>
                  <Badge variant="info">Provider</Badge>
                </div>
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  <div>Rating: {p.rating != null ? `${p.rating.toFixed(1)} ★ (${p.total_reviews} reviews)` : "No ratings yet"}</div>
                  <div>Price: {p.price != null ? `₹${Number(p.price).toLocaleString("en-IN")}` : "—"}</div>
                  <div>
                    Location:{" "}
                    {p.lat != null && p.lon != null ? `${p.lat}, ${p.lon}` : p.city || p.area || "Not provided"}
                  </div>
                </div>
                <button
                  type="button"
                  className={`mt-4 w-full text-sm px-3 py-2 rounded-lg border ${
                    isSelected && !disabled
                      ? "border-primary-start bg-primary-start text-white"
                      : "border-slate-200 text-slate-700 hover:border-primary-start"
                  }`}
                  onClick={() => !disabled && setSelectedProviderId(p.id)}
                  disabled={disabled}
                >
                  {disabled ? "Auto-assigned" : isSelected ? "Selected" : "Select provider"}
                </button>
              </article>
            );
          })}
        </div>
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

