import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Clock3, GitBranch, Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router";
import { useDashboard } from "../../context/DashboardContext";
import { PublicRepositoryModal } from "../repository/PublicRepositoryModal";
import { ingestRepository } from "../../../../lib/api/ingest";

export function RepositorySwitcher() {
  const { hasRepo, repoName, setHasRepo, setRepoName, lastSyncedAt, setLastSyncedAt } = useDashboard();
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [publicRepoModalOpen, setPublicRepoModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const handleSync = async () => {
    if (!repoName || syncing) return;
    setSyncing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setLastSyncedAt(new Date().toISOString());
    } finally {
      setSyncing(false);
    }
  };

  const handlePublicRepositoryConnect = async (url: string) => {
    await ingestRepository(url);
    const parts = url.replace(/\/$/, "").split("/");
    const name = parts.slice(-2).join("/");
    setRepoName(name);
    setHasRepo(true);
    setLastSyncedAt(new Date().toISOString());
    navigate("/dashboard");
  };

  if (!hasRepo) {
    return (
      <>
        <div className="p-3 border-b border-white/[0.06]">
          <button onClick={() => setPublicRepoModalOpen(true)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-indigo-500/30 hover:border-indigo-500/60 hover:bg-indigo-500/[0.05] text-[11px] text-indigo-400 transition-all">
            <Plus className="w-3 h-3" /> Connect Repository
          </button>
        </div>
        <PublicRepositoryModal open={publicRepoModalOpen} onClose={() => setPublicRepoModalOpen(false)} onConnect={handlePublicRepositoryConnect} />
      </>
    );
  }

  return (
    <div className="p-3 border-b border-white/[0.06]">
      <div className="relative" ref={menuRef}>
        <button onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] transition-colors text-left">
          <div className="flex items-center gap-2 min-w-0">
            <GitBranch className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="text-xs font-mono text-slate-300 truncate">{repoName}</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
        </button>
        {menuOpen && (
          <div className="absolute top-11 left-0 right-0 z-40 rounded-lg border border-white/[0.1] bg-[#111827] shadow-xl shadow-black/30 overflow-hidden">
            <div className="px-3 py-2 border-b border-white/[0.06] text-[9px] uppercase tracking-widest text-slate-600">Current repository</div>
            <button className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.04]">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-slate-200 truncate">{repoName}</span>
            </button>
            <button onClick={() => { setMenuOpen(false); setPublicRepoModalOpen(true); }} className="w-full flex items-center gap-2 px-3 py-2.5 border-t border-white/[0.06] text-xs text-indigo-400 hover:bg-indigo-500/[0.05]">
              <Plus className="w-3.5 h-3.5" /> Connect another repository
            </button>
          </div>
        )}
      </div>

      <button onClick={handleSync} disabled={syncing} className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-white/[0.06] hover:border-indigo-500/30 hover:bg-indigo-500/[0.05] disabled:opacity-60 text-[11px] text-slate-400 hover:text-indigo-300 transition-all">
        <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? "Checking repository..." : "Sync Repository"}
      </button>
      <div className="flex items-center gap-1.5 mt-2 px-1 text-[9px] text-slate-600">
        {lastSyncedAt ? <><Clock3 className="w-2.5 h-2.5" /> Last synced {new Date(lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</> : "Repository connected"}
      </div>
      <PublicRepositoryModal open={publicRepoModalOpen} onClose={() => setPublicRepoModalOpen(false)} onConnect={handlePublicRepositoryConnect} />
    </div>
  );
}
