export interface Repository {
  id: string;
  name: string;
  url: string;
  language?: string;
  indexed: boolean;
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
}

export interface RepositoryArchitecture {
  tags: string[];
  summary: string;
  connections: string[];
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
