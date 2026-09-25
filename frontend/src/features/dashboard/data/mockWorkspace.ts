export interface DependencyModule {
  name: string;
  deps: string[];
  color: string;
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  required: boolean;
}

export interface Prerequisite {
  name: string;
  version: string;
  available: boolean;
}

export interface SetupCommandData {
  command: string;
  comment: string;
}

export const ARCHITECTURE_TAGS = [
  "Node.js REST API",
  "PostgreSQL",
  "Redis",
  "Prisma ORM",
  "JWT Auth",
];

export const ARCHITECTURE_SUMMARY =
  "Monolithic NestJS application exposing a REST API consumed by the billing frontend. Authentication via RS256 JWT tokens. All data lives in PostgreSQL accessed through Prisma. Redis handles sessions and async job queuing.";

export const ARCHITECTURE_CONNECTIONS = [
  "→ HTTP/REST",
  "→ TCP/5432 (PG)",
  "→ TCP/6379 (Redis)",
];

export const QUICK_START_COMMANDS: SetupCommandData[] = [
  { command: "git clone git@github.com:company/core-billing-api.git", comment: "clone" },
  { command: "cd core-billing-api && cp .env.example .env", comment: "env" },
  { command: "npm install", comment: "deps" },
  { command: "npx prisma migrate dev", comment: "migrations" },
  { command: "npm run start:dev", comment: "start" },
];

export const DEPENDENCY_MODULES: DependencyModule[] = [
  { name: "AuthModule", deps: ["ConfigModule", "PrismaModule"], color: "border-indigo-500/30 bg-indigo-500/5" },
  { name: "BillingModule", deps: ["AuthModule", "PrismaModule", "RedisModule"], color: "border-emerald-500/30 bg-emerald-500/5" },
  { name: "WebhookModule", deps: ["BillingModule", "RedisModule"], color: "border-orange-500/30 bg-orange-500/5" },
  { name: "PrismaModule", deps: [], color: "border-slate-500/30 bg-slate-500/5" },
  { name: "RedisModule", deps: [], color: "border-cyan-500/30 bg-cyan-500/5" },
  { name: "ConfigModule", deps: [], color: "border-pink-500/30 bg-pink-500/5" },
];

export const ENVIRONMENT_VARIABLES: EnvironmentVariable[] = [
  { key: "DATABASE_URL", value: "postgresql://<USER>:<PASSWORD>@<HOST>:5432/<DB>", required: true },
  { key: "REDIS_URL", value: "redis://<HOST>:6379", required: true },
  { key: "JWT_PRIVATE_KEY", value: "<your-rs256-private-key>", required: true },
  { key: "STRIPE_SECRET_KEY", value: "sk_test_<your-stripe-key>", required: true },
  { key: "PORT", value: "3000", required: false },
];

export const PREREQUISITES: Prerequisite[] = [
  { name: "Node.js", version: "≥ 20.0.0", available: true },
  { name: "PostgreSQL", version: "≥ 15.0", available: true },
  { name: "Redis", version: "≥ 7.0", available: true },
  { name: "Docker", version: "optional", available: false },
];
