import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import { matchProviders } from "../api/endpoints";
import ProviderCard from "../components/ProviderCard";
import { showToast } from "../utils/toast";

type GlobalService = {
  id: number;
  title: string;
};

type ProviderResult = {
  provider_id: number;
  distance_km?: number | null;
  rating?: number | null;
};

const MIN_RADIUS = 2;
const MAX_RADIUS = 20;

const MatchProviders: React.FC = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<GlobalService[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  const [serviceId, setServiceId] = useState<number | null>(null);
  const [lat, setLat] = useState<string>("");
  const [lon, setLon] = useState<string>("");
  const [radius, setRadius] = useState<number>(5);

  const [results, setResults] = useState<ProviderResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadServices = async () => {
      setLoadingServices(true);
      try {
        const res = await client.get("/services/global");
        setServices(res.data || []);
        if ((res.data || []).length > 0) {
          setServiceId(res.data[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load services");
      } finally {
        setLoadingServices(false);
      }
    };
    loadServices();
  }, []);

  const canSubmit = useMemo(() => {
    return (
      !!serviceId &&
      lat.trim() !== "" &&
      lon.trim() !== "" &&
      !loading &&
      !loadingServices
    );
  }, [serviceId, lat, lon, loading, loadingServices]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !serviceId) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await matchProviders({
        global_service_id: serviceId,
        user_lat: Number(lat),
        user_lon: Number(lon),
        radius_km: radius,
      });
      const items = res?.items || res || [];
      setResults(items);
      if (items.length === 0) {
        showToast("No providers found. Try increasing the radius.", "info");
      } else {
        showToast(`Found ${items.length} provider(s).`, "success");
      }
    } catch (err: any) {
      console.error(err);
      const detail =
        err?.response?.data?.detail ||
        err?.message ||
        "Could not fetch providers.";
      setError(detail);
      showToast(detail, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleBook = (providerId: number) => {
    if (!serviceId) return;
    navigate("/book", {
      state: {
        providerId,
        globalServiceId: serviceId,
      },
    });
  };

  return (
    <div className="page-transition max-w-4xl mx-auto py-6 px-4">
      <div className="flex flex-col gap-3 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Match Providers</h1>
        <p className="text-slate-600">
          Select a service and location to find nearby providers. Radius is limited to 2–20 km.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 grid gap-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Service
          </label>
          <select
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-start"
            value={serviceId ?? ""}
            onChange={(e) => setServiceId(Number(e.target.value))}
            disabled={loadingServices}
          >
            {services.map((svc) => (
              <option key={svc.id} value={svc.id}>
                {svc.title}
              </option>
            ))}
          </select>
          {loadingServices && (
            <p className="text-xs text-slate-500 mt-1">Loading services…</p>
          )}
        </div>

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

        <div className="sm:col-span-2">
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Radius: {radius} km
          </label>
          <input
            type="range"
            min={MIN_RADIUS}
            max={MAX_RADIUS}
            step={1}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-slate-500 mt-1">
            Search radius between {MIN_RADIUS} km and {MAX_RADIUS} km.
          </p>
        </div>

        <div className="sm:col-span-2 flex gap-3">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-primary-start text-white px-4 py-2 text-sm font-medium hover:bg-primary-end transition disabled:opacity-60"
          >
            {loading ? "Searching…" : "Find Providers"}
          </button>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>

      <div className="mt-6">
        {loading && (
          <div className="text-slate-600 text-sm flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-slate-300 border-t-primary-start rounded-full animate-spin" />
            Searching providers…
          </div>
        )}
        {!loading && results.length === 0 && (
          <div className="text-slate-600 text-sm">No providers found. Try increasing the radius.</div>
        )}
        {!loading && results.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((p: ProviderResult) => (
              <ProviderCard
                key={p.provider_id}
                providerId={p.provider_id}
                distanceKm={p.distance_km}
                rating={p.rating}
                onBook={() => handleBook(p.provider_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchProviders;

