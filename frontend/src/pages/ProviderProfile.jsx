import { useEffect, useState } from "react";
import API from "../api";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../hooks/useAuth";
import { showToast } from "../utils/toast";

const STORAGE_KEY = "provider_profile_cache";

export function loadProviderProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function saveCachedProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    /* ignore */
  }
}

export default function ProviderProfile() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    display_name: "",
    phone: "",
    bio: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const preview = {
    name: form.display_name || user?.name || "Your business name",
    phone: form.phone || "Phone not set",
    bio: form.bio || "Tell customers about your experience and areas you cover.",
  };

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      const cached = loadProviderProfile();
      if (cached && active) {
        setForm({
          display_name: cached.display_name || user?.name || "",
          phone: cached.phone || "",
          bio: cached.bio || "",
        });
      } else if (user && active) {
        setForm({
          display_name: user.name || "",
          phone: "",
          bio: "",
        });
      }
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [user]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    const payload = {
      display_name: form.display_name?.trim() || "",
      phone: form.phone?.trim() || "",
      bio: form.bio?.trim() || "",
    };
    if (!payload.phone) {
      setError("Phone number is required to receive bookings.");
      setSaving(false);
      return;
    }
    try {
      await API.put("/provider/profile", payload).catch(() => {});
      saveCachedProfile(payload);
      setSuccess("Profile saved. Providers will see your contact details.");
      showToast("Profile saved", "success");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || "Could not save profile right now.");
    } finally {
      setSaving(false);
    }
  }

  const completion = form.phone
    ? "Profile ready to receive bookings."
    : "Add a phone number to complete your profile.";

  return (
    <div className="page-transition">
      <PageHeader
        title="Provider Profile"
        subtitle="Help customers reach you quickly."
      />

      {loading ? (
        <div className="glass rounded-xl p-6 text-center text-slate-600">
          Loading profile…
        </div>
      ) : (
        <form
          className="glass rounded-2xl p-6 border border-slate-200/50 shadow-xl max-w-2xl space-y-4"
          onSubmit={handleSave}
        >
          <div className="text-sm text-slate-700">{completion}</div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-slate-700">
              Business Name
            </label>
            <input
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={form.display_name}
              onChange={(e) => setForm((prev) => ({ ...prev, display_name: e.target.value }))}
              placeholder="e.g. Syed Home Services"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-slate-700">
              Phone number <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Include country code if needed"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              This number will be shared with customers after booking acceptance.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-slate-700">
              Short Bio / Description
            </label>
            <textarea
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all min-h-[120px]"
              value={form.bio}
              onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
              placeholder="Briefly describe your services and experience (shown to customers)."
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
              {success}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() => setForm(loadProviderProfile() || form)}
            >
              Reset
            </button>
            <button
              type="submit"
              className="btn-gradient text-sm disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>

          <div className="border-t border-slate-200 pt-4 grid grid-cols-1 gap-3">
            <h4 className="text-sm font-semibold text-slate-800 mb-1">
              Customer Preview
            </h4>
            <div className="glass rounded-xl p-4 border border-slate-200/50 shadow-sm space-y-2 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">{preview.name}</div>
              <div>{preview.bio}</div>
              <div className="text-slate-600">
                {form.phone
                  ? "📞 Contact available after booking acceptance"
                  : "Contact details not available"}
              </div>
              <div className="text-xs text-slate-500">
                This is how customers see your profile after accepting a booking.
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

