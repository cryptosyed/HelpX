import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import ServiceCard from "../components/ServiceCard";
import Pagination from "../components/Pagination";
import MapModal from "../components/MapModal";
import { useAuthContext } from "../context/AuthContext";

const PAGE_SIZE = 6;
const CATEGORY_OPTIONS = [
  "Cleaning",
  "Repair",
  "Delivery",
  "Wellness",
  "Other",
];

export default function Services() {
  const { user, role } = useAuthContext();
  const normalizedRole = (role || user?.role || "").toLowerCase();
  const isProvider = normalizedRole === "provider";
  const [services, setServices] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, page_size: PAGE_SIZE });
  const [filters, setFilters] = useState({
    q: "",
    category: "",
    minPrice: "",
    maxPrice: "",
  });
  const [clientFilters, setClientFilters] = useState({
    q: "",
    category: "",
    minPrice: "",
    maxPrice: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const noServices = !loading && !error && services.length === 0;

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filters.q) params.append("q", filters.q);
        if (filters.category) params.append("category", filters.category);
        if (filters.minPrice) params.append("min_price", filters.minPrice);
        if (filters.maxPrice) params.append("max_price", filters.maxPrice);

        const res = await API.get(`/services/global?${params.toString()}`);
        if (!active) return;
        const items = res.data || [];
        setServices(items);
        setMeta((prev) => ({
          ...prev,
          total: items.length,
          page_size: PAGE_SIZE,
        }));
      } catch (err) {
        console.error(err);
        if (!active) return;
        setError("Could not load services.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [filters, meta.page]);

  const appliedFilters = useMemo(
    () =>
      ["q", "category", "minPrice", "maxPrice"].filter(
        (key) => filters[key]
      ).length,
    [filters]
  );

  // Client-side filtered services
  const filteredServices = useMemo(() => {
    return services.filter((svc) => {
      if (clientFilters.q) {
        const query = clientFilters.q.toLowerCase();
        const matches =
          svc.title?.toLowerCase().includes(query) ||
          svc.description?.toLowerCase().includes(query) ||
          svc.category?.toLowerCase().includes(query);
        if (!matches) return false;
      }
      if (clientFilters.category && svc.category !== clientFilters.category) {
        return false;
      }
      if (clientFilters.minPrice) {
        const min = Number(clientFilters.minPrice);
        if (svc.base_price == null || Number(svc.base_price) < min) return false;
      }
      if (clientFilters.maxPrice) {
        const max = Number(clientFilters.maxPrice);
        if (svc.base_price == null || Number(svc.base_price) > max) return false;
      }
      return true;
    });
  }, [services, clientFilters]);

  useEffect(() => {
    setMeta((prev) => ({ ...prev, total: filteredServices.length }));
  }, [filteredServices]);

  const pagedServices = useMemo(() => {
    const start = (meta.page - 1) * PAGE_SIZE;
    return filteredServices.slice(start, start + PAGE_SIZE);
  }, [filteredServices, meta.page]);

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setClientFilters((prev) => ({ ...prev, [name]: value }));
    setMeta((prev) => ({ ...prev, page: 1 }));
  }

  function clearFilters() {
    const empty = { q: "", category: "", minPrice: "", maxPrice: "" };
    setFilters(empty);
    setClientFilters(empty);
    setMeta((prev) => ({ ...prev, page: 1 }));
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Hero Header */}
      <div className="relative bg-slate-900 pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[100px] animate-hover-float" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[100px] animate-hover-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 text-center z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 text-sm font-medium animate-fade-in-up">
            🔎 Find your expert
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Discover Professional <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Local Services</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Browse through our trusted providers and find the perfect match for your needs.
          </p>

          {isProvider && (
            <div className="pt-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <Link to="/create" className="btn-gradient inline-flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                <span className="text-xl">+</span> Offer a Service
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 -mt-20 relative z-20 pb-20">
        {/* Floating Glass Filter Bar */}
        <section className="glass-strong rounded-2xl p-6 shadow-xl border border-white/20 mb-10 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1" htmlFor="filter-q">
                Search
              </label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <input
                  id="filter-q"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all text-sm font-medium"
                  name="q"
                  value={clientFilters.q}
                  onChange={handleFilterChange}
                  placeholder="What do you need help with?"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1" htmlFor="filter-category">
                Category
              </label>
              <div className="relative">
                <select
                  id="filter-category"
                  name="category"
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all text-sm font-medium appearance-none cursor-pointer"
                  value={clientFilters.category}
                  onChange={handleFilterChange}
                >
                  <option value="">All Categories</option>
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1" htmlFor="filter-min">
                Min price
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                <input
                  id="filter-min"
                  name="minPrice"
                  type="number"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all text-sm font-medium"
                  value={clientFilters.minPrice}
                  onChange={handleFilterChange}
                  min={0}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1" htmlFor="filter-max">
                Max price
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                <input
                  id="filter-max"
                  name="maxPrice"
                  type="number"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/50 text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all text-sm font-medium"
                  value={clientFilters.maxPrice}
                  onChange={handleFilterChange}
                  min={0}
                  placeholder="No limit"
                />
              </div>
            </div>
          </form>

          {/* Quick Categories */}
          <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-slate-200/50">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Quick Filters:</span>
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${clientFilters.category === cat
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 ring-2 ring-indigo-600 ring-offset-2"
                    : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:-translate-y-0.5"
                  }`}
                onClick={() => {
                  const newCategory = clientFilters.category === cat ? "" : cat;
                  handleFilterChange({
                    target: { name: "category", value: newCategory },
                  });
                }}
              >
                {cat}
              </button>
            ))}
            {appliedFilters > 0 && (
              <button
                type="button"
                className="ml-auto text-sm font-semibold text-red-500 hover:text-red-600 hover:underline flex items-center gap-1"
                onClick={clearFilters}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                Clear all
              </button>
            )}
          </div>
        </section>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-slate-200 bg-white shadow-sm p-0 overflow-hidden animate-pulse h-[400px]"
              >
                <div className="h-48 bg-slate-200 w-full"></div>
                <div className="p-6 space-y-4">
                  <div className="h-6 w-2/3 bg-slate-200 rounded"></div>
                  <div className="h-4 w-full bg-slate-200 rounded"></div>
                  <div className="h-4 w-3/4 bg-slate-200 rounded"></div>
                  <div className="pt-4 flex justify-between">
                    <div className="h-8 w-24 bg-slate-200 rounded"></div>
                    <div className="h-8 w-24 bg-slate-200 rounded"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="glass rounded-xl p-8 text-center text-red-600 bg-red-50 border border-red-200">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-600 mb-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            </div>
            <h3 className="text-lg font-bold mb-1">Could not load services</h3>
            <p className="text-slate-600">{error}</p>
          </div>
        )}

        {noServices && (
          <div className="glass rounded-2xl p-12 text-center border-dashed border-2 border-slate-300">
            <div className="text-5xl mb-4 opacity-50">🧭</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No services available yet</h3>
            <p className="text-slate-600 max-w-sm mx-auto">It looks like no providers have listed services yet. Check back soon!</p>
          </div>
        )}

        {!loading && !error && !noServices && filteredServices.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center border-dashed border-2 border-slate-300">
            <div className="text-5xl mb-4 opacity-50">🔍</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No matches found</h3>
            <p className="text-slate-600 max-w-sm mx-auto">Try adjusting your filters or search terms to find what you're looking for.</p>
            <button
              onClick={clearFilters}
              className="mt-6 text-indigo-600 font-semibold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12 animate-fade-in-up" role="list">
            {pagedServices.map((svc, idx) => (
              <ServiceCard
                key={svc.id}
                service={svc}
                onShowMap={setSelectedService}
                index={idx}
                isLoading={loading}
              />
            ))}
          </div>
        )}

        {!loading && !error && filteredServices.length > 0 && (
          <Pagination
            page={meta.page}
            pageSize={meta.page_size}
            total={meta.total}
            onPageChange={(page) => setMeta((prev) => ({ ...prev, page }))}
          />
        )}

        {selectedService && (
          <MapModal
            service={selectedService}
            onClose={() => setSelectedService(null)}
          />
        )}
      </div>
    </div>
  );
}