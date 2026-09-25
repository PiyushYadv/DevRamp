import { apiFetch } from "./client";
import { USE_MOCK_API } from "./config";
import {
  ARCHITECTURE_CONNECTIONS,
  ARCHITECTURE_SUMMARY,
  ARCHITECTURE_TAGS,
  DEPENDENCY_MODULES,
  ENVIRONMENT_VARIABLES,
  PREREQUISITES,
  QUICK_START_COMMANDS,
} from "../../features/dashboard/data/mockWorkspace";
import { MOCK_ARCHITECTURE_NODES } from "../../features/dashboard/data/mockArchitecture";
import { MODULE_DATA } from "../../features/dashboard/data/mockModules";
import { INITIAL_CHECKLISTS } from "../../features/dashboard/data/mockDashboardState";
import type { CheckItem } from "../../features/dashboard/types";
import type { ArchitectureNodeViewModel, ModuleViewModel } from "../ui/types";
import type { DependencyModule, EnvironmentVariable, Prerequisite, RepositoryArchitecture } from "./types";

export interface WorkspaceArchitecture extends RepositoryArchitecture {
  quickStart: { command: string; comment: string }[];
  nodes: ArchitectureNodeViewModel[];
}

export interface WorkspaceSetup {
  environmentVariables: EnvironmentVariable[];
  prerequisites: Prerequisite[];
}

export function getArchitecture(repoId: string): Promise<WorkspaceArchitecture> {
  if (USE_MOCK_API) {
    return Promise.resolve({
      tags: ARCHITECTURE_TAGS,
      summary: ARCHITECTURE_SUMMARY,
      connections: ARCHITECTURE_CONNECTIONS,
      quickStart: QUICK_START_COMMANDS,
      nodes: MOCK_ARCHITECTURE_NODES,
    });
  }
  return apiFetch<WorkspaceArchitecture>(`/api/repository/${encodeURIComponent(repoId)}/architecture`);
}

export function getDependencies(repoId: string) {
  if (USE_MOCK_API) return Promise.resolve(DEPENDENCY_MODULES);
  return apiFetch<DependencyModule[]>(`/api/repository/${encodeURIComponent(repoId)}/dependencies`);
}

export function getSetup(repoId: string): Promise<WorkspaceSetup> {
  if (USE_MOCK_API) return Promise.resolve({ environmentVariables: ENVIRONMENT_VARIABLES, prerequisites: PREREQUISITES });
  return apiFetch<WorkspaceSetup>(`/api/repository/${encodeURIComponent(repoId)}/setup`);
}

export function getModules(repoId: string) {
  if (USE_MOCK_API) return Promise.resolve(MODULE_DATA);
  return apiFetch<ModuleViewModel[]>(`/api/repository/${encodeURIComponent(repoId)}/modules`);
}

export function getChecklist(repoId: string) {
  if (USE_MOCK_API) return Promise.resolve(INITIAL_CHECKLISTS);
  return apiFetch<Record<number, CheckItem[]>>(`/api/repository/${encodeURIComponent(repoId)}/checklist`);
}
