import { useQuery } from "@tanstack/react-query";
import { getRepositories } from "../../../lib/api/repository";

export function useRepositories(enabled = true) {
  return useQuery({ queryKey: ["repositories"], queryFn: getRepositories, enabled });
}
