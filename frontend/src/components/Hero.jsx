import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Hero({ onSearch }) {
    const [searchQuery, setSearchQuery] = useState("");
    const navigate = useNavigate();
    const heroRef = useRef(null);
    const [scrollY, setScrollY] = useState(0);

    useEffect(() => {
        let ticking = false;
        function handleScroll() {
            if (!ticking) {
                requestAnimationFrame(() => {
                    setScrollY(window.scrollY);
                    ticking = false;
                });
                ticking = true;
            }
        }
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    function handleSearch(e) {
        e.preventDefault();
        if (onSearch) {
            onSearch(searchQuery);
        }
    }

    const parallaxOffset = scrollY * 0.3;

    return (
        <section className="relative py-20 px-5 text-center overflow-hidden mb-10" ref={heroRef}>
            <div className="absolute inset-0 pointer-events-none">
                <svg
                    className="absolute -top-24 -right-12 w-96 h-96 opacity-60 parallax-slow"
                    style={{ transform: `translateY(${parallaxOffset * 0.5}px)` }}
                    viewBox="0 0 400 400"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6C63FF" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#4C6EF5" stopOpacity="0.3" />
                        </linearGradient>
                    </defs>
                    <path
                        d="M100,200 Q150,100 250,200 T400,200 L400,400 L0,400 Z"
                        fill="url(#grad1)"
                    />
                </svg>
                <svg
                    className="absolute -bottom-20 -left-8 w-72 h-72 opacity-60 parallax-fast"
                    style={{ transform: `translateY(${parallaxOffset * 0.3}px)` }}
                    viewBox="0 0 300 300"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <defs>
                        <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#6C63FF" stopOpacity="0.25" />
                        </linearGradient>
                    </defs>
                    <circle cx="150" cy="150" r="120" fill="url(#grad2)" />
                </svg>
            </div>

            <div className="relative z-10 max-w-3xl mx-auto animate-fade-in-up">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 leading-tight">
                    <span className="block text-gradient">HelpX</span>
                    <span className="block text-3xl md:text-4xl lg:text-5xl font-medium text-slate-800 mt-2">
                        Trusted local help near you
                    </span>
                </h1>

                <form className="flex gap-3 max-w-2xl mx-auto mt-10 bg-white rounded-full p-1.5 shadow-2xl border-2 border-transparent focus-within:border-primary-start transition-all duration-300" onSubmit={handleSearch}>
                    <input
                        type="text"
                        className="flex-1 border-0 outline-none px-6 py-4 text-base rounded-full bg-transparent text-slate-700 placeholder:text-slate-400"
                        placeholder="What do you need help with?"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search for services"
                    />
                    <button 
                        type="submit" 
                        className="w-14 h-14 rounded-full bg-gradient-primary text-white flex items-center justify-center shadow-lg hover:shadow-glow transition-all duration-200 hover:scale-110 active:scale-95" 
                        aria-label="Search"
                    >
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.35-4.35" />
                        </svg>
                    </button>
                </form>
            </div>
        </section>
    );
}

