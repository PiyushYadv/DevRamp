import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Github, Lock, X } from "lucide-react";
import type { RepositoryCard } from "../../../../lib/ui/types";

interface RepositoryAccessModalProps {
  open: boolean;
  repositories: RepositoryCard[];
  onClose: () => void;
  onContinue: (repositoryIds: string[]) => void;
  loading?: boolean;
}

export function RepositoryAccessModal({
  open,
  repositories,
  onClose,
  onContinue,
  loading = false,
}: RepositoryAccessModalProps) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open) setSelected([]);
  }, [open]);

  const allSelected = repositories.length > 0 && selected.length === repositories.length;
  const selectedRepos = useMemo(
    () => repositories.filter((repo) => selected.includes(repo.id)),
    [repositories, selected],
  );

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const toggleAll = () => {
    setSelected(allSelected ? [] : repositories.map((repo) => repo.id));
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !loading) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="repository-access-title"
        className="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#111827] shadow-2xl shadow-black/60 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Github className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 id="repository-access-title" className="text-sm font-semibold text-white">
                Choose repositories
              </h2>
              <p className="text-[11px] text-slate-500">Select what DevRamp should be able to access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-widest text-slate-600 font-medium">
              Available repositories
            </span>
            <button
              onClick={toggleAll}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-xl border border-white/[0.06] divide-y divide-white/[0.05]">
            {repositories.map((repo) => {
              const isSelected = selected.includes(repo.id);
              return (
                <button
                  key={repo.id}
                  onClick={() => toggle(repo.id)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 bg-[#0D1117] hover:bg-white/[0.03] text-left transition-colors"
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? "bg-indigo-600 border-indigo-600" : "border-white/[0.15]"}`}>
                    {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-200 truncate">{repo.name}</span>
                      {repo.private && <Lock className="w-3 h-3 text-slate-600 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-600 mt-0.5">{repo.language ?? "Unknown language"}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 mb-5 text-[11px] text-slate-500">
            <span>{selectedRepos.length} selected</span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Private repositories require GitHub access
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={() => onContinue(selected)}
              disabled={!selected.length || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-40"
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Continue with {selectedRepos.length} {selectedRepos.length === 1 ? "repository" : "repositories"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
