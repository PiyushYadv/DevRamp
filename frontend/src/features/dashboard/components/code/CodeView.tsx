import { useState } from "react";
import { useDashboard } from "../../context/DashboardContext";
import { ArrowLeft, FileCode2, FileJson, X } from "lucide-react";
import { CodeLine } from "./CodeLine";
import { useFileContent } from "../../hooks/useFileContent";

export function CodeView() {
  const { selectedFile, setSelectedFile, repoName } = useDashboard();
  const [openFiles, setOpenFiles] = useState<string[]>(
    selectedFile ? [selectedFile] : [],
  );
  const [activeTab, setActiveTab] = useState(selectedFile ?? "");

  // Sync when selectedFile changes from sidebar
  if (selectedFile && !openFiles.includes(selectedFile)) {
    openFiles.push(selectedFile);
    // Note: we call openFile logic inline to avoid state update in render
  }
  const currentTab =
    selectedFile && openFiles.includes(selectedFile) ? selectedFile : activeTab;

  const closeTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = openFiles.filter((f) => f !== path);
    setOpenFiles(next);
    if (currentTab === path) {
      const fallback = next[next.length - 1] ?? null;
      setSelectedFile(fallback);
      setActiveTab(fallback ?? "");
    }
  };

  const { data: fileData, isLoading } = useFileContent(repoName || null, currentTab);
  const lines = fileData?.content.split("\n") ?? [];
  const fileName = currentTab.split("/").pop() ?? "";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Back breadcrumb + file tabs */}
      <div className="flex items-center border-b border-white/[0.06] bg-[#0D1117] shrink-0 overflow-x-auto">
        <button
          onClick={() => setSelectedFile(null)}
          className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors border-r border-white/[0.06] shrink-0"
        >
          <ArrowLeft className="w-3 h-3" />
          Workspace
        </button>
        {openFiles.map((path) => {
          const name = path.split("/").pop()!;
          const isJson = name.endsWith(".json");
          const isCurrent = path === currentTab;
          return (
            <div
              key={path}
              onClick={() => {
                setSelectedFile(path);
                setActiveTab(path);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 cursor-pointer shrink-0 group transition-colors ${
                isCurrent
                  ? "border-indigo-500 bg-[#0B0F17] text-slate-200"
                  : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]"
              }`}
            >
              {isJson ? (
                <FileJson className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              ) : (
                <FileCode2 className="w-3.5 h-3.5 text-indigo-400/70 shrink-0" />
              )}
              <span className="text-[11px] font-mono">{name}</span>
              <button
                onClick={(e) => closeTab(path, e)}
                className="w-4 h-4 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-all"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Path breadcrumb */}
      {currentTab && (
        <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/[0.04] bg-[#0B0F17] shrink-0">
          <span className="text-[10px] font-mono text-slate-600">
            {currentTab}
          </span>
          {fileData && (
            <span className="text-[10px] font-mono text-slate-700">
              {fileData.lang}
            </span>
          )}
        </div>
      )}

      {/* Code */}
      <div className="flex-1 overflow-auto bg-[#0B0F17]">
        {!currentTab || isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <FileCode2 className="w-8 h-8 text-slate-700" />
            <p className="text-sm text-slate-600">{isLoading ? "Loading file..." : `No preview available for ${fileName}`}</p>
          </div>
        ) : (
          <div className="py-3 min-w-0">
            {lines.map((line, i) => (
              <CodeLine
                key={i}
                line={line}
                num={i + 1}
                highlight={i + 1 === 42 && currentTab === "src/auth/jwt.ts"}
              />
            ))}
          </div>
        )}
      </div>

      {fileData && (
        <div className="flex items-center justify-between px-4 py-1 border-t border-white/[0.04] bg-[#0D1117] shrink-0">
          <span className="text-[10px] font-mono text-slate-700">
            {lines.length} lines
          </span>
          <div className="flex items-center gap-4 text-[10px] font-mono text-slate-700">
            <span>{fileData.lang}</span>
            <span>UTF-8</span>
            <span>LF</span>
          </div>
        </div>
      )}
    </div>
  );
}
