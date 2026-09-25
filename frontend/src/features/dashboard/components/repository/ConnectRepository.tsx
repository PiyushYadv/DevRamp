import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboard } from "../../context/DashboardContext";
import { GitHubConnectModal } from "./GitHubConnectModal";
import { RepositoryAccessModal } from "./RepositoryAccessModal";
import {
  ChevronRight,
  GitBranch,
  Github,
  Lock,
  Search,
  Star,
} from "lucide-react";
import { langColor } from "../../constants/workspace";
import { useIngestRepository } from "../../hooks/useIngestRepository";
import { useRepositories } from "../../hooks/useRepositories";
import { updateRepositoryAccess } from "../../../../lib/api/repository";

export function ConnectRepository() {
  const { setHasRepo, setRepoId, setRepoName, githubConnected, setGithubConnected } = useDashboard();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [connecting, setConnecting] = useState<string | null>(null);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const { ingest } = useIngestRepository();
  const { data: repositories = [], isLoading, error } = useRepositories(githubConnected);

  const filtered = repositories.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleConnect = async (name: string) => {
    const repo = repositories.find((item) => item.name === name);
    if (!repo) return;
    setConnecting(name);
    try {
      const result = await ingest(repo.url);
      setRepoId(result.repoId);
      setHasRepo(true);
      setRepoName(name);
    } finally {
      setConnecting(null);
    }
  };

  const handleRepositoryAccess = async (repositoryIds: string[]) => {
    setSavingAccess(true);
    try {
      await updateRepositoryAccess(repositoryIds);
      await queryClient.invalidateQueries({ queryKey: ["repositories"] });
      setAccessModalOpen(false);
    } finally {
      setSavingAccess(false);
    }
  };

  if (!githubConnected) {
    return (
      <>
        <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
            <Github className="w-7 h-7 text-indigo-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">Connect your GitHub account</h2>
          <p className="text-sm text-slate-500 text-center max-w-sm mb-6">
            DevRamp needs GitHub access before it can show the repositories available to your account.
          </p>
          <button
            onClick={() => setGithubModalOpen(true)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm text-white font-medium transition-all"
          >
            <Github className="w-4 h-4" />
            Connect GitHub account
          </button>
        </div>
        <GitHubConnectModal
          open={githubModalOpen}
          onClose={() => setGithubModalOpen(false)}
          onConnected={() => setGithubConnected(true)}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
          <GitBranch className="w-7 h-7 text-indigo-400" />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-lg font-semibold text-white">Connect a repository</h2>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> GitHub connected
          </span>
        </div>
        <p className="text-sm text-slate-500 text-center max-w-sm mb-6">
          Choose which repositories DevRamp can access, then connect one to start indexing it.
        </p>
        <button
          onClick={() => setAccessModalOpen(true)}
          disabled={isLoading || repositories.length === 0}
          className="flex items-center gap-2.5 px-4 py-2.5 mb-6 rounded-lg border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] text-sm text-slate-200 font-medium transition-all disabled:opacity-40"
        >
          <Github className="w-4 h-4" />
          Manage repository access
        </button>
        <div className="w-full max-w-lg">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search repositories..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-indigo-500/40 transition-colors"
            />
          </div>
          <div className="rounded-xl border border-white/[0.06] overflow-hidden divide-y divide-white/[0.04]">
            {isLoading && (
              <div className="px-4 py-6 text-center text-sm text-slate-600 bg-[#0D1117]">Loading repositories...</div>
            )}
            {error && (
              <div className="px-4 py-6 text-center text-sm text-red-400 bg-[#0D1117]">Unable to load repositories.</div>
            )}
            {!isLoading && !error && filtered.map((repo) => (
              <div key={repo.id} className="flex items-center gap-3 px-4 py-3 bg-[#0D1117] hover:bg-white/[0.03] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-mono text-slate-200 truncate">{repo.name}</span>
                    {repo.private && <Lock className="w-3 h-3 text-slate-600 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${langColor[repo.language ?? ""] ?? "bg-slate-500"}`} />
                      {repo.language}
                    </span>
                    <span className="flex items-center gap-1"><Star className="w-2.5 h-2.5" />{repo.stars}</span>
                    <span>Updated {repo.updated}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleConnect(repo.name)}
                  disabled={connecting !== null}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
                >
                  {connecting === repo.name ? (
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><ChevronRight className="w-3.5 h-3.5" />Connect</>
                  )}
                </button>
              </div>
            ))}
            {!isLoading && !error && filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-slate-600 bg-[#0D1117]">No repositories found.</div>
            )}
          </div>
        </div>
      </div>
      <RepositoryAccessModal
        open={accessModalOpen}
        repositories={repositories}
        onClose={() => setAccessModalOpen(false)}
        onContinue={handleRepositoryAccess}
        loading={savingAccess}
      />
    </>
  );
}
