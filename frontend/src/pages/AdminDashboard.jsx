import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import API from "../api";
import PageHeader from "../components/PageHeader";
import StatsCard from "../components/StatsCard";
import Table from "../components/Table";
import Badge from "../components/Badge";
import Modal from "../components/Modal";
import { LineChartComponent, PieChartComponent } from "../components/Chart";
import { useAuthContext } from "../contexts/AuthContext";

export default function AdminDashboard() {
  const auth = useAuthContext();
  const normalizedRole = (auth.role || "").toLowerCase();
  const [activeSection, setActiveSection] = useState("overview");
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [pendingProviders, setPendingProviders] = useState([]);
  const [flaggedServices, setFlaggedServices] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modals
  const [showUserModal, setShowUserModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  
  // Forms
  const [userForm, setUserForm] = useState({ role: "user", is_active: true, name: "" });
  const [reportForm, setReportForm] = useState({ status: "resolved", admin_notes: "" });

  useEffect(() => {
    if (normalizedRole === "admin") {
      loadData();
    }
  }, [activeSection, normalizedRole]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [analyticsRes, usersRes, providersRes, servicesRes, reportsRes] = await Promise.all([
        API.get("/admin/analytics").catch(() => ({ data: null })),
        API.get("/admin/users?page=1&page_size=50").catch(() => ({ data: { items: [] } })),
        API.get("/admin/providers/pending").catch(() => ({ data: [] })),
        API.get("/admin/services/flagged").catch(() => ({ data: [] })),
        API.get("/admin/reports").catch(() => ({ data: [] })),
      ]);
      
      setAnalytics(analyticsRes.data);
      setUsers(usersRes.data?.items || []);
      setPendingProviders(providersRes.data || []);
      setFlaggedServices(servicesRes.data || []);
      setReports(reportsRes.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  async function updateUser() {
    if (!selectedUser) return;
    try {
      await API.put(`/admin/users/${selectedUser.id}`, userForm);
      setShowUserModal(false);
      setSelectedUser(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to update user");
    }
  }

  async function verifyProvider(id) {
    try {
      await API.put(`/admin/providers/${id}/verify`);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to verify provider");
    }
  }

  async function rejectProvider(id) {
    try {
      await API.put(`/admin/providers/${id}/reject`);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to reject provider");
    }
  }

  async function approveService(id) {
    try {
      await API.put(`/admin/services/${id}/approve`);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to approve service");
    }
  }

  async function rejectService(id) {
    try {
      await API.put(`/admin/services/${id}/reject`);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to reject service");
    }
  }

  async function resolveReport() {
    if (!selectedReport) return;
    try {
      await API.put(`/admin/reports/${selectedReport.id}/resolve`, reportForm);
      setShowReportModal(false);
      setSelectedReport(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to resolve report");
    }
  }

  const sections = [
    { id: "overview", label: "Overview" },
    { id: "users", label: "Users" },
    { id: "providers", label: "Providers" },
    { id: "services", label: "Services" },
    { id: "reports", label: "Reports" },
  ];

  const bookingsChartData = analytics?.bookings_chart || [];
  const rolesData = [
    { name: "Users", value: analytics ? analytics.total_users - analytics.total_providers : 0 },
    { name: "Providers", value: analytics?.total_providers || 0 },
  ];

  if (auth.isLoading) {
    return (
      <div className="glass rounded-xl p-6 text-center text-slate-600">
        Loading...
      </div>
    );
  }

  if (normalizedRole !== "admin") {
    return <Navigate to="/" replace />;
  }

  if (loading && !analytics) {
    return (
      <div className="glass rounded-xl p-6 text-center text-slate-600">
        Loading admin dashboard...
      </div>
    );
  }

  return (
    <div className="page-transition">
      <PageHeader title="Admin Dashboard" />

      {/* Navigation */}
      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-4 py-2 font-medium text-sm transition-all ${
              activeSection === section.id
                ? "text-primary-start border-b-2 border-primary-start"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="glass rounded-xl p-6 text-center text-red-600 bg-red-50 border border-red-200 mb-6">
          {error}
        </div>
      )}

      {/* Overview Section */}
      {activeSection === "overview" && analytics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Users"
              value={analytics.total_users}
              icon="👥"
              gradient
            />
            <StatsCard
              title="Total Providers"
              value={analytics.total_providers}
              icon="🏢"
            />
            <StatsCard
              title="Total Services"
              value={analytics.total_services}
              icon="🔧"
            />
            <StatsCard
              title="Total Bookings"
              value={analytics.total_bookings}
              icon="📅"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Revenue</h3>
              <div className="text-4xl font-bold text-gradient mb-2">
                ₹{analytics.revenue.toLocaleString("en-IN")}
              </div>
              <p className="text-sm text-slate-600">From accepted bookings</p>
            </div>
            <div className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Active Users (24h)</h3>
              <div className="text-4xl font-bold text-gradient mb-2">
                {analytics.active_users_24h}
              </div>
              <p className="text-sm text-slate-600">Users with bookings in last 24 hours</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl">
              <h3 className="text-xl font-bold text-slate-800 mb-4">Bookings Trend (30 days)</h3>
              <div className="h-64">
                <LineChartComponent data={bookingsChartData} dataKey="count" nameKey="date" />
              </div>
            </div>
            <div className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl">
              <h3 className="text-xl font-bold text-slate-800 mb-4">User Roles Distribution</h3>
              <div className="h-64">
                <PieChartComponent data={rolesData} dataKey="value" nameKey="name" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Users Section */}
      {activeSection === "users" && (
        <div className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">User Management</h2>
          <Table
            headers={["ID", "Email", "Name", "Role", "Status", "Actions"]}
            rows={users}
            emptyMessage="No users found"
            renderRow={(user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{user.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{user.name || "—"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Badge variant={user.role === "admin" ? "info" : user.role === "provider" ? "warning" : "default"}>
                    {user.role}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Badge variant={user.is_active ? "success" : "danger"}>
                    {user.is_active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setUserForm({ role: user.role, is_active: user.is_active, name: user.name || "" });
                      setShowUserModal(true);
                    }}
                    className="btn-ghost text-xs"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            )}
          />
        </div>
      )}

      {/* Providers Section */}
      {activeSection === "providers" && (
        <div className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Provider Verification Queue</h2>
          {pendingProviders.length === 0 ? (
            <div className="text-slate-600 text-center py-8">No pending providers</div>
          ) : (
            <div className="space-y-4">
              {pendingProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="glass rounded-xl p-5 border border-slate-200/50 shadow-md"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">
                        {provider.business_name || "Unnamed Business"}
                      </h3>
                      <p className="text-sm text-slate-600 mb-1">
                        Provider ID: {provider.id}
                      </p>
                      {provider.bio && (
                        <p className="text-sm text-slate-600 mb-2">{provider.bio}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => verifyProvider(provider.id)}
                        className="btn-gradient text-sm"
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => rejectProvider(provider.id)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-red-600 bg-red-50 border-2 border-red-200 hover:bg-red-100 transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Services Section */}
      {activeSection === "services" && (
        <div className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Flagged Services</h2>
          {flaggedServices.length === 0 ? (
            <div className="text-slate-600 text-center py-8">No flagged services</div>
          ) : (
            <div className="space-y-4">
              {flaggedServices.map((service) => (
                <div
                  key={service.id}
                  className="glass rounded-xl p-5 border border-slate-200/50 shadow-md"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 mb-2">
                        {service.title}
                      </h3>
                      <p className="text-sm text-slate-600 mb-2">{service.description}</p>
                      {service.flag_reason && (
                        <p className="text-sm text-red-600 mb-2">
                          <strong>Flag Reason:</strong> {service.flag_reason}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveService(service.id)}
                        className="btn-gradient text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectService(service.id)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-red-600 bg-red-50 border-2 border-red-200 hover:bg-red-100 transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reports Section */}
      {activeSection === "reports" && (
        <div className="glass rounded-2xl p-7 border border-slate-200/50 shadow-xl mb-8">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Reports Management</h2>
          <Table
            headers={["ID", "Type", "Target ID", "Reason", "Status", "Actions"]}
            rows={reports}
            emptyMessage="No reports"
            renderRow={(report) => (
              <tr key={report.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{report.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Badge variant="info">{report.report_type}</Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{report.target_id}</td>
                <td className="px-6 py-4 text-sm text-slate-700 max-w-xs truncate">{report.reason}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Badge variant={report.status === "resolved" ? "success" : "pending"}>
                    {report.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {report.status === "pending" && (
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setReportForm({ status: "resolved", admin_notes: "" });
                        setShowReportModal(true);
                      }}
                      className="btn-ghost text-xs"
                    >
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            )}
          />
        </div>
      )}

      {/* Edit User Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUser(null);
        }}
        title="Edit User"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700">Name</label>
            <input
              className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={userForm.name}
              onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700">Role</label>
            <select
              className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
            >
              <option value="user">User</option>
              <option value="provider">Provider</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={userForm.is_active}
                onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm font-semibold text-slate-700">Active</span>
            </label>
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={() => {
                setShowUserModal(false);
                setSelectedUser(null);
              }}
              className="btn-ghost text-sm"
            >
              Cancel
            </button>
            <button onClick={updateUser} className="btn-gradient text-sm">
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      {/* Resolve Report Modal */}
      <Modal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setSelectedReport(null);
        }}
        title="Resolve Report"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700">Status</label>
            <select
              className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={reportForm.status}
              onChange={(e) => setReportForm({ ...reportForm, status: e.target.value })}
            >
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700">Admin Notes</label>
            <textarea
              className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all min-h-[100px] resize-y"
              value={reportForm.admin_notes}
              onChange={(e) => setReportForm({ ...reportForm, admin_notes: e.target.value })}
              placeholder="Add notes about resolution..."
            />
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={() => {
                setShowReportModal(false);
                setSelectedReport(null);
              }}
              className="btn-ghost text-sm"
            >
              Cancel
            </button>
            <button onClick={resolveReport} className="btn-gradient text-sm">
              Resolve
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

