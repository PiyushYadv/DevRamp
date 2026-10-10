import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRepository } from "../../../lib/api/repository";

export function useRepository(repoId: string | null) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["repository", repoId],
    queryFn: () => getRepository(repoId!),
    enabled: Boolean(repoId),
    // Keep polling while background indexing runs so counts and status update on their own
    refetchInterval: (q) =>
      q.state.data && ["queued", "processing"].includes(q.state.data.analysisStatus) ? 3000 : false,
  });

  // When a (re)index finishes, the tree, analysis and checklist may all have changed
  const previousStatus = useRef(query.data?.analysisStatus);
  useEffect(() => {
    const status = query.data?.analysisStatus;
    if (previousStatus.current && previousStatus.current !== "completed" && status === "completed") {
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] !== "repository" && q.queryKey.includes(repoId),
      });
    }
    previousStatus.current = status;
  }, [query.data?.analysisStatus, queryClient, repoId]);

  return query;
}
