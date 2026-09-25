import type { FileTreeNode } from "../../../lib/api/types";

export const FILE_TREE: FileTreeNode[] = [
  {
    name: "src",
    type: "folder",
    path: "src",
    children: [
      {
        name: "auth",
        type: "folder",
        path: "src/auth",
        children: [
          {
            name: "jwt.ts",
            type: "file",
            path: "src/auth/jwt.ts",
            indexed: true,
          },
          {
            name: "middleware.ts",
            type: "file",
            path: "src/auth/middleware.ts",
            indexed: true,
          },
          {
            name: "oauth.ts",
            type: "file",
            path: "src/auth/oauth.ts",
            indexed: false,
          },
        ],
      },
      {
        name: "services",
        type: "folder",
        path: "src/services",
        children: [
          {
            name: "billing.service.ts",
            type: "file",
            path: "src/services/billing.service.ts",
            indexed: true,
          },
          {
            name: "payment.service.ts",
            type: "file",
            path: "src/services/payment.service.ts",
            indexed: true,
          },
          {
            name: "webhook.service.ts",
            type: "file",
            path: "src/services/webhook.service.ts",
            indexed: false,
          },
        ],
      },
      {
        name: "db",
        type: "folder",
        path: "src/db",
        children: [
          {
            name: "schema.prisma",
            type: "file",
            path: "src/db/schema.prisma",
            indexed: true,
          },
        ],
      },
      {
        name: "main.ts",
        type: "file",
        path: "src/main.ts",
        indexed: true,
      },
      {
        name: "app.module.ts",
        type: "file",
        path: "src/app.module.ts",
        indexed: true,
      },
    ],
  },
  {
    name: "package.json",
    type: "file",
    path: "package.json",
    indexed: true,
  },
  {
    name: "tsconfig.json",
    type: "file",
    path: "tsconfig.json",
    indexed: true,
  },
  {
    name: ".env.example",
    type: "file",
    path: ".env.example",
    indexed: false,
  },
];
