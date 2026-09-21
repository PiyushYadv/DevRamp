import { useState } from "react";
import { useNavigate } from "react-router";
import {
  ChevronDown,
  RefreshCw,
  CheckCircle2,
  Folder,
  FolderOpen,
  FileCode2,
  FileJson,
  Send,
  Copy,
  Check,
  ArrowRight,
  GitBranch,
  Zap,
  Terminal,
  ChevronRight,
  Circle,
  Database,
  Server,
  Layers,
  Home,
  LayoutDashboard,
  BookOpen,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "architecture" | "dependency" | "setup";

interface FileNode {
  name: string;
  type: "folder" | "file";
  indexed?: boolean;
  ext?: string;
  children?: FileNode[];
  open?: boolean;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: { label: string; file: string }[];
  code?: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FILE_TREE: FileNode[] = [
  {
    name: "src",
    type: "folder",
    open: true,
    children: [
      {
        name: "auth",
        type: "folder",
        open: true,
        children: [
          { name: "jwt.ts", type: "file", indexed: true, ext: "ts" },
          { name: "middleware.ts", type: "file", indexed: true, ext: "ts" },
          { name: "oauth.ts", type: "file", indexed: false, ext: "ts" },
        ],
      },
      {
        name: "services",
        type: "folder",
        open: false,
        children: [
          { name: "billing.service.ts", type: "file", indexed: true, ext: "ts" },
          { name: "payment.service.ts", type: "file", indexed: true, ext: "ts" },
          { name: "webhook.service.ts", type: "file", indexed: false, ext: "ts" },
        ],
      },
      {
        name: "db",
        type: "folder",
        open: false,
        children: [
          { name: "schema.prisma", type: "file", indexed: true, ext: "prisma" },
          { name: "migrations", type: "folder", open: false, children: [] },
        ],
      },
      { name: "main.ts", type: "file", indexed: true, ext: "ts" },
      { name: "app.module.ts", type: "file", indexed: true, ext: "ts" },
    ],
  },
  { name: "package.json", type: "file", indexed: true, ext: "json" },
  { name: "tsconfig.json", type: "file", indexed: true, ext: "json" },
  { name: ".env.example", type: "file", indexed: false, ext: "env" },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "I've indexed **company/core-billing-api** — 47 files across 6 modules. Ask me anything about the architecture, authentication flow, or how to get started locally.",
  },
  {
    role: "user",
    content: "How does JWT authentication work in this repo?",
  },
  {
    role: "assistant",
    content:
      "Authentication uses a dual-token strategy: short-lived access tokens (15 min) and long-lived refresh tokens (30 days). The `verifyToken` middleware validates signatures using the RS256 algorithm with rotating key pairs stored in Redis.",
    citations: [
      { label: "src/auth/jwt.ts:L42", file: "jwt.ts" },
      { label: "src/auth/middleware.ts:L18", file: "middleware.ts" },
    ],
    code: `// src/auth/jwt.ts:L42
export const verifyToken = async (token: string): Promise<JWTPayload> => {
  const key = await getPublicKey(token);
  return jose.jwtVerify(token, key, {
    algorithms: ["RS256"],
  });
};`,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ExtIcon({ ext }: { ext?: string }) {
  if (ext === "json") return <FileJson className="w-3.5 h-3.5 text-yellow-400" />;
  return <FileCode2 className="w-3.5 h-3.5 text-indigo-400" />;
}

function FileTreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [open, setOpen] = useState(node.open ?? false);
  const pad = depth * 12;

  if (node.type === "folder") {
    return (
      <div>
        <button
          className="w-full flex items-center gap-1.5 py-0.5 px-2 hover:bg-white/5 rounded text-left transition-colors"
          style={{ paddingLeft: `${8 + pad}px` }}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronRight className={`w-3 h-3 text-slate-500 transition-transform ${open ? "rotate-90" : ""}`} />
          {open ? (
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400/80" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span className="text-xs text-slate-300 font-mono">{node.name}</span>
        </button>
        {open &&
          node.children?.map((child, i) => (
            <FileTreeNode key={i} node={child} depth={depth + 1} />
          ))}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-1.5 py-0.5 px-2 hover:bg-white/5 rounded cursor-pointer group transition-colors"
      style={{ paddingLeft: `${8 + pad + 16}px` }}
    >
      <ExtIcon ext={node.ext} />
      <span className="text-xs font-mono text-slate-400 group-hover:text-slate-200 transition-colors flex-1">
        {node.name}
      </span>
      {node.indexed && <CheckCircle2 className="w-3 h-3 text-emerald-500 opacity-80" />}
      {node.indexed === false && <Circle className="w-3 h-3 text-slate-600" />}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative mt-2 rounded-md overflow-hidden border border-white/10">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 border-b border-white/10">
        <span className="text-[10px] font-mono text-slate-500">TypeScript</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-3 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed bg-[#0D1117]">
        {code}
      </pre>
    </div>
  );
}

function CitationChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-[10px] font-mono text-indigo-300 hover:bg-indigo-500/20 cursor-pointer transition-colors">
      <span className="text-[9px]">📄</span>
      {label}
    </span>
  );
}

function ServiceFlow() {
  const nodes = [
    { id: "client", label: "Client", sub: "React / Mobile", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/30" },
    { id: "api", label: "REST API", sub: "Node.js / Express", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/30" },
    { id: "pg", label: "PostgreSQL", sub: "Primary DB", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
    { id: "redis", label: "Redis", sub: "Cache / Sessions", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  ];
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-4">
      {nodes.map((node, i) => (
        <div key={node.id} className="flex items-center gap-2 flex-1">
          <div className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border ${node.bg} transition-all hover:scale-[1.03]`}>
            <span className={`text-xs font-semibold ${node.color}`}>{node.label}</span>
            <span className="text-[10px] text-slate-500">{node.sub}</span>
          </div>
          {i < nodes.length - 1 && (
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <div className="w-8 h-px bg-gradient-to-r from-slate-600 to-indigo-500/50" />
              <ArrowRight className="w-3 h-3 text-slate-600 -mt-1.5" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SetupCommand({ cmd, comment }: { cmd: string; comment?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group flex items-center gap-3 py-2 px-3 rounded-md bg-[#0D1117] border border-white/[0.06] hover:border-indigo-500/30 transition-all">
      <span className="text-indigo-400 font-mono text-xs select-none">$</span>
      <span className="font-mono text-xs text-slate-300 flex-1">{cmd}</span>
      {comment && <span className="text-[10px] text-slate-600 font-mono hidden group-hover:block"># {comment}</span>}
      <button
        onClick={() => { navigator.clipboard.writeText(cmd); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("architecture");
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 1800);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: input };
    const assistantReply: ChatMessage = {
      role: "assistant",
      content:
        "I found relevant patterns across the codebase. The billing service integrates with Stripe via webhook events processed asynchronously using a Redis queue, ensuring idempotency with a 24-hour deduplication window.",
      citations: [
        { label: "src/services/billing.service.ts:L87", file: "billing.service.ts" },
        { label: "src/services/webhook.service.ts:L23", file: "webhook.service.ts" },
      ],
    };
    setMessages((m) => [...m, userMsg, assistantReply]);
    setInput("");
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "architecture", label: "System Architecture" },
    { id: "dependency", label: "Dependency Graph" },
    { id: "setup", label: "Environment Setup" },
  ];

  const onboardingModules = [
    { n: 1, label: "Architecture Overview", done: true },
    { n: 2, label: "Local Setup", done: false },
    { n: 3, label: "Key Services", done: false },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#0B0F17] text-slate-200 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Top Bar */}
      <div className="h-10 flex items-center gap-3 px-4 border-b border-white/[0.06] bg-[#0D1117] shrink-0">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          Home
        </button>
        <span className="text-slate-700">/</span>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
          Workspace
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-slate-500 font-mono">47 files indexed</span>
        </div>
      </div>

      {/* 3-Pane Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-[260px] shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0D1117]">
          <div className="p-3 border-b border-white/[0.06]">
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] transition-colors text-left">
              <div className="flex items-center gap-2 min-w-0">
                <GitBranch className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-xs font-mono text-slate-300 truncate">company/core-billing-api</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </button>
            <button
              onClick={handleSync}
              className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-white/[0.06] hover:border-indigo-500/30 hover:bg-indigo-500/[0.05] text-[11px] text-slate-400 hover:text-indigo-300 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Latest Commit"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2 px-1">
            <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
              <Layers className="w-3 h-3 text-slate-600" />
              <span className="text-[10px] uppercase tracking-widest text-slate-600 font-medium">Repository</span>
            </div>
            {FILE_TREE.map((node, i) => (
              <FileTreeNode key={i} node={node} depth={0} />
            ))}
            <div className="mt-1 px-2 py-1">
              <span className="text-[9px] font-mono text-slate-700">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 inline mr-1" />
                = indexed in vector DB
              </span>
            </div>
          </div>

          <div className="border-t border-white/[0.06] p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <BookOpen className="w-3 h-3 text-slate-600" />
              <span className="text-[10px] uppercase tracking-widest text-slate-600 font-medium">Onboarding Modules</span>
            </div>
            {onboardingModules.map((m) => (
              <div key={m.n} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/[0.04] cursor-pointer transition-colors group">
                <span className="text-[10px] font-mono text-slate-600 w-4">{m.n}.</span>
                {m.done ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                )}
                <span className={`text-xs ${m.done ? "text-slate-400" : "text-slate-300"} group-hover:text-slate-200 transition-colors`}>
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </aside>

        {/* Center Panel */}
        <main className="flex-1 flex flex-col overflow-hidden border-r border-white/[0.06]">
          <div className="flex items-center gap-0 border-b border-white/[0.06] bg-[#0D1117] shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 text-xs font-medium border-b-2 transition-all ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-300 bg-indigo-500/[0.05]"
                    : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === "architecture" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Server className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-sm font-semibold text-white">Architecture Summary</h2>
                    <span className="ml-auto text-[10px] font-mono text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded">auto-generated</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {["Node.js REST API", "PostgreSQL", "Redis", "Prisma ORM", "JWT Auth"].map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full border border-white/[0.08] text-slate-400 bg-white/[0.03] font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Monolithic NestJS application exposing a REST API consumed by the billing frontend. Authentication is handled via RS256 JWT tokens. All persistent data lives in a single PostgreSQL instance accessed through Prisma. Redis provides session storage and async job queuing.
                  </p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
                    <Database className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-medium text-slate-300">Service Topology</span>
                  </div>
                  <ServiceFlow />
                  <div className="px-4 pb-3 flex items-center gap-4 text-[10px] text-slate-600 font-mono border-t border-white/[0.06] pt-2">
                    <span>→ HTTP/REST</span>
                    <span>→ TCP/5432 (PG)</span>
                    <span>→ TCP/6379 (Redis)</span>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white">Quick Start Setup Guide</h3>
                  </div>
                  <div className="space-y-1.5">
                    <SetupCommand cmd="git clone git@github.com:company/core-billing-api.git" comment="clone repo" />
                    <SetupCommand cmd="cd core-billing-api && cp .env.example .env" comment="configure env" />
                    <SetupCommand cmd="npm install" comment="install deps" />
                    <SetupCommand cmd="npx prisma migrate dev" comment="run migrations" />
                    <SetupCommand cmd="npm run start:dev" comment="start dev server" />
                  </div>
                  <p className="text-[11px] text-slate-600 mt-3">
                    Server starts on <span className="font-mono text-indigo-400">http://localhost:3000</span>. Swagger docs at{" "}
                    <span className="font-mono text-indigo-400">/api/docs</span>.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "dependency" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-4 h-4 text-violet-400" />
                    <h2 className="text-sm font-semibold text-white">Module Dependency Graph</h2>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { name: "AuthModule", deps: ["ConfigModule", "PrismaModule"], color: "border-indigo-500/30 bg-indigo-500/5" },
                      { name: "BillingModule", deps: ["AuthModule", "PrismaModule", "RedisModule"], color: "border-emerald-500/30 bg-emerald-500/5" },
                      { name: "WebhookModule", deps: ["BillingModule", "RedisModule"], color: "border-orange-500/30 bg-orange-500/5" },
                      { name: "PrismaModule", deps: [], color: "border-slate-500/30 bg-slate-500/5" },
                      { name: "RedisModule", deps: [], color: "border-cyan-500/30 bg-cyan-500/5" },
                      { name: "ConfigModule", deps: [], color: "border-pink-500/30 bg-pink-500/5" },
                    ].map((mod) => (
                      <div key={mod.name} className={`p-3 rounded-lg border ${mod.color}`}>
                        <p className="text-xs font-mono font-semibold text-slate-300 mb-2">{mod.name}</p>
                        {mod.deps.length > 0 ? (
                          <div className="space-y-0.5">
                            {mod.deps.map((d) => (
                              <div key={d} className="flex items-center gap-1 text-[10px] text-slate-500">
                                <ArrowRight className="w-2.5 h-2.5" />
                                <span className="font-mono">{d}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-700 font-mono">no deps</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "setup" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <h2 className="text-sm font-semibold text-white mb-1">Environment Configuration</h2>
                  <p className="text-xs text-slate-500 mb-4">Required environment variables for local development.</p>
                  <div className="space-y-1">
                    {[
                      { key: "DATABASE_URL", val: "postgresql://user:pass@localhost:5432/billing", required: true },
                      { key: "REDIS_URL", val: "redis://localhost:6379", required: true },
                      { key: "JWT_PRIVATE_KEY", val: "<RS256 private key>", required: true },
                      { key: "STRIPE_SECRET_KEY", val: "sk_test_...", required: true },
                      { key: "STRIPE_WEBHOOK_SECRET", val: "whsec_...", required: true },
                      { key: "PORT", val: "3000", required: false },
                      { key: "LOG_LEVEL", val: "debug", required: false },
                    ].map((env) => (
                      <div key={env.key} className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06] transition-all">
                        <span className="font-mono text-[11px] text-sky-400 w-48 shrink-0">{env.key}</span>
                        <span className="font-mono text-[11px] text-slate-500 flex-1 truncate">{env.val}</span>
                        {env.required ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/25 text-red-400 font-mono">required</span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 border border-white/[0.06] text-slate-500 font-mono">optional</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Prerequisites</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: "Node.js", version: "≥ 20.0.0", ok: true },
                      { name: "PostgreSQL", version: "≥ 15.0", ok: true },
                      { name: "Redis", version: "≥ 7.0", ok: true },
                      { name: "Docker", version: "optional", ok: null },
                    ].map((req) => (
                      <div key={req.name} className="flex items-center gap-2 p-2.5 rounded-md bg-white/[0.02] border border-white/[0.06]">
                        {req.ok === true && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        {req.ok === null && <Circle className="w-3.5 h-3.5 text-slate-600" />}
                        <span className="text-xs text-slate-300">{req.name}</span>
                        <span className="ml-auto text-[10px] font-mono text-slate-600">{req.version}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right Panel — AI Copilot */}
        <aside className="w-[320px] shrink-0 flex flex-col bg-[#0D1117]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center">
                <Zap className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-white">Ask the Codebase</span>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 font-mono">
              Scope: Full Repo
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                {msg.role === "user" ? (
                  <div className="max-w-[85%] px-3 py-2 rounded-xl rounded-tr-sm bg-indigo-600 text-white text-[11px] leading-relaxed">
                    {msg.content}
                  </div>
                ) : (
                  <div className="w-full">
                    <div
                      className="text-[11px] text-slate-300 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }}
                    />
                    {msg.code && <CodeBlock code={msg.code} />}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {msg.citations.map((c) => (
                          <CitationChip key={c.label} label={c.label} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-white/[0.06] shrink-0">
            <div className="flex items-end gap-2 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.03] focus-within:border-indigo-500/40 transition-colors">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask about authentication, data flows, or setup..."
                rows={2}
                className="flex-1 bg-transparent text-[11px] text-slate-300 placeholder-slate-600 resize-none outline-none leading-relaxed"
                style={{ fontFamily: "'Inter', sans-serif" }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="flex items-center justify-center w-7 h-7 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0 mb-0.5"
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
            <p className="text-[9px] text-slate-700 mt-1.5 text-center font-mono">
              Powered by DevRamp AI · scoped to company/core-billing-api
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
