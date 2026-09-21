import { useState } from "react";
import { FileCode2, FileJson, ChevronRight, Folder, FolderOpen, X, GitCommit, User, Clock } from "lucide-react";

// ─── Syntax Highlighter ───────────────────────────────────────────────────────

const KEYWORDS = new Set([
  "import", "export", "from", "const", "let", "var", "function", "async",
  "await", "return", "if", "else", "for", "while", "class", "interface",
  "type", "extends", "default", "new", "this", "null", "undefined", "true",
  "false", "void", "typeof", "readonly", "as", "of", "in", "switch", "case",
  "break", "continue", "throw", "try", "catch", "finally", "string", "number",
  "boolean", "Promise",
]);

type TT = "keyword" | "string" | "comment" | "typename" | "number" | "fn" | "plain";

function tokenizeLine(line: string): Array<{ text: string; type: TT }> {
  const tokens: Array<{ text: string; type: TT }> = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === "/" && line[i + 1] === "/") {
      tokens.push({ text: line.slice(i), type: "comment" }); break;
    }
    if (line[i] === '"' || line[i] === "'") {
      const q = line[i]; let j = i + 1;
      while (j < line.length && line[j] !== q) { if (line[j] === "\\") j++; j++; }
      tokens.push({ text: line.slice(i, j + 1), type: "string" }); i = j + 1; continue;
    }
    if (line[i] === "`") {
      let j = i + 1;
      while (j < line.length && line[j] !== "`") { if (line[j] === "\\") j++; j++; }
      tokens.push({ text: line.slice(i, j + 1), type: "string" }); i = j + 1; continue;
    }
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);
      if (KEYWORDS.has(word)) tokens.push({ text: word, type: "keyword" });
      else if (/^[A-Z]/.test(word)) tokens.push({ text: word, type: "typename" });
      else if (line[j] === "(") tokens.push({ text: word, type: "fn" });
      else tokens.push({ text: word, type: "plain" });
      i = j; continue;
    }
    if (/[0-9]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      tokens.push({ text: line.slice(i, j), type: "number" }); i = j; continue;
    }
    tokens.push({ text: line[i], type: "plain" }); i++;
  }
  return tokens;
}

const COLORS: Record<TT, string> = {
  keyword: "#a78bfa",
  string: "#34d399",
  comment: "#4b5563",
  typename: "#60a5fa",
  number: "#fb923c",
  fn: "#93c5fd",
  plain: "#cbd5e1",
};

function CodeLine({ line, lineNum, highlighted }: { line: string; lineNum: number; highlighted?: boolean }) {
  const tokens = tokenizeLine(line);
  return (
    <div className={`flex group min-w-0 ${highlighted ? "bg-indigo-500/[0.07] border-l-2 border-indigo-500" : "border-l-2 border-transparent hover:bg-white/[0.02]"}`}>
      <span className="w-11 text-right pr-4 py-0.5 text-[11px] font-mono text-slate-700 select-none shrink-0 group-hover:text-slate-500">
        {lineNum}
      </span>
      <span className="font-mono text-[12px] leading-6 py-0.5 whitespace-pre">
        {tokens.map((t, i) => (
          <span key={i} style={{ color: COLORS[t.type] }}>{t.text}</span>
        ))}
      </span>
    </div>
  );
}

// ─── File Contents ────────────────────────────────────────────────────────────

