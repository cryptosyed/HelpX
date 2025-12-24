import { useEffect, useState } from "react";
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
    { label: "Total Users", value: stats?.total_users || 0 },
    { label: "Total Providers", value: stats?.total_providers || 0 },
    { label: "Active Bookings", value: stats?.active_bookings || 0 },
    { label: "Pending Reports", value: stats?.pending_reports || 0 },
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

  if (!providers) {
    return <div className="text-sm text-slate-600 p-4">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white shadow rounded p-4">
            <div className="text-sm text-gray-500">{c.label}</div>
            <div className="text-2xl font-semibold">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white shadow rounded p-4">
        <div className="text-lg font-semibold mb-3">Providers</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Rating</th>
                <th className="py-2 pr-4">Reviews</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(providers || []).map((p) => (
                <tr key={p.id ?? p.provider_id} className="border-t border-gray-100">
                  <td className="py-2 pr-4">
                    <button
                      className="text-indigo-600 hover:text-indigo-800"
                      onClick={() => openProfile(p)}
                    >
                      {p.name || "—"}
                    </button>
                  </td>
                  <td className="py-2 pr-4">{p.email || "—"}</td>
                  <td className="py-2 pr-4">{p.avg_rating != null ? p.avg_rating.toFixed(1) : "—"}</td>
                  <td className="py-2 pr-4">{p.total_reviews ?? 0}</td>
                  <td className="py-2 pr-4">
                    {(() => {
                      if (p.approved === true) {
                        return (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">
                            Approved
                          </span>
                        );
                      }
                      if (p.approved === false) {
                        return (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded">
                            Rejected
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded">
                          Pending
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap gap-2">
                      {p.approved !== true && !p.is_suspended && (
                        <button
                          className="px-3 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200"
                          onClick={() => handleProviderStatus(p.id, "approved")}
                        >
                          Approve
                        </button>
                      )}
                      {p.approved === true && !p.is_suspended && (
                        <button
                          disabled={actionLoadingId === p.id}
                          className="px-3 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
                          onClick={() => handleProviderStatus(p.id, "suspended")}
                        >
                          {actionLoadingId === p.id ? "Saving..." : "Suspend"}
                        </button>
                      )}
                      {p.is_suspended && (
                        <button
                          disabled={actionLoadingId === p.id}
                          className="px-3 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-60"
                          onClick={() => handleProviderStatus(p.id, "approved")}
                        >
                          {actionLoadingId === p.id ? "Saving..." : "Resume"}
                        </button>
                      )}
                      <button
                        disabled={resetLoading}
                        className="px-3 py-1 text-xs rounded bg-yellow-100 text-yellow-800 hover:bg-yellow-200 disabled:opacity-60"
                        onClick={() => handleProviderReset(p.id)}
                      >
                        {resetLoading ? "Loading..." : "Reset"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {providers.length === 0 && !loading && (
                <tr>
                  <td className="py-3 text-gray-500" colSpan={6}>
                    No providers found
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