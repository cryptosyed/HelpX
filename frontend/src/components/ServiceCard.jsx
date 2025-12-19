import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

export default function ServiceCard({ service, onShowMap, index = 0, isLoading = false }) {
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
            className="relative glass rounded-2xl p-0 border border-slate-200/50 shadow-md card-hover card-tilt overflow-hidden reveal-up"
            ref={cardRef}
            style={{ animationDelay: `${index * 60}ms`, '--delay': `${index * 60}ms` }}
            aria-label={service.title}
        >
            <div className="gradient-accent-line"></div>
            <div className="p-5 flex flex-col gap-3 min-h-[240px]">
                <h2 className="text-xl font-bold text-slate-800 m-0">{service.title}</h2>
                <p className="text-sm font-medium text-slate-500 m-0">
                    {service.category || "General"} • {priceLabel}
                </p>
                <p className="text-sm text-slate-700 leading-relaxed flex-1 m-0">
                    {service.description || "No description."}
                </p>

                <div className="text-xs text-slate-500" aria-label="Location metadata">
                    {hasCoords && latLabel && lonLabel ? (
                        <>Lat {latLabel} · Lon {lonLabel}</>
                    ) : (
                        "Coordinates not provided"
                    )}
                </div>

                <footer className="flex gap-2.5 mt-auto pt-3">
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

