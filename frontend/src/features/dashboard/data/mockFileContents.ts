import type { MockFileContent } from "../../../lib/ui/types";

export const FILE_CONTENTS: Record<string, MockFileContent> = {
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
