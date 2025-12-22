import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../api";
import PageHeader from "../components/PageHeader";

export default function ProviderProfile() {
  const { providerId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ratingSummary, setRatingSummary] = useState(null);
  const [services, setServices] = useState([]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [ratingRes, servicesRes] = await Promise.all([
          API.get(`/providers/${providerId}/rating-summary`),
          API.get("/services/?page_size=200"),
        ]);
        if (!active) return;
        setRatingSummary(ratingRes.data || null);
        const all = servicesRes.data?.items || [];
        setServices(all.filter((s) => String(s.provider_id) === String(providerId)));
      } catch (err) {
        console.error(err);
        if (!active) return;
        setError("Unable to load provider profile.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [providerId]);

  const avgRating = ratingSummary?.avg_rating;
  const totalReviews = ratingSummary?.total_reviews ?? 0;
  const providerName = useMemo(() => {
    return services[0]?.provider_name || `Provider #${providerId}`;
  }, [services, providerId]);

  const completedBookings = "—";
  const bio = services[0]?.description
    ? `Service provider: ${services[0].description}`
    : "No bio available for this provider.";

  const location = useMemo(() => {
    const svc = services.find((s) => s.lat && s.lon) || services[0];
    if (!svc) return "Location not provided";
    if (svc.lat != null && svc.lon != null) return `${svc.lat}, ${svc.lon}`;
    return svc.city || svc.area || "Location not provided";
  }, [services]);

  if (loading) {
    return (
      <div className="glass rounded-xl p-6 text-center text-slate-600">
        Loading provider profile…
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-xl p-6 text-center text-red-600 bg-red-50 border border-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="page-transition space-y-6">
      <PageHeader title={providerName} />

      <section className="glass rounded-2xl p-6 border border-slate-200/50 shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard label="Average rating" value={avgRating != null ? `${avgRating.toFixed(1)} ★` : "No ratings"} />
          <InfoCard label="Total reviews" value={totalReviews} />
          <InfoCard label="Completed bookings" value={completedBookings} />
        </div>
        <div className="mt-4 text-slate-700">
          <p className="font-semibold mb-1">About</p>
          <p className="text-sm text-slate-600">{bio}</p>
          <p className="text-sm text-slate-500 mt-2">Location: {location}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-slate-800">Services</h2>
        {services.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center text-slate-600">No services listed by this provider.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((svc) => (
              <article key={svc.id} className="glass rounded-xl p-5 border border-slate-200/50 shadow-md flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-800">{svc.title}</h3>
                  <p className="text-sm text-slate-600 line-clamp-3">{svc.description || "No description provided."}</p>
                  <div className="text-sm text-slate-600">Category: {svc.category || "—"}</div>
                  <div className="text-sm font-semibold text-slate-800">₹{svc.price ? Number(svc.price).toLocaleString("en-IN") : "—"}</div>
                </div>
                <div className="pt-4">
                  <Link to={`/services/${svc.id}`} className="btn-gradient text-sm w-full inline-block text-center">
                    Book a service
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="glass rounded-xl p-4 border border-slate-200/50 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">{label}</div>
      <div className="text-xl font-semibold text-slate-800">{value}</div>
    </div>
  );
}


