import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.detail ||
      err.response?.data?.message ||
      err.message ||
      "Request failed";
    return Promise.reject(new Error(message));
  }
);

export const adminApi = {
  dashboard: async () => {
    const [users, providers, reports] = await Promise.all([
      api.get("/admin/users"),
      api.get("/admin/providers"),
      api.get("/admin/reports"),
    ]);
    return {
      users: users.data.items || users.data,
      providers: providers.data,
      reports: reports.data,
    };
  },
  users: () => api.get("/admin/users").then((r) => r.data),
  providers: () => api.get("/admin/providers").then((r) => r.data),
  services: () => api.get("/admin/services").then((r) => r.data),
  reports: () => api.get("/admin/reports").then((r) => r.data),
  suspendProvider: (id) => api.put(`/admin/providers/${id}/suspend`).then((r) => r.data),
  activateProvider: (id) => api.put(`/admin/providers/${id}/unsuspend`).then((r) => r.data),
  approveService: (id) => api.put(`/admin/services/${id}/approve`).then((r) => r.data),
  rejectService: (id) => api.put(`/admin/services/${id}/reject`).then((r) => r.data),
  resolveReport: (id, payload) =>
    api.put(`/admin/reports/${id}/resolve`, payload).then((r) => r.data),
};

