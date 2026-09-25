import type { ChatMessage } from "../../../lib/api/types";

export const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "assistant-1",
    role: "assistant",
    content:
      "I've indexed **company/core-billing-api** — 47 files across 6 modules. Ask me anything about the architecture, authentication flow, or how to get started locally.",
  },
  {
    id: "user-1",
    role: "user",
    content: "How does JWT authentication work in this repo?",
  },
  {
    id: "assistant-2",
    role: "assistant",
    content:
      "Authentication uses a dual-token strategy: short-lived access tokens (15 min) and long-lived refresh tokens (30 days). The `verifyToken` middleware validates signatures using the RS256 algorithm with rotating key pairs stored in Redis.",
    citations: [
      {
        file: "src/auth/jwt.ts",
        line: 42,
        label: "src/auth/jwt.ts:L42",
      },
      {
        file: "src/auth/middleware.ts",
        line: 18,
        label: "src/auth/middleware.ts:L18",
      },
    ],
    code: `// src/auth/jwt.ts:L42
export const verifyToken = async (token: string): Promise<JWTPayload> => {
  const isRevoked = await redis.sismember("jwt:revoked", token);
  if (isRevoked) throw new Error("Token has been revoked");
  const { publicKey } = await getKeyPair();
  return jose.jwtVerify(token, publicKey, { algorithms: ["RS256"] });
};`,
  },
];

export const MOCK_CHAT_REPLY: ChatMessage = {
  id: "assistant-reply",
  role: "assistant",
  content:
    "The billing service integrates with Stripe via webhook events processed asynchronously through a Redis queue, ensuring idempotency with a 24-hour deduplication window.",
  citations: [
    {
      label: "src/services/billing.service.ts:L87",
      file: "src/services/billing.service.ts",
    },
    {
      label: "src/services/webhook.service.ts:L23",
      file: "src/services/webhook.service.ts",
    },
  ],
};
