import { CheckCircle2, Layers } from "lucide-react";
import { useDashboard } from "../../context/DashboardContext";
import { FileTree } from "./FileTree";
import { OnboardingModuleList } from "./OnboardingModuleList";
import { RepositorySwitcher } from "./RepositorySwitcher";
import { useRepositoryTree } from "../../hooks/useRepositoryTree";

export function DashboardSidebar() {
  const { hasRepo, repoName } = useDashboard();
  const { data: fileTree = [], isLoading } = useRepositoryTree(
    hasRepo ? repoName : null,
  );

  return (
    <>
      <RepositorySwitcher />
      {hasRepo ? (
        <div className="flex-1 overflow-y-auto py-2 px-1">
          <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
            <Layers className="w-3 h-3 text-slate-600" />
            <span className="text-[10px] uppercase tracking-widest text-slate-600 font-medium">
              Repository
            </span>
          </div>
          {isLoading && <p className="px-2 py-3 text-xs text-slate-600">Loading tree...</p>}
          {fileTree.map((node) => (
            <FileTree key={node.path} node={node} />
          ))}
          <div className="mt-2 px-2">
            <span className="text-[9px] font-mono text-slate-700">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 inline mr-1" />
              = indexed in vector DB
            </span>
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}
      <OnboardingModuleList />
    </>
  );
}
