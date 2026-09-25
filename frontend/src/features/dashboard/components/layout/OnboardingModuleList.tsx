import { BookOpen, CheckCircle2, Circle } from "lucide-react";
import { useDashboard } from "../../context/DashboardContext";
import { useModules } from "../../hooks/useWorkspaceData";

export function OnboardingModuleList() {
  const {
    hasRepo,
    selectedModule,
    setSelectedModule,
    setSelectedFile,
    moduleProgress,
    repoName,
  } = useDashboard();
  const { data: modules = [] } = useModules(repoName || null);
  if (!hasRepo) return null;
  return (
    <div className="border-t border-white/[0.06] p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <BookOpen className="w-3 h-3 text-slate-600" />
        <span className="text-[10px] uppercase tracking-widest text-slate-600 font-medium">
          Onboarding Modules
        </span>
      </div>
      {modules.map((module) => {
        const active = selectedModule === module.n;
        const progress = moduleProgress(module.n);
        const done = progress === 100;
        return (
          <button
            key={module.n}
            onClick={() => {
              setSelectedModule(module.n);
              setSelectedFile(null);
            }}
            className={`w-full flex items-center gap-2 py-1.5 px-2 rounded transition-colors group text-left ${active ? "bg-indigo-500/10 border border-indigo-500/20" : "hover:bg-white/[0.04] border border-transparent"}`}
          >
            <span className="text-[10px] font-mono text-slate-600 w-4 shrink-0">
              {module.n}.
            </span>
            {done ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : progress > 0 ? (
              <span className="relative w-3.5 h-3.5 shrink-0">
                <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 -rotate-90">
                  <circle
                    cx="7"
                    cy="7"
                    r="5"
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="2"
                  />
                  <circle
                    cx="7"
                    cy="7"
                    r="5"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2"
                    strokeDasharray={`${progress * 0.314} 31.4`}
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            ) : (
              <Circle
                className={`w-3.5 h-3.5 shrink-0 ${active ? "text-indigo-400" : "text-slate-700"}`}
              />
            )}
            <span
              className={`text-xs transition-colors truncate ${active ? "text-indigo-300" : done ? "text-slate-400" : "text-slate-300 group-hover:text-slate-200"}`}
            >
              {module.title}
            </span>
            {progress > 0 && !done && (
              <span className="ml-auto text-[9px] font-mono text-slate-600 shrink-0">
                {progress}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
