export interface Repository {
  id: string;
  name: string;
  url: string;
  language?: string;
  indexed: boolean;
}

export interface FileTreeNode {
  name: string;
  type: "folder" | "file";
  path: string;
  children: FileTreeNode[];
  indexed?: boolean;
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

export interface Citation {
  file: string;
  line?: number;
  label: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}
