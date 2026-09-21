import { useState } from "react";
import {
  Send, Copy, Check, ArrowRight, Zap, Terminal, Server, Database,
  Layers, GitBranch, Github, Search, Lock, Star, ChevronRight,
  CheckCircle2, X, FileCode2, FileJson, ArrowLeft, Clock, Award,
  ChevronDown, Circle, Play, RotateCcw,
} from "lucide-react";
import { useDashboard } from "../../DashboardContext";

// ─── Shared: AI chat types ────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: { label: string }[];
  code?: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    content: "I've indexed **company/core-billing-api** — 47 files across 6 modules. Ask me anything about the architecture, authentication flow, or how to get started locally.",
  },
  { role: "user", content: "How does JWT authentication work in this repo?" },
  {
    role: "assistant",
    content: "Authentication uses a dual-token strategy: short-lived access tokens (15 min) and long-lived refresh tokens (30 days). The `verifyToken` middleware validates signatures using the RS256 algorithm with rotating key pairs stored in Redis.",
    citations: [{ label: "src/auth/jwt.ts:L42" }, { label: "src/auth/middleware.ts:L18" }],
    code: `// src/auth/jwt.ts:L42
export const verifyToken = async (token: string): Promise<JWTPayload> => {
  const isRevoked = await redis.sismember("jwt:revoked", token);
  if (isRevoked) throw new Error("Token has been revoked");
  const { publicKey } = await getKeyPair();
  return jose.jwtVerify(token, publicKey, { algorithms: ["RS256"] });
};`,
  },
];

// ─── Shared: AI chat panel ────────────────────────────────────────────────────

function AIChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const reply: ChatMessage = {
      role: "assistant",
      content: "The billing service integrates with Stripe via webhook events processed asynchronously through a Redis queue, ensuring idempotency with a 24-hour deduplication window.",
      citations: [{ label: "src/services/billing.service.ts:L87" }, { label: "src/services/webhook.service.ts:L23" }],
    };
    setMessages((m) => [...m, { role: "user", content: input }, reply]);
    setInput("");
  };

  return (
    <aside className="w-[300px] shrink-0 flex flex-col bg-[#0D1117] border-l border-white/[0.06]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-semibold text-white">Ask the Codebase</span>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 font-mono">Full Repo</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}>
            {msg.role === "user" ? (
              <div className="max-w-[85%] px-3 py-2 rounded-xl rounded-tr-sm bg-indigo-600 text-white text-[11px] leading-relaxed">{msg.content}</div>
            ) : (
              <div className="w-full">
                <div
                  className="text-[11px] text-slate-300 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/`(.*?)`/g, "<code style='color:#a78bfa;font-family:monospace'>$1</code>"),
                  }}
                />
                {msg.code && (
                  <div className="mt-2 rounded-md overflow-hidden border border-white/10">
                    <div className="px-3 py-1.5 bg-slate-900/80 border-b border-white/10">
                      <span className="text-[10px] font-mono text-slate-500">TypeScript</span>
                    </div>
                    <pre className="p-3 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed bg-[#0D1117]">{msg.code}</pre>
                  </div>
                )}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {msg.citations.map((c) => (
                      <span key={c.label} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-[10px] font-mono text-indigo-300 hover:bg-indigo-500/20 cursor-pointer transition-colors">
                        <span className="text-[9px]">📄</span>{c.label}
                      </span>
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
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex items-center justify-center w-7 h-7 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0 mb-0.5"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <p className="text-[9px] text-slate-700 mt-1.5 text-center font-mono">Powered by DevRamp AI</p>
      </div>
    </aside>
  );
}

// ─── Connect repo empty state ─────────────────────────────────────────────────

const MOCK_REPOS = [
  { name: "company/core-billing-api", lang: "TypeScript", stars: 42, private: true, updated: "2h ago" },
  { name: "company/auth-service", lang: "TypeScript", stars: 18, private: true, updated: "1d ago" },
  { name: "company/frontend-app", lang: "TypeScript", stars: 91, private: false, updated: "3d ago" },
  { name: "company/data-pipeline", lang: "Python", stars: 7, private: true, updated: "1w ago" },
  { name: "company/mobile-sdk", lang: "Swift", stars: 33, private: false, updated: "2w ago" },
];

function ConnectRepoView() {
  const { setHasRepo, setRepoName } = useDashboard();
  const [search, setSearch] = useState("");
  const [connecting, setConnecting] = useState<string | null>(null);

  const filtered = MOCK_REPOS.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  const handleConnect = (name: string) => {
    setConnecting(name);
    setTimeout(() => { setHasRepo(true); setRepoName(name); }, 1200);
  };

  const langColor: Record<string, string> = { TypeScript: "bg-blue-500", Python: "bg-yellow-500", Swift: "bg-orange-500" };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
        <GitBranch className="w-7 h-7 text-indigo-400" />
      </div>
      <h2 className="text-lg font-semibold text-white mb-1">Connect a repository</h2>
      <p className="text-sm text-slate-500 text-center max-w-sm mb-6">
        Choose a repo to index into DevRamp. We'll scan the codebase, generate architecture docs, and enable the AI copilot.
      </p>
      <button className="flex items-center gap-2.5 px-4 py-2.5 mb-6 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-sm text-slate-200 font-medium transition-all">
        <Github className="w-4 h-4" />Connect GitHub account
      </button>
      <div className="w-full max-w-lg">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-colors"
          />
        </div>
        <div className="rounded-xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
          {filtered.map((repo) => (
            <div key={repo.name} className="flex items-center gap-3 px-4 py-3 bg-[#0D1117] hover:bg-white/[0.03] transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-mono text-slate-200 truncate">{repo.name}</span>
                  {repo.private && <Lock className="w-3 h-3 text-slate-600 shrink-0" />}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-600">
                  <span className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${langColor[repo.lang] ?? "bg-slate-500"}`} />{repo.lang}
                  </span>
                  <span className="flex items-center gap-1"><Star className="w-2.5 h-2.5" />{repo.stars}</span>
                  <span>Updated {repo.updated}</span>
                </div>
              </div>
              <button
                onClick={() => handleConnect(repo.name)}
                disabled={connecting !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
              >
                {connecting === repo.name
                  ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><ChevronRight className="w-3.5 h-3.5" />Connect</>}
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-slate-600 bg-[#0D1117]">No repositories found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Code viewer ──────────────────────────────────────────────────────────────

const KEYWORDS = new Set([
  "import","export","from","const","let","var","function","async","await",
  "return","if","else","for","while","class","interface","type","extends",
  "default","new","this","null","undefined","true","false","void","typeof",
  "readonly","as","of","in","switch","case","break","throw","try","catch",
  "finally","string","number","boolean","Promise",
]);
type TT = "keyword"|"string"|"comment"|"typename"|"number"|"fn"|"plain";

function tokenize(line: string): Array<{ text: string; type: TT }> {
  const out: Array<{ text: string; type: TT }> = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === "/" && line[i+1] === "/") { out.push({ text: line.slice(i), type: "comment" }); break; }
    if (line[i] === '"' || line[i] === "'") {
      const q = line[i]; let j = i+1;
      while (j < line.length && line[j] !== q) { if (line[j] === "\\") j++; j++; }
      out.push({ text: line.slice(i, j+1), type: "string" }); i = j+1; continue;
    }
    if (line[i] === "`") {
      let j = i+1;
      while (j < line.length && line[j] !== "`") { if (line[j] === "\\") j++; j++; }
      out.push({ text: line.slice(i, j+1), type: "string" }); i = j+1; continue;
    }
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++;
      const w = line.slice(i, j);
      if (KEYWORDS.has(w)) out.push({ text: w, type: "keyword" });
      else if (/^[A-Z]/.test(w)) out.push({ text: w, type: "typename" });
      else if (line[j] === "(") out.push({ text: w, type: "fn" });
      else out.push({ text: w, type: "plain" });
      i = j; continue;
    }
    if (/[0-9]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      out.push({ text: line.slice(i, j), type: "number" }); i = j; continue;
    }
    out.push({ text: line[i], type: "plain" }); i++;
  }
  return out;
}

const CLRS: Record<TT, string> = {
  keyword: "#a78bfa", string: "#34d399", comment: "#4b5563",
  typename: "#60a5fa", number: "#fb923c", fn: "#93c5fd", plain: "#cbd5e1",
};

function CodeLine({ line, num, highlight }: { line: string; num: number; highlight?: boolean }) {
  const tokens = tokenize(line);
  return (
    <div className={`flex group min-w-0 ${highlight ? "bg-indigo-500/[0.07] border-l-2 border-indigo-500" : "border-l-2 border-transparent hover:bg-white/[0.02]"}`}>
      <span className="w-11 text-right pr-4 py-0.5 text-[11px] font-mono text-slate-700 select-none shrink-0 group-hover:text-slate-500">{num}</span>
      <span className="font-mono text-[12px] leading-6 py-0.5 whitespace-pre">
        {tokens.map((t, i) => <span key={i} style={{ color: CLRS[t.type] }}>{t.text}</span>)}
      </span>
    </div>
  );
}

const FILE_CONTENTS: Record<string, { lang: string; content: string }> = {
  "src/auth/jwt.ts": {
    lang: "TypeScript",
    content: `import { SignJWT, jwtVerify } from "jose";
import { redis } from "../db/redis";
import type { JWTPayload, KeyPair } from "./types";

const KEY_TTL = 24 * 60 * 60; // 24 hours in seconds

async function getKeyPair(): Promise<KeyPair> {
  const cached = await redis.get("jwt:keypair");
  if (cached) return JSON.parse(cached) as KeyPair;

  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );

  await redis.setex("jwt:keypair", KEY_TTL, JSON.stringify(keyPair));
  return keyPair as unknown as KeyPair;
}

export async function signToken(
  payload: JWTPayload,
  expiresIn = "15m"
): Promise<string> {
  const { privateKey } = await getKeyPair();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(privateKey);
}

// L42 — verify and decode a JWT, checking revocation list
export const verifyToken = async (token: string): Promise<JWTPayload> => {
  const isRevoked = await redis.sismember("jwt:revoked", token);
  if (isRevoked) throw new Error("Token has been revoked");

  const { publicKey } = await getKeyPair();
  const { payload } = await jwtVerify(token, publicKey, {
    algorithms: ["RS256"],
  });

  return payload as JWTPayload;
};

export async function revokeToken(token: string): Promise<void> {
  await redis.sadd("jwt:revoked", token);
  await redis.expire("jwt:revoked", KEY_TTL);
}`,
  },
  "src/services/billing.service.ts": {
    lang: "TypeScript",
    content: `import { Injectable } from "@nestjs/common";
import Stripe from "stripe";
import { PrismaService } from "../db/prisma.service";
import { RedisService } from "../db/redis.service";
import type { CreateSubscriptionDto } from "./dto/create-subscription.dto";

const DEDUP_WINDOW = 86400; // 24 hours

@Injectable()
export class BillingService {
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-06-20",
    });
  }

  async createSubscription(
    userId: string,
    dto: CreateSubscriptionDto
  ): Promise<Stripe.Subscription> {
    const customer = await this.getOrCreateCustomer(userId);
    return this.stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: dto.priceId }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });
  }

  // L87 — idempotent Stripe webhook processor
  async processWebhookEvent(event: Stripe.Event): Promise<void> {
    const key = \`webhook:\${event.id}\`;
    const already = await this.redis.get(key);
    if (already) return;
    await this.redis.setex(key, DEDUP_WINDOW, "1");

    switch (event.type) {
      case "invoice.payment_succeeded":
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.deleted":
        await this.handleCanceled(event.data.object as Stripe.Subscription);
        break;
    }
  }

  private async getOrCreateCustomer(userId: string): Promise<Stripe.Customer> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.stripeCustomerId) {
      return this.stripe.customers.retrieve(user.stripeCustomerId) as Promise<Stripe.Customer>;
    }
    const c = await this.stripe.customers.create({ email: user.email });
    await this.prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: c.id } });
    return c;
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    await this.prisma.subscription.update({
      where: { stripeId: invoice.subscription as string },
      data: { status: "active" },
    });
  }

  private async handleCanceled(sub: Stripe.Subscription): Promise<void> {
    await this.prisma.subscription.update({
      where: { stripeId: sub.id },
      data: { status: "canceled" },
    });
  }
}`,
  },
  "src/app.module.ts": {
    lang: "TypeScript",
    content: `import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./services/billing.module";
import { WebhookModule } from "./services/webhook.module";
import { PrismaModule } from "./db/prisma.module";
import { RedisModule } from "./db/redis.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    BillingModule,
    WebhookModule,
  ],
})
export class AppModule {}`,
  },
  "package.json": {
    lang: "JSON",
    content: `{
  "name": "core-billing-api",
  "version": "1.4.2",
  "description": "Billing and subscription management API",
  "scripts": {
    "start:dev": "nest start --watch",
    "build": "nest build",
    "test": "jest",
    "lint": "eslint src --ext .ts --fix",
    "prisma:migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@prisma/client": "^5.9.1",
    "jose": "^5.2.2",
    "stripe": "^14.17.0",
    "ioredis": "^5.3.2"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.1",
    "typescript": "^5.3.3"
  }
}`,
  },
};

function CodeView() {
  const { selectedFile, setSelectedFile } = useDashboard();
  const [openFiles, setOpenFiles] = useState<string[]>(selectedFile ? [selectedFile] : []);
  const [activeTab, setActiveTab] = useState(selectedFile ?? "");

  const openFile = (path: string) => {
    setActiveTab(path);
    if (!openFiles.includes(path)) setOpenFiles((f) => [...f, path]);
  };

  // Sync when selectedFile changes from sidebar
  if (selectedFile && !openFiles.includes(selectedFile)) {
    openFiles.push(selectedFile);
    // Note: we call openFile logic inline to avoid state update in render
  }
  const currentTab = selectedFile && openFiles.includes(selectedFile) ? selectedFile : activeTab;

  const closeTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = openFiles.filter((f) => f !== path);
    setOpenFiles(next);
    if (currentTab === path) {
      const fallback = next[next.length - 1] ?? null;
      setSelectedFile(fallback);
      setActiveTab(fallback ?? "");
    }
  };

  const fileData = FILE_CONTENTS[currentTab];
  const lines = fileData?.content.split("\n") ?? [];
  const fileName = currentTab.split("/").pop() ?? "";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Back breadcrumb + file tabs */}
      <div className="flex items-center border-b border-white/[0.06] bg-[#0D1117] shrink-0 overflow-x-auto">
        <button
          onClick={() => setSelectedFile(null)}
          className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors border-r border-white/[0.06] shrink-0"
        >
          <ArrowLeft className="w-3 h-3" />Workspace
        </button>
        {openFiles.map((path) => {
          const name = path.split("/").pop()!;
          const isJson = name.endsWith(".json");
          const isCurrent = path === currentTab;
          return (
            <div
              key={path}
              onClick={() => { setSelectedFile(path); setActiveTab(path); }}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 cursor-pointer shrink-0 group transition-colors ${
                isCurrent ? "border-indigo-500 bg-[#0B0F17] text-slate-200" : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
              }`}
            >
              {isJson
                ? <FileJson className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                : <FileCode2 className="w-3.5 h-3.5 text-indigo-400/70 shrink-0" />}
              <span className="text-[11px] font-mono">{name}</span>
              <button
                onClick={(e) => closeTab(path, e)}
                className="w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Path breadcrumb */}
      {currentTab && (
        <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/[0.04] bg-[#0B0F17] shrink-0">
          <span className="text-[10px] font-mono text-slate-600">{currentTab}</span>
          {fileData && <span className="text-[10px] font-mono text-slate-700">{fileData.lang}</span>}
        </div>
      )}

      {/* Code */}
      <div className="flex-1 overflow-auto bg-[#0B0F17]">
        {!currentTab || !fileData ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <FileCode2 className="w-8 h-8 text-slate-700" />
            <p className="text-sm text-slate-600">No preview available for <span className="font-mono">{fileName}</span></p>
          </div>
        ) : (
          <div className="py-3 min-w-0">
            {lines.map((line, i) => (
              <CodeLine
                key={i}
                line={line}
                num={i + 1}
                highlight={i + 1 === 42 && currentTab === "src/auth/jwt.ts"}
              />
            ))}
          </div>
        )}
      </div>

      {fileData && (
        <div className="flex items-center justify-between px-4 py-1 border-t border-white/[0.04] bg-[#0D1117] shrink-0">
          <span className="text-[10px] font-mono text-slate-700">{lines.length} lines</span>
          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-700">
            <span>{fileData.lang}</span><span>UTF-8</span><span>LF</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Module viewer ────────────────────────────────────────────────────────────

interface ModuleData {
  n: number;
  title: string;
  subtitle: string;
  duration: string;
  color: string;
  accentBg: string;
  accentBorder: string;
  sections: { heading: string; body: string }[];
}

const MODULE_DATA: ModuleData[] = [
  {
    n: 1, title: "Architecture Overview", subtitle: "Understand the system topology and key design decisions.",
    duration: "~20 min", color: "text-indigo-400", accentBg: "bg-indigo-500/10", accentBorder: "border-indigo-500/30",
    sections: [
      { heading: "What is core-billing-api?", body: "A monolithic NestJS REST API that handles subscription billing, payment processing, and webhook event ingestion for all customer accounts. It is the single source of truth for subscription state across the platform." },
      { heading: "Technology stack", body: "Node.js 20 + NestJS 10 for the application layer. PostgreSQL 15 as the primary database accessed through Prisma ORM. Redis 7 for session storage, short-lived caches, and the async job queue. Stripe for payment processing. JWT with RS256 rotating keys for authentication." },
      { heading: "Key design decisions", body: "The team chose a monolith over microservices to avoid distributed-transaction complexity for billing operations where consistency matters most. The Stripe webhook idempotency pattern uses Redis-based deduplication rather than a DB lock to keep the hot path fast." },
    ],
  },
  {
    n: 2, title: "Local Setup", subtitle: "Get the API running on your machine end-to-end.",
    duration: "~35 min", color: "text-emerald-400", accentBg: "bg-emerald-500/10", accentBorder: "border-emerald-500/30",
    sections: [
      { heading: "Prerequisites", body: "You need Node.js ≥ 20, PostgreSQL ≥ 15, and Redis ≥ 7 running locally. Docker Compose is optional but recommended — run `docker compose up -d` from the repo root to spin up Postgres and Redis automatically." },
      { heading: "First-time setup", body: "Clone the repo, copy `.env.example` to `.env`, and fill in DATABASE_URL, REDIS_URL, and the JWT key pair. Run `npm install` then `npx prisma migrate dev` to apply all migrations. Start the server with `npm run start:dev`." },
      { heading: "Verifying your setup", body: "The server listens on port 3000 by default. Visit `http://localhost:3000/health` — you should see {\"status\":\"ok\"}. Swagger UI is at `/api/docs`. Run `npm test` to confirm all 143 unit tests pass." },
    ],
  },
  {
    n: 3, title: "Key Services", subtitle: "Deep-dive into the three core service modules.",
    duration: "~45 min", color: "text-violet-400", accentBg: "bg-violet-500/10", accentBorder: "border-violet-500/30",
    sections: [
      { heading: "AuthModule", body: "Handles all authentication and authorization. Issues short-lived access tokens (15 min) and long-lived refresh tokens (30 days) signed with RS256. Key rotation happens every 24h via a Redis-cached key pair. The JwtGuard protects all non-public endpoints." },
      { heading: "BillingModule", body: "Wraps the Stripe SDK with our domain logic. Manages subscription lifecycle: creation, upgrades, downgrades, and cancellations. All Stripe customer objects are lazily created on first subscription. BillingService.createSubscription() is the primary entry point." },
      { heading: "WebhookModule", body: "Receives Stripe webhook events, verifies signatures using STRIPE_WEBHOOK_SECRET, and processes events idempotently. A Redis SISMEMBER check prevents double-processing. Processed event IDs expire after 24h. Critical events: invoice.payment_succeeded, customer.subscription.deleted." },
    ],
  },
];

function ModuleView() {
  const { selectedModule, setSelectedModule, checklists, toggleItem, resetModule, markAllDone, moduleProgress } = useDashboard();
  const [activeSection, setActiveSection] = useState(0);

  const module = MODULE_DATA.find((m) => m.n === selectedModule) ?? MODULE_DATA[0];
  const items = checklists[module.n] ?? [];
  const progress = moduleProgress(module.n);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Back + header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-[#0D1117] shrink-0">
        <button
          onClick={() => setSelectedModule(null)}
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />Workspace
        </button>
        <span className="text-slate-700">/</span>
        <span className="text-[11px] text-slate-400">Onboarding Modules</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Module selector tabs */}
        <div className="flex gap-2 mb-5">
          {MODULE_DATA.map((m) => {
            const mProgress = moduleProgress(m.n);
            const isActive = selectedModule === m.n;
            return (
              <button
                key={m.n}
                onClick={() => { setSelectedModule(m.n); setActiveSection(0); }}
                className={`flex-1 text-left p-3 rounded-xl border transition-all ${
                  isActive ? `${m.accentBg} ${m.accentBorder}` : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-slate-600">MODULE {m.n}</span>
                  {mProgress === 100 && <Award className="w-3 h-3 text-emerald-400" />}
                </div>
                <p className={`text-xs font-semibold mb-2 ${isActive ? m.color : "text-slate-300"}`}>{m.title}</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className={`h-full rounded-full ${mProgress === 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${mProgress}%` }} />
                  </div>
                  <span className="text-[9px] font-mono text-slate-600">{mProgress}%</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Expanded module content */}
        {selectedModule !== null && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            {/* Module title bar */}
            <div className={`flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] ${module.accentBg}`}>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono text-slate-600">MODULE {module.n}</span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-500"><Clock className="w-3 h-3" />{module.duration}</span>
                </div>
                <h2 className={`text-sm font-semibold ${module.color}`}>{module.title}</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">{module.subtitle}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {progress === 100 && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <Award className="w-4 h-4" />Complete
                  </span>
                )}
                <div className="relative w-12 h-12">
                  <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke={progress === 100 ? "#34d399" : "#6366f1"} strokeWidth="3"
                      strokeDasharray={`${progress * 0.942} 94.2`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-white leading-none">{progress}%</span>
                </div>
              </div>
            </div>

            {/* 3-column body */}
            <div className="grid grid-cols-5">
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

              {/* Section body */}
              <div className="col-span-2 p-5 border-r border-white/[0.06]">
                <h4 className={`text-sm font-semibold mb-3 ${module.color}`}>{module.sections[activeSection].heading}</h4>
                <p className="text-sm text-slate-400 leading-relaxed">{module.sections[activeSection].body}</p>
              </div>

              {/* Checklist */}
              <div className="col-span-2 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-medium text-slate-400">Checklist</span>
                  <span className="text-[10px] font-mono text-slate-600">
                    {items.filter((c) => c.done).length}/{items.length} done
                  </span>
                </div>
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <label key={item.id} className="flex items-start gap-2.5 cursor-pointer group">
                      <button
                        onClick={() => toggleItem(module.n, item.id)}

                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          item.done ? "bg-emerald-500 border-emerald-500" : "border-slate-600 hover:border-emerald-500/50"
                        }`}
                      >
                        {item.done && <Check className="w-2.5 h-2.5 text-white" />}
                      </button>
                      <span className={`text-xs leading-relaxed transition-colors ${item.done ? "text-slate-500 line-through" : "text-slate-300 group-hover:text-white"}`}>
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-5">
                  <button
                    onClick={() => resetModule(module.n)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] text-slate-500 hover:text-slate-300 border border-white/[0.06] hover:border-white/[0.12] transition-all"
                  >
                    <RotateCcw className="w-3 h-3" />Reset
                  </button>
                  <button
                    onClick={() => markAllDone(module.n)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                  >
                    <Play className="w-3 h-3" />Mark all done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Default workspace view ───────────────────────────────────────────────────

type WsTab = "architecture" | "dependency" | "setup";

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

function ServiceFlow() {
  const nodes = [
    { label: "Client", sub: "React / Mobile", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/30" },
    { label: "REST API", sub: "Node.js / Express", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/30" },
    { label: "PostgreSQL", sub: "Primary DB", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
    { label: "Redis", sub: "Cache / Sessions", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  ];
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-4">
      {nodes.map((n, i) => (
        <div key={n.label} className="flex items-center gap-2 flex-1">
          <div className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border ${n.bg} hover:scale-[1.03] transition-transform`}>
            <span className={`text-xs font-semibold ${n.color}`}>{n.label}</span>
            <span className="text-[10px] text-slate-500">{n.sub}</span>
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

function DefaultWorkspace() {
  const [activeTab, setActiveTab] = useState<WsTab>("architecture");
  const tabs: { id: WsTab; label: string }[] = [
    { id: "architecture", label: "System Architecture" },
    { id: "dependency", label: "Dependency Graph" },
    { id: "setup", label: "Environment Setup" },
  ];
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex border-b border-white/[0.06] bg-[#0D1117] shrink-0">
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
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full border border-white/[0.08] text-slate-400 bg-white/[0.03] font-mono">{tag}</span>
                ))}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Monolithic NestJS application exposing a REST API consumed by the billing frontend. Authentication via RS256 JWT tokens. All data lives in PostgreSQL accessed through Prisma. Redis handles sessions and async job queuing.
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
                <Database className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-300">Service Topology</span>
              </div>
              <ServiceFlow />
              <div className="px-4 pb-3 flex items-center gap-4 text-[10px] text-slate-600 font-mono border-t border-white/[0.06] pt-2">
                <span>→ HTTP/REST</span><span>→ TCP/5432 (PG)</span><span>→ TCP/6379 (Redis)</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Quick Start</h3>
              </div>
              <div className="space-y-1.5">
                <SetupCommand cmd="git clone git@github.com:company/core-billing-api.git" comment="clone" />
                <SetupCommand cmd="cd core-billing-api && cp .env.example .env" comment="env" />
                <SetupCommand cmd="npm install" comment="deps" />
                <SetupCommand cmd="npx prisma migrate dev" comment="migrations" />
                <SetupCommand cmd="npm run start:dev" comment="start" />
              </div>
            </div>
          </div>
        )}

        {activeTab === "dependency" && (
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
                  {mod.deps.length > 0
                    ? mod.deps.map((d) => (
                      <div key={d} className="flex items-center gap-1 text-[10px] text-slate-500">
                        <ArrowRight className="w-2.5 h-2.5" /><span className="font-mono">{d}</span>
                      </div>
                    ))
                    : <span className="text-[10px] text-slate-700 font-mono">no deps</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "setup" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-white">Environment Variables</h2>
                <span className="text-[10px] font-mono text-slate-600 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded">.env.example</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">Copy <span className="font-mono text-slate-400">.env.example</span> to <span className="font-mono text-slate-400">.env</span> and fill in your own values — never commit real credentials.</p>
              <div className="space-y-1">
                {[
                  { key: "DATABASE_URL", val: "postgresql://<USER>:<PASSWORD>@<HOST>:5432/<DB>", required: true },
                  { key: "REDIS_URL", val: "redis://<HOST>:6379", required: true },
                  { key: "JWT_PRIVATE_KEY", val: "<your-rs256-private-key>", required: true },
                  { key: "STRIPE_SECRET_KEY", val: "sk_test_<your-stripe-key>", required: true },
                  { key: "PORT", val: "3000", required: false },
                ].map((env) => (
                  <div key={env.key} className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06] transition-all">
                    <span className="font-mono text-[11px] text-sky-400 w-44 shrink-0">{env.key}</span>
                    <span className="font-mono text-[11px] text-slate-600 flex-1 truncate italic">{env.val}</span>
                    {env.required
                      ? <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/25 text-red-400 font-mono">required</span>
                      : <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/50 border border-white/[0.06] text-slate-500 font-mono">optional</span>}
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
                ].map((r) => (
                  <div key={r.name} className="flex items-center gap-2 p-2.5 rounded-md bg-white/[0.02] border border-white/[0.06]">
                    {r.ok === true ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-slate-600" />}
                    <span className="text-xs text-slate-300">{r.name}</span>
                    <span className="ml-auto text-[10px] font-mono text-slate-600">{r.version}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────

export function WorkspacePage() {
  const { hasRepo, selectedFile, selectedModule } = useDashboard();

  if (!hasRepo) return <ConnectRepoView />;

  const showChat = !selectedModule; // hide chat only for module view to give more width

  const centerPanel = selectedFile
    ? <CodeView />
    : selectedModule
      ? <ModuleView />
      : <DefaultWorkspace />;

  return (
    <div className="flex flex-1 overflow-hidden">
      {centerPanel}
      {showChat && <AIChatPanel />}
    </div>
  );
}
