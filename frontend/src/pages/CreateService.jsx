import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import API from "../api";
import { useAuthContext } from "../context/AuthContext";
import { showToast } from "../utils/toast";

export default function CreateService() {
  const navigate = useNavigate();
  const auth = useAuthContext();
  const [form, setForm] = useState({
    service_id: "",
    price: "",
    service_radius_km: "",
    experience_years: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [globalServices, setGlobalServices] = useState([]);
  const [loadingGlobals, setLoadingGlobals] = useState(true);

  useEffect(() => {
    if (auth.isLoading) return;

    if (!auth.isAuthenticated) {
      navigate("/login");
      return;
    }

    if ((auth.role || "").toLowerCase() !== "provider") {
      showToast("Only providers can offer services.", "error");
      navigate("/");
      return;
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.role, navigate]);

  useEffect(() => {
    let active = true;
    async function loadGlobals() {
      setLoadingGlobals(true);
      try {
        const res = await API.get("/services/global");
        if (!active) return;
        setGlobalServices(res.data || []);
        if (res.data?.length && !form.service_id) {
          setForm((prev) => ({ ...prev, service_id: res.data[0].id }));
        }
      } catch (err) {
        console.error(err);
        if (active) setMessage("Service catalog unavailable");
      } finally {
        if (active) setLoadingGlobals(false);
      }
    }
    loadGlobals();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.service_id) {
      setMessage("Select a service to offer.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        service_id: Number(form.service_id),
        price: form.price === "" ? null : Number(form.price),
        service_radius_km: form.service_radius_km === "" ? null : Number(form.service_radius_km),
        experience_years: form.experience_years === "" ? null : Number(form.experience_years),
      };
      await API.post("/provider/services", payload);
      showToast("Service offered successfully!", "success");
      navigate("/");
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      if (detail === "Provider already registered for this service") {
        setMessage("You are already offering this service.");
        showToast("You are already offering this service.", "error");
      } else {
        const errorMsg = detail || "Could not offer service.";
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
        <h1 className="text-3xl font-bold text-gradient m-0">Offer a Service</h1>
      </div>

      <form className="glass rounded-2xl p-8 max-w-2xl mx-auto border border-slate-200/50 shadow-xl" onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="svc-select">
            Choose from service catalog
          </label>
          <select
            id="svc-select"
            value={form.service_id}
            onChange={(e) => setForm({ ...form, service_id: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
            disabled={loadingGlobals}
          >
            <option value="">Select a service</option>
            {globalServices.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title} — {g.category}
              </option>
            ))}
          </select>
          {loadingGlobals && <div className="text-xs text-slate-500 mt-1">Loading catalog…</div>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="svc-price">
              Price (₹)
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
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="svc-radius">
              Service radius (km)
            </label>
            <input
              id="svc-radius"
              type="number"
              min="0"
              className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={form.service_radius_km}
              onChange={(e) => setForm({ ...form, service_radius_km: e.target.value })}
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="svc-exp">
            Experience (years)
          </label>
          <input
            id="svc-exp"
            type="number"
            min="0"
            className="w-full px-4 py-3 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
            value={form.experience_years}
            onChange={(e) => setForm({ ...form, experience_years: e.target.value })}
          />
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
          <button type="submit" className="btn-gradient disabled:opacity-50 disabled:cursor-not-allowed" disabled={saving || loadingGlobals}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
