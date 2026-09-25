import { ArrowRight } from "lucide-react";
import { useDashboard } from "../../context/DashboardContext";
import { useArchitecture } from "../../hooks/useWorkspaceData";

export function ServiceFlow() {
  const { repoName } = useDashboard();
  const { data } = useArchitecture(repoName || null);
  const nodes = data?.nodes ?? [];
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-4">
      {nodes.map((n, i) => (
        <div key={n.label} className="flex items-center gap-2 flex-1">
          <div
            className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border ${n.bg} hover:scale-[1.03] transition-transform`}
          >
            <span className={`text-xs font-semibold ${n.color}`}>
              {n.label}
            </span>
            <span className="text-[10px] text-slate-500">{n.sub}</span>
          </div>
          {i < nodes.length - 1 && (
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              <div className="w-8 h-px bg-gradient-to-r from-slate-600 to-indigo-500/50" />
              <ArrowRight className="w-3 h-3 text-slate-600 -mt-1.5" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
