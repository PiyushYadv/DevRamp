import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  Terminal,
  Zap,
  BookOpen,
  Shield,
  BarChart3,
  GitBranch,
  Users,
  CheckCircle2,
  FileCode2,
  ChevronRight,
  Folder,
  Send,
} from "lucide-react";
import {
  LANDING_QUICK_START,
  LANDING_REPOSITORY_NAME,
  LANDING_SUMMARY,
  LANDING_TECHNOLOGY_TAGS,
} from "../../features/landing/data/mockLanding";
import { getCurrentUser, isGithubConnected, logout } from "../../lib/api/auth";

export function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getCurrentUser);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncUser = () => setUser(getCurrentUser());
    syncUser();
    window.addEventListener("devramp-auth-changed", syncUser);
    return () => window.removeEventListener("devramp-auth-changed", syncUser);
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    setUser(null);
  };

  const features = [
    {
      icon: <Zap className="w-5 h-5 text-indigo-400" />,
      title: "Instant Codebase Intelligence",
      desc: "Vector-index any repo in seconds. Ask natural-language questions and get pinpoint answers with file citations.",
    },
    {
      icon: <BookOpen className="w-5 h-5 text-emerald-400" />,
      title: "Auto-Generated Onboarding",
      desc: "Architecture diagrams, dependency graphs, and setup guides generated from your actual code — never stale docs.",
    },
    {
      icon: <Shield className="w-5 h-5 text-sky-400" />,
      title: "Context-Aware AI Copilot",
      desc: "Chat scoped to your repository. Every answer is grounded in your codebase, not hallucinated from training data.",
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-orange-400" />,
      title: "Onboarding Analytics",
      desc: "Track which modules engineers explore first, where they get stuck, and how long ramp-up takes across cohorts.",
    },
    {
      icon: <GitBranch className="w-5 h-5 text-violet-400" />,
      title: "Multi-Repo Workspace",
      desc: "Switch between repositories without losing context. Cross-repo intelligence surfaces shared dependencies automatically.",
    },
    {
      icon: <Users className="w-5 h-5 text-pink-400" />,
      title: "Team Onboarding Modules",
      desc: "Engineering leads author structured onboarding paths. New hires follow guided flows with progress tracking.",
    },
  ];

  const stats = [
    { value: "3.2×", label: "faster time-to-first-PR" },
    { value: "94%", label: "reduction in setup blockers" },
    { value: "47min", label: "avg onboarding session" },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-200" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0B0F17]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center">
              <Terminal className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">DevRamp</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 font-mono">BETA</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-xs text-slate-400">
            <a href="#" className="hover:text-slate-200 transition-colors">Features</a>
            <a href="#" className="hover:text-slate-200 transition-colors">Pricing</a>
            <a href="#" className="hover:text-slate-200 transition-colors">Docs</a>
            <a href="#" className="hover:text-slate-200 transition-colors">Blog</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen((open) => !open)}
                  aria-label="Open profile menu"
                  aria-expanded={profileOpen}
                  title={user.email}
                  className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-semibold text-white hover:bg-indigo-500 transition-colors"
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>
                {profileOpen && (
                  <div className="absolute right-0 top-9 z-50 w-60 rounded-lg border border-white/[0.1] bg-[#111827] shadow-xl shadow-black/40 overflow-hidden">
                    <div className="px-3 py-3 border-b border-white/[0.06]">
                      <p className="text-xs font-medium text-white truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { setProfileOpen(false); navigate("/dashboard"); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-slate-300 hover:bg-white/[0.05] transition-colors text-left"
                    >
                      <Terminal className="w-3.5 h-3.5" /> Open dashboard
                    </button>
                    <a
                      href={user.githubUrl ?? "https://github.com"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-2.5 text-xs text-slate-300 hover:bg-white/[0.05] transition-colors"
                    >
                      <GitBranch className="w-3.5 h-3.5" /> GitHub profile
                    </a>
                    <div className="px-3 py-2 border-t border-white/[0.06]">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Repository access</span>
                        <span className={isGithubConnected() ? "text-emerald-400" : "text-slate-600"}>
                          {isGithubConnected() ? "Connected" : "Not connected"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/[0.08] transition-colors text-left border-t border-white/[0.06]"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => navigate("/login")} className="text-xs text-slate-400 hover:text-slate-200 transition-colors">Sign in</button>
            )}
            <button
              onClick={() => navigate("/signup")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
            >
              Get started free
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-28 pb-20 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/10 text-indigo-300 text-[11px] font-mono mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              Now indexing 10,000+ repositories
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-[1.15] tracking-tight text-white mb-5">
              Ramp up engineers
              <br />
              <span className="text-indigo-400">3× faster</span> with codebase AI.
            </h1>
            <p className="text-base text-slate-400 leading-relaxed mb-8">
              DevRamp indexes your repositories, generates architecture docs, and deploys an AI copilot scoped to your codebase — so new engineers ship on day one, not week three.
            </p>
            <div className="flex items-center gap-3 mb-12">
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
              >
                Open Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-md border border-white/10 hover:border-white/20 text-slate-300 text-sm transition-colors">
                View Demo
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02]">
                  <div className="text-2xl font-semibold text-white font-mono">{s.value}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: app mockup */}
          <div className="relative hidden lg:block">
            {/* Glow */}
            <div className="absolute -inset-4 bg-indigo-500/10 rounded-3xl blur-3xl pointer-events-none" />
            {/* Window chrome */}
            <div className="relative rounded-xl border border-white/[0.08] overflow-hidden shadow-2xl shadow-black/60" style={{ fontFamily: "'Inter', sans-serif" }}>
              {/* Title bar */}
              <div className="flex items-center gap-2 px-3 py-2 bg-[#0D1117] border-b border-white/[0.06]">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                <span className="ml-2 text-[10px] font-mono text-slate-600">{LANDING_REPOSITORY_NAME}</span>
              </div>

              {/* 3-pane layout mini */}
              <div className="flex h-[380px] bg-[#0B0F17]">
                {/* Sidebar */}
                <div className="w-[140px] shrink-0 border-r border-white/[0.06] bg-[#0D1117] p-2 flex flex-col gap-1">
                  <div className="text-[8px] uppercase tracking-widest text-slate-700 px-1 mb-1">Repository</div>
                  {[
                    { name: "src/", folder: true, open: true },
                    { name: "auth/", folder: true, open: false, indent: true },
                    { name: "jwt.ts", folder: false, indent: true, indexed: true },
                    { name: "middleware.ts", folder: false, indent: true, indexed: true },
                    { name: "services/", folder: true, open: false, indent: true },
                    { name: "billing.ts", folder: false, indent: true, indexed: true },
                    { name: "main.ts", folder: false, indent: false, indexed: true },
                    { name: "package.json", folder: false, indent: false, indexed: true },
                  ].map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 py-0.5 hover:bg-white/5 rounded px-1 cursor-pointer"
                      style={{ paddingLeft: f.indent ? "12px" : "4px" }}
                    >
                      {f.folder ? (
                        <>
                          <ChevronRight className={`w-2 h-2 text-slate-600 ${f.open ? "rotate-90" : ""}`} />
                          <Folder className="w-2.5 h-2.5 text-indigo-400/70" />
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 shrink-0" />
                          <FileCode2 className="w-2.5 h-2.5 text-indigo-400/60" />
                        </>
                      )}
                      <span className="text-[8px] font-mono text-slate-400 truncate flex-1">{f.name}</span>
                      {f.indexed && <CheckCircle2 className="w-2 h-2 text-emerald-500 shrink-0" />}
                    </div>
                  ))}

                  <div className="mt-auto pt-2 border-t border-white/[0.06]">
                    <div className="text-[8px] uppercase tracking-widest text-slate-700 px-1 mb-1">Modules</div>
                    {["1. Architecture", "2. Local Setup", "3. Key Services"].map((m, i) => (
                      <div key={m} className="flex items-center gap-1 px-1 py-0.5">
                        {i === 0
                          ? <CheckCircle2 className="w-2 h-2 text-emerald-500 shrink-0" />
                          : <span className="w-2 h-2 rounded-full border border-slate-700 shrink-0" />}
                        <span className="text-[8px] text-slate-500 truncate">{m}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Center */}
                <div className="flex-1 flex flex-col border-r border-white/[0.06] overflow-hidden">
                  {/* Tabs */}
                  <div className="flex border-b border-white/[0.06] bg-[#0D1117]">
                    {["System Architecture", "Dependency Graph", "Env Setup"].map((t, i) => (
                      <div
                        key={t}
                        className={`px-3 py-1.5 text-[9px] font-medium border-b-2 ${i === 0 ? "border-indigo-500 text-indigo-300" : "border-transparent text-slate-600"}`}
                      >
                        {t}
                      </div>
                    ))}
                  </div>

                  <div className="flex-1 p-3 overflow-hidden space-y-2">
                    {/* Summary card */}
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                      <div className="text-[9px] font-semibold text-white mb-1.5">Architecture Summary</div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {LANDING_TECHNOLOGY_TAGS.map((t) => (
                          <span key={t} className="text-[7px] px-1.5 py-0.5 rounded-full border border-white/[0.08] text-slate-500 font-mono">{t}</span>
                        ))}
                      </div>
                      <p className="text-[8px] text-slate-500 leading-relaxed">
                        {LANDING_SUMMARY}
                      </p>
                    </div>

                    {/* Flow */}
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                      <div className="text-[9px] font-semibold text-slate-300 mb-2">Service Topology</div>
                      <div className="flex items-center gap-1.5">
                        {[
                          { l: "Client", c: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
                          { l: "API", c: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" },
                          { l: "PG", c: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
                          { l: "Redis", c: "text-orange-400 bg-orange-500/10 border-orange-500/30" },
                        ].map((n, i, arr) => (
                          <div key={n.l} className="flex items-center gap-1 flex-1">
                            <div className={`flex-1 flex flex-col items-center py-1.5 rounded border ${n.c} text-[8px] font-semibold`}>{n.l}</div>
                            {i < arr.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-slate-700 shrink-0" />}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Commands */}
                    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                      <div className="text-[9px] font-semibold text-slate-300 mb-1.5">Quick Start</div>
                      {LANDING_QUICK_START.map((cmd) => (
                        <div key={cmd} className="flex items-center gap-1.5 py-1 px-2 mb-1 rounded bg-[#0D1117] border border-white/[0.05]">
                          <span className="text-[8px] text-indigo-400 font-mono">$</span>
                          <span className="text-[8px] font-mono text-slate-400 truncate">{cmd}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* AI chat panel */}
                <div className="w-[160px] shrink-0 flex flex-col bg-[#0D1117]">
                  <div className="px-2.5 py-2 border-b border-white/[0.06] flex items-center gap-1.5">
                    <div className="w-3.5 h-3.5 rounded bg-indigo-600 flex items-center justify-center shrink-0">
                      <Zap className="w-2 h-2 text-white" />
                    </div>
                    <span className="text-[9px] font-semibold text-white">Ask the Codebase</span>
                  </div>
                  <div className="flex-1 p-2 space-y-2 overflow-hidden">
                    <div className="text-[8px] text-slate-400 leading-relaxed">
                      I've indexed <strong className="text-white">47 files</strong> across 6 modules. Ask anything about the architecture or auth flow.
                    </div>
                    <div className="self-end ml-4 px-2 py-1 rounded-lg rounded-tr-none bg-indigo-600 text-white text-[8px] leading-relaxed">
                      How does JWT auth work?
                    </div>
                    <div className="text-[8px] text-slate-400 leading-relaxed">
                      Dual-token RS256 strategy. Access tokens expire in 15 min, refresh in 30 days.
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono">📄 jwt.ts:L42</span>
                    </div>
                  </div>
                  <div className="p-2 border-t border-white/[0.06]">
                    <div className="flex items-center gap-1 px-2 py-1.5 rounded border border-white/[0.08] bg-white/[0.03]">
                      <span className="text-[8px] text-slate-600 flex-1 truncate">Ask about auth...</span>
                      <Send className="w-2.5 h-2.5 text-indigo-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-3 -right-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111827] border border-indigo-500/30 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono text-slate-300">47 files indexed · live</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl font-semibold text-white mb-2">Everything engineers need to ramp.</h2>
          <p className="text-sm text-slate-500 mb-10">One workspace for understanding, exploring, and contributing to any codebase.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="p-5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-indigo-500/20 hover:bg-indigo-500/[0.03] transition-all group"
              >
                <div className="mb-3">{f.icon}</div>
                <h3 className="text-sm font-semibold text-slate-200 mb-1.5 group-hover:text-white transition-colors">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent p-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-semibold text-white mb-1">Ready to eliminate onboarding friction?</h2>
              <p className="text-sm text-slate-400">Index your first repo in under 2 minutes. No credit card required.</p>
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 px-6 py-3 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium whitespace-nowrap transition-colors"
            >
              Launch Workspace
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[11px] text-slate-600">
          <span>© 2026 DevRamp, Inc.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-slate-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-slate-400 transition-colors">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
