import type { ArchitectureNode, ModuleContent, Repository } from "../api/types";

export interface RepositoryCard extends Repository {
  private: boolean;
  stars: number;
  updated: string;
}

export interface ModuleViewModel extends ModuleContent {
  color: string;
  accentBg: string;
  accentBorder: string;
}

export interface MockFileContent {
  lang: string;
  content: string;
}

export interface ArchitectureNodeViewModel extends ArchitectureNode {
  color: string;
  bg: string;
}
