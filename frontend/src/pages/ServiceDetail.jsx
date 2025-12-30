import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import L from "leaflet";

import API from "../api";
import MapModal from "../components/MapModal";

export default function ServiceDetail() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [bookingMessage, setBookingMessage] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await API.get(`/services/global/${id}`);
        if (!active) return;
        setService(res.data);
      } catch (err) {
        console.error(err);
        if (!active) return;
        setError("Service not found.");
        setService(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    // Global services do not have reviews yet
    setReviews([]);
    setReviewsError(null);
    setReviewsLoading(false);
  }, [id]);

  useEffect(() => {
    if (!service) return;
    const hasCoords =
      service.lat != null &&
      service.lon != null &&
      service.lat !== "" &&
      service.lon !== "";

    if (!hasCoords) {
      if (markerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      return;
    }

    const lat = Number(service.lat);
    const lon = Number(service.lon);
    const mapHost = mapContainerRef.current;
    if (!mapHost) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapHost, {
        center: [lat, lon],
        zoom: 14,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(mapInstanceRef.current);
    }

    mapInstanceRef.current.setView([lat, lon], 14);
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
    } else {
      markerRef.current = L.marker([lat, lon]).addTo(mapInstanceRef.current);
    }

    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 60);
  }, [service]);

  useEffect(() => {
    return () => {
      if (markerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const priceLabel =
    service?.price != null || service?.base_price != null
      ? `₹${Number((service.price ?? service.base_price) || 0).toLocaleString("en-IN")}`
      : "Transparent pricing";
  const createdAtLabel = service?.created_at
    ? new Date(service.created_at).toLocaleString()
    : "—";
  const latDisplay =
    service?.lat != null ? Number(service.lat).toFixed(4) : null;
  const lonDisplay =
    service?.lon != null ? Number(service.lon).toFixed(4) : null;
  const hasCoords =
    service?.lat != null &&
    service?.lon != null &&
    service.lat !== "" &&
    service.lon !== "";
  const descriptionText =
    service?.description && service.description.trim().length > 0
      ? service.description.trim()
      : "Professional service delivered by verified local providers.";
  const aboutDescription = descriptionText;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-5 py-10 space-y-6">
        <div className="h-5 w-40 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          <div className="space-y-4">
            <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
            <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
            <div className="h-24 w-full bg-slate-200 rounded animate-pulse" />
            <div className="h-32 w-full bg-slate-200 rounded animate-pulse" />
          </div>
          <div className="h-64 w-full bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-10 glass rounded-xl border border-red-200 bg-red-50 text-center">
        <div className="text-3xl mb-2">⚠️</div>
        <p className="text-red-600 mb-2 font-semibold">Service not available</p>
        <p className="text-slate-600 mb-4">{error}</p>
        <Link to="/services" className="btn-ghost text-sm">
          Back to services
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-10 page-transition">
      {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link to="/" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Home
        </Link>
        <span>/</span>
        <Link to="/services" className="font-semibold text-indigo-600 hover:text-indigo-500">
          Services
        </Link>
        <span>/</span>
        <span className="text-slate-700 truncate max-w-[280px]">{service.title}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-4xl font-bold text-slate-900 m-0">{service.title}</h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {service.category || "General"}
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-700">
            <span className="text-2xl font-bold text-indigo-600">{priceLabel}</span>
            <span className="text-sm text-slate-500">Trusted local professionals · Verified providers · Secure booking</span>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link to="/services" className="btn-ghost text-sm">
            Back to services
          </Link>
          {hasCoords && (
            <button
              type="button"
              className="btn-gradient text-sm"
              onClick={() => setShowMapModal(true)}
            >
              View map
            </button>
          )}
          {hasCoords && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${service.lat},${service.lon}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-sm"
            >
              Open in Google Maps
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-6">
        {/* Main content */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-8">
          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-slate-900">About this service</h3>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{aboutDescription}</p>
          </div>

          <div className="space-y-3" id="how-it-works">
            <h3 className="text-2xl font-bold text-slate-900">How it works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { title: "Request a booking", desc: "Tell us what you need and when." },
                { title: "Providers notified", desc: "Nearby verified pros are alerted instantly." },
                { title: "First to accept", desc: "Fastest available pro is assigned to you." },
              ].map((step, idx) => (
                <div key={step.title} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{step.title}</p>
                    <p className="text-sm text-slate-600">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-2xl font-bold text-slate-900">Why choose HelpX?</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
              {[
                "Verified providers",
                "Transparent pricing",
                "Secure payments",
                "Location-based matching",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-emerald-600">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {hasCoords && (
            <div className="space-y-2">
              <h4 className="text-xl font-semibold text-slate-900">Service location</h4>
              <div
                className="w-full h-60 rounded-xl overflow-hidden border border-slate-200"
                ref={mapContainerRef}
                aria-hidden={!hasCoords}
              />
              <p className="text-sm text-slate-600">
                {latDisplay && lonDisplay ? `${latDisplay}, ${lonDisplay}` : "Coordinates not provided"}
              </p>
            </div>
          )}

          <div className="flex justify-between gap-4 text-sm text-slate-600 pt-4 border-t border-slate-200">
            <span>Global service</span>
            <strong className="text-slate-800">#{service.id}</strong>
          </div>
        </section>

        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg shadow-indigo-500/10 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500">Book this service</p>
                <p className="text-3xl font-bold text-indigo-600">{priceLabel}</p>
                <p className="text-sm text-slate-600 mt-1">{service.title}</p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                Fast response
              </span>
            </div>
            <p className="text-sm text-slate-600">No commitment until a provider accepts.</p>
            <div className="space-y-2">
              <Link
                to="/book"
                state={{ globalServiceId: service?.id }}
                className={`w-full inline-flex justify-center items-center px-4 py-3 rounded-xl font-semibold shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                  service?.id
                    ? "bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-500"
                    : "bg-slate-300 text-slate-500 cursor-not-allowed pointer-events-none"
                }`}
                onClick={(e) => {
                  if (!service?.id) {
                    e.preventDefault();
                    alert("Service ID is missing. Please refresh the page.");
                  }
                }}
              >
                Request booking
              </Link>
              <Link
                to="#how-it-works"
                className="w-full inline-flex justify-center items-center px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold hover:border-indigo-200 hover:text-indigo-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
              >
                How matching works
              </Link>
            </div>
            <div className="text-xs text-slate-500">
              Transparent pricing · Verified providers · Secure payments
            </div>
          </div>
        </aside>
      </div>

      {showMapModal && hasCoords && (
        <MapModal
          service={service}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </div>
  );
}