const FILES: Record<string, { content: string; lang: string; blame: { line: number; author: string; msg: string; time: string }[] }> = {
  "src/auth/jwt.ts": {
    lang: "TypeScript",
    blame: [
      { line: 1, author: "Maya R.", msg: "feat: add jose JWT library", time: "3d ago" },
      { line: 9, author: "Jordan K.", msg: "feat: key rotation via Redis", time: "1d ago" },
      { line: 22, author: "Alex C.", msg: "fix: handle revocation list", time: "2h ago" },
    ],
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

// L42 — verify and decode a JWT, checking the revocation list
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
    blame: [
      { line: 1, author: "Sam T.", msg: "feat: billing service scaffold", time: "1w ago" },
      { line: 18, author: "Maya R.", msg: "feat: Stripe integration", time: "3d ago" },
      { line: 45, author: "Jordan K.", msg: "fix: idempotency key dedup", time: "1d ago" },
    ],
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

    const subscription = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: dto.priceId }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
    });

    await this.prisma.subscription.create({
      data: {
        userId,
        stripeId: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });

    return subscription;
  }

  // L87 — idempotent webhook event processor
  async processWebhookEvent(event: Stripe.Event): Promise<void> {
    const dedupKey = \`webhook:\${event.id}\`;
    const already = await this.redis.get(dedupKey);
    if (already) return;

    await this.redis.setex(dedupKey, DEDUP_WINDOW, "1");

    switch (event.type) {
      case "invoice.payment_succeeded":
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.deleted":
        await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;
    }
  }

  private async getOrCreateCustomer(userId: string): Promise<Stripe.Customer> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.stripeCustomerId) {
      return this.stripe.customers.retrieve(user.stripeCustomerId) as Promise<Stripe.Customer>;
    }
    const customer = await this.stripe.customers.create({ email: user.email, metadata: { userId } });
    await this.prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } });
    return customer;
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    await this.prisma.subscription.update({
      where: { stripeId: invoice.subscription as string },
      data: { status: "active" },
    });
  }

  private async handleSubscriptionCanceled(sub: Stripe.Subscription): Promise<void> {
    await this.prisma.subscription.update({
      where: { stripeId: sub.id },
      data: { status: "canceled" },
    });
  }
}`,
  },
  "src/app.module.ts": {
    lang: "TypeScript",
    blame: [
      { line: 1, author: "Alex C.", msg: "chore: initial NestJS scaffold", time: "2w ago" },
      { line: 12, author: "Sam T.", msg: "feat: register all modules", time: "1w ago" },
    ],
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
    blame: [{ line: 1, author: "Alex C.", msg: "chore: init package.json", time: "2w ago" }],
    content: `{
  "name": "core-billing-api",
  "version": "1.4.2",
  "description": "Billing and subscription management API",
  "scripts": {
    "start:dev": "nest start --watch",
    "build": "nest build",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "lint": "eslint src --ext .ts --fix",
    "prisma:migrate": "prisma migrate dev"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/throttler": "^5.1.1",
    "@prisma/client": "^5.9.1",
    "jose": "^5.2.2",
    "stripe": "^14.17.0",
    "ioredis": "^5.3.2"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.1",
    "@types/node": "^20.11.5",
    "prisma": "^5.9.1",
    "typescript": "^5.3.3"
  }
}`,
  },
};

// ─── File Tree ────────────────────────────────────────────────────────────────

interface FNode { name: string; type: "folder" | "file"; path?: string; children?: FNode[]; open?: boolean }

const TREE: FNode[] = [
  {
    name: "src", type: "folder", open: true, children: [
      { name: "auth", type: "folder", open: true, children: [
        { name: "jwt.ts", type: "file", path: "src/auth/jwt.ts" },
        { name: "middleware.ts", type: "file", path: "src/auth/middleware.ts" },
        { name: "oauth.ts", type: "file", path: "src/auth/oauth.ts" },
      ]},
      { name: "services", type: "folder", open: false, children: [
        { name: "billing.service.ts", type: "file", path: "src/services/billing.service.ts" },
        { name: "webhook.service.ts", type: "file", path: "src/services/webhook.service.ts" },
      ]},
      { name: "db", type: "folder", open: false, children: [
        { name: "schema.prisma", type: "file", path: "src/db/schema.prisma" },
      ]},
      { name: "app.module.ts", type: "file", path: "src/app.module.ts" },
      { name: "main.ts", type: "file", path: "src/main.ts" },
    ],
  },
  { name: "package.json", type: "file", path: "package.json" },
  { name: "tsconfig.json", type: "file", path: "tsconfig.json" },
];

