import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export interface CheckItem { id: string; label: string; done: boolean }

const INITIAL_INDEXED_FILES = new Set<string>([
  "src/auth/jwt.ts", "src/auth/middleware.ts",
  "src/services/billing.service.ts", "src/services/payment.service.ts",
  "src/db/schema.prisma", "src/main.ts", "src/app.module.ts",
  "package.json", "tsconfig.json",
]);

const INITIAL_CHECKLISTS: Record<number, CheckItem[]> = {
  1: [
    { id: "a1", label: "Read the architecture summary", done: true },
    { id: "a2", label: "Review the service topology diagram", done: true },
    { id: "a3", label: "Understand the JWT rotation pattern", done: true },
    { id: "a4", label: "Ask the AI copilot one architecture question", done: true },
  ],
  2: [
    { id: "s1", label: "Clone the repository", done: true },
    { id: "s2", label: "Configure .env from .env.example", done: false },
    { id: "s3", label: "Run database migrations", done: false },
    { id: "s4", label: "Start the dev server successfully", done: false },
    { id: "s5", label: "Verify /health endpoint responds", done: false },
    { id: "s6", label: "Run the test suite (npm test)", done: false },
  ],
  3: [
    { id: "k1", label: "Read AuthModule source in the repository", done: false },
    { id: "k2", label: "Trace a billing request end-to-end", done: false },
    { id: "k3", label: "Understand the Stripe webhook signature check", done: false },
    { id: "k4", label: "Make a test API call via Swagger UI", done: false },
  ],
};

interface DashboardContextType {
  hasRepo: boolean;
  setHasRepo: (v: boolean) => void;
  repoName: string;
  setRepoName: (v: string) => void;
  selectedFile: string | null;
  setSelectedFile: (v: string | null) => void;
  selectedModule: number | null;
  setSelectedModule: (v: number | null) => void;
  checklists: Record<number, CheckItem[]>;
  toggleItem: (moduleN: number, itemId: string) => void;
  resetModule: (moduleN: number) => void;
  markAllDone: (moduleN: number) => void;
  moduleProgress: (moduleN: number) => number;
  indexedFiles: Set<string>;
  toggleIndexedFile: (path: string) => void;
}

const DashboardContext = createContext<DashboardContextType>({
  hasRepo: false, setHasRepo: () => {},
  repoName: "", setRepoName: () => {},
  selectedFile: null, setSelectedFile: () => {},
  selectedModule: null, setSelectedModule: () => {},
  checklists: INITIAL_CHECKLISTS,
  toggleItem: () => {},
  resetModule: () => {},
  markAllDone: () => {},
  moduleProgress: () => 0,
  indexedFiles: INITIAL_INDEXED_FILES,
  toggleIndexedFile: () => {},
});

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [hasRepo, setHasRepo] = useState(false);
  const [repoName, setRepoName] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [checklists, setChecklists] = useState<Record<number, CheckItem[]>>(INITIAL_CHECKLISTS);
  const [indexedFiles, setIndexedFiles] = useState<Set<string>>(INITIAL_INDEXED_FILES);

  const toggleIndexedFile = (path: string) =>
    setIndexedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });

  const toggleItem = (moduleN: number, itemId: string) =>
    setChecklists((prev) => ({
      ...prev,
      [moduleN]: prev[moduleN].map((c) => c.id === itemId ? { ...c, done: !c.done } : c),
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
    if (!items.length) return 0;
    return Math.round((items.filter((c) => c.done).length / items.length) * 100);
  };

  return (
    <DashboardContext.Provider value={{
      hasRepo, setHasRepo,
      repoName, setRepoName,
      selectedFile, setSelectedFile,
      selectedModule, setSelectedModule,
      checklists, toggleItem, resetModule, markAllDone, moduleProgress,
      indexedFiles, toggleIndexedFile,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  return useContext(DashboardContext);
}
