// frontend/src/api.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
  withCredentials: false,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for debugging
API.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    return config;
  },
  (error) => {
    console.error("[API] Request error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
API.interceptors.response.use(
  (response) => {
    console.log(`[API] Response from ${response.config.url}:`, response.status, response.data);
    return response;
  },
  (error) => {
    console.error(`[API] Error from ${error.config?.url}:`, error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

const TOKEN_KEY = "token";

// safe setter for auth header + localStorage
API.setToken = (token) => {
  if (!token || token === "null") {
    API.clearToken();
    return;
  }
  API.defaults.headers.common.Authorization = `Bearer ${token}`;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.warn("ls write failed", e);
  }
};

// clear auth header + storage
API.clearToken = () => {
  delete API.defaults.headers.common.Authorization;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (e) {
    /* ignore */
  }
};

// init token from storage (only if valid)
const saved = (() => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    return null;
  }
})();

if (saved && saved !== "null") {
  API.setToken(saved);
} else {
  API.clearToken();
}

export default API;
