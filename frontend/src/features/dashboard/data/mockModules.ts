import type { ModuleSummary } from "../../../lib/api/types";
import type { ModuleViewModel } from "../../../lib/ui/types";

export const MODULES: ModuleSummary[] = [
  { n: 1, label: "Architecture Overview" },
  { n: 2, label: "Local Setup" },
  { n: 3, label: "Key Services" },
];

export const MODULE_DATA: ModuleViewModel[] = [
  {
    n: 1,
    title: "Architecture Overview",
    subtitle: "Understand the system topology and key design decisions.",
    duration: "~20 min",
    color: "text-indigo-400",
    accentBg: "bg-indigo-500/10",
    accentBorder: "border-indigo-500/30",
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
  },
  {
    n: 2,
    title: "Local Setup",
    subtitle: "Get the API running on your machine end-to-end.",
    duration: "~35 min",
    color: "text-emerald-400",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/30",
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
        body: 'The server listens on port 3000 by default. Visit `http://localhost:3000/health` — you should see {"status":"ok"}. Swagger UI is at `/api/docs`. Run `npm test` to confirm all 143 unit tests pass.',
      },
    ],
  },
  {
    n: 3,
    title: "Key Services",
    subtitle: "Deep-dive into the three core service modules.",
    duration: "~45 min",
    color: "text-violet-400",
    accentBg: "bg-violet-500/10",
    accentBorder: "border-violet-500/30",
    sections: [
      {
        heading: "AuthModule",
        body: "Handles all authentication and authorization. Issues short-lived access tokens (15 min) and long-lived refresh tokens (30 days) signed with RS256. Key rotation happens every 24h via a Redis-cached key pair. The JwtGuard protects all non-public endpoints.",
      },
      {
        heading: "BillingModule",
        body: "Wraps the Stripe SDK with our domain logic. Manages subscription lifecycle: creation, upgrades, downgrades, and cancellations. All Stripe customer objects are lazily created on first subscription. BillingService.createSubscription() is the primary entry point.",
      },
      {
        heading: "WebhookModule",
        body: "Receives Stripe webhook events, verifies signatures using STRIPE_WEBHOOK_SECRET, and processes events idempotently. A Redis SISMEMBER check prevents double-processing. Processed event IDs expire after 24h. Critical events: invoice.payment_succeeded, customer.subscription.deleted.",
      },
    ],
  },
];
