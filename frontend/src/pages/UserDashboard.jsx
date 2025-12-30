import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import PageHeader from "../components/PageHeader";
import StatsCard from "../components/StatsCard";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import Table from "../components/Table";

const statusVariant = (status) => {
  const normalized = (status || "").toLowerCase();
  if (normalized === "pending") return "pending";
  if (normalized === "accepted") return "accepted";
  if (normalized === "rejected" || normalized === "cancelled" || normalized === "declined")
    return "danger";
  if (normalized === "completed") return "success";
  return "default";
};

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch (e) {
    return value;
  }
};

export default function UserDashboard() {
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [pastBookings, setPastBookings] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasFetchedRef = useRef(false); // guard against duplicate fetches in StrictMode

  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Forms
  const [addressForm, setAddressForm] = useState({
    label: "",
    line1: "",
    line2: "",
    city: "",
    pincode: "",
    lat: "",
    lon: "",
  });
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const bookingsRes = await API.get("/bookings/user");

      const now = new Date();
      const bookings = bookingsRes.data || [];
      const upcoming = [];
      const past = [];
      bookings.forEach((b) => {
        const when = b.scheduled_at ? new Date(b.scheduled_at) : null;
        const status = (b.status || "").toLowerCase();
        if (status === "pending" || status === "accepted") {
          if (when && when < now) {
            past.push(b);
          } else {
            upcoming.push(b);
          }
        } else {
          past.push(b);
        }
      });

      setUpcomingBookings(upcoming);
      setPastBookings(past);
      const [profileRes, addressesRes] = await Promise.all([
        API.get("/user/profile").catch(() => ({ data: {} })),
        API.get("/user/addresses").catch(() => ({ data: [] })),
      ]);

      setProfile(profileRes.data);
      setAddresses(addressesRes.data || []);
      setProfileForm({
        name: profileRes.data?.name || "",
        phone: profileRes.data?.phone || "",
      });
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard data");
      // keep existing bookings if an error occurs after a successful load
    } finally {
      setLoading(false);
    }
  }

  async function cancelBooking() {
    if (!selectedBooking) return;
    try {
      // optimistic update
      setUpcomingBookings((prev) =>
        prev.map((b) =>
          b.id === selectedBooking.id ? { ...b, status: "cancelled" } : b
        )
      );
      await API.put(`/bookings/${selectedBooking.id}/cancel`);
      setShowCancelModal(false);
      setSelectedBooking(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to cancel booking");
    }
  }

  async function createAddress() {
    try {
      await API.post("/user/addresses", addressForm);
      setShowAddressModal(false);
      setAddressForm({
        label: "",
        line1: "",
        line2: "",
        city: "",
        pincode: "",
        lat: "",
        lon: "",
      });
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to save address");
    }
  }

  async function deleteAddress(id) {
    if (!confirm("Delete this address?")) return;
    try {
      await API.delete(`/user/addresses/${id}`);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to delete address");
    }
  }

  async function updateProfile() {
    try {
      await API.put("/user/profile", profileForm);
      setShowProfileModal(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to update profile");
    }
  }

  if (loading) {
    return (
      <div className="glass rounded-xl p-6 text-center text-slate-600">
        Loading dashboard...
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
    <div className="page-transition">
      <PageHeader
        title="My Bookings"
        subtitle="Upcoming and past bookings"
        action={
          <button
            onClick={() => setShowProfileModal(true)}
            className="btn-ghost text-sm"
          >
            Edit Profile
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Upcoming Bookings"
          value={upcomingBookings.length}
          icon="📅"
        />
        <StatsCard
          title="Past Bookings"
          value={pastBookings.length}
          icon="✅"
        />
        <StatsCard
          title="Saved Addresses"
          value={addresses.length}
          icon="📍"
        />
      </div>

      {/* Upcoming Bookings */}
      <section className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Upcoming Bookings</h2>
        </div>
        {upcomingBookings.length === 0 ? (
          <div className="text-slate-600 text-center py-8">
            No upcoming bookings. <Link to="/" className="text-primary-start hover:underline">Browse services</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingBookings.map((booking) => (
              <div
                key={booking.id}
                className="glass rounded-xl p-5 border border-slate-200/50 shadow-md"
              >
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      {booking.service?.title || "Service"}
                    </h3>
                    <p className="text-sm text-slate-600 mb-1">
                      <strong>When:</strong> {formatDateTime(booking.scheduled_at)}
                    </p>
                    {booking.notes && (
                      <p className="text-sm text-slate-600 mb-2">
                        <strong>Notes:</strong> {booking.notes}
                      </p>
                    )}
                    <Badge variant={statusVariant(booking.status)}>{booking.status}</Badge>
                  </div>
                  <div className="flex gap-2">
                    {["pending", "accepted"].includes((booking.status || "").toLowerCase()) && (
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowCancelModal(true);
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-red-600 bg-red-50 border-2 border-red-200 hover:bg-red-100 transition-all"
                      >
                        Cancel
                      </button>
                    )}
                    <Link
                      to={`/bookings/${booking.id}`}
                      className="btn-gradient text-sm"
                    >
                      View Booking
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past Bookings */}
      <section className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl mb-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Past Bookings</h2>
        {pastBookings.length === 0 ? (
          <div className="text-slate-600 text-center py-8">No past bookings</div>
        ) : (
          <div className="space-y-4">
            {pastBookings.map((booking) => (
              <div
                key={booking.id}
                className="glass rounded-xl p-5 border border-slate-200/50 shadow-md"
              >
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      {booking.service?.title || "Service"}
                    </h3>
                    <p className="text-sm text-slate-600 mb-1">
                      <strong>When:</strong> {formatDateTime(booking.scheduled_at)}
                    </p>
                    <Badge variant={statusVariant(booking.status)}>{booking.status}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/service/${booking.service_id}`}
                      className="btn-ghost text-sm"
                    >
                      View
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Addresses */}
      <section className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Saved Addresses</h2>
          <button
            onClick={() => setShowAddressModal(true)}
            className="btn-gradient text-sm"
          >
            + Add Address
          </button>
        </div>
        {addresses.length === 0 ? (
          <div className="text-slate-600 text-center py-8">
            No saved addresses. Add one to make booking easier!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="glass rounded-xl p-5 border border-slate-200/50 shadow-md"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-slate-800">{address.label}</h3>
                  <button
                    onClick={() => deleteAddress(address.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Delete
                  </button>
                </div>
                <p className="text-sm text-slate-600">
                  {address.line1}
                  {address.line2 && `, ${address.line2}`}
                  <br />
                  {address.city}, {address.pincode}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Cancel Booking Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false);
          setSelectedBooking(null);
        }}
        title="Cancel Booking"
      >
        <p className="mb-4 text-slate-700">
          Are you sure you want to cancel this booking?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => {
              setShowCancelModal(false);
              setSelectedBooking(null);
            }}
            className="btn-ghost text-sm"
          >
            No, Keep It
          </button>
          <button onClick={cancelBooking} className="btn-gradient text-sm">
            Yes, Cancel
          </button>
        </div>
      </Modal>

      {/* Add Address Modal */}
      <Modal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        title="Add New Address"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700">
              Label (e.g., Home, Work)
            </label>
            <input
              className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={addressForm.label}
              onChange={(e) =>
                setAddressForm({ ...addressForm, label: e.target.value })
              }
              placeholder="Home"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700">
              Address Line 1
            </label>
            <input
              className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={addressForm.line1}
              onChange={(e) =>
                setAddressForm({ ...addressForm, line1: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700">
              Address Line 2 (Optional)
            </label>
            <input
              className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={addressForm.line2}
              onChange={(e) =>
                setAddressForm({ ...addressForm, line2: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                City
              </label>
              <input
                className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
                value={addressForm.city}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, city: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700">
                Pincode
              </label>
              <input
                className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
                value={addressForm.pincode}
                onChange={(e) =>
                  setAddressForm({ ...addressForm, pincode: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={() => setShowAddressModal(false)}
              className="btn-ghost text-sm"
            >
              Cancel
            </button>
            <button onClick={createAddress} className="btn-gradient text-sm">
              Save Address
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        title="Edit Profile"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700">
              Name
            </label>
            <input
              className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={profileForm.name}
              onChange={(e) =>
                setProfileForm({ ...profileForm, name: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700">
              Phone Number
            </label>
            <input
              className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={profileForm.phone}
              onChange={(e) =>
                setProfileForm({ ...profileForm, phone: e.target.value })
              }
              placeholder="+91 9988776655"
            />
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={() => setShowProfileModal(false)}
              className="btn-ghost text-sm"
            >
              Cancel
            </button>
            <button onClick={updateProfile} className="btn-gradient text-sm">
              Save Changes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

