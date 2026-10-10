import { useQuery } from "@tanstack/react-query";
import { getRepository } from "../../../lib/api/repository";

export function useRepository(repoId: string | null) {
  return useQuery({
    queryKey: ["repository", repoId],
    queryFn: () => getRepository(repoId!),
    enabled: Boolean(repoId),
    // Keep polling while background indexing runs so counts and status update on their own
    refetchInterval: (query) =>
      query.state.data && ["queued", "processing"].includes(query.state.data.analysisStatus) ? 3000 : false,
  });
}
