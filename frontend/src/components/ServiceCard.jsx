import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

export default function ServiceCard({ service, onShowMap, index = 0, isLoading = false, avg_rating, total_reviews }) {
    const cardRef = useRef(null);

    // Category image mapping using reliable placeholder service
    const getCategoryImage = (category) => {
        const cat = (category || "").toLowerCase();
        // Use loremflickr for reliable category-based real images
        if (cat.includes("clean")) return "https://loremflickr.com/800/600/cleaning";
        if (cat.includes("repair") || cat.includes("fix")) return "https://loremflickr.com/800/600/repair,tools";
        if (cat.includes("paint")) return "https://loremflickr.com/800/600/painting,house";
        if (cat.includes("mov") || cat.includes("deliver")) return "https://loremflickr.com/800/600/delivery,truck";
        if (cat.includes("plumb")) return "https://loremflickr.com/800/600/plumbing";
        if (cat.includes("electr")) return "https://loremflickr.com/800/600/electrician";
        if (cat.includes("well") || cat.includes("health")) return "https://loremflickr.com/800/600/wellness,yoga";
        // Default fallback
        return "https://loremflickr.com/800/600/service,work";
    };

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

    const basePrice = service.base_price ?? service.price;
    const priceLabel =
        basePrice != null
            ? `₹${Number(basePrice).toLocaleString("en-IN")}`
            : "Transparent pricing";

    const hasCoords = service.lat != null && service.lon != null;
    const disableActions = isLoading;

    // Use provided image or fallback based on category
    const imageUrl = service.image_url || getCategoryImage(service.category);

    const rawDescription = (service.description || "").trim();
    const fallbackDescription = "Professional and reliable service provided by verified experts.";
    const baseDescription = rawDescription || fallbackDescription;
    const maxDescLength = 100; // Shortened for cleaner UI
    const displayDescription =
        baseDescription.length > maxDescLength
            ? `${baseDescription.slice(0, maxDescLength).trimEnd()}…`
            : baseDescription;

    return (
        <article
            className="service-card group relative rounded-3xl border border-slate-200 bg-white shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full"
            ref={cardRef}
            style={{ animationDelay: `${index * 60}ms`, "--delay": `${index * 60}ms` }}
            aria-label={service.title}
        >
            <Link
                to={`/service/${service.id}`}
                className="flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
                {/* Image Section */}
                <div className="relative h-48 overflow-hidden bg-slate-100">
                    <img
                        src={imageUrl}
                        alt={service.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                    />
                    <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/90 backdrop-blur-md text-slate-800 shadow-sm border border-white/20">
                            {service.category || "General"}
                        </span>
                    </div>
                </div>

                {/* Content Section */}
                <div className="flex flex-col flex-1 p-6">
                    <div className="mb-4">
                        <h2 className="text-xl font-bold text-slate-900 mb-2 leading-tight group-hover:text-primary-start transition-colors">
                            {service.title}
                        </h2>
                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                            {displayDescription}
                        </p>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Starting at</span>
                            <span className="text-lg font-bold text-slate-900">{priceLabel}</span>
                        </div>

                        {/* Rating or Verified Badge */}
                        <div className="flex items-center gap-1.5">
                            {avg_rating !== undefined || total_reviews !== undefined ? (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 border border-amber-100">
                                    <span className="text-amber-500 text-sm">★</span>
                                    <span className="font-bold text-slate-800 text-sm">
                                        {avg_rating != null ? Number(avg_rating).toFixed(1) : "—"}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    <span className="text-xs font-bold">Verified</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Link>
        </article>
    );
}

