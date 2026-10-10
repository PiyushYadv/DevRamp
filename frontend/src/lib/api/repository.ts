import { apiFetch } from "./client";
import type {
  FileTreeNode,
  GithubRepository,
  IngestRepositoryPayload,
  IngestRepositoryResponse,
  WorkspaceRepository,
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

/** Repositories in the user's DevRamp workspace (GET /api/repositories). */
export async function getRepositories(): Promise<RepositoryCard[]> {
  if (USE_MOCK_API) return MOCK_REPOSITORIES;
  const repositories = await apiFetch<WorkspaceRepository[]>("/api/repositories");
  return repositories.map((repo) => ({
    id: repo.id,
    name: repo.fullName,
    url: repo.url,
    language: repo.language ?? undefined,
    indexed: repo.indexed,
    private: repo.private,
    stars: repo.stars,
    updated: formatRelativeTime(repo.updated),
  }));
}

/**
 * Repositories from the connected GitHub account (GET /api/github/repositories), limited to the ones chosen
 * in RepositoryAccessModal when a selection exists. Card ids are GitHub repository ids.
 */
export async function getGithubRepositories(): Promise<RepositoryCard[]> {
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
  const repositories = await apiFetch<GithubRepository[]>("/api/github/repositories");
  const hasSelection = repositories.some((repo) => repo.selected);
  return repositories
    .filter((repo) => !hasSelection || repo.selected)
    .map((repo) => ({
      id: repo.id,
      name: repo.fullName,
      url: repo.url,
      language: repo.language ?? undefined,
      indexed: repo.indexed,
      private: repo.private,
      stars: repo.stars,
      updated: formatRelativeTime(repo.updated),
    }));
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "recently";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const units: [number, string][] = [[31536000, "y"], [2592000, "mo"], [86400, "d"], [3600, "h"], [60, "m"]];
  for (const [size, label] of units) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${label} ago`;
  }
  return "just now";
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
