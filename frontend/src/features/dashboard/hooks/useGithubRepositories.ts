import { useQuery } from "@tanstack/react-query";
import { getGithubRepositories } from "../../../lib/api/repository";

export const GITHUB_REPOSITORIES_QUERY_KEY = ["github-repositories"];

export function useGithubRepositories(enabled = true) {
  return useQuery({ queryKey: GITHUB_REPOSITORIES_QUERY_KEY, queryFn: getGithubRepositories, enabled });
}
