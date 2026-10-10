import type { ArchitectureNodeViewModel } from "../../../lib/ui/types";

export const MOCK_ARCHITECTURE_MERMAID = `flowchart TD
  client(["Client<br/><small>React / Mobile</small>"])
  api["REST API<br/><small>Node.js / Express</small>"]
  pg[("PostgreSQL<br/><small>Primary DB</small>")]
  redis[("Redis<br/><small>Cache / Sessions</small>")]
  client -->|HTTP/REST| api
  api -->|Prisma| pg
  api -->|TCP/6379| redis
  classDef client fill:#38bdf81a,stroke:#38bdf8,color:#e2e8f0
  classDef server fill:#818cf81a,stroke:#818cf8,color:#e2e8f0
  classDef database fill:#34d3991a,stroke:#34d399,color:#e2e8f0
  class client client
  class api server
  class pg,redis database`;

export const MOCK_ARCHITECTURE_NODES: ArchitectureNodeViewModel[] = [
  {
    id: "client",
    label: "Client",
    sub: "React / Mobile",
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/30",
  },
  {
    id: "api",
    label: "REST API",
    sub: "Node.js / Express",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/30",
  },
  {
    id: "pg",
    label: "PostgreSQL",
    sub: "Primary DB",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
  },
  {
    id: "redis",
    label: "Redis",
    sub: "Cache / Sessions",
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/30",
  },
];
