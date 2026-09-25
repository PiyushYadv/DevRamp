import { Database, Server, Terminal } from "lucide-react";
import { ServiceFlow } from "./ServiceFlow";
import { SetupView } from "./SetupView";
import { useDashboard } from "../../context/DashboardContext";
import { useArchitecture } from "../../hooks/useWorkspaceData";

export function ArchitectureView() {
  const { repoName } = useDashboard();
  const { data, isLoading } = useArchitecture(repoName || null);
  if (isLoading || !data) return <div className="p-5 text-sm text-slate-500">Loading architecture...</div>;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold text-white">Architecture Summary</h2>
          <span className="ml-auto text-[10px] font-mono text-slate-500 bg-white/[0.04] px-2 py-0.5 rounded">
            auto-generated
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {data.tags.map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full border border-white/[0.08] text-slate-400 bg-white/[0.03] font-mono">
              {tag}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{data.summary}</p>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
          <Database className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-medium text-slate-300">Service Topology</span>
        </div>
        <ServiceFlow />
        <div className="px-4 pb-3 flex items-center gap-4 text-[10px] text-slate-600 font-mono border-t border-white/[0.06] pt-2">
          {data.connections.map((connection) => <span key={connection}>{connection}</span>)}
        </div>
      </div>
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center gap-2 mb-3">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Quick Start</h3>
        </div>
        <div className="space-y-1.5">
          {data.quickStart.map((item) => (
            <SetupView key={item.command} cmd={item.command} comment={item.comment} />
          ))}
        </div>
      </div>
    </div>
  );
}
