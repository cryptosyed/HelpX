import axios, { AxiosError, AxiosInstance } from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Centralized Axios client with auth + basic 401 handling hook placeholder
const client: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 401) {
      // Placeholder: wire this to a global logout/redirect hook
      console.warn("Unauthorized (401) - consider redirecting to login");
    }
    return Promise.reject(error);
  }
);

export default client;

