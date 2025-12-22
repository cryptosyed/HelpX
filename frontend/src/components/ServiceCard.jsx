import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

export default function ServiceCard({ service, onShowMap, index = 0, isLoading = false, avg_rating, total_reviews }) {
    const cardRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("revealed");
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.1 }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => {
            if (cardRef.current) {
                observer.unobserve(cardRef.current);
            }
        };
    }, []);

    if (!service) return null;

    const priceLabel =
        service.price != null
            ? `₹${Number(service.price).toLocaleString("en-IN")}`
            : "—";

    const hasCoords = service.lat != null && service.lon != null;
    const latLabel = hasCoords ? Number(service.lat).toFixed(4) : null;
    const lonLabel = hasCoords ? Number(service.lon).toFixed(4) : null;

    const disableActions = isLoading;

    return (
        <article
            className="service-card relative glass rounded-2xl p-0 border border-slate-200/50 shadow-md overflow-hidden reveal-up flex flex-col"
            ref={cardRef}
            style={{ animationDelay: `${index * 60}ms`, '--delay': `${index * 60}ms` }}
            aria-label={service.title}
        >
            <div className="gradient-accent-line"></div>
            <div className="p-5 pb-6 flex-1 flex flex-col gap-3 min-h-[240px]">
                <div className="service-image-placeholder flex items-center justify-center">
                    <span className="text-2xl opacity-20">🧹</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                    <h2 className="text-[1.05rem] font-semibold text-[#111827] m-0">{service.title}</h2>
                    <span className="inline-flex items-center px-[10px] py-[4px] rounded-full text-[0.75rem] font-medium bg-[#eef2ff] text-[#4338ca]">
                        {service.category || "General"}
                    </span>
                </div>
                <div className="flex items-baseline gap-2">
                    <div className="text-[1.25rem] font-bold text-[#6366f1] leading-none">{priceLabel}</div>
                    {avg_rating !== undefined || total_reviews !== undefined ? (
                        <div className="text-xs text-slate-600 flex items-center gap-1">
                            <span className="text-amber-500">★</span>
                            <span className="font-semibold">
                                {avg_rating != null ? Number(avg_rating).toFixed(1) : "—"}
                            </span>
                            <span className="text-slate-500">({total_reviews ?? 0})</span>
                        </div>
                    ) : null}
                </div>
                <p className="text-[0.9rem] text-[#6b7280] leading-[1.5] flex-1 m-0">
                    {service.description || "No description."}
                </p>

                <div className="text-xs text-slate-500" aria-label="Location metadata">
                    {hasCoords && latLabel && lonLabel ? (
                        <>Lat {latLabel} · Lon {lonLabel}</>
                    ) : (
                        "Coordinates not provided"
                    )}
                </div>

                <footer className="flex gap-2.5 mt-auto pt-2.5">
                    <Link
                        to={`/service/${service.id}`}
                        className={`btn-gradient text-sm px-4 py-2 ${disableActions ? "opacity-60 pointer-events-none" : ""}`}
                        aria-disabled={disableActions}
                        tabIndex={disableActions ? -1 : 0}
                    >
                        View
                    </Link>
                    <button
                        type="button"
                        className="btn-ghost text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => onShowMap?.(service)}
                        disabled={disableActions || !hasCoords}
                        aria-disabled={disableActions || !hasCoords}
                    >
                        Map
                    </button>
                </footer>
            </div>
        </article>
    );
}

