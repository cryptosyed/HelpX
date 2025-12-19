import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api";
import { useAuthContext } from "../contexts/AuthContext";
import { showToast } from "../utils/toast";

export default function CreateService() {
  const navigate = useNavigate();
  const auth = useAuthContext();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    price: "",
    lat: "",
    lon: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (auth.isLoading) return;

    if (!auth.isAuthenticated) {
      navigate("/login");
      return;
    }

    // Only providers and admins can create services
    if (!auth.isProvider) {
      showToast("Only providers can create services.", "error");
      navigate("/");
      return;
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.isProvider, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setMessage("Title is required.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || null,
        category: form.category || null,
        price: form.price === "" ? null : Number(form.price),
        lat: form.lat === "" ? null : Number(form.lat),
        lon: form.lon === "" ? null : Number(form.lon),
      };
      await API.post("/services/", payload);
      showToast("Service created successfully!", "success");
      navigate("/");
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        const errorMsg = "You must be signed in as a provider to create a service.";
        setMessage(errorMsg);
        showToast(errorMsg, "error");
      } else {
        const errorMsg = err.response?.data?.detail || "Could not create service.";
        setMessage(errorMsg);
        showToast(errorMsg, "error");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-transition">
      <div className="flex justify-between items-center gap-4 flex-wrap mb-6">
        <h1 className="text-3xl font-bold text-gradient m-0">Create service</h1>
      </div>

      <form className="glass rounded-2xl p-8 max-w-2xl mx-auto border border-slate-200/50 shadow-xl" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="svc-title">
              Title
            </label>
            <input
              id="svc-title"
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="svc-price">
              Price
            </label>
            <input
              id="svc-price"
              type="number"
              min="0"
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="svc-category">
            Category
          </label>
          <input
            id="svc-category"
            className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="svc-description">
            Description
          </label>
          <textarea
            id="svc-description"
            className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all min-h-[120px] resize-y"
            rows={4}
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="svc-lat">
              Latitude
            </label>
            <input
              id="svc-lat"
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={form.lat}
              onChange={(e) => setForm({ ...form, lat: e.target.value })}
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="svc-lon">
              Longitude
            </label>
            <input
              id="svc-lon"
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={form.lon}
              onChange={(e) => setForm({ ...form, lon: e.target.value })}
              inputMode="decimal"
            />
          </div>
        </div>

        {message && (
          <div className="mb-6 p-3 rounded-lg text-sm text-red-600 bg-red-50 border border-red-200">
            {message}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => navigate("/")}
          >
            Cancel
          </button>
          <button type="submit" className="btn-gradient disabled:opacity-50 disabled:cursor-not-allowed" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
