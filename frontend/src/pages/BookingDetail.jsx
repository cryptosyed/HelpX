import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import API from "../api";
import PageHeader from "../components/PageHeader";

const DEFAULT_CENTER = { lat: 12.9716, lon: 77.5946 };

const statusSteps = ["requested", "accepted", "in_progress", "completed"];

function Timeline({ status }) {
  const normalized = (status || "").toLowerCase();
  const activeIndex = (() => {
    if (normalized === "completed") return 3;
    if (normalized === "cancelled") return 2;
    if (normalized === "accepted") return 1;
    return 0;
  })();

  return (
    <div className="flex flex-wrap gap-3 items-center text-sm text-slate-700">
      {statusSteps.map((step, idx) => (
        <div key={step} className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${
              idx <= activeIndex ? "bg-primary-start" : "bg-slate-300"
            }`}
          />
          <span className={idx <= activeIndex ? "font-semibold text-slate-900" : ""}>
            {step.replace("_", " ")}
          </span>
          {idx < statusSteps.length - 1 && <div className="h-px w-8 bg-slate-300" />}
        </div>
      ))}
      {normalized === "cancelled" && (
        <span className="ml-2 text-red-600 font-semibold">Cancelled</span>
      )}
    </div>
  );
}

export default function BookingDetail() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [providerProfile, setProviderProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await API.get("/bookings");
        if (!active) return;
        const list = res.data || [];
        const found = list.find((b) => String(b.id) === String(bookingId));
        if (!found) {
          setError("We could not find this booking. It may have been updated or removed.");
          return;
        }
        setBooking(found);
      } catch (err) {
        console.error(err);
        if (!active) return;
        const detail = err.response?.data?.detail;
        setError(detail || "Unable to load booking right now.");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [bookingId]);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!booking?.provider_id) {
        setProviderProfile(null);
        return;
      }
      setProfileLoading(true);
      setProfileError(null);
      try {
        const res = await API.get("/provider/profile", {
          params: { provider_id: booking.provider_id },
        });
        if (!active) return;
        setProviderProfile(res.data || null);
      } catch (err) {
        if (!active) return;
        const detail = err.response?.data?.detail;
        setProfileError(detail || "Unable to load provider details right now.");
      } finally {
        if (active) setProfileLoading(false);
      }
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, [booking?.provider_id]);

  const title =
    booking?.service_title ||
    booking?.service?.title ||
    "Service booked (details confirmed at booking time)";

  const locationText =
    booking?.user_address ||
    booking?.location ||
    "Location selected during booking";

  const status = booking?.status || "pending";

  const providerInfo = useMemo(() => {
    if (!booking) return null;
    const businessName =
      providerProfile?.business_name ||
      booking.provider?.business_name ||
      null;
    const providerName =
      businessName ||
      booking.provider?.name ||
      booking.provider?.display_name ||
      null;
    const phone = providerProfile?.phone || booking.provider?.phone || null;

    if (!booking.provider_id && !providerProfile) return null;
    return {
      name: providerName || "Assigned provider",
      business: businessName,
      phone,
    };
  }, [booking, providerProfile]);

  const mapCoords = useMemo(() => {
    const lat = booking?.user_lat;
    const lon = booking?.user_lon;
    if (lat != null && lon != null) return { lat: Number(lat), lon: Number(lon) };
    return null;
  }, [booking]);

  return (
    <div className="page-transition">
      <PageHeader
        title="Booking Details"
        subtitle="Your booking is confirmed. Providers have been notified."
        action={
          <button className="btn-ghost text-sm" onClick={() => navigate(-1)}>
            Back
          </button>
        }
      />

      {loading && (
        <div className="glass rounded-xl p-6 text-center text-slate-600">Loading booking…</div>
      )}
      {error && (
        <div className="glass rounded-xl p-6 text-center text-red-600 bg-red-50 border border-red-200">
          {error}
        </div>
      )}
      {!loading && !error && booking && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="glass rounded-2xl p-6 border border-slate-200/50 shadow-xl lg:col-span-2">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
            <p className="text-sm text-slate-600 mb-6">
              Booking ID: #{booking.id}
            </p>

            <div className="space-y-3 text-sm text-slate-700">
              <div>
                <strong>Status:</strong> <span className="capitalize">{status}</span>
              </div>
              <div>
                <strong>Date & time:</strong>{" "}
                {booking.scheduled_at
                  ? new Date(booking.scheduled_at).toLocaleString()
                  : "Not specified"}
              </div>
              <div>
                <strong>Notes:</strong>{" "}
                {booking.notes ? booking.notes : "No notes added."}
              </div>
              <div>
                <strong>Location:</strong> {locationText}
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Status timeline</h3>
              <Timeline status={status} />
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Map preview</h3>
              {mapCoords ? (
                <div className="h-64 rounded-xl overflow-hidden border border-slate-200">
                  <MapContainer
                    center={[mapCoords.lat, mapCoords.lon]}
                    zoom={14}
                    className="h-full w-full"
                    scrollWheelZoom={false}
                    dragging={false}
                    doubleClickZoom={false}
                    zoomControl={false}
                    keyboard={false}
                    touchZoom={false}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    <Marker position={[mapCoords.lat, mapCoords.lon]} />
                  </MapContainer>
                  <div className="text-xs text-slate-600 mt-2">
                    Location shared with the provider for this booking.
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-600">
                  Map preview unavailable. Location will be shared with the provider.
                </div>
              )}
            </div>
          </section>

          <section className="glass rounded-2xl p-6 border border-slate-200/50 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-slate-800">Provider</h3>
            {profileLoading && (
              <div className="text-sm text-slate-600">Loading provider details…</div>
            )}
            {profileError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                {profileError}
              </div>
            )}
            {!profileLoading && !profileError && providerInfo ? (
              <div className="space-y-2 text-sm text-slate-700">
                <div>
                  <strong>Name:</strong> {providerInfo.name}
                </div>
                {providerInfo.business && (
                  <div>
                    <strong>Business:</strong> {providerInfo.business}
                  </div>
                )}
                {providerInfo.phone && (
                  <div>
                    <strong>Phone:</strong> {providerInfo.phone}
                  </div>
                )}
                <ContactCTA status={status} phone={providerInfo.phone} />
              </div>
            ) : null}
            {!profileLoading && !profileError && !providerInfo && (
              <div className="text-sm text-slate-600">
                Provider contact details will be shared once your booking is accepted.
              </div>
            )}

            <div className="pt-2 border-t border-slate-200">
              <h4 className="font-semibold text-slate-800 mb-1">Need help?</h4>
              <p className="text-sm text-slate-600">
                Your booking is confirmed. Providers have been notified. If anything looks off, you can refresh your bookings list.
              </p>
              <Link to="/user/dashboard" className="btn-ghost text-sm mt-2 inline-block">
                Back to My Bookings
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function ContactCTA({ status, phone }) {
  const normalized = (status || "").toLowerCase();
  const ready = normalized === "accepted" || normalized === "confirmed";

  if (!ready) {
    return (
      <div className="text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded-lg p-3">
        Contact details are shared after booking acceptance.
      </div>
    );
  }

  if (!phone) {
    return (
      <div className="text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded-lg p-3">
        Provider contact details will appear once they complete their profile.
      </div>
    );
  }

  return (
    <a className="btn-gradient text-sm w-full inline-block text-center" href={`tel:${phone}`}>
      📞 Call Provider
    </a>
  );
}

