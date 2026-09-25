import { useQuery } from "@tanstack/react-query";
import { getRepositoryTree } from "../../../lib/api/repository";

export function useRepositoryTree(repoId: string | null) {
  return useQuery({
    queryKey: ["repository-tree", repoId],
    queryFn: () => getRepositoryTree(repoId!),
    enabled: Boolean(repoId),
  });
}
