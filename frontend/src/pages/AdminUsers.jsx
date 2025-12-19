import { useEffect, useState } from "react";
import { adminApi } from "../api/admin";

export default function AdminUsers() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await adminApi.users();
        const users = data.items || data;
        setItems(users);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div className="bg-white shadow rounded overflow-x-auto">
        <table className="min-w-full text-left text-sm sm:text-base">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="px-3 sm:px-4 py-2">Email</th>
              <th className="px-3 sm:px-4 py-2">Role</th>
              <th className="px-3 sm:px-4 py-2">Active</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 sm:px-4 py-2">{u.email}</td>
                <td className="px-3 sm:px-4 py-2 capitalize">{u.role}</td>
                <td className="px-3 sm:px-4 py-2">{u.is_active ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

