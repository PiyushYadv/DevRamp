import { useState } from "react";
import { Outlet, useNavigate } from "react-router";
import {
  Terminal, ChevronDown, RefreshCw, CheckCircle2, Folder, FolderOpen,
  FileCode2, FileJson, ChevronRight, Circle, Layers, BookOpen,
  GitBranch, Home, Plus,
} from "lucide-react";
import { DashboardProvider, useDashboard } from "../../DashboardContext";

// ─── File tree types & data ───────────────────────────────────────────────────

interface FileNode {
  name: string;
  type: "folder" | "file";
  indexed?: boolean;
  ext?: string;
  path?: string;
  children?: FileNode[];
  open?: boolean;
}

const FILE_TREE: FileNode[] = [
  {
    name: "src", type: "folder", open: true,
    children: [
      {
        name: "auth", type: "folder", open: true,
        children: [
          { name: "jwt.ts", type: "file", indexed: true, ext: "ts", path: "src/auth/jwt.ts" },
          { name: "middleware.ts", type: "file", indexed: true, ext: "ts", path: "src/auth/middleware.ts" },
          { name: "oauth.ts", type: "file", indexed: false, ext: "ts", path: "src/auth/oauth.ts" },
        ],
      },
      {
        name: "services", type: "folder", open: false,
        children: [
          { name: "billing.service.ts", type: "file", indexed: true, ext: "ts", path: "src/services/billing.service.ts" },
          { name: "payment.service.ts", type: "file", indexed: true, ext: "ts", path: "src/services/payment.service.ts" },
          { name: "webhook.service.ts", type: "file", indexed: false, ext: "ts", path: "src/services/webhook.service.ts" },
        ],
      },
      {
        name: "db", type: "folder", open: false,
        children: [
          { name: "schema.prisma", type: "file", indexed: true, ext: "prisma", path: "src/db/schema.prisma" },
        ],
      },
      { name: "main.ts", type: "file", indexed: true, ext: "ts", path: "src/main.ts" },
      { name: "app.module.ts", type: "file", indexed: true, ext: "ts", path: "src/app.module.ts" },
    ],
  },
  { name: "package.json", type: "file", indexed: true, ext: "json", path: "package.json" },
  { name: "tsconfig.json", type: "file", indexed: true, ext: "json", path: "tsconfig.json" },
  { name: ".env.example", type: "file", indexed: false, ext: "env", path: ".env.example" },
];

// ─── File tree node ───────────────────────────────────────────────────────────

function ExtIcon({ ext }: { ext?: string }) {
  if (ext === "json") return <FileJson className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
  return <FileCode2 className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" />;
}

function FileTreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [open, setOpen] = useState(node.open ?? false);
  const { selectedFile, setSelectedFile, setSelectedModule, indexedFiles, toggleIndexedFile } = useDashboard();
  const pl = 8 + depth * 12;

  if (node.type === "folder") {
    return (
      <div>
        <button
          className="w-full flex items-center gap-1.5 py-0.5 hover:bg-white/5 rounded text-left transition-colors"
          style={{ paddingLeft: `${pl}px`, paddingRight: "8px" }}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronRight className={`w-3 h-3 text-slate-500 transition-transform shrink-0 ${open ? "rotate-90" : ""}`} />
          {open
            ? <FolderOpen className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" />
            : <Folder className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
          <span className="text-xs text-slate-300 font-mono truncate">{node.name}</span>
        </button>
        {open && node.children?.map((c, i) => <FileTreeNode key={i} node={c} depth={depth + 1} />)}
      </div>
    );
  }

  const isActive = node.path === selectedFile;
  return (
    <button
      onClick={() => {
        if (node.path) { setSelectedFile(node.path); setSelectedModule(null); }
      }}
      className={`w-full flex items-center gap-1.5 py-0.5 rounded text-left transition-colors group ${
        isActive
          ? "bg-indigo-500/15 border-l-2 border-indigo-500"
          : "hover:bg-white/[0.05] border-l-2 border-transparent"
      }`}
      style={{ paddingLeft: `${pl + 14}px`, paddingRight: "8px" }}
    >
      <ExtIcon ext={node.ext} />
      <span className={`text-xs font-mono truncate flex-1 transition-colors ${isActive ? "text-indigo-300" : "text-slate-400 group-hover:text-slate-200"}`}>
        {node.name}
      </span>
      {node.path != null && (
        <span
          onClick={(e) => { e.stopPropagation(); toggleIndexedFile(node.path!); }}
          title={indexedFiles.has(node.path) ? "Remove from index" : "Add to index"}
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          role="checkbox"
          aria-checked={indexedFiles.has(node.path)}
        >
          {indexedFiles.has(node.path)
            ? <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            : <Circle className="w-3 h-3 text-slate-600 hover:text-slate-400 transition-colors" />}
        </span>
      )}
    </button>
  );
}

