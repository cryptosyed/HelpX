import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50">
      <div className="max-w-7xl mx-auto px-5 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="space-y-3 text-center sm:text-left">
          <div className="text-2xl font-bold text-gradient">HelpX</div>
          <p className="text-sm text-slate-600">
            HelpX connects you with trusted local professionals for everyday services.
          </p>
        </div>
        <div className="space-y-3 text-center sm:text-left">
          <p className="text-sm font-semibold text-slate-900">Product</p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li><Link className="hover:text-indigo-600 transition" to="/services">Services</Link></li>
            <li><a className="hover:text-indigo-600 transition" href="#how-it-works">How it works</a></li>
            <li><a className="hover:text-indigo-600 transition" href="#pricing">Pricing</a></li>
          </ul>
        </div>
        <div className="space-y-3 text-center sm:text-left">
          <p className="text-sm font-semibold text-slate-900">Company</p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li><a className="hover:text-indigo-600 transition" href="#about">About</a></li>
            <li><Link className="hover:text-indigo-600 transition" to="/register">Providers</Link></li>
            <li><a className="hover:text-indigo-600 transition" href="#contact">Contact</a></li>
          </ul>
        </div>
        <div className="space-y-3 text-center sm:text-left">
          <p className="text-sm font-semibold text-slate-900">Support</p>
          <ul className="space-y-2 text-sm text-slate-600">
            <li><a className="hover:text-indigo-600 transition" href="#help">Help Center</a></li>
            <li><a className="hover:text-indigo-600 transition" href="#safety">Safety</a></li>
            <li><a className="hover:text-indigo-600 transition" href="#terms">Terms & Privacy</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-5 py-4 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <span>© 2025 HelpX</span>
          <div className="flex items-center gap-3">
            <a className="hover:text-indigo-600 transition" href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
            <a className="hover:text-indigo-600 transition" href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
            <a className="hover:text-indigo-600 transition" href="https://twitter.com" target="_blank" rel="noreferrer">Twitter</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

