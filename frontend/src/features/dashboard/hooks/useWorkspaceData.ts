import { useQuery } from "@tanstack/react-query";
import { getArchitecture, getDependencies, getModules, getSetup } from "../../../lib/api/workspace";

export function useArchitecture(repoId: string | null) {
  return useQuery({ queryKey: ["architecture", repoId], queryFn: () => getArchitecture(repoId!), enabled: Boolean(repoId) });
}

export function useDependencies(repoId: string | null) {
  return useQuery({ queryKey: ["dependencies", repoId], queryFn: () => getDependencies(repoId!), enabled: Boolean(repoId) });
}

export function useSetup(repoId: string | null) {
  return useQuery({ queryKey: ["setup", repoId], queryFn: () => getSetup(repoId!), enabled: Boolean(repoId) });
}

export function useModules(repoId: string | null) {
  return useQuery({ queryKey: ["modules", repoId], queryFn: () => getModules(repoId!), enabled: Boolean(repoId) });
}
