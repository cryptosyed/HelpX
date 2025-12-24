import { useEffect, useState } from "react";
import { adminApi } from "../api/admin";
import ProviderProfileModal from "../components/ProviderProfileModal";

export default function AdminProviders() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [providerDetail, setProviderDetail] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");
  const [serviceActionId, setServiceActionId] = useState(null);
  const [focusSection, setFocusSection] = useState("overview");

  const load = async () => {
    try {
      const data = await adminApi.providers();
      setItems(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const fetchProviderDetail = async (providerId) => {
    setModalLoading(true);
    setModalError("");
    try {
      const [detail, servicesResp] = await Promise.all([
        adminApi.providerDetail(providerId),
        adminApi.providerServices(providerId),
      ]);
      const services = servicesResp?.items ?? [];
      setProviderDetail({ ...detail, services });
    } catch (e) {
      setModalError(e.message);
    } finally {
      setModalLoading(false);
    }
  };

  const openModal = async (providerId, section = "overview") => {
    setSelectedProviderId(providerId);
    setFocusSection(section);
    setProviderDetail(null);
    setModalError("");
    setModalOpen(true);
    await fetchProviderDetail(providerId);
  };

  const handleStatusChange = async (providerId, status) => {
    if (actionLoadingId) return;
    setActionLoadingId(providerId);
    try {
      await adminApi.updateProviderStatus(providerId, status);
      await load();
      if (selectedProviderId === providerId) {
        await fetchProviderDetail(providerId);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleServiceToggle = async (providerServiceId, desiredState) => {
    if (serviceActionId) return;
    const confirmMsg = desiredState
      ? "Enable this service for the provider?"
      : "Disable this service for the provider?";
    if (!window.confirm(confirmMsg)) return;
    setServiceActionId(providerServiceId);
    try {
      const updated = await adminApi.updateProviderServiceStatus(providerServiceId, desiredState);
      setProviderDetail((prev) => {
        if (!prev) return prev;
        const services = (prev.services || []).map((svc) =>
          svc.id === providerServiceId ? { ...svc, ...updated } : svc
        );
        return { ...prev, services };
      });
      await load();
    } catch (e) {
      setModalError(e.message);
    } finally {
      setServiceActionId(null);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Providers</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="min-w-full text-left text-sm sm:text-base">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-3 sm:px-4 py-2">Provider</th>
              <th className="px-3 sm:px-4 py-2">Rating</th>
              <th className="px-3 sm:px-4 py-2">Status</th>
              <th className="px-3 sm:px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr>
                <td className="px-3 sm:px-4 py-4 text-slate-500 text-sm" colSpan={4}>
                  No providers found.
                </td>
              </tr>
            )}
            {items.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 sm:px-4 py-2">
                  <button
                    className="text-primary-start hover:underline font-semibold"
                    onClick={() => openModal(p.id, "overview")}
                  >
                    {p.name || p.business_name || `Provider #${p.id}`}
                  </button>
                  <div className="text-xs text-slate-500">{p.email}</div>
                </td>
                <td className="px-3 sm:px-4 py-2">
                  {p.avg_rating != null ? Number(p.avg_rating).toFixed(1) : "—"} ({p.total_reviews ?? 0})
                </td>
                <td className="px-3 sm:px-4 py-2">
                  {p.is_suspended ? (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded">
                      Suspended
                    </span>
                  ) : p.approved ? (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">
                      Approved
                    </span>
                  ) : (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded">
                      Pending
                    </span>
                  )}
                </td>
                <td className="px-3 sm:px-4 py-2">
                  <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                    <button
                      onClick={() => openModal(p.id, "overview")}
                      className="px-3 py-2 text-sm bg-slate-100 text-slate-800 rounded hover:bg-slate-200 h-10"
                    >
                      View
                    </button>
                    <button
                      disabled={actionLoadingId === p.id}
                      onClick={() => handleStatusChange(p.id, p.is_suspended ? "approved" : "suspended")}
                      className="px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 h-10"
                    >
                      {actionLoadingId === p.id
                        ? "Saving..."
                        : p.is_suspended
                        ? "Approve"
                        : "Suspend"}
                    </button>
                    <button
                      onClick={() => openModal(p.id, "earnings")}
                      className="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 h-10"
                    >
                      View Earnings
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProviderProfileModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        loading={modalLoading}
        data={providerDetail}
        error={modalError}
        serviceActionId={serviceActionId}
        onServiceAction={handleServiceToggle}
        focusSection={focusSection}
        onProviderStatusChange={handleStatusChange}
        actionLoadingId={actionLoadingId}
        selectedProviderId={selectedProviderId}
      />
    </div>
  );
}

