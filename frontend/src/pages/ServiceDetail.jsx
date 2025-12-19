import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import L from "leaflet";

import API from "../api";
import BookingForm from "../components/BookingForm";
import MapModal from "../components/MapModal";

export default function ServiceDetail() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [bookingMessage, setBookingMessage] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await API.get(`/services/${id}/`);
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
    service?.price != null
      ? `₹${Number(service.price).toLocaleString("en-IN")}`
      : "—";
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

  if (loading) {
    return (
      <div className="glass rounded-xl p-6 text-center text-slate-600">
        Loading service…
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-xl p-6 border border-red-200 bg-red-50">
        <p className="text-red-600 mb-4">{error}</p>
        <Link to="/" className="btn-ghost text-sm">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-5 py-10 page-transition">
      <div className="flex justify-between items-start gap-5 flex-wrap mb-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-800 m-0 mb-2">{service.title}</h1>
          <div className="text-base text-slate-600">
            {service.category || "General"} • {priceLabel}
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link to="/" className="btn-ghost text-sm">
            Back
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 glass rounded-2xl p-7 border border-slate-200/50 shadow-xl">
          <h3 className="text-2xl font-bold mb-4 text-slate-800">Description</h3>
          <p className="text-slate-700 leading-relaxed mb-6 whitespace-pre-wrap">
            {service.description || "No description provided."}
          </p>

          <div className="flex justify-between gap-4 text-sm text-slate-600 pt-4 border-t border-slate-200 mb-4">
            <span>Provider ID</span>
            <strong className="text-slate-800">#{service.provider_id}</strong>
          </div>
          <div className="flex justify-between gap-4 text-sm text-slate-600 pb-4 border-b border-slate-200 mb-6">
            <span>Created</span>
            <strong className="text-slate-800">{createdAtLabel}</strong>
          </div>

          {hasCoords && (
            <div
              className="w-full h-60 rounded-xl overflow-hidden border border-slate-200"
              ref={mapContainerRef}
              aria-hidden={!hasCoords}
            />
          )}
        </section>

        <aside className="lg:sticky lg:top-24 glass rounded-2xl p-6 border border-slate-200/50 shadow-xl h-fit">
          <div className="text-3xl font-bold text-gradient mb-4">{priceLabel}</div>
          <div className="text-sm text-slate-600 mb-3">
            Category: <strong className="text-slate-800">{service.category || "General"}</strong>
          </div>
          <div className="text-sm text-slate-600 mb-6">
            Coordinates:{" "}
            {latDisplay && lonDisplay ? (
              <strong className="text-slate-800">{latDisplay}, {lonDisplay}</strong>
            ) : (
              "Not provided"
            )}
          </div>

          <BookingForm
            service={service}
            serviceId={service.id}
            serviceProviderId={service.provider_id}
            onCreated={(_, chosen) =>
              setBookingMessage(
                chosen
                  ? `Best provider #${chosen.provider_id} assigned (${chosen.distance_km?.toFixed?.(1) ?? "?"} km away).`
                  : "Booking request sent."
              )
            }
          />
          {bookingMessage && (
            <div className="mt-4 p-3 rounded-lg text-sm text-green-600 bg-green-50 border border-green-200">
              {bookingMessage}
            </div>
          )}
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
