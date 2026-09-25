import { ArrowRight, CheckCircle2, Circle, Clock3, GitCommitHorizontal, RefreshCw, Sparkles } from "lucide-react";
import { useDashboard } from "../../context/DashboardContext";
import { useModules } from "../../hooks/useWorkspaceData";

export function OnboardingOverview() {
  const { repoName, checklists, moduleProgress, setSelectedModule, setSelectedFile } = useDashboard();
  const { data: modules = [] } = useModules(repoName || null);

  const allItems = Object.values(checklists).flat();
  const completed = allItems.filter((item) => item.done).length;
  const total = allItems.length;
  const overall = total ? Math.round((completed / total) * 100) : 0;

  const next = modules.flatMap((module) => (checklists[module.n] ?? []).map((item) => ({ module, item }))).find(({ item }) => !item.done);
  const nextModule = next?.module;

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 mb-2">Developer onboarding</p>
          <h1 className="text-xl font-semibold text-white">Get productive in {repoName}</h1>
          <p className="text-sm text-slate-500 mt-1">Follow the recommended path, verify your setup, and learn the parts of the codebase you need first.</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-semibold text-white">{overall}%</div>
          <div className="text-[10px] text-slate-600 font-mono">{completed}/{total} tasks</div>
        </div>
      </div>

      <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${overall}%` }} />
      </div>

      {next && nextModule && (
        <button
          onClick={() => { setSelectedFile(null); setSelectedModule(nextModule.n); }}
          className="w-full text-left rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] hover:bg-indigo-500/[0.09] transition-colors p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-indigo-300"><Sparkles className="w-3.5 h-3.5" /> Next recommended task</span>
            <ArrowRight className="w-4 h-4 text-indigo-400" />
          </div>
          <h2 className="text-sm font-semibold text-white">{next.item.label}</h2>
          <p className="text-xs text-slate-500 mt-1">Module {nextModule.n} · {nextModule.title}</p>
          <div className="flex items-center gap-3 mt-4 text-[10px] text-slate-500"><Clock3 className="w-3 h-3" /> Continue where you left off</div>
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {modules.map((module) => {
          const progress = moduleProgress(module.n);
          const items = checklists[module.n] ?? [];
          return (
            <button key={module.n} onClick={() => { setSelectedFile(null); setSelectedModule(module.n); }} className="text-left rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] p-4 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono text-slate-600">MODULE {module.n}</span>
                {progress === 100 ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4 text-slate-700" />}
              </div>
              <h3 className="text-xs font-semibold text-slate-200">{module.title}</h3>
              <div className="flex items-center gap-2 mt-4">
                <div className="flex-1 h-1 rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${progress}%` }} /></div>
                <span className="text-[9px] font-mono text-slate-600">{progress}%</span>
              </div>
              <p className="text-[10px] text-slate-600 mt-2">{items.filter((item) => item.done).length}/{items.length} complete</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-3"><GitCommitHorizontal className="w-4 h-4 text-indigo-400" /><span className="text-xs font-semibold text-white">Repository status</span></div>
          <div className="flex items-center justify-between text-xs"><span className="text-slate-500">Analysis</span><span className="text-emerald-400">Up to date</span></div>
          <div className="flex items-center justify-between text-xs mt-2"><span className="text-slate-500">Indexed files</span><span className="text-slate-300">47</span></div>
          <div className="flex items-center justify-between text-xs mt-2"><span className="text-slate-500">Last synced</span><span className="text-slate-400">8 min ago</span></div>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 mb-3"><RefreshCw className="w-4 h-4 text-indigo-400" /><span className="text-xs font-semibold text-white">Suggested path</span></div>
          <p className="text-xs text-slate-500 leading-relaxed">Finish local setup first, then move into the critical authentication and billing flows. Architecture is already complete.</p>
        </div>
      </div>
    </div>
  );
}
