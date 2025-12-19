import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import ServiceCard from "../components/ServiceCard";
import Pagination from "../components/Pagination";
import MapModal from "../components/MapModal";
import Hero from "../components/Hero";

const PAGE_SIZE = 6;
const CATEGORY_OPTIONS = [
  "Cleaning",
  "Repair",
  "Delivery",
  "Wellness",
  "Other",
];

export default function Services() {
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
        params.append("page", meta.page);
        params.append("page_size", PAGE_SIZE);

        const res = await API.get(`/services/?${params.toString()}`);
        if (!active) return;
        setServices(res.data?.items || []);
        setMeta({
          total: res.data?.total ?? 0,
          page: res.data?.page ?? 1,
          page_size: res.data?.page_size ?? PAGE_SIZE,
        });
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
        if (svc.price == null || Number(svc.price) < min) return false;
      }
      if (clientFilters.maxPrice) {
        const max = Number(clientFilters.maxPrice);
        if (svc.price == null || Number(svc.price) > max) return false;
      }
      return true;
    });
  }, [services, clientFilters]);

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setClientFilters((prev) => ({ ...prev, [name]: value }));
    setMeta((prev) => ({ ...prev, page: 1 }));
  }

  function handleHeroSearch(query) {
    setFilters((prev) => ({ ...prev, q: query }));
    setClientFilters((prev) => ({ ...prev, q: query }));
    setMeta((prev) => ({ ...prev, page: 1 }));
  }

  function clearFilters() {
    const empty = { q: "", category: "", minPrice: "", maxPrice: "" };
    setFilters(empty);
    setClientFilters(empty);
    setMeta((prev) => ({ ...prev, page: 1 }));
  }

  return (
    <div className="page-transition">
      <Hero onSearch={handleHeroSearch} />

      <div className="flex justify-between items-center gap-4 flex-wrap mb-6">
        <h1 className="text-3xl font-bold text-gradient m-0">Browse services</h1>
        <Link to="/create" className="btn-gradient text-sm">
          + Create Service
        </Link>
      </div>

      <section className="glass rounded-2xl p-6 border border-slate-200/50 shadow-md mb-8" aria-label="Search and filter">
        <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="filter-q">
              Search
            </label>
            <input
              id="filter-q"
              className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              name="q"
              value={clientFilters.q}
              onChange={handleFilterChange}
              placeholder="Title, description…"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="filter-category">
              Category
            </label>
            <select
              id="filter-category"
              name="category"
              className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={clientFilters.category}
              onChange={handleFilterChange}
            >
              <option value="">All</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="filter-min">
              Min price
            </label>
            <input
              id="filter-min"
              name="minPrice"
              type="number"
              className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={clientFilters.minPrice}
              onChange={handleFilterChange}
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700" htmlFor="filter-max">
              Max price
            </label>
            <input
              id="filter-max"
              name="maxPrice"
              type="number"
              className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-200 bg-white text-slate-700 outline-none focus:border-primary-start focus:ring-4 focus:ring-primary-start/10 transition-all"
              value={clientFilters.maxPrice}
              onChange={handleFilterChange}
              min={0}
            />
          </div>
        </form>
        <div className="flex flex-wrap gap-2.5 mt-4">
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                clientFilters.category === cat
                  ? "bg-gradient-primary text-white shadow-md"
                  : "bg-white border-2 border-slate-200 text-slate-700 hover:border-primary-start hover:bg-primary-start/5"
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
        </div>
        {appliedFilters > 0 && (
          <div className="flex justify-start mt-4">
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={clearFilters}
            >
              Clear filters ({appliedFilters})
            </button>
          </div>
        )}
      </section>

      {loading && (
        <div className="glass rounded-xl p-6 text-center text-slate-600">
          Loading services…
        </div>
      )}
      {error && (
        <div className="glass rounded-xl p-6 text-center text-red-600 bg-red-50 border border-red-200">
          {error}
        </div>
      )}
      {!loading && !error && filteredServices.length === 0 && (
        <div className="glass rounded-xl p-10 text-center bg-primary-start/5 text-primary-start font-semibold">
          No services match your filters.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8" role="list">
        {filteredServices.map((svc, idx) => (
          <ServiceCard
            key={svc.id}
            service={svc}
            onShowMap={setSelectedService}
            index={idx}
          />
        ))}
      </div>

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
          title={selectedService.title}
          lat={Number(selectedService.lat)}
          lon={Number(selectedService.lon)}
          onClose={() => setSelectedService(null)}
        />
      )}
    </div>
  );
}