import Modal from "./Modal";

export default function ProviderProfileModal({
  isOpen,
  onClose,
  loading,
  data,
  serviceActionId,
  onServiceAction,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Provider Profile" size="lg">
      {loading && <div className="text-sm text-slate-600">Loading...</div>}
      {!loading && data && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold text-slate-800">{data.name || "—"}</div>
              <div className="text-sm text-slate-600">{data.email}</div>
            </div>
            <div>
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
            </div>
          </div>

          <div className="text-sm text-slate-700">
            <div className="font-medium text-slate-800 mb-1">Services</div>
            {data.services && data.services.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-500">
                    <tr>
                      <th className="py-2 pr-4">Title</th>
                      <th className="py-2 pr-4">Category</th>
                      <th className="py-2 pr-4">Price</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.services.map((s) => (
                      <tr key={s.id} className="border-t border-gray-100">
                        <td className="py-2 pr-4">{s.title || "—"}</td>
                        <td className="py-2 pr-4">{s.category || "—"}</td>
                        <td className="py-2 pr-4">
                          {s.price != null ? `₹${Number(s.price).toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="py-2 pr-4">
                          {s.approved === true && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">
                              Approved
                            </span>
                          )}
                          {s.approved === false && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded">
                              Rejected
                            </span>
                          )}
                          {s.approved === null && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          {s.approved === true && (
                            <div className="flex gap-2 items-center">
                              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded">
                                Approved
                              </span>
                              <button
                                disabled={serviceActionId === s.id}
                                className="px-3 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
                                onClick={() => onServiceAction?.(s.id, false)}
                              >
                                {serviceActionId === s.id ? "Loading..." : "Reject"}
                              </button>
                            </div>
                          )}
                          {s.approved === false && (
                            <div className="flex gap-2 items-center">
                              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded">
                                Rejected
                              </span>
                              <button
                                disabled={serviceActionId === s.id}
                                className="px-3 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-60"
                                onClick={() => onServiceAction?.(s.id, true)}
                              >
                                {serviceActionId === s.id ? "Loading..." : "Approve"}
                              </button>
                            </div>
                          )}
                          {s.approved === null && (
                            <div className="flex gap-2">
                              <button
                                disabled={serviceActionId === s.id}
                                className="px-3 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-60"
                                onClick={() => onServiceAction?.(s.id, true)}
                              >
                                {serviceActionId === s.id ? "Loading..." : "Approve"}
                              </button>
                              <button
                                disabled={serviceActionId === s.id}
                                className="px-3 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
                                onClick={() => onServiceAction?.(s.id, false)}
                              >
                                {serviceActionId === s.id ? "Loading..." : "Reject"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-slate-500">No services submitted by this provider</div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

