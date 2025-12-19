import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { useAuthContext } from "../contexts/AuthContext";
import Badge from "./Badge";

const DEFAULT_RADIUS_KM = 10;
const DEFAULT_TOP_N = 5;

export default function BookingForm({ service, serviceId, serviceProviderId, onCreated }) {
  const auth = useAuthContext();
  const navigate = useNavigate();
  const [form, setForm] = useState({ scheduled_at: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [isOwnService, setIsOwnService] = useState(false);
  const [matching, setMatching] = useState(false);
  const [matches, setMatches] = useState([]);
  const [baselineMatches, setBaselineMatches] = useState([]);
  const [hybridDebug, setHybridDebug] = useState(null);
  const [baselineDebug, setBaselineDebug] = useState(null);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [autoAssign, setAutoAssign] = useState(true);

  const jobLocation = useMemo(() => {
    if (!service) return null;
    if (service.lat != null && service.lon != null) {
      return { lat: Number(service.lat), lon: Number(service.lon) };
    }
    return null;
  }, [service]);

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

  const isDev = import.meta.env.DEV;

  async function fetchMatches(algo = "trust_hybrid", persist = true) {
    if (!jobLocation) {
      setMessage("This service does not have a location yet. Unable to find nearby providers.");
      return { matches: [], meta: null };
    }

    setMatching(true);
    try {
      const res = await API.get("/match/providers", {
        params: {
          service_id: serviceId,
          user_lat: jobLocation.lat,
          user_lon: jobLocation.lon,
          radius_km: DEFAULT_RADIUS_KM,
          top_n: DEFAULT_TOP_N,
          algorithm: algo,
          debug: true,
        },
      });
      const list = res.data?.items || [];
      const meta = res.data?.debug || null;

      if (persist) {
        if (algo === "hybrid") {
          setMatches(list);
          setHybridDebug(meta);
          if (list.length > 0) {
            setSelectedProviderId(list[0].provider_id);
            setMessage(null);
          } else {
            setMessage("No providers found within the search radius.");
          }
        } else {
          setBaselineMatches(list);
          setBaselineDebug(meta);
        }
      }
      return { matches: list, meta };
    } catch (err) {
      console.error(err);
      setMessage("Could not find providers. Please try again.");
      return { matches: [], meta: null };
    } finally {
      setMatching(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);

    if (!auth.isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    if (!form.scheduled_at) {
      setMessage("Select a preferred date/time.");
      return;
    }
    setSubmitting(true);
    try {
      const { matches: nearby } = await fetchMatches("trust_hybrid", true);
      if (!nearby.length) {
        setSubmitting(false);
        return;
      }

      const chosen =
        (autoAssign && nearby[0]) ||
        nearby.find((m) => m.provider_id === selectedProviderId) ||
        nearby[0];

      const payload = {
        service_id: chosen.service_id,
        provider_id: chosen.provider_id,
        scheduled_at: form.scheduled_at,
        notes: form.notes || undefined,
      };
      if (import.meta.env.DEV) {
        console.log("BookingForm: creating booking payload", payload);
      }
      const res = await API.post("/bookings/", payload);
      setMessage("Booking request sent with best-matched provider!");
      setForm({ scheduled_at: "", notes: "" });
      onCreated?.(res.data, chosen);
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

      <div className="rounded-lg border border-slate-200 p-3 bg-slate-50 text-sm text-slate-700">
        <div className="flex items-center justify-between">
          <span>Matching radius</span>
          <Badge variant="info">{DEFAULT_RADIUS_KM} km</Badge>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          We find and score providers near the job location using distance, rating, and workload.
        </p>
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

      <div className="flex items-center justify-between gap-2 border border-slate-200 rounded-lg p-3 bg-white">
        <div className="flex items-center gap-2">
          <input
            id="auto-assign"
            type="checkbox"
            checked={autoAssign}
            onChange={(e) => setAutoAssign(e.target.checked)}
            className="rounded border-slate-300 text-primary-start focus:ring-primary-start"
          />
          <label htmlFor="auto-assign" className="text-sm text-slate-700">
            Auto-assign best provider
          </label>
        </div>
        {!autoAssign && matches.length > 0 && (
          <select
            value={selectedProviderId || matches[0]?.provider_id}
            onChange={(e) => setSelectedProviderId(Number(e.target.value))}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1"
          >
            {matches.map((m, idx) => (
              <option key={m.provider_id} value={m.provider_id}>
                #{m.provider_id} • {m.distance_km.toFixed(1)} km • score {m.score.toFixed(3)} {idx === 0 ? "(best)" : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      {matching && (
        <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 p-3 rounded-lg">
          Finding the best nearby providers…
        </div>
      )}

      {matches.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-semibold text-slate-700">Top providers nearby</div>
          {matches.slice(0, 3).map((m, idx) => (
            <div
              key={m.provider_id}
              className="border border-slate-200 rounded-lg p-3 bg-white flex items-center justify-between gap-3"
            >
              <div>
                <div className="text-slate-800 font-semibold flex items-center gap-2">
                  Provider #{m.provider_id}
                  <Badge variant={idx === 0 ? "success" : "info"}>{idx === 0 ? "Best match" : "Near you"}</Badge>
                </div>
                <div className="text-xs text-slate-600">
                  {m.distance_km.toFixed(2)} km away • Rating {m.rating.toFixed(1)} • Score {m.score.toFixed(3)}
                </div>
                <div className="text-xs text-slate-500">
                  Reason: weighted distance + rating + workload (active {m.active_bookings})
                </div>
              </div>
              {!autoAssign && (
                <button
                  type="button"
                  onClick={() => setSelectedProviderId(m.provider_id)}
                  className={`text-xs px-3 py-1 rounded-lg border ${
                    selectedProviderId === m.provider_id
                      ? "border-primary-start text-primary-start"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  Choose
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isDev && (
        <div className="space-y-3 border border-dashed border-slate-300 rounded-lg p-3 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-700">Developer comparison</div>
            <button
              type="button"
              onClick={() => fetchMatches("baseline", true)}
              className="text-xs px-3 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-white"
            >
              Compare with baseline
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
            <div className="border border-slate-200 bg-white rounded-lg p-2">
              <div className="font-semibold text-slate-800 mb-1">Hybrid</div>
              <div>Latency: {hybridDebug?.elapsed_ms ? `${hybridDebug.elapsed_ms.toFixed(2)} ms` : "—"}</div>
              <div>Candidates: {hybridDebug?.candidate_count ?? "—"}</div>
              <div>Best distance: {matches[0]?.distance_km?.toFixed?.(2) ?? "—"} km</div>
              <div>Workload: active {matches[0]?.active_bookings ?? "—"}</div>
            </div>
            <div className="border border-slate-200 bg-white rounded-lg p-2">
              <div className="font-semibold text-slate-800 mb-1">Baseline (distance only)</div>
              <div>Latency: {baselineDebug?.elapsed_ms ? `${baselineDebug.elapsed_ms.toFixed(2)} ms` : "—"}</div>
              <div>Candidates: {baselineDebug?.candidate_count ?? "—"}</div>
              <div>Best distance: {baselineMatches[0]?.distance_km?.toFixed?.(2) ?? "—"} km</div>
              <div>Workload: active {baselineMatches[0]?.active_bookings ?? "—"}</div>
            </div>
          </div>

          {baselineMatches.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-slate-700">Baseline top providers</div>
              {baselineMatches.slice(0, 3).map((m, idx) => (
                <div
                  key={`baseline-${m.provider_id}`}
                  className="border border-slate-200 rounded-lg p-3 bg-white flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-slate-800 font-semibold flex items-center gap-2">
                      Provider #{m.provider_id}
                      <Badge variant={idx === 0 ? "warning" : "info"}>{idx === 0 ? "Baseline best" : "Baseline near"}</Badge>
                    </div>
                    <div className="text-xs text-slate-600">
                      {m.distance_km.toFixed(2)} km away • Rating {m.rating.toFixed(1)} • Score {m.score.toFixed(3)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Reason: distance-only baseline (active {m.active_bookings})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

