import { useState } from "react";
import { useDashboard } from "../../context/DashboardContext";
import { useModules } from "../../hooks/useWorkspaceData";
import { ArrowLeft, Award, Check, Clock, Play, RotateCcw } from "lucide-react";

export function ModuleView() {
  const {
    selectedModule,
    setSelectedModule,
    checklists,
    toggleItem,
    resetModule,
    markAllDone,
    moduleProgress,
  } = useDashboard();
  const { repoName } = useDashboard();
  const { data: modules = [], isLoading } = useModules(repoName || null);
  const [activeSection, setActiveSection] = useState(0);

  const module = modules.find((m) => m.n === selectedModule) ?? modules[0];
  if (isLoading || !module) return <div className="p-5 text-sm text-slate-500">Loading modules...</div>;
  const items = checklists[module.n] ?? [];
  const progress = moduleProgress(module.n);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Back + header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-[#0D1117] shrink-0">
        <button
          onClick={() => setSelectedModule(null)}
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Workspace
        </button>
        <span className="text-slate-700">/</span>
        <span className="text-[11px] text-slate-400">Onboarding Modules</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Module selector tabs */}
        <div className="flex gap-2 mb-5">
          {modules.map((m) => {
            const mProgress = moduleProgress(m.n);
            const isActive = selectedModule === m.n;
            return (
              <button
                key={m.n}
                onClick={() => {
                  setSelectedModule(m.n);
                  setActiveSection(0);
                }}
                className={`flex-1 text-left p-3 rounded-xl border transition-all ${
                  isActive
                    ? `${m.accentBg} ${m.accentBorder}`
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-slate-600">
                    MODULE {m.n}
                  </span>
                  {mProgress === 100 && (
                    <Award className="w-3 h-3 text-emerald-400" />
                  )}
                </div>
                <p
                  className={`text-xs font-semibold mb-2 ${isActive ? m.color : "text-slate-300"}`}
                >
                  {m.title}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${mProgress === 100 ? "bg-emerald-500" : "bg-indigo-500"}`}
                      style={{ width: `${mProgress}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-slate-600">
                    {mProgress}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Expanded module content */}
        {selectedModule !== null && (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            {/* Module title bar */}
            <div
              className={`flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] ${module.accentBg}`}
            >
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono text-slate-600">
                    MODULE {module.n}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    {module.duration}
                  </span>
                </div>
                <h2 className={`text-sm font-semibold ${module.color}`}>
                  {module.title}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {module.subtitle}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                {progress === 100 && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <Award className="w-4 h-4" />
                    Complete
                  </span>
                )}
                <div className="relative w-12 h-12">
                  <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="3"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke={progress === 100 ? "#34d399" : "#6366f1"}
                      strokeWidth="3"
                      strokeDasharray={`${progress * 0.942} 94.2`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-white leading-none">
                    {progress}%
                  </span>
                </div>
              </div>
            </div>

            {/* 3-column body */}
            <div className="grid grid-cols-5">
              {/* Section nav */}
              <div className="col-span-1 border-r border-white/[0.06] p-3 space-y-1">
                {module.sections.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSection(i)}
                    className={`w-full text-left px-2.5 py-2 rounded-md text-[11px] leading-snug transition-colors ${
                      activeSection === i
                        ? `${module.accentBg} ${module.color} border ${module.accentBorder}`
                        : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
                    }`}
                  >
                    {s.heading}
                  </button>
                ))}
              </div>

              {/* Section body */}
              <div className="col-span-2 p-5 border-r border-white/[0.06]">
                <h4 className={`text-sm font-semibold mb-3 ${module.color}`}>
                  {module.sections[activeSection].heading}
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {module.sections[activeSection].body}
                </p>
              </div>

              {/* Checklist */}
              <div className="col-span-2 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-medium text-slate-400">
                    Checklist
                  </span>
                  <span className="text-[10px] font-mono text-slate-600">
                    {items.filter((c) => c.done).length}/{items.length} done
                  </span>
                </div>
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start gap-2.5 cursor-pointer group"
                    >
                      <button
                        onClick={() => toggleItem(module.n, item.id)}
                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          item.done
                            ? "bg-emerald-500 border-emerald-500"
                            : "border-slate-600 hover:border-emerald-500/50"
                        }`}
                      >
                        {item.done && (
                          <Check className="w-2.5 h-2.5 text-white" />
                        )}
                      </button>
                      <span
                        className={`text-xs leading-relaxed transition-colors ${item.done ? "text-slate-500 line-through" : "text-slate-300 group-hover:text-white"}`}
                      >
                        {item.label}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-5">
                  <button
                    onClick={() => resetModule(module.n)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] text-slate-500 hover:text-slate-300 border border-white/[0.06] hover:border-white/[0.12] transition-all"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                  <button
                    onClick={() => markAllDone(module.n)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    Mark all done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
