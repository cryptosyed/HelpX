import { useEffect, useState } from "react";
import { adminApi } from "../api/admin";

export default function AdminServices() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      const data = await adminApi.services();
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

  const approve = async (id) => {
    setActionLoading(true);
    try {
      await adminApi.approveService(id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const reject = async (id) => {
    setActionLoading(true);
    try {
      await adminApi.rejectService(id);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Services</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="min-w-full text-left text-sm sm:text-base">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-3 sm:px-4 py-2">Title</th>
              <th className="px-3 sm:px-4 py-2">Provider</th>
              <th className="px-3 sm:px-4 py-2">Approved</th>
              <th className="px-3 sm:px-4 py-2">Flagged</th>
              <th className="px-3 sm:px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-3 sm:px-4 py-2">{s.title}</td>
                <td className="px-3 sm:px-4 py-2">{s.provider_id}</td>
                <td className="px-3 sm:px-4 py-2">{s.approved ? "Yes" : "No"}</td>
                <td className="px-3 sm:px-4 py-2">{s.flagged ? "Yes" : "No"}</td>
                <td className="px-3 sm:px-4 py-2">
                  <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                    <button
                      disabled={actionLoading}
                      onClick={() => approve(s.id)}
                      className="px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 h-10"
                    >
                      Approve
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => reject(s.id)}
                      className="px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 h-10"
                    >
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

