import { useEffect, useState } from "react";
const formatId = (id) => {
  if (id === null || id === undefined) return "—";
  const str = String(id);
  return str.length > 8 ? `${str.slice(0, 8)}…` : str;
};
import { adminApi } from "../api/admin";
import { showToast } from "../utils/toast";
import ProviderProfileModal from "../components/ProviderProfileModal";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_users: 0,
    total_providers: 0,
    active_bookings: 0,
    pending_reports: 0,
  });
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [modalError, setModalError] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [serviceActionId, setServiceActionId] = useState(null);

  useEffect(() => {
    const run = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Admin authentication required");
        setLoading(false);
        return;
      }
      try {
        const [statsRes, providersRes] = await Promise.all([
          adminApi.dashboard(),
          adminApi.providers(),
        ]);
        setStats(statsRes);
        setProviders(providersRes || []);
      } catch (e) {
        if (e.status === 401 || e.status === 403) {
          setError("Unauthorized admin access");
        } else {
          setError(e.message || "Network Error");
        }
        console.error("Admin dashboard error", {
          status: e.status,
          message: e.message,
          response: e.response?.data,
        });
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const cards = [
    {
      label: "Total Users",
      value: stats?.total_users || 0,
      icon: "👥",
      gradient: "from-blue-500 to-indigo-500"
    },
    {
      label: "Total Providers",
      value: stats?.total_providers || 0,
      icon: "🛠️",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      label: "Active Bookings",
      value: stats?.active_bookings || 0,
      icon: "📅",
      gradient: "from-emerald-500 to-teal-500"
    },
    {
      label: "Pending Reports",
      value: stats?.pending_reports || 0,
      icon: "⚠️",
      gradient: "from-amber-500 to-orange-500"
    },
  ];

  const openProfile = async (provider) => {
    if (!provider?.id) return;
    setSelectedProvider(provider);
    setIsModalOpen(true);
    setProfileLoading(true);
    setProfileData(null);
    setModalError("");
    try {
      const [detail, servicesResp] = await Promise.all([
        adminApi.providerDetail(provider.id),
        adminApi.providerServices(provider.id),
      ]);
      setProfileData({ ...detail, services: servicesResp?.items ?? [] });
    } catch (e) {
      console.error("Provider detail load failed", e);
      setModalError(e.response?.data?.detail || e.message || "Failed to load provider");
      setIsModalOpen(false);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProviderStatus = async (providerId, status) => {
    setActionLoadingId(providerId);
    try {
      await adminApi.updateProviderStatus(providerId, status);
      const refreshed = await adminApi.providers();
      setProviders(refreshed || []);
      if (selectedProvider?.id === providerId) {
        await openProfile({ id: providerId });
      }
      const msg =
        status === "approved"
          ? "Provider approved"
          : status === "suspended"
            ? "Provider suspended"
            : "Provider set to pending";
      showToast(msg, "success");
    } catch (e) {
      console.error("Provider status update failed", e);
      showToast(e.response?.data?.detail || "Action failed", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleProviderReset = async (providerId) => {
    if (!window.confirm("Reset this provider back to pending?")) return;
    setResetLoading(true);
    try {
      await adminApi.resetProvider(providerId);
      const refreshed = await adminApi.providers();
      setProviders(refreshed || []);
      if (selectedProvider?.id === providerId) {
        await openProfile({ id: providerId });
      }
      showToast("Provider reset to pending", "success");
    } catch (e) {
      console.error("Provider reset failed", e);
      showToast(e.response?.data?.detail || e.message || "Action failed", "error");
    } finally {
      setResetLoading(false);
    }
  };

  const handleServiceToggle = async (serviceId, desiredState) => {
    if (!profileData) return;
    if (!desiredState && !window.confirm("Disable this service?")) return;
    setServiceActionId(serviceId);
    try {
      const updated = await adminApi.updateProviderServiceStatus(serviceId, desiredState);
      setProfileData((prev) => {
        if (!prev) return prev;
        const updatedServices = (prev.services || []).map((s) =>
          s.id === serviceId ? { ...s, ...updated } : s
        );
        return { ...prev, services: updatedServices };
      });
      showToast(desiredState ? "Service enabled" : "Service disabled", "success");
    } catch (e) {
      console.error("Service toggle failed", e);
      showToast(e.response?.data?.detail || e.message || "Action failed", "error");
    } finally {
      setServiceActionId(null);
    }
  };

  if (!providers && loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <div className="text-sm text-slate-500 font-medium px-4 py-2 bg-white rounded-lg border border-slate-200 shadow-sm">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${c.gradient} opacity-10 rounded-bl-full transform translate-x-4 -translate-y-4 group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-2xl">{c.icon}</span>
                <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${c.gradient} opacity-20`} />
              </div>
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">{c.label}</div>
              <div className="text-3xl font-bold text-slate-900">{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Providers Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">All Providers</h2>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">{providers?.length || 0} Total</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Rating</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(providers || []).map((p) => (
                <tr key={p.id ?? p.provider_id ?? Math.random()} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <button
                      className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-left"
                      onClick={() => openProfile(p)}
                    >
                      {p.name || "—"}
                    </button>
                    <div className="text-xs text-slate-400 mt-0.5">ID: {formatId(p.id ?? p.provider_id)}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{p.email || "—"}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-500">★</span>
                      <span className="font-medium text-slate-700">{p.avg_rating != null ? p.avg_rating.toFixed(1) : "—"}</span>
                      <span className="text-slate-400 text-xs">({p.total_reviews ?? 0})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      if (p.approved === true) {
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Approved
                          </span>
                        );
                      }
                      if (p.approved === false) {
                        return (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-100 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Rejected
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          Pending
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openProfile(p)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                      >
                        Details
                      </button>

                      {p.approved !== true && !p.is_suspended && (
                        <button
                          className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                          onClick={() => handleProviderStatus(p.id, "approved")}
                        >
                          Approve
                        </button>
                      )}
                      {p.approved === true && !p.is_suspended && (
                        <button
                          disabled={actionLoadingId === p.id}
                          className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
                          onClick={() => handleProviderStatus(p.id, "suspended")}
                        >
                          {actionLoadingId === p.id ? "..." : "Suspend"}
                        </button>
                      )}

                      {/* Reset Action (hidden behind hover or extra menu usually, but inline here for utility) */}
                      {(p.approved === false || p.is_suspended) && (
                        <button
                          disabled={resetLoading}
                          className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
                          onClick={() => handleProviderReset(p.id)}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {providers.length === 0 && !loading && (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-500" colSpan={5}>
                    <div className="text-4xl mb-2">📂</div>
                    <p>No providers found in the system.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedProvider && (
        <ProviderProfileModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          loading={profileLoading}
          data={profileData}
          error={modalError}
          serviceActionId={serviceActionId}
          onServiceAction={handleServiceToggle}
          onProviderStatusChange={handleProviderStatus}
          actionLoadingId={actionLoadingId}
          selectedProviderId={selectedProvider?.id}
        />
      )}
    </div>
  );
}