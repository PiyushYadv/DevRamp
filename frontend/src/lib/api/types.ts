export interface Repository {
  id: string;
  name: string;
  url: string;
  language?: string;
  indexed: boolean;
}
export type AnalysisStatus = "queued" | "processing" | "completed" | "failed";

/** GET /api/repositories item */
export interface WorkspaceRepository extends Repository {
  owner: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
  description?: string | null;
  stars: number;
  updated?: string | null;
  analysisStatus: AnalysisStatus;
  currentCommit?: string | null;
  lastSyncedAt?: string | null;
  lastAnalyzedAt?: string | null;
  onboardingProgress: { completed: number; total: number; percentage: number };
}

/** GET /api/github/repositories item */
export interface GithubRepository {
  id: string;
  name: string;
  fullName: string;
  url: string;
  private: boolean;
  defaultBranch: string;
  language?: string | null;
  description?: string | null;
  stars: number;
  updated?: string | null;
  indexed: boolean;
  selected: boolean;
  repoId?: string | null;
}

/** GET /api/repository/{repoId}/ingestion */
export interface IngestionStatus {
  status: AnalysisStatus;
  stage?: string | null;
  progress: number;
  message?: string | null;
  chunkCount: number;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: "folder" | "file";
  children?: FileTreeNode[];
  indexed?: boolean;
  startLine?: number;
  endLine?: number;
  nodeType?: string;
}
export interface FileContent {
  path: string;
  content: string;
  startLine?: number;
  endLine?: number;
}
export interface IngestRepositoryPayload {
  repoUrl: string;
}
export interface IngestRepositoryResponse {
  repoId: string;
  status: "queued" | "processing" | "completed" | "failed";
  message?: string;
}
export interface LoginPayload {
  email: string;
  password: string;
}
export interface SignupPayload extends LoginPayload {
  name: string;
}
export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    githubUrl?: string;
    authProvider?: "password" | "github";
  };
  accessToken: string;
}
export interface Citation {
  file: string;
  line?: number;
  label: string;
}
export interface ChatContext {
  repoId: string;
  filePath?: string;
  startLine?: number;
  endLine?: number;
  moduleId?: string;
  selectedSymbol?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  code?: string;
  context?: ChatContext | null;
  createdAt?: string;
}
export interface ModuleSummary {
  n: number;
  label: string;
}
export interface ModuleSection {
  heading: string;
  body: string;
}
export interface ModuleContent {
  n: number;
  title: string;
  subtitle: string;
  duration: string;
  sections: ModuleSection[];
}
export interface ArchitectureNode {
  id: string;
  label: string;
  sub: string;
  kind?: string;
}

export interface RepositoryArchitecture {
  tags: string[];
  summary: string;
  connections: string[];
  /** Mermaid `flowchart TD` source for the service topology */
  mermaid: string;
}

export interface DependencyModule {
  name: string;
  deps: string[];
  color: string;
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  required: boolean;
}

export interface Prerequisite {
  name: string;
  version: string;
  available: boolean;
}
