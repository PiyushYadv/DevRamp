import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  INITIAL_CHECKLISTS,
  INITIAL_INDEXED_FILES,
} from "../data/mockDashboardState";
import { getChecklist } from "../../../lib/api/workspace";
import { isGithubConnected } from "../../../lib/api/auth";
import type { CheckItem, DashboardContextType } from "../types";

const context = createContext<DashboardContextType>({
  repoId: "",
  setRepoId: () => {},
  hasRepo: false,
  setHasRepo: () => {},
  repoName: "",
  setRepoName: () => {},
  selectedFile: null,
  setSelectedFile: () => {},
  selectedModule: null,
  setSelectedModule: () => {},
  checklists: INITIAL_CHECKLISTS,
  toggleItem: () => {},
  resetModule: () => {},
  markAllDone: () => {},
  moduleProgress: () => 0,
  indexedFiles: INITIAL_INDEXED_FILES,
  toggleIndexedFile: () => {},
  githubConnected: false,
  setGithubConnected: () => {},
  repositoryModalOpen: false,
  setRepositoryModalOpen: () => {},
  lastSyncedAt: null,
  setLastSyncedAt: () => {},
});

const storageKey = (repo: string) => `devramp:onboarding:${repo}`;

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [hasRepo, setHasRepo] = useState(() => {
    return localStorage.getItem("devramp_has_repo") === "true";
  });

  const [repoId, setRepoId] = useState<string>(() => {
    return localStorage.getItem("devramp_repo_id") ?? "";
  });

  const [repoName, setRepoName] = useState<string>(() => {
    return localStorage.getItem("devramp_repo_name") ?? "";
  });

  const [githubConnected, setGithubConnected] = useState(isGithubConnected);
  const [repositoryModalOpen, setRepositoryModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [checklists, setChecklists] =
    useState<Record<number, CheckItem[]>>(INITIAL_CHECKLISTS);
  const [indexedFiles, setIndexedFiles] = useState<Set<string>>(
    INITIAL_INDEXED_FILES,
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const hydratedRepo = useRef<string | null>(null);

  useEffect(() => {
    const syncAuth = () => setGithubConnected(isGithubConnected());
    window.addEventListener("devramp-auth-changed", syncAuth);
    return () => window.removeEventListener("devramp-auth-changed", syncAuth);
  }, []);

  useEffect(() => {
    localStorage.setItem("devramp_has_repo", String(hasRepo));

    if (repoId) {
      localStorage.setItem("devramp_repo_id", repoId);
    } else {
      localStorage.removeItem("devramp_repo_id");
    }

    if (repoName) {
      localStorage.setItem("devramp_repo_name", repoName);
    } else {
      localStorage.removeItem("devramp_repo_name");
    }
  }, [hasRepo, repoId, repoName]);

  const checklistQuery = useQuery({
    queryKey: ["checklist", repoName],
    queryFn: () => getChecklist(repoName),
    enabled: hasRepo && Boolean(repoName),
    initialData: INITIAL_CHECKLISTS,
  });

  useEffect(() => {
    if (repoId) {
      localStorage.setItem("devramp_repo_id", repoId);
    } else {
      localStorage.removeItem("devramp_repo_id");
    }

    if (repoName) {
      localStorage.setItem("devramp_repo_name", repoName);
    } else {
      localStorage.removeItem("devramp_repo_name");
    }
  }, [repoId, repoName]);

  useEffect(() => {
    if (!repoName || !hasRepo || hydratedRepo.current !== repoName) return;
    localStorage.setItem(
      storageKey(repoName),
      JSON.stringify({ checklists, lastSyncedAt }),
    );
  }, [repoName, hasRepo, checklists, lastSyncedAt]);

  const toggleIndexedFile = (path: string) =>
    setIndexedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });

  const toggleItem = (moduleN: number, itemId: string) =>
    setChecklists((prev) => ({
      ...prev,
      [moduleN]: prev[moduleN].map((c) =>
        c.id === itemId ? { ...c, done: !c.done } : c,
      ),
    }));

  const resetModule = (moduleN: number) =>
    setChecklists((prev) => ({
      ...prev,
      [moduleN]: prev[moduleN].map((c) => ({ ...c, done: false })),
    }));
  const markAllDone = (moduleN: number) =>
    setChecklists((prev) => ({
      ...prev,
      [moduleN]: prev[moduleN].map((c) => ({ ...c, done: true })),
    }));
  const moduleProgress = (moduleN: number) => {
    const items = checklists[moduleN] ?? [];
    return items.length
      ? Math.round((items.filter((c) => c.done).length / items.length) * 100)
      : 0;
  };

  const value = useMemo(
    () => ({
      repoId,
      setRepoId,
      hasRepo,
      setHasRepo,
      repoName,
      setRepoName,
      selectedFile,
      setSelectedFile,
      selectedModule,
      setSelectedModule,
      checklists,
      toggleItem,
      resetModule,
      markAllDone,
      moduleProgress,
      indexedFiles,
      toggleIndexedFile,
      githubConnected,
      setGithubConnected,
      repositoryModalOpen,
      setRepositoryModalOpen,
      lastSyncedAt,
      setLastSyncedAt,
    }),
    [
      repoId,
      hasRepo,
      repoName,
      selectedFile,
      selectedModule,
      checklists,
      indexedFiles,
      githubConnected,
      repositoryModalOpen,
      lastSyncedAt,
    ],
  );

  return <context.Provider value={value}>{children}</context.Provider>;
}

export function useDashboard() {
  return useContext(context);
}
