import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createBooking } from "../api/endpoints";
import { showToast } from "../utils/toast";
import API from "../api";

// Ensure Leaflet CSS is loaded
import "leaflet/dist/leaflet.css";

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

  // Date & Time state
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [isTimeConfirmed, setIsTimeConfirmed] = useState(false); // New state for confirmation

  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Reset confirmation if inputs change
  useEffect(() => {
    setIsTimeConfirmed(false);
  }, [dateInput, timeInput]);

  const hasDateTime = Boolean(dateInput) && Boolean(timeInput);

  const scheduledIso = useMemo(() => {
    if (!dateInput || !timeInput) return "";

    const [year, month, day] = dateInput.split("-").map(Number);
    const [hours, minutes] = timeInput.split(":").map(Number);

    // Construct date using local time components to avoid UTC/timezone issues
    const d = new Date(year, month - 1, day, hours, minutes);

    return d.toISOString();
  }, [dateInput, timeInput]);

  const canSubmit =
    !!globalServiceId &&
    globalServiceId > 0 &&
    !!scheduledIso &&
    lat.trim() !== "" &&
    lon.trim() !== "";

  useEffect(() => {
    console.log("BOOKING DEBUG", {
      dateInput,
      timeInput,
      scheduledIso,
      canSubmit,
    });
  }, [dateInput, timeInput, scheduledIso, canSubmit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowValidation(true);

    // Defensive check: Ensure globalServiceId is valid
    if (!globalServiceId || globalServiceId <= 0) {
      const errorMsg = "Please select a valid service. Service ID is missing or invalid.";
      setError(errorMsg);
      showToast(errorMsg, "error");
      return;
    }

    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        global_service_id: globalServiceId,
        provider_id: providerId,
        scheduled_at: scheduledIso,
        notes: notes || null,
        user_lat: Number(lat),
        user_lon: Number(lon),
        user_address: address || null,
        service_id: null,
      };

      const res = await createBooking(payload);
      showToast("Booking created successfully.", "success");
      const bookingId = (res as any)?.id;
      if (bookingId) {
        navigate(`/booking/${bookingId}`);
      } else {
        navigate("/user/dashboard");
      }
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

  const handleConfirmTime = () => {
    if (!hasDateTime) {
      showToast("Please select both date and time first.", "error");
      return;
    }
    setIsTimeConfirmed(true);
    showToast("Schedule set.", "success");
  };

  const scheduledDisplay = useMemo(() => {
    if (!scheduledIso) return "Not selected";
    const dt = new Date(scheduledIso);
    if (Number.isNaN(dt.getTime())) return "Not selected";
    return dt.toLocaleString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }, [scheduledIso]);

  const locationDisplay = useMemo(() => {
    if (address.trim()) return address.trim();
    if (lat && lon) return `${lat}, ${lon}`;
    if (lat || lon) return "Incomplete coordinates";
    return "Not provided";
  }, [address, lat, lon]);

  const [serviceName, setServiceName] = useState<string | null>(null);

  // Fetch service name when globalServiceId is available
  useEffect(() => {
    if (!globalServiceId || globalServiceId <= 0) {
      setServiceName(null);
      return;
    }

    let active = true;
    async function fetchServiceName() {
      try {
        console.log(`CreateBooking: Fetching service details for ID: ${globalServiceId}`);
        const res = await API.get(`/services/global/${globalServiceId}`);
        if (!active) return;
        setServiceName(res.data?.title || null);
      } catch (err: any) {
        console.error("Failed to fetch service name:", err);
        if (active) {
          setServiceName(null);
          // If service not found, clear invalid ID
          if (err?.response?.status === 404) {
            console.warn(`CreateBooking: Service ${globalServiceId} not found (404)`);
            setGlobalServiceId(null);
            showToast("Service not found. Please select a valid service.", "error");
          }
        }
      }
    }

    fetchServiceName();
    return () => {
      active = false;
    };
  }, [globalServiceId]);

  const serviceLabel = useMemo(() => {
    if (serviceName) return serviceName;
    if (globalServiceId && globalServiceId > 0) return `Service #${globalServiceId}`;
    return "Service not selected";
  }, [globalServiceId, serviceName]);

  const mapDefaults = { lat: 12.9716, lon: 77.5946, zoom: 12 };

  const MapPicker: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (lat: number, lon: number) => void;
  }> = ({ isOpen, onClose, onSelect }) => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const mapInstance = useRef<any>(null);
    const markerRef = useRef<any>(null);

    // Initial load logic
    const initialLat = Number(lat) || mapDefaults.lat;
    const initialLon = Number(lon) || mapDefaults.lon;

    useEffect(() => {
      if (!isOpen) return;
      let mounted = true;
      (async () => {
        const L = await import("leaflet");

        // Fix for missing marker icons in Webpack/Vite environments if needed
        // Usually handled by loading CSS, but sometimes explicit icon set is safer
        // We'll trust CSS is enough largely, but let's ensure the map container is clean

        if (!mounted) return;
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
          return;
        }

        mapInstance.current = L.map(mapRef.current as HTMLDivElement, {
          center: [initialLat, initialLon],
          zoom: mapDefaults.zoom,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(mapInstance.current);

        // Add initial marker
        markerRef.current = L.marker([initialLat, initialLon]).addTo(mapInstance.current);

        mapInstance.current.on("click", (e: any) => {
          const { lat: newLat, lng: newLon } = e.latlng;
          if (markerRef.current) {
            markerRef.current.setLatLng([newLat, newLon]);
          } else {
            markerRef.current = L.marker([newLat, newLon]).addTo(mapInstance.current);
          }
          // We don't auto-close; user must confirm or we can do it on click if desired.
          // Current logic: click map -> select & close immediately?
          // Previous logic: onSelect(newLat, newLon); onClose();
          // Let's keep it simple for now as per previous behavior but ensure marker is visible

          // Actually, let's delay so they see the marker move
          onSelect(newLat, newLon);
          setTimeout(onClose, 200);
        });
      })();
      return () => {
        mounted = false;
        if (mapInstance.current) {
          mapInstance.current.remove();
          mapInstance.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm transition-all">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in-up">
          <div className="px-5 py-4 flex justify-between items-center border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-semibold text-slate-800">Pick a location</h3>
            <button
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              onClick={onClose}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div className="relative h-[450px]" ref={mapRef}>
            {/* Center Crosshair (optional visual aid if map moves instead of marker) */}
            {/* For Leaflet usually marker is enough, but user asked for "pointer". 
                 A marker IS a pointer. If they meant crosshair, we might not need it if clicking places a marker.
                 We'll assume the marker is sufficient if styled correctly. */}
          </div>
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Tap anywhere on the map to pin the location.
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-transition max-w-6xl mx-auto py-8 px-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/" className="font-medium text-slate-500 hover:text-slate-800 transition-colors">
          Home
        </Link>
        <span className="text-slate-300">/</span>
        <Link to="/services" className="font-medium text-slate-500 hover:text-slate-800 transition-colors">
          Services
        </Link>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-indigo-600">Request Booking</span>
      </nav>

      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Request Service</h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            Complete the form below to request a service. Nearby verified providers will be notified instantly.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-indigo-700 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
          No payment until accepted
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1.8fr_1fr] gap-8">
        {/* Left column - Form */}
        <div className="space-y-8">
          <form id="booking-form" onSubmit={handleSubmit} className="space-y-8">

            {/* 1. Service Details */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">1</div>
                <h2 className="font-semibold text-slate-800">Service Details</h2>
              </div>
              <div className="p-6 space-y-6">
                {/* Service ID & Provider */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Selected Service
                    </label>
                    <div className="relative">
                      <input
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none cursor-not-allowed"
                        type="text"
                        value={serviceLabel}
                        readOnly
                      />
                      {(!globalServiceId || globalServiceId <= 0) && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Link to="/services" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                            Change
                          </Link>
                        </div>
                      )}
                    </div>
                    {(!globalServiceId || globalServiceId <= 0) && (
                      <p className="text-xs text-amber-600 mt-1.5 font-medium">
                        ⚠ No service selected. <Link to="/services" className="underline">Browse Services</Link>
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Preferred Provider (Optional)
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      type="number"
                      value={providerId ?? ""}
                      onChange={(e) => setProviderId(e.target.value ? Number(e.target.value) : null)}
                      placeholder="ID"
                    />
                    <p className="text-xs text-slate-400 mt-1.5">Leave empty to auto-assign best match.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Date & Time */}
            <section className={`bg-white rounded-2xl shadow-sm border transition-all ${isTimeConfirmed ? 'border-emerald-200 ring-4 ring-emerald-50/50' : 'border-slate-200'}`}>
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${isTimeConfirmed ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>2</div>
                  <h2 className="font-semibold text-slate-800">Date & Time</h2>
                </div>
                {isTimeConfirmed && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Confirmed
                  </span>
                )}
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Time</label>
                    <input
                      type="time"
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
                      value={timeInput}
                      onChange={(e) => setTimeInput(e.target.value)}
                    />
                  </div>
                </div>

                {showValidation && !hasDateTime && (
                  <p className="text-sm text-red-500 font-medium mb-4 bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    Please select both date and time.
                  </p>
                )}

                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={handleConfirmTime}
                    disabled={!dateInput || !timeInput || isTimeConfirmed}
                    className="text-sm font-semibold bg-slate-900 text-white px-5 py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-slate-900/10"
                  >
                    {isTimeConfirmed ? 'Schedule Confirmed' : 'Set Time'}
                    {!isTimeConfirmed && (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* 3. Location */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">3</div>
                  <h2 className="font-semibold text-slate-800">Location</h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!navigator.geolocation) {
                      showToast("Geolocation not supported.", "error");
                      return;
                    }
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const { latitude, longitude } = pos.coords;
                        setLat(latitude.toFixed(6));
                        setLon(longitude.toFixed(6));
                        showToast("Location auto-detected", "success");
                      },
                      () => showToast("Unable to retrieve location.", "error")
                    );
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"></polygon></svg>
                  Use my current location
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Address (Optional)</label>
                  <div className="relative">
                    <input
                      className="w-full rounded-xl border border-slate-200 pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Enter street, area, or landmark"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-semibold text-slate-700">Coordinates</label>
                    <button
                      type="button"
                      className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5"
                      onClick={() => setShowMapPicker(true)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
                      Open Map
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono text-slate-600"
                        value={lat}
                        onChange={(e) => setLat(e.target.value)}
                        placeholder="Latitude"
                        inputMode="decimal"
                      />
                    </div>
                    <div>
                      <input
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono text-slate-600"
                        value={lon}
                        onChange={(e) => setLon(e.target.value)}
                        placeholder="Longitude"
                        inputMode="decimal"
                      />
                    </div>
                  </div>
                  {showValidation && (!lat.trim() || !lon.trim()) && (
                    <p className="text-xs text-red-500 mt-3 font-medium flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                      Location coordinates are required.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* 4. Notes */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">4</div>
                <h2 className="font-semibold text-slate-800">Additional Notes</h2>
              </div>
              <div className="p-6">
                <textarea
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 min-h-[120px]"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe your issue, specific requirements, or instructions for the provider..."
                />
              </div>
            </section>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <div className="text-sm text-red-700 font-medium leading-relaxed">{error}</div>
              </div>
            )}

            {/* Steps Visual */}
            <div className="hidden md:flex justify-between items-center gap-4 py-6 border-t border-slate-100 mt-4 px-4">
              {[
                { label: "Book Service", step: 1, active: true },
                { label: "Provider Assigned", step: 2, active: false },
                { label: "Job Started", step: 3, active: false },
                { label: "Payment & Rating", step: 4, active: false },
              ].map((s, i) => (
                <div key={i} className={`flex items-center gap-3 ${s.active ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${s.active ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-slate-100 text-slate-400'}`}>
                    {s.step}
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{s.label}</span>
                  {i < 3 && <div className="h-px w-12 bg-slate-200 ml-4"></div>}
                </div>
              ))}
            </div>
          </form>
        </div>

        {/* Right column - Summary */}
        <aside className="lg:sticky lg:top-24 h-fit space-y-6">
          <div className="bg-white rounded-2xl shadow-xl shadow-indigo-900/5 border border-slate-200/60 overflow-hidden">
            <div className="bg-slate-900 px-6 py-5 text-white">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Total Estimated Cost</div>
              <div className="text-3xl font-bold flex items-baseline gap-1">
                TBD
                <span className="text-sm font-normal text-slate-400 ml-1">approx</span>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-3">Booking Summary</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 9.4 7.5 4.21"></path><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{serviceLabel}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Standard Service</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{scheduledDisplay}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Scheduled Time</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 line-clamp-2" title={locationDisplay}>
                        {locationDisplay}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">Service Location</div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                form="booking-form"
                disabled={!canSubmit || submitting}
                className="w-full btn-gradient py-4 text-base shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Sending Request...
                  </span>
                ) : "Confirm & Book"}
              </button>
              <p className="text-xs text-center text-slate-400 px-4">
                By booking, you agree to our Terms of Service. No payment is required until the job is done.
              </p>
            </div>
          </div>
        </aside>
      </div>

      <MapPicker
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelect={(pickedLat, pickedLon) => {
          setLat(pickedLat.toFixed(6));
          setLon(pickedLon.toFixed(6));
          showToast("Location pinned", "success");
        }}
      />
    </div>
  );
};

export default CreateBooking;

