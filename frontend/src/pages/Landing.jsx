import { Link } from "react-router-dom";

const categories = [
  { title: "Plumbing", subtitle: "Leaks, fittings, installations", icon: "🚰" },
  { title: "Cleaning", subtitle: "Home, office, deep clean", icon: "🧹" },
  { title: "Electrical", subtitle: "Wiring, fixtures, safety", icon: "💡" },
  { title: "AC Repair", subtitle: "Cooling, maintenance, gas refill", icon: "❄️" },
  { title: "Painting", subtitle: "Interiors, exteriors, touch-ups", icon: "🎨" },
  { title: "Pest Control", subtitle: "Termites, rodents, hygiene", icon: "🪲" },
];

const trustSignals = [
  { title: "Verified providers", description: "ID-verified pros with proven track records." },
  { title: "Secure payments", description: "Protected checkouts and clear receipts." },
  { title: "Transparent pricing", description: "Upfront estimates with no hidden fees." },
];

export default function Landing() {
  return (
    <div className="bg-gradient-to-b from-white via-[#f8faff] to-white text-slate-900 overflow-x-hidden">
      {/* Hero */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">
        <div className="absolute inset-0 -z-10 bg-gradient-hero blur-3xl opacity-60 animate-glow" />
        <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-primary-start/10 rounded-full blur-[100px] animate-hover-float" />

        <div className="max-w-7xl mx-auto px-5 pt-20 pb-24 grid gap-16 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div className="space-y-8 animate-fade-in-up">
            <p className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-sm text-indigo-700">
              <span className="text-lg">⚡</span> Fast, trusted local help
            </p>
            <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-slate-900">
              Approved local <br />
              <span className="text-gradient">services near you</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl leading-relaxed">
              HelpX connects you with verified nearby providers for cleaning, repairs, and home services—request in minutes and get auto-assigned to the closest pro.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                to="/services"
                className="btn-gradient text-lg px-8 py-4 h-auto shadow-lg shadow-primary-start/20"
              >
                Browse services
              </Link>
              <Link
                to="/register"
                className="btn-ghost text-lg px-8 py-4 h-auto bg-white/50"
              >
                Become a provider
              </Link>
            </div>
            <div className="flex items-center gap-8 text-sm font-medium text-slate-600 pt-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">✓</div>
                Verified pros
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">✓</div>
                Fast matching
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xs">✓</div>
                24/7 Support
              </div>
            </div>
          </div>

          <div className="relative animate-fade-in-up-delay">
            <div className="absolute -inset-10 bg-gradient-to-tr from-indigo-500/20 to-sky-400/20 blur-3xl rounded-[3rem] animate-pulse" />
            <div className="relative rounded-[2rem] border border-white/40 bg-white/60 backdrop-blur-xl shadow-2xl shadow-indigo-500/10 p-8 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Estimated Time</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">~12 mins</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-100 animate-pulse">
                  LIVE
                </span>
              </div>

              <div className="space-y-4">
                {["Cleaning", "Plumbing", "Electrical"].map((item, i) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-xl bg-white/80 border border-slate-100 p-4 shadow-sm hover:scale-[1.02] transition-transform duration-300"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-xl">
                        {item === "Cleaning" ? "🧹" : item === "Plumbing" ? "🚰" : "💡"}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{item}</p>
                        <p className="text-xs text-slate-500 font-medium">12 pros nearby</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-green-600">Available</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-indigo-50/50 border border-indigo-100 p-4 flex gap-4 items-center">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-indigo-900 leading-tight">“Booked in 2 minutes, cleaner arrived in 20. Amazing service!”</p>
                  <p className="text-xs text-indigo-700 mt-1 font-bold">— Riya, Bengaluru</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search strip */}
      <section className="relative z-20 max-w-5xl mx-auto px-5 -mt-20 mb-24 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
        <div className="rounded-2xl border border-white/50 bg-white/80 backdrop-blur-md shadow-card-hover p-2 flex flex-col md:flex-row gap-2">
          <div className="flex-1 relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <input
              type="text"
              placeholder="What do you need help with?"
              className="w-full h-14 pl-12 pr-4 rounded-xl bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white/50 transition-colors"
            />
          </div>
          <div className="w-px bg-slate-200 my-2 hidden md:block" />
          <div className="flex-1 relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>
            <input
              type="text"
              placeholder="Enter your location"
              className="w-full h-14 pl-12 pr-4 rounded-xl bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white/50 transition-colors"
            />
          </div>
          <button className="btn-gradient rounded-xl px-8 md:w-auto w-full h-14 md:h-auto whitespace-nowrap">
            Search
          </button>
        </div>
      </section>

      {/* Featured categories */}
      <section className="max-w-7xl mx-auto px-5 py-20">
        <div className="flex items-end justify-between mb-12">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-900">Featured categories</h2>
            <p className="text-lg text-slate-600">Trusted local experts for the most requested services.</p>
          </div>
          <Link
            to="/services"
            className="hidden md:flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors bg-indigo-50 px-4 py-2 rounded-lg"
          >
            View all categories →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((cat, i) => (
            <Link
              key={cat.title}
              to="/services"
              className="group relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-8 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity text-8xl grayscale group-hover:grayscale-0">
                {cat.icon}
              </div>
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-white shadow-sm border border-indigo-100 text-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  {cat.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{cat.title}</h3>
                <p className="text-slate-600 mb-6">{cat.subtitle}</p>
                <div className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600">
                  Browse services <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link
            to="/services"
            className="inline-flex items-center text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors bg-indigo-50 px-6 py-3 rounded-lg"
          >
            View all categories →
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 py-24 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-white opacity-50 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-5 relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">How it works</h2>
            <p className="text-lg text-slate-600">Get your tasks done in three simple steps. We handle the vetting so you can focus on what matters.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { title: "Request a service", desc: "Select the service you need, describe the task, and choose a convenient time slot.", icon: "1" },
              { title: "Get matched instantly", desc: "Our algorithm finds the best verified provider near you based on rating and proximity.", icon: "2" },
              { title: "Pay securely", desc: "Pay upfront or after service. Funds are held securely until the job is completed.", icon: "3" },
            ].map((step, i) => (
              <div
                key={step.title}
                className="relative flex flex-col items-center text-center group"
              >
                <div className="w-16 h-16 rounded-2xl bg-white shadow-lg shadow-indigo-500/10 border border-slate-100 flex items-center justify-center text-2xl font-bold text-gradient mb-6 group-hover:scale-110 transition-transform duration-300 z-10 relative">
                  {step.icon}
                </div>
                {i !== 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-indigo-200 to-transparent dashed opacity-50" />
                )}
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="max-w-7xl mx-auto px-5 py-24">
        <div className="rounded-[2.5rem] bg-slate-900 text-white p-8 md:p-16 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-500/10 rounded-full blur-[80px]" />

          <div className="relative z-10 grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 text-sm font-medium">
                Built for trust
              </div>
              <h2 className="text-3xl lg:text-5xl font-bold leading-tight">
                Peace of mind with every booking
              </h2>
              <p className="text-indigo-100 text-lg leading-relaxed opacity-90">
                We take safety seriously. Every provider on HelpX goes through a rigorous background check and verification process.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-2xl">🛡️</div>
                  <div>
                    <p className="font-bold">Insurance covered</p>
                    <p className="text-sm text-indigo-200">Up to ₹50,000 protection</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-2xl">🤝</div>
                  <div>
                    <p className="font-bold">Dispute resolution</p>
                    <p className="text-sm text-indigo-200">Dedicated support team</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5">
              {trustSignals.map((signal) => (
                <div key={signal.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md hover:bg-white/10 transition-colors">
                  <h3 className="font-bold text-xl mb-2">{signal.title}</h3>
                  <p className="text-indigo-100 opacity-80">{signal.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

