import api from "./client";

export const adminApi = {
  dashboard: () => api.get("/admin/stats").then((r) => r.data),

  // Providers
  providers: () => api.get("/admin/providers").then((r) => r.data),
  providerDetail: (id) => api.get(`/admin/providers/${id}`).then((r) => r.data),
  providerServices: (id) =>
    api.get(`/admin/providers/${id}/services`).then((r) => r.data),

  // Provider actions
  updateProviderStatus: (id, status) =>
    api.put(`/admin/providers/${id}/status`, { status }).then((r) => r.data),
  resetProvider: (id) =>
    api.post(`/admin/providers/${id}/reset`).then((r) => r.data),

  updateProviderServiceStatus: (id, is_active) =>
    api.put(`/admin/services/${id}/status`, { is_active }).then((r) => r.data),
};