import axios from "axios";

const client = axios.create({
  baseURL: "http://127.0.0.1:8000",
  timeout: 10000,
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

const TOKEN_KEY = "token";

// Attach Authorization header from localStorage on every request
client.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token && token !== "null") {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      /* ignore storage errors */
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global 401 handler: redirect to login
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default client;

