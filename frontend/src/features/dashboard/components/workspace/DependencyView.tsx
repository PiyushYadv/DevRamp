import { ArrowRight, Layers } from "lucide-react";
import { useDashboard } from "../../context/DashboardContext";
import { useDependencies } from "../../hooks/useWorkspaceData";

export function DependencyView() {
  const { repoName } = useDashboard();
  const { data: modules = [], isLoading } = useDependencies(repoName || null);
  if (isLoading) return <div className="p-5 text-sm text-slate-500">Loading dependencies...</div>;
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-4 h-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-white">Module Dependency Graph</h2>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {modules.map((mod) => (
          <div key={mod.name} className={`p-3 rounded-lg border ${mod.color}`}>
            <p className="text-xs font-mono font-semibold text-slate-300 mb-2">{mod.name}</p>
            {mod.deps.length > 0 ? mod.deps.map((dependency) => (
              <div key={dependency} className="flex items-center gap-1 text-[10px] text-slate-500">
                <ArrowRight className="w-2.5 h-2.5" />
                <span className="font-mono">{dependency}</span>
              </div>
            )) : (
              <span className="text-[10px] text-slate-700 font-mono">no deps</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
