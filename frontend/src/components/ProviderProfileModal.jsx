import { useEffect, useRef } from "react";
import Modal from "./Modal";

export default function ProviderProfileModal({
  isOpen,
  onClose,
  loading,
  data,
  error,
  serviceActionId,
  onServiceAction,
  focusSection = "overview",
  onProviderStatusChange,
  actionLoadingId,
  selectedProviderId,
}) {
  const earningsRef = useRef(null);

  useEffect(() => {
    if (isOpen && focusSection === "earnings" && earningsRef.current) {
      earningsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isOpen, focusSection]);

  const effectiveProviderId = selectedProviderId || data?.id;
  const services = data?.services || [];
  const hasServices = services.length > 0;
  const hasServicesCount = (data?.services_count || 0) > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Provider Profile" size="xl">
      {loading && <div className="text-sm text-slate-600">Loading...</div>}
      {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
      {!loading && data && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-800">Admin Actions</div>
            <div className="flex flex-wrap gap-3">
              {data.approved !== true && !data.is_suspended && (
                <button
                  disabled={actionLoadingId === effectiveProviderId}
                  onClick={() => onProviderStatusChange?.(effectiveProviderId, "approved")}
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-60"
                >
                  {actionLoadingId === effectiveProviderId ? "Saving..." : "Approve Provider"}
                </button>
              )}
              {data.approved === true && !data.is_suspended && (
                <button
                  disabled={actionLoadingId === effectiveProviderId}
                  onClick={() => onProviderStatusChange?.(effectiveProviderId, "suspended")}
                  className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
                >
                  {actionLoadingId === effectiveProviderId ? "Saving..." : "Suspend Provider"}
                </button>
              )}
              {data.is_suspended && (
                <button
                  disabled={actionLoadingId === effectiveProviderId}
                  onClick={() => onProviderStatusChange?.(effectiveProviderId, "approved")}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                >
                  {actionLoadingId === effectiveProviderId ? "Saving..." : "Resume Provider"}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-slate-800">{data.name || "—"}</div>
              <div className="text-sm text-slate-600">{data.email}</div>
              {data.profile && (
                <div className="text-sm text-slate-600 mt-1">
                  {data.profile.business_name || "—"}
                  {data.profile.phone ? ` • ${data.profile.phone}` : ""}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {data.approved === true && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">
                  Approved
                </span>
              )}
              {data.approved === false && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded">
                  Rejected
                </span>
              )}
              {data.approved === null && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded">
                  Pending
                </span>
              )}
              {data.is_suspended && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-red-800 bg-red-200 rounded">
                  Suspended
                </span>
              )}
            </div>
          </div>

          {data.profile?.bio && (
            <div className="bg-slate-50 border border-slate-100 rounded p-3 text-sm text-slate-700">
              {data.profile.bio}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-100 rounded p-3">
              <div className="text-xs uppercase text-slate-500">Rating</div>
              <div className="text-xl font-semibold text-slate-800">
                {data.rating?.avg_rating != null ? Number(data.rating.avg_rating).toFixed(1) : "—"}
              </div>
              <div className="text-xs text-slate-500">
                {data.rating?.total_reviews || 0} reviews
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded p-3">
              <div className="text-xs uppercase text-slate-500">Services</div>
              <div className="text-xl font-semibold text-slate-800">{data.services_count ?? 0}</div>
              <div className="text-xs text-slate-500">{data.active_services ?? 0} active</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded p-3">
              <div className="text-xs uppercase text-slate-500">Bookings</div>
              <div className="text-xl font-semibold text-slate-800">
                {data.bookings?.total ?? 0}
              </div>
              <div className="text-xs text-slate-500">
                {data.bookings?.completed ?? 0} completed • {data.bookings?.pending ?? 0} pending
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-100 rounded p-4">
              <div className="text-sm font-semibold text-slate-800 mb-2">Booking summary</div>
              <div className="text-xs text-slate-600 space-y-1">
                <div>Pending: {data.bookings?.pending ?? 0}</div>
                <div>Accepted: {data.bookings?.accepted ?? 0}</div>
                <div>Completed: {data.bookings?.completed ?? 0}</div>
                <div>Cancelled: {data.bookings?.cancelled ?? 0}</div>
                <div>Rejected: {data.bookings?.rejected ?? 0}</div>
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded p-4" ref={earningsRef}>
              <div className="text-sm font-semibold text-slate-800 mb-2">Earnings</div>
              <div className="text-2xl font-semibold text-slate-900">
                ₹{Number(data.earnings?.total_earnings || 0).toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-slate-600">
                {data.earnings?.accepted_bookings || 0} accepted bookings
              </div>
            </div>
          </div>

          <div className="text-sm text-slate-700 space-y-2">
            <div className="font-medium text-slate-800 mb-1">Services Offered</div>
            {(hasServices || hasServicesCount) ? (
              <div className="overflow-x-auto border border-slate-100 rounded">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-500 bg-slate-50">
                    <tr>
                      <th className="py-2 pr-4 pl-3">Service</th>
                      <th className="py-2 pr-4">Price</th>
                      <th className="py-2 pr-4">Radius (km)</th>
                      <th className="py-2 pr-4">Experience (yrs)</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(hasServices ? services : [{ id: "__loading__", title: "Loading services...", category: "", price: null, service_radius_km: null, experience_years: null, is_active: false }]).map((s) => (
                      <tr key={s.id} className="border-t border-gray-100">
                        <td className="py-2 pr-4 pl-3">
                          <div className="font-medium text-slate-800">{s.title || "—"}</div>
                          <div className="text-xs text-slate-500">{s.category || "—"}</div>
                        </td>
                        <td className="py-2 pr-4">
                          {s.price != null ? `₹${Number(s.price).toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          {s.service_radius_km != null ? Number(s.service_radius_km) : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          {s.experience_years != null ? Number(s.experience_years) : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          {s.is_active ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <button
                            disabled={serviceActionId === s.id || s.id === "__loading__"}
                            className="px-3 py-1 text-xs rounded bg-slate-100 text-slate-800 hover:bg-slate-200 disabled:opacity-60"
                            onClick={() => onServiceAction?.(s.id, !s.is_active)}
                          >
                            {serviceActionId === s.id
                              ? "Saving..."
                              : s.is_active
                              ? "Disable"
                              : "Enable"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-slate-500 border border-dashed border-slate-200 rounded p-3">
                No services offered
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

