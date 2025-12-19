import { useEffect, useState } from "react";
import { adminApi } from "../api/admin";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: [], providers: [], reports: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        const data = await adminApi.dashboard();
        setStats(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const cards = [
    { label: "Total Users", value: stats.users?.length || 0 },
    { label: "Total Providers", value: stats.providers?.length || 0 },
    {
      label: "Active Bookings",
      value: stats.providers?.reduce((acc, p) => acc + (p.bookings_count || 0), 0) || 0,
    },
    { label: "Pending Reports", value: (stats.reports || []).filter((r) => r.status !== "resolved").length },
  ];

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
    </div>
  );
}

