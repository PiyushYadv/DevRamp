export type WsTab = "overview" | "architecture" | "dependency" | "setup";

export type TokenType =
  | "keyword"
  | "string"
  | "comment"
  | "typename"
  | "number"
  | "fn"
  | "plain";

export interface CheckItem {
  id: string;
  label: string;
  done: boolean;
}

/** Lines to reveal in the code viewer; `nonce` lets re-clicking the same citation scroll again */
export interface LineTarget {
  start: number;
  end: number;
  nonce: number;
}

export interface DashboardContextType {
  repoId: string;
  setRepoId: (v: string) => void;
  hasRepo: boolean;
  setHasRepo: (v: boolean) => void;
  repoName: string;
  setRepoName: (v: string) => void;
  selectedFile: string | null;
  setSelectedFile: (v: string | null) => void;
  selectedLines: LineTarget | null;
  openFileAt: (path: string, start?: number, end?: number) => void;
  selectedModule: number | null;
  setSelectedModule: (v: number | null) => void;
  checklists: Record<number, CheckItem[]>;
  toggleItem: (moduleN: number, itemId: string) => void;
  resetModule: (moduleN: number) => void;
  markAllDone: (moduleN: number) => void;
  moduleProgress: (moduleN: number) => number;
  indexedFiles: Set<string>;
  toggleIndexedFile: (path: string) => void;
  githubConnected: boolean;
  setGithubConnected: (v: boolean) => void;
  repositoryModalOpen: boolean;
  setRepositoryModalOpen: (v: boolean) => void;
  lastSyncedAt: string | null;
  setLastSyncedAt: (v: string | null) => void;
}
