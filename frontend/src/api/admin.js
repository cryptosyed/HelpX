import api from "./client";

export const adminApi = {
  dashboard: async () => {
    const res = await api.get("/admin/stats");
    return res.data;
  },
  users: () => api.get("/admin/users").then((r) => r.data),
  providers: () => api.get("/admin/providers").then((r) => r.data),
  services: () => api.get("/admin/services").then((r) => r.data),
  reports: () => api.get("/admin/reports").then((r) => r.data),
  approveProvider: (id) => api.put(`/admin/providers/${id}/approve`).then((r) => r.data),
  rejectProvider: (id) => api.put(`/admin/providers/${id}/reject`).then((r) => r.data),
  suspendProvider: (id) => api.put(`/admin/providers/${id}/suspend`).then((r) => r.data),
  activateProvider: (id) => api.put(`/admin/providers/${id}/unsuspend`).then((r) => r.data),
  activateService: (id) => api.put(`/admin/services/${id}/activate`).then((r) => r.data),
  deactivateService: (id) => api.put(`/admin/services/${id}/deactivate`).then((r) => r.data),
  approveService: (id) => api.put(`/admin/services/${id}/approve`).then((r) => r.data),
  rejectService: (id) => api.put(`/admin/services/${id}/reject`).then((r) => r.data),
  resolveReport: (id, payload) =>
    api.put(`/admin/reports/${id}/resolve`, payload).then((r) => r.data),
  updateProviderStatus: (id, approved) =>
    api.patch(`/admin/providers/${id}/status`, { approved }).then((r) => r.data),
  resetProvider: (id) => api.post(`/admin/providers/${id}/reset`).then((r) => r.data),
  providerDetail: (id) => api.get(`/admin/providers/${id}/profile`).then((r) => r.data),
  activateService: (id) => api.put(`/admin/services/${id}/activate`).then((r) => r.data),
  deactivateService: (id) => api.put(`/admin/services/${id}/deactivate`).then((r) => r.data),
};

