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
    <Modal isOpen={isOpen} onClose={onClose} title="Provider Profile" size="2xl">
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 mb-4 text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          {error}
        </div>
      )}

      {!loading && data && (
        <div className="space-y-8">

          {/* Header Section */}
          <div className="flex flex-col md:flex-row gap-6 items-start justify-between border-b border-slate-100 pb-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-2xl">
                {data.name ? data.name.charAt(0).toUpperCase() : "P"}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 leading-tight">{data.name || "Unknown Provider"}</h2>
                <div className="text-sm text-slate-500 font-medium mb-1">{data.email}</div>
                {data.profile?.business_name && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                    🏢 {data.profile.business_name}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                {data.approved === true ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Verified
                  </span>
                ) : data.approved === false ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold text-red-700 bg-red-50 border border-red-100 rounded-full">Rejected</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-full">Pending Approval</span>
                )}
                {data.is_suspended && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold text-red-700 bg-red-50 border border-red-100 rounded-full">⚠️ Suspended</span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 w-full md:w-auto justify-end">
                {data.approved !== true && !data.is_suspended && (
                  <button
                    disabled={actionLoadingId === effectiveProviderId}
                    onClick={() => onProviderStatusChange?.(effectiveProviderId, "approved")}
                    className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg shadow-sm hover:bg-emerald-700 hover:shadow disabled:opacity-70 transition-all w-full md:w-auto"
                  >
                    {actionLoadingId === effectiveProviderId ? "Approving..." : "Approve"}
                  </button>
                )}
                {data.approved === true && !data.is_suspended && (
                  <button
                    disabled={actionLoadingId === effectiveProviderId}
                    onClick={() => onProviderStatusChange?.(effectiveProviderId, "suspended")}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-70 transition-all w-full md:w-auto"
                  >
                    {actionLoadingId === effectiveProviderId ? "Suspending..." : "Suspend"}
                  </button>
                )}
                {data.is_suspended && (
                  <button
                    disabled={actionLoadingId === effectiveProviderId}
                    onClick={() => onProviderStatusChange?.(effectiveProviderId, "approved")}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 hover:shadow disabled:opacity-70 transition-all w-full md:w-auto"
                  >
                    {actionLoadingId === effectiveProviderId ? "Resuming..." : "Resume Service"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Performance</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{data.rating?.avg_rating != null ? Number(data.rating.avg_rating).toFixed(1) : "—"}</span>
                <span className="text-lg text-amber-500">★</span>
              </div>
              <div className="text-sm text-slate-500 mt-1">{data.rating?.total_reviews || 0} customer reviews</div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Engagement</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900">{data.bookings?.total ?? 0}</span>
                <span className="text-sm font-medium text-slate-500">bookings</span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs font-medium">
                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{data.bookings?.completed ?? 0} done</span>
                <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded">{data.bookings?.pending ?? 0} pending</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100" ref={earningsRef}>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Earnings</div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-medium text-slate-500">₹</span>
                <span className="text-3xl font-bold text-slate-900">{Number(data.earnings?.total_earnings || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="text-sm text-slate-500 mt-1 font-medium text-emerald-600">
                {data.earnings?.accepted_bookings || 0} paid bookings
              </div>
            </div>
          </div>

          {data.profile?.bio && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-2">About Provider</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{data.profile.bio}</p>
            </div>
          )}

          {/* Services Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Services Offered</h3>
            {(hasServices || hasServicesCount) ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50/80 text-slate-500 font-medium border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-5 text-left">Service</th>
                      <th className="py-3 px-5 text-left">Pricing</th>
                      <th className="py-3 px-5 text-left">Radius</th>
                      <th className="py-3 px-5 text-left">Experience</th>
                      <th className="py-3 px-5 text-left">Status</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(hasServices ? services : [{ id: "__loading__", title: "Loading services...", category: "", price: null, service_radius_km: null, experience_years: null, is_active: false }]).map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-5">
                          <div className="font-semibold text-slate-900">{s.title || "—"}</div>
                          <div className="text-xs text-slate-500">{s.category || "—"}</div>
                        </td>
                        <td className="py-3 px-5 text-slate-600 font-medium">
                          {s.price != null ? `₹${Number(s.price).toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="py-3 px-5 text-slate-600">
                          {s.service_radius_km != null ? `${s.service_radius_km} km` : "—"}
                        </td>
                        <td className="py-3 px-5 text-slate-600">
                          {s.experience_years != null ? `${s.experience_years} yrs` : "—"}
                        </td>
                        <td className="py-3 px-5">
                          {s.is_active ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
                              <span className="w-1 h-1 rounded-full bg-green-500"></span> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-right">
                          <button
                            disabled={serviceActionId === s.id || s.id === "__loading__"}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${s.is_active
                                ? "bg-white text-red-600 border-slate-200 hover:bg-red-50 hover:border-red-200"
                                : "bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100"
                              } disabled:opacity-50`}
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
              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <div className="text-2xl mb-2">🛠️</div>
                <p className="text-sm font-medium text-slate-900">No services listed yet</p>
                <p className="text-xs text-slate-500">This provider hasn't added any services.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

