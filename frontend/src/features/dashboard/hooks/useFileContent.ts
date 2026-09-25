import { useQuery } from "@tanstack/react-query";
import { getFileContent } from "../../../lib/api/repository";

export function useFileContent(repoId: string | null, path: string) {
  return useQuery({
    queryKey: ["file-content", repoId, path],
    queryFn: () => getFileContent(repoId!, path),
    enabled: Boolean(repoId && path),
  });
}
