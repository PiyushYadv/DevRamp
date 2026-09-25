import { useMutation } from "@tanstack/react-query";
import { ingestRepository } from "../../../lib/api/ingest";

export function useIngestRepository() {
  const mutation = useMutation({ mutationFn: ingestRepository });

  return {
    ingest: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
