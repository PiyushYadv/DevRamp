import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { INITIAL_CHECKLISTS, INITIAL_INDEXED_FILES } from "../data/mockDashboardState";
import { getChecklist } from "../../../lib/api/workspace";
import { isGithubConnected } from "../../../lib/api/auth";
import type { CheckItem, DashboardContextType } from "../types";

const context = createContext<DashboardContextType>({
  hasRepo: false, setHasRepo: () => {}, repoName: "", setRepoName: () => {},
  selectedFile: null, setSelectedFile: () => {}, selectedModule: null, setSelectedModule: () => {},
  checklists: INITIAL_CHECKLISTS, toggleItem: () => {}, resetModule: () => {}, markAllDone: () => {}, moduleProgress: () => 0,
  indexedFiles: INITIAL_INDEXED_FILES, toggleIndexedFile: () => {}, githubConnected: false, setGithubConnected: () => {},
  repositoryModalOpen: false, setRepositoryModalOpen: () => {}, lastSyncedAt: null, setLastSyncedAt: () => {},
});

const storageKey = (repo: string) => `devramp:onboarding:${repo}`;

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [hasRepo, setHasRepo] = useState(false);
  const [githubConnected, setGithubConnected] = useState(isGithubConnected);
  const [repositoryModalOpen, setRepositoryModalOpen] = useState(false);
  const [repoName, setRepoName] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [checklists, setChecklists] = useState<Record<number, CheckItem[]>>(INITIAL_CHECKLISTS);
  const [indexedFiles, setIndexedFiles] = useState<Set<string>>(INITIAL_INDEXED_FILES);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const hydratedRepo = useRef<string | null>(null);

  useEffect(() => {
    const syncAuth = () => setGithubConnected(isGithubConnected());
    window.addEventListener("devramp-auth-changed", syncAuth);
    return () => window.removeEventListener("devramp-auth-changed", syncAuth);
  }, []);

  const checklistQuery = useQuery({
    queryKey: ["checklist", repoName],
    queryFn: () => getChecklist(repoName),
    enabled: hasRepo && Boolean(repoName),
    initialData: INITIAL_CHECKLISTS,
  });

  useEffect(() => {
    if (!repoName || !hasRepo || hydratedRepo.current === repoName) return;
    hydratedRepo.current = repoName;
    const saved = localStorage.getItem(storageKey(repoName));
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { checklists?: Record<number, CheckItem[]>; lastSyncedAt?: string | null };
        if (parsed.checklists) setChecklists(parsed.checklists);
        setLastSyncedAt(parsed.lastSyncedAt ?? null);
        return;
      } catch { /* fall through to API data */ }
    }
    if (checklistQuery.data) setChecklists(checklistQuery.data);
  }, [repoName, hasRepo, checklistQuery.data]);

  useEffect(() => {
    if (!repoName || !hasRepo || hydratedRepo.current !== repoName) return;
    localStorage.setItem(storageKey(repoName), JSON.stringify({ checklists, lastSyncedAt }));
  }, [repoName, hasRepo, checklists, lastSyncedAt]);

  const toggleIndexedFile = (path: string) => setIndexedFiles((prev) => {
    const next = new Set(prev);
    if (next.has(path)) next.delete(path); else next.add(path);
    return next;
  });

  const toggleItem = (moduleN: number, itemId: string) => setChecklists((prev) => ({
    ...prev,
    [moduleN]: prev[moduleN].map((c) => c.id === itemId ? { ...c, done: !c.done } : c),
  }));

  const resetModule = (moduleN: number) => setChecklists((prev) => ({ ...prev, [moduleN]: prev[moduleN].map((c) => ({ ...c, done: false })) }));
  const markAllDone = (moduleN: number) => setChecklists((prev) => ({ ...prev, [moduleN]: prev[moduleN].map((c) => ({ ...c, done: true })) }));
  const moduleProgress = (moduleN: number) => {
    const items = checklists[moduleN] ?? [];
    return items.length ? Math.round((items.filter((c) => c.done).length / items.length) * 100) : 0;
  };

  const value = useMemo(() => ({
    hasRepo, setHasRepo, repoName, setRepoName, selectedFile, setSelectedFile, selectedModule, setSelectedModule,
    checklists, toggleItem, resetModule, markAllDone, moduleProgress, indexedFiles, toggleIndexedFile,
    githubConnected, setGithubConnected, repositoryModalOpen, setRepositoryModalOpen, lastSyncedAt, setLastSyncedAt,
  }), [hasRepo, repoName, selectedFile, selectedModule, checklists, indexedFiles, githubConnected, repositoryModalOpen, lastSyncedAt]);

  return <context.Provider value={value}>{children}</context.Provider>;
}

export function useDashboard() { return useContext(context); }