function TreeNode({ node, depth, onSelect, active }: { node: FNode; depth: number; onSelect: (p: string) => void; active: string }) {
  const [open, setOpen] = useState(node.open ?? false);
  const pl = 8 + depth * 12;
  if (node.type === "folder") {
    return (
      <div>
        <button
          className="w-full flex items-center gap-1 py-0.5 hover:bg-white/5 rounded text-left transition-colors"
          style={{ paddingLeft: `${pl}px`, paddingRight: "8px" }}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronRight className={`w-3 h-3 text-slate-600 transition-transform shrink-0 ${open ? "rotate-90" : ""}`} />
          {open ? <FolderOpen className="w-3.5 h-3.5 text-indigo-400/70 shrink-0" /> : <Folder className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
          <span className="text-[11px] font-mono text-slate-400 truncate">{node.name}</span>
        </button>
        {open && node.children?.map((c, i) => <TreeNode key={i} node={c} depth={depth + 1} onSelect={onSelect} active={active} />)}
      </div>
    );
  }
  const isActive = node.path === active;
  const isJson = node.name.endsWith(".json");
  return (
    <button
      onClick={() => node.path && onSelect(node.path)}
      className={`w-full flex items-center gap-1.5 py-0.5 rounded text-left transition-colors ${isActive ? "bg-indigo-500/15 text-indigo-300" : "hover:bg-white/[0.04] text-slate-500 hover:text-slate-300"}`}
      style={{ paddingLeft: `${pl + 16}px`, paddingRight: "8px" }}
    >
      {isJson ? <FileJson className="w-3.5 h-3.5 text-yellow-400 shrink-0" /> : <FileCode2 className="w-3.5 h-3.5 text-indigo-400/70 shrink-0" />}
      <span className="text-[11px] font-mono truncate">{node.name}</span>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function CodePage() {
  const [activeFile, setActiveFile] = useState("src/auth/jwt.ts");
  const [openFiles, setOpenFiles] = useState(["src/auth/jwt.ts"]);
  const [showBlame, setShowBlame] = useState(false);

  const openFile = (path: string) => {
    setActiveFile(path);
    if (!openFiles.includes(path)) setOpenFiles((f) => [...f, path]);
  };

  const closeFile = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = openFiles.filter((f) => f !== path);
    setOpenFiles(next);
    if (activeFile === path) setActiveFile(next[next.length - 1] ?? "");
  };

  const fileData = FILES[activeFile];
  const lines = fileData?.content.split("\n") ?? [];

  const blameForLine = (n: number) => {
    const sorted = (fileData?.blame ?? []).filter((b) => b.line <= n).sort((a, b) => b.line - a.line);
    return sorted[0] ?? null;
  };

  return (
    <div className="flex flex-1 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* File explorer panel */}
      <div className="w-[200px] shrink-0 border-r border-white/[0.06] bg-[#0D1117] flex flex-col">
        <div className="px-3 py-2 border-b border-white/[0.06]">
          <span className="text-[10px] uppercase tracking-widest text-slate-600 font-medium">Explorer</span>
        </div>
        <div className="flex-1 overflow-y-auto py-1 px-1">
          {TREE.map((n, i) => <TreeNode key={i} node={n} depth={0} onSelect={openFile} active={activeFile} />)}
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* File tabs */}
        <div className="flex items-center border-b border-white/[0.06] bg-[#0D1117] overflow-x-auto shrink-0">
          {openFiles.map((path) => {
            const name = path.split("/").pop()!;
            const isJson = name.endsWith(".json");
            return (
              <div
                key={path}
                onClick={() => setActiveFile(path)}
                className={`flex items-center gap-2 px-4 py-2.5 border-b-2 cursor-pointer shrink-0 group transition-colors ${
                  activeFile === path
                    ? "border-indigo-500 bg-[#0B0F17] text-slate-200"
                    : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
                }`}
              >
                {isJson
                  ? <FileJson className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  : <FileCode2 className="w-3.5 h-3.5 text-indigo-400/70 shrink-0" />}
                <span className="text-[11px] font-mono">{name}</span>
                <button
                  onClick={(e) => closeFile(path, e)}
                  className="w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Breadcrumb + actions */}
        {activeFile && (
          <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/[0.04] bg-[#0B0F17] shrink-0">
            <span className="text-[10px] font-mono text-slate-600">{activeFile}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowBlame((v) => !v)}
                className={`flex items-center gap-1.5 text-[10px] transition-colors ${showBlame ? "text-indigo-400" : "text-slate-600 hover:text-slate-400"}`}
              >
                <GitCommit className="w-3 h-3" />
                Git Blame
              </button>
              {fileData && <span className="text-[10px] font-mono text-slate-700">{fileData.lang}</span>}
            </div>
          </div>
        )}

        {/* Code viewer */}
        <div className="flex-1 overflow-auto bg-[#0B0F17]">
          {!activeFile || !fileData ? (
            <div className="flex items-center justify-center h-full text-slate-700 text-sm">Select a file to view</div>
          ) : (
            <div className="min-w-0 py-3">
              {lines.map((line, i) => {
                const lineNum = i + 1;
                const blame = showBlame ? blameForLine(lineNum) : null;
                return (
                  <div key={i} className="flex items-stretch">
                    {showBlame && (
                      <div className="w-48 shrink-0 flex items-center gap-2 px-2 py-0.5 border-r border-white/[0.04] bg-[#0D1117]/50">
                        {blame ? (
                          <>
                            <User className="w-2.5 h-2.5 text-slate-700 shrink-0" />
                            <span className="text-[9px] font-mono text-slate-600 truncate">{blame.author}</span>
                            <Clock className="w-2 h-2 text-slate-700 shrink-0 ml-auto" />
                            <span className="text-[9px] font-mono text-slate-700 shrink-0">{blame.time}</span>
                          </>
                        ) : (
                          <span className="text-[9px] font-mono text-slate-800 pl-4">·</span>
                        )}
                      </div>
                    )}
                    <CodeLine line={line} lineNum={lineNum} highlighted={lineNum === 42 && activeFile === "src/auth/jwt.ts"} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status bar */}
        {fileData && (
          <div className="flex items-center justify-between px-4 py-1 border-t border-white/[0.04] bg-[#0D1117] shrink-0">
            <span className="text-[10px] font-mono text-slate-700">{lines.length} lines</span>
            <div className="flex items-center gap-4 text-[10px] font-mono text-slate-700">
              <span>{fileData.lang}</span>
              <span>UTF-8</span>
              <span>LF</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
