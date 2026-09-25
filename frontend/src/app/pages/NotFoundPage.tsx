import { Link } from "react-router";
import { ArrowLeft, Home, Terminal } from "lucide-react";

export function NotFoundPage() {
  return (
    <main className="min-h-screen bg-[#0B0F17] text-slate-200 flex items-center justify-center px-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="fixed inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <section className="relative w-full max-w-md text-center">
        <div className="mx-auto mb-6 w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
          <Terminal className="w-7 h-7 text-indigo-400" />
        </div>
        <p className="text-xs font-mono tracking-[0.3em] text-indigo-400 uppercase mb-3">Error 404</p>
        <h1 className="text-3xl font-semibold text-white mb-3">Page not found</h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-8">The route you requested does not exist or may have moved.</p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/" className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-white/[0.1] hover:border-white/[0.2] text-sm text-slate-300 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Go home
          </Link>
          <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm text-white transition-colors">
            <Home className="w-3.5 h-3.5" /> Open dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
