import type { ArchitectureNodeViewModel } from "../../../lib/ui/types";

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
