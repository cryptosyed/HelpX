import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../api/admin";

export default function AdminProviders() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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

  const toggleSuspend = async (id, suspend) => {
    setActionLoading(true);
    try {
      if (suspend) {
        await adminApi.suspendProvider(id);
      } else {
        await adminApi.activateProvider(id);
      }
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
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
              <th className="px-3 sm:px-4 py-2">Business Name</th>
              <th className="px-3 sm:px-4 py-2">Rating</th>
              <th className="px-3 sm:px-4 py-2">Active</th>
              <th className="px-3 sm:px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 sm:px-4 py-2">
                  <Link
                    to={`/providers/${p.id}`}
                    className="text-primary-start hover:underline font-semibold"
                  >
                    {p.business_name || `Provider #${p.id}`}
                  </Link>
                </td>
                <td className="px-3 sm:px-4 py-2">{p.rating ?? 0}</td>
                <td className="px-3 sm:px-4 py-2">{p.is_suspended ? "Suspended" : "Active"}</td>
                <td className="px-3 sm:px-4 py-2">
                  <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
                    <button
                      disabled={actionLoading}
                      onClick={() => toggleSuspend(p.id, true)}
                      className="px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 h-10"
                    >
                      Suspend
                    </button>
                    <button
                      disabled={actionLoading}
                      onClick={() => toggleSuspend(p.id, false)}
                      className="px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 h-10"
                    >
                      Activate
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

