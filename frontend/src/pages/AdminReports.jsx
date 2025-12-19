import { useEffect, useState } from "react";
import { adminApi } from "../api/admin";

export default function AdminReports() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      const data = await adminApi.reports();
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

  const openModal = (r) => {
    setModal(r);
    setNotes(r.admin_notes || "");
  };

  const resolve = async (id) => {
    setActionLoading(true);
    try {
      await adminApi.resolveReport(id, { status: "resolved", admin_notes: notes });
      setModal(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reports</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="min-w-full text-left text-sm sm:text-base">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-3 sm:px-4 py-2">Type</th>
              <th className="px-3 sm:px-4 py-2">Target ID</th>
              <th className="px-3 sm:px-4 py-2">Status</th>
              <th className="px-3 sm:px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 sm:px-4 py-2">{r.report_type || r.target_type}</td>
                <td className="px-3 sm:px-4 py-2">{r.target_id}</td>
                <td className="px-3 sm:px-4 py-2 capitalize">{r.status}</td>
                <td className="px-3 sm:px-4 py-2">
                  <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                    <button
                      onClick={() => openModal(r)}
                      className="px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 h-10"
                    >
                      View / Resolve
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4">
          <div className="bg-white rounded shadow max-w-lg w-full p-4 space-y-3">
            <h2 className="text-xl font-semibold">Report #{modal.id}</h2>
            <div className="text-sm text-gray-600">
              <div>Type: {modal.report_type || modal.target_type}</div>
              <div>Target ID: {modal.target_id}</div>
              <div>Status: {modal.status}</div>
              <div>Reason: {modal.reason}</div>
            </div>
            <textarea
              className="w-full border rounded p-2 text-sm"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Admin notes"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setModal(null)}
                className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
              >
                Close
              </button>
              <button
                disabled={actionLoading}
                onClick={() => resolve(modal.id)}
                className="px-3 py-1 text-sm rounded bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

