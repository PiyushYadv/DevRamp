import { apiFetch } from "./client";
import type {
  FileTreeNode,
  IngestRepositoryPayload,
  IngestRepositoryResponse,
} from "./types";

export function ingestRepository(payload: IngestRepositoryPayload) {
  return apiFetch<IngestRepositoryResponse>("/repository/ingest", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getRepositoryTree(repoId: string) {
  return apiFetch<FileTreeNode[]>(
    `/api/tree?repo_id=${encodeURIComponent(repoId)}`,
  );
}
