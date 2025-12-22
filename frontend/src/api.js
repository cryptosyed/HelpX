// frontend/src/api.js
import client from "./api/client";

const TOKEN_KEY = "token";

const API = client;

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
