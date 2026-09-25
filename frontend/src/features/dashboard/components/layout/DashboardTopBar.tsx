import { useEffect, useRef, useState } from "react";
import { ExternalLink, Github, Home, LogOut, Terminal } from "lucide-react";
import { useNavigate } from "react-router";
import { useDashboard } from "../../context/DashboardContext";
import { getCurrentUser, logout } from "../../../../lib/api/auth";

export function DashboardTopBar() {
  const navigate = useNavigate();
  const { setHasRepo, setRepoName, setSelectedFile, setSelectedModule } = useDashboard();
  const { hasRepo } = useDashboard();
  const user = getCurrentUser();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
  const goToRepositoryPicker = () => {
    setHasRepo(false);
    setRepoName("");
    setSelectedFile(null);
    setSelectedModule(null);
    navigate("/dashboard");
  };
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  return (
    <div className="h-10 flex items-center gap-3 px-4 border-b border-white/[0.06] bg-[#0D1117] shrink-0">
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center">
          <Terminal className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs font-semibold text-white">DevRamp</span>
      </div>
      <span className="text-slate-700">/</span>
      <button
        onClick={goToRepositoryPicker}
        className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
      >
        <Home className="w-3 h-3" /> Home
      </button>
      <span className="text-slate-700">/</span>
      <span className="text-[11px] text-slate-400">{hasRepo ? "Dashboard" : "Connect Repository"}</span>
      <div className="ml-auto flex items-center gap-3">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span className="text-[10px] text-slate-500 font-mono">
          47 files indexed
        </span>
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen((open) => !open)}
            aria-label="Open profile menu"
            aria-expanded={profileOpen}
            className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            {user?.name?.charAt(0).toUpperCase() ?? "U"}
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-8 z-50 w-56 rounded-lg border border-white/[0.1] bg-[#111827] shadow-xl shadow-black/40 overflow-hidden">
              <div className="px-3 py-3 border-b border-white/[0.06]">
                <p className="text-xs font-medium text-white truncate">{user?.name ?? "DevRamp user"}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email ?? ""}</p>
              </div>
              <a href={user?.githubUrl ?? "https://github.com"} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2.5 text-xs text-slate-300 hover:bg-white/[0.05] transition-colors">
                <Github className="w-3.5 h-3.5" /> GitHub profile <ExternalLink className="w-3 h-3 ml-auto text-slate-600" />
              </a>
              <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/[0.08] transition-colors">
                <LogOut className="w-3.5 h-3.5" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
