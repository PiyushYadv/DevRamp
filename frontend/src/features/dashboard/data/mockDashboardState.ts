import type { CheckItem } from "../types";

export const INITIAL_INDEXED_FILES = new Set<string>([
  "src/auth/jwt.ts",
  "src/auth/middleware.ts",
  "src/services/billing.service.ts",
  "src/services/payment.service.ts",
  "src/db/schema.prisma",
  "src/main.ts",
  "src/app.module.ts",
  "package.json",
  "tsconfig.json",
]);

export const INITIAL_CHECKLISTS: Record<number, CheckItem[]> = {
  1: [
    { id: "a1", label: "Read the architecture summary", done: true },
    { id: "a2", label: "Review the service topology diagram", done: true },
    { id: "a3", label: "Understand the JWT rotation pattern", done: true },
    {
      id: "a4",
      label: "Ask the AI copilot one architecture question",
      done: true,
    },
  ],
  2: [
    { id: "s1", label: "Clone the repository", done: true },
    { id: "s2", label: "Configure .env from .env.example", done: false },
    { id: "s3", label: "Run database migrations", done: false },
    { id: "s4", label: "Start the dev server successfully", done: false },
    { id: "s5", label: "Verify /health endpoint responds", done: false },
    { id: "s6", label: "Run the test suite (npm test)", done: false },
  ],
  3: [
    {
      id: "k1",
      label: "Read AuthModule source in the repository",
      done: false,
    },
    { id: "k2", label: "Trace a billing request end-to-end", done: false },
    {
      id: "k3",
      label: "Understand the Stripe webhook signature check",
      done: false,
    },
    { id: "k4", label: "Make a test API call via Swagger UI", done: false },
  ],
};
