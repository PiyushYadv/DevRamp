import { useState } from "react";
import {
  CheckCircle2, Circle, ChevronDown, ChevronRight, BookOpen, Terminal,
  Server, Layers, Clock, Award, Play, RotateCcw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CheckItem { id: string; label: string; done: boolean }
interface Module {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  duration: string;
  icon: React.ReactNode;
  color: string;
  accentBg: string;
  accentBorder: string;
  progress: number;
  sections: { heading: string; body: string }[];
  checklist: CheckItem[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

function useModules() {
  const initial: Module[] = [
    {
      id: "arch",
      number: 1,
      title: "Architecture Overview",
      subtitle: "Understand the system topology and key design decisions.",
      duration: "~20 min",
      icon: <Server className="w-5 h-5" />,
      color: "text-indigo-400",
      accentBg: "bg-indigo-500/10",
      accentBorder: "border-indigo-500/30",
      progress: 100,
      sections: [
        {
          heading: "What is core-billing-api?",
          body: "A monolithic NestJS REST API that handles subscription billing, payment processing, and webhook event ingestion for all customer accounts. It is the single source of truth for subscription state across the platform.",
        },
        {
          heading: "Technology stack",
          body: "Node.js 20 + NestJS 10 for the application layer. PostgreSQL 15 as the primary database accessed through Prisma ORM. Redis 7 for session storage, short-lived caches, and the async job queue. Stripe for payment processing. JWT with RS256 rotating keys for authentication.",
        },
        {
          heading: "Key design decisions",
          body: "The team chose a monolith over microservices to avoid distributed-transaction complexity for billing operations where consistency matters most. The Stripe webhook idempotency pattern uses Redis-based deduplication rather than a DB lock to keep the hot path fast.",
        },
      ],
      checklist: [
        { id: "a1", label: "Read the architecture summary", done: true },
        { id: "a2", label: "Review the service topology diagram", done: true },
        { id: "a3", label: "Understand the JWT rotation pattern", done: true },
        { id: "a4", label: "Ask the AI copilot one architecture question", done: true },
      ],
    },
    {
      id: "setup",
      number: 2,
      title: "Local Setup",
      subtitle: "Get the API running on your machine end-to-end.",
      duration: "~35 min",
      icon: <Terminal className="w-5 h-5" />,
      color: "text-emerald-400",
      accentBg: "bg-emerald-500/10",
      accentBorder: "border-emerald-500/30",
      progress: 33,
      sections: [
        {
          heading: "Prerequisites",
          body: "You need Node.js ≥ 20, PostgreSQL ≥ 15, and Redis ≥ 7 running locally. Docker Compose is optional but recommended — run `docker compose up -d` from the repo root to spin up Postgres and Redis automatically.",
        },
        {
          heading: "First-time setup",
          body: "Clone the repo, copy `.env.example` to `.env`, and fill in DATABASE_URL, REDIS_URL, and the JWT key pair. Run `npm install` then `npx prisma migrate dev` to apply all migrations. Start the server with `npm run start:dev`.",
        },
        {
          heading: "Verifying your setup",
          body: "The server listens on port 3000 by default. Visit `http://localhost:3000/health` — you should see `{\"status\":\"ok\"}`. Swagger UI is at `/api/docs`. Run `npm test` to confirm all 143 unit tests pass.",
        },
      ],
      checklist: [
        { id: "s1", label: "Clone the repository", done: true },
        { id: "s2", label: "Configure .env from .env.example", done: false },
        { id: "s3", label: "Run database migrations", done: false },
        { id: "s4", label: "Start the dev server successfully", done: false },
        { id: "s5", label: "Verify /health endpoint responds", done: false },
        { id: "s6", label: "Run the test suite (npm test)", done: false },
      ],
    },
    {
      id: "services",
      number: 3,
      title: "Key Services",
      subtitle: "Deep-dive into the three core service modules.",
      duration: "~45 min",
      icon: <Layers className="w-5 h-5" />,
      color: "text-violet-400",
      accentBg: "bg-violet-500/10",
      accentBorder: "border-violet-500/30",
      progress: 0,
      sections: [
        {
          heading: "AuthModule",
          body: "Handles all authentication and authorization. Issues short-lived access tokens (15 min) and long-lived refresh tokens (30 days) signed with RS256. Key rotation happens every 24h via a Redis-cached key pair. The `JwtGuard` protects all non-public endpoints.",
        },
        {
          heading: "BillingModule",
          body: "Wraps the Stripe SDK with our domain logic. Manages subscription lifecycle: creation, upgrades, downgrades, and cancellations. All Stripe customer objects are lazily created on first subscription. The `BillingService.createSubscription()` method is the primary entry point.",
        },
        {
          heading: "WebhookModule",
          body: "Receives Stripe webhook events, verifies signatures using `STRIPE_WEBHOOK_SECRET`, and processes events idempotently. A Redis `SISMEMBER` check prevents double-processing. Processed event IDs expire after 24h. Critical events: `invoice.payment_succeeded`, `customer.subscription.deleted`.",
        },
      ],
      checklist: [
        { id: "k1", label: "Read AuthModule source in the Code Explorer", done: false },
        { id: "k2", label: "Trace a billing request end-to-end in the debugger", done: false },
        { id: "k3", label: "Understand the Stripe webhook signature check", done: false },
        { id: "k4", label: "Make a test API call via Swagger UI", done: false },
      ],
    },
  ];

  const [modules, setModules] = useState(initial);

  const toggleCheck = (moduleId: string, itemId: string) => {
    setModules((ms) =>
      ms.map((m) => {
        if (m.id !== moduleId) return m;
        const checklist = m.checklist.map((c) => c.id === itemId ? { ...c, done: !c.done } : c);
        const progress = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
        return { ...m, checklist, progress };
      })
    );
  };

  return { modules, toggleCheck };
}

// ─── Module Card ──────────────────────────────────────────────────────────────

function ModuleCard({ module, onToggle }: { module: Module; onToggle: (itemId: string) => void }) {
  const [expanded, setExpanded] = useState(module.progress > 0 && module.progress < 100);
  const [activeSection, setActiveSection] = useState(0);
  const allDone = module.progress === 100;
  const started = module.progress > 0;

  return (
    <div className={`rounded-xl border ${allDone ? "border-emerald-500/20" : "border-white/[0.06]"} bg-white/[0.02] overflow-hidden transition-all`}>
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className={`w-10 h-10 rounded-xl ${module.accentBg} border ${module.accentBorder} flex items-center justify-center ${module.color} shrink-0`}>
          {module.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-mono text-slate-600">MODULE {module.number}</span>
            {allDone && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                <Award className="w-3 h-3" /> Complete
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-white">{module.title}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{module.subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <Clock className="w-3 h-3" />{module.duration}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${allDone ? "bg-emerald-500" : started ? "bg-indigo-500" : "bg-slate-700"}`}
                style={{ width: `${module.progress}%` }}
              />
            </div>
            <span className={`text-[10px] font-mono ${allDone ? "text-emerald-400" : started ? "text-indigo-400" : "text-slate-600"}`}>
              {module.progress}%
            </span>
          </div>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-white/[0.06]">
          <div className="grid grid-cols-5 gap-0">
            {/* Section nav */}
            <div className="col-span-1 border-r border-white/[0.06] p-3 space-y-1">
              {module.sections.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSection(i)}
                  className={`w-full text-left px-2.5 py-2 rounded-md text-[11px] leading-snug transition-colors ${
                    activeSection === i
                      ? `${module.accentBg} ${module.color} border ${module.accentBorder}`
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
                  }`}
                >
                  {s.heading}
                </button>
              ))}
            </div>

            {/* Section content */}
            <div className="col-span-2 p-5 border-r border-white/[0.06]">
              <h4 className={`text-sm font-semibold mb-3 ${module.color}`}>
                {module.sections[activeSection].heading}
              </h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                {module.sections[activeSection].body}
              </p>
            </div>

            {/* Checklist */}
            <div className="col-span-2 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium text-slate-400">Checklist</span>
                <span className="text-[10px] font-mono text-slate-600">
                  {module.checklist.filter((c) => c.done).length}/{module.checklist.length} done
                </span>
              </div>
              <div className="space-y-2">
                {module.checklist.map((item) => (
                  <label key={item.id} className="flex items-start gap-2.5 cursor-pointer group">
                    <button
                      onClick={() => onToggle(item.id)}
                      className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        item.done
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-slate-600 hover:border-emerald-500/50 bg-transparent"
                      }`}
                    >
                      {item.done && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </button>
                    <span className={`text-xs leading-relaxed transition-colors ${item.done ? "text-slate-500 line-through" : "text-slate-300 group-hover:text-white"}`}>
                      {item.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ModulesPage() {
  const { modules, toggleCheck } = useModules();

  const totalItems = modules.flatMap((m) => m.checklist).length;
  const doneItems = modules.flatMap((m) => m.checklist).filter((c) => c.done).length;
  const overallProgress = Math.round((doneItems / totalItems) * 100);

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <h1 className="text-base font-semibold text-white">Onboarding Modules</h1>
          </div>
          <p className="text-sm text-slate-500">Complete all three modules to finish your onboarding for <span className="text-indigo-400 font-mono">company/core-billing-api</span>.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs font-semibold text-white">{overallProgress}% complete</div>
            <div className="text-[10px] text-slate-600">{doneItems} of {totalItems} tasks done</div>
          </div>
          <div className="relative w-12 h-12">
            <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                stroke={overallProgress === 100 ? "#34d399" : "#6366f1"}
                strokeWidth="3"
                strokeDasharray={`${overallProgress * 0.942} 94.2`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white">{overallProgress}%</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {modules.map((m, i) => (
            <div key={m.id} className="flex items-center gap-2 flex-1">
              <div className={`flex items-center gap-1.5 ${m.progress === 100 ? "text-emerald-400" : m.progress > 0 ? "text-indigo-400" : "text-slate-600"}`}>
                {m.progress === 100 ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                <span className="text-[11px] font-medium">{m.title}</span>
              </div>
              {i < modules.length - 1 && <ChevronRight className="w-3 h-3 text-slate-700 ml-2" />}
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          {modules.map((m) => (
            <div key={m.id} className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${m.progress === 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
                style={{ width: `${m.progress}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Estimated time */}
      <div className="flex items-center gap-4 mb-6 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Clock className="w-3.5 h-3.5 text-slate-600" />
          <span>Estimated total time: <span className="text-slate-300 font-medium">~1h 40min</span></span>
        </div>
        <div className="ml-auto flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] text-slate-400 hover:text-slate-200 border border-white/[0.06] hover:border-white/[0.12] transition-all">
            <RotateCcw className="w-3 h-3" />Reset progress
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] text-white bg-indigo-600 hover:bg-indigo-500 transition-colors">
            <Play className="w-3 h-3" />Continue
          </button>
        </div>
      </div>

      {/* Module cards */}
      <div className="space-y-4">
        {modules.map((m) => (
          <ModuleCard key={m.id} module={m} onToggle={(itemId) => toggleCheck(m.id, itemId)} />
        ))}
      </div>
    </div>
  );
}
