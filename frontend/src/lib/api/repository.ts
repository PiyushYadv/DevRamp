import { apiFetch } from "./client";
import type {
  FileTreeNode,
  IngestRepositoryPayload,
  IngestRepositoryResponse,
} from "./types";
import { USE_MOCK_API } from "./config";
import { MOCK_REPOSITORIES } from "../../features/dashboard/data/mockRepository";
import { FILE_TREE } from "../../features/dashboard/data/mockRepositoryTree";
import { FILE_CONTENTS } from "../../features/dashboard/data/mockFileContents";
import type { RepositoryCard, MockFileContent } from "../ui/types";

const MOCK_REPOSITORY_ACCESS_KEY = "devramp-repository-access";


export function ingestRepository(payload: IngestRepositoryPayload) {
  return apiFetch<IngestRepositoryResponse>("/api/ingest", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getRepositories(): Promise<RepositoryCard[]> {
  if (USE_MOCK_API) {
    const stored = localStorage.getItem(MOCK_REPOSITORY_ACCESS_KEY);
    if (!stored) return MOCK_REPOSITORIES;
    try {
      const allowed = JSON.parse(stored) as string[];
      return MOCK_REPOSITORIES.filter((repo) => allowed.includes(repo.id));
    } catch {
      return MOCK_REPOSITORIES;
    }
  }
  return apiFetch<RepositoryCard[]>("/api/repositories");
}

export function getRepositoryTree(repoId: string) {
  if (USE_MOCK_API) return Promise.resolve(FILE_TREE);
  return apiFetch<FileTreeNode[]>(
    `/api/tree?repo_id=${encodeURIComponent(repoId)}`,
  );
}

export async function getFileContent(repoId: string, path: string): Promise<MockFileContent> {
  if (USE_MOCK_API) {
    return FILE_CONTENTS[path] ?? { lang: "text", content: "" };
  }
  return apiFetch<MockFileContent>(
    `/api/repository/${encodeURIComponent(repoId)}/file?path=${encodeURIComponent(path)}`,
  );
}


export async function updateRepositoryAccess(repositoryIds: string[]): Promise<void> {
  if (USE_MOCK_API) {
    localStorage.setItem(MOCK_REPOSITORY_ACCESS_KEY, JSON.stringify(repositoryIds));
    return;
  }
  await apiFetch<void>("/api/github/repositories/access", {
    method: "POST",
    body: JSON.stringify({ repositoryIds }),
  });
}
