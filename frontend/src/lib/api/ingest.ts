import type { IngestRepositoryResponse } from "./types";
import { apiFetch } from "./client";
import { USE_MOCK_API } from "./config";

// Replace this implementation with POST /api/ingest later.
export async function mockIngestRepository(repoId: string): Promise<IngestRepositoryResponse> {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  return { repoId, status: "completed", message: "Repository indexed successfully." };
}

export function ingestRepository(repoUrl: string) {
  return USE_MOCK_API
    ? mockIngestRepository(repoUrl)
    : apiFetch<IngestRepositoryResponse>("/api/ingest", {
        method: "POST",
        body: JSON.stringify({ repoUrl }),
      });
}