// ─── Sidebar content ──────────────────────────────────────────────────────────

const MODULES = [
  { n: 1, label: "Architecture Overview" },
  { n: 2, label: "Local Setup" },
  { n: 3, label: "Key Services" },
];

function SidebarContent() {
  const { hasRepo, repoName, setHasRepo, selectedModule, setSelectedModule, setSelectedFile, moduleProgress } = useDashboard();
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => { setSyncing(true); setTimeout(() => setSyncing(false), 1800); };

  return (
    <>
      {/* Repo switcher */}
      <div className="p-3 border-b border-white/[0.06]">
        {hasRepo ? (
          <>
            <button className="w-full flex items-center justify-between px-3 py-2 rounded-md bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] transition-colors text-left">
              <div className="flex items-center gap-2 min-w-0">
                <GitBranch className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-xs font-mono text-slate-300 truncate">{repoName}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            </button>
            <button
              onClick={handleSync}
              className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-white/[0.06] hover:border-indigo-500/30 hover:bg-indigo-500/[0.05] text-[11px] text-slate-400 hover:text-indigo-300 transition-all"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Latest Commit"}
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-indigo-500/30 hover:border-indigo-500/60 hover:bg-indigo-500/[0.05] text-[11px] text-indigo-400 transition-all"
          >
            <Plus className="w-3 h-3" />
            Connect Repository
          </button>
        )}
      </div>

      {/* File tree */}
      {hasRepo && (
        <div className="flex-1 overflow-y-auto py-2 px-1">
          <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
            <Layers className="w-3 h-3 text-slate-600" />
            <span className="text-[10px] uppercase tracking-widest text-slate-600 font-medium">Repository</span>
          </div>
          {FILE_TREE.map((node, i) => <FileTreeNode key={i} node={node} depth={0} />)}
          <div className="mt-2 px-2">
            <span className="text-[9px] font-mono text-slate-700">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 inline mr-1" />= indexed in vector DB
            </span>
          </div>
        </div>
      )}

      {!hasRepo && <div className="flex-1" />}

      {/* Onboarding modules */}
      {hasRepo && (
        <div className="border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen className="w-3 h-3 text-slate-600" />
            <span className="text-[10px] uppercase tracking-widest text-slate-600 font-medium">Onboarding Modules</span>
          </div>
          {MODULES.map((m) => {
            const isActive = selectedModule === m.n;
            const progress = moduleProgress(m.n);
            const allDone = progress === 100;
            return (
              <button
                key={m.n}
                onClick={() => { setSelectedModule(m.n); setSelectedFile(null); }}
                className={`w-full flex items-center gap-2 py-1.5 px-2 rounded transition-colors group text-left ${
                  isActive ? "bg-indigo-500/10 border border-indigo-500/20" : "hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                <span className="text-[10px] font-mono text-slate-600 w-4 shrink-0">{m.n}.</span>
                {allDone
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  : progress > 0
                    ? (
                      <span className="relative w-3.5 h-3.5 shrink-0">
                        <svg viewBox="0 0 14 14" className="w-3.5 h-3.5 -rotate-90">
                          <circle cx="7" cy="7" r="5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
                          <circle cx="7" cy="7" r="5" fill="none" stroke="#6366f1" strokeWidth="2"
                            strokeDasharray={`${progress * 0.314} 31.4`} strokeLinecap="round" />
                        </svg>
                      </span>
                    )
                    : <Circle className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-indigo-400" : "text-slate-700"}`} />}
                <span className={`text-xs transition-colors truncate ${
                  isActive ? "text-indigo-300" : allDone ? "text-slate-400" : "text-slate-300 group-hover:text-slate-200"
                }`}>
                  {m.label}
                </span>
                {progress > 0 && !allDone && (
                  <span className="ml-auto text-[9px] font-mono text-slate-600 shrink-0">{progress}%</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function LayoutInner() {
  const navigate = useNavigate();
  return (
    <div className="h-screen flex flex-col bg-[#0B0F17] text-slate-200 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Top bar */}
      <div className="h-10 flex items-center gap-3 px-4 border-b border-white/[0.06] bg-[#0D1117] shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center">
            <Terminal className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-semibold text-white">DevRamp</span>
        </div>
        <span className="text-slate-700">/</span>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          <Home className="w-3 h-3" />
          Home
        </button>
        <span className="text-slate-700">/</span>
        <span className="text-[11px] text-slate-400">Dashboard</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-slate-500 font-mono">47 files indexed</span>
          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-semibold text-white">A</div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[260px] shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0D1117]">
          <SidebarContent />
        </aside>
        <div className="flex-1 overflow-hidden flex flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout() {
  return (
    <DashboardProvider>
      <LayoutInner />
    </DashboardProvider>
  );
}
