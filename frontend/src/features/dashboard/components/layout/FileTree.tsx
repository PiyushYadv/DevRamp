import {
  CheckCircle2,
  ChevronRight,
  Circle,
  FileCode2,
  FileJson,
  Folder,
  FolderOpen,
} from "lucide-react";
import type { FileTreeNode } from "../../../../lib/api/types";
import { useDashboard } from "../../context/DashboardContext";
import { getFileExtension } from "../../../../utils/file";
import { useState } from "react";

export function ExtIcon({ ext }: { ext?: string }) {
  if (ext === "json")
    return <FileJson className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
  return <FileCode2 className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" />;
}

export function FileTree({
  node,
  depth = 0,
}: {
  node: FileTreeNode;
  depth?: number;
}) {
  const [open, setOpen] = useState(false);
  const {
    selectedFile,
    setSelectedFile,
    setSelectedModule,
    indexedFiles,
    toggleIndexedFile,
  } = useDashboard();
  const pl = 8 + depth * 12;

  if (node.type === "folder") {
    return (
      <div>
        <button
          className="w-full flex items-center gap-1.5 py-0.5 hover:bg-white/5 rounded text-left transition-colors"
          style={{ paddingLeft: `${pl}px`, paddingRight: "8px" }}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronRight
            className={`w-3 h-3 text-slate-500 transition-transform shrink-0 ${open ? "rotate-90" : ""}`}
          />
          {open ? (
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" />
          ) : (
            <Folder className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          )}
          <span className="text-xs text-slate-300 font-mono truncate">
            {node.name}
          </span>
        </button>
        {open &&
          node.children?.map((c, i) => (
            <FileTree key={i} node={c} depth={depth + 1} />
          ))}
      </div>
    );
  }

  const isActive = node.path === selectedFile;
  return (
    <button
      onClick={() => {
        if (node.path) {
          setSelectedFile(node.path);
          setSelectedModule(null);
        }
      }}
      className={`w-full flex items-center gap-1.5 py-0.5 rounded text-left transition-colors group ${
        isActive
          ? "bg-indigo-500/15 border-l-2 border-indigo-500"
          : "hover:bg-white/[0.05] border-l-2 border-transparent"
      }`}
      style={{ paddingLeft: `${pl + 14}px`, paddingRight: "8px" }}
    >
      <ExtIcon ext={getFileExtension(node.name)} />
      <span
        className={`text-xs font-mono truncate flex-1 transition-colors ${isActive ? "text-indigo-300" : "text-slate-400 group-hover:text-slate-200"}`}
      >
        {node.name}
      </span>
      <span
        onClick={(e) => {
          e.stopPropagation();
          toggleIndexedFile(node.path!);
        }}
        title={
          indexedFiles.has(node.path) ? "Remove from index" : "Add to index"
        }
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
        role="checkbox"
        aria-checked={indexedFiles.has(node.path)}
      >
        {indexedFiles.has(node.path) ? (
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        ) : (
          <Circle className="w-3 h-3 text-slate-600 hover:text-slate-400 transition-colors" />
        )}
      </span>
    </button>
  );
}
