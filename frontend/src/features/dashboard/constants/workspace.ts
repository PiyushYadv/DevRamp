import type { TokenType } from "../types";

export const KEYWORDS = new Set([
  "import",
  "export",
  "from",
  "const",
  "let",
  "var",
  "function",
  "async",
  "await",
  "return",
  "if",
  "else",
  "for",
  "while",
  "class",
  "interface",
  "type",
  "extends",
  "default",
  "new",
  "this",
  "null",
  "undefined",
  "true",
  "false",
  "void",
  "typeof",
  "readonly",
  "as",
  "of",
  "in",
  "switch",
  "case",
  "break",
  "throw",
  "try",
  "catch",
  "finally",
  "string",
  "number",
  "boolean",
  "Promise",
]);

export const CLRS: Record<TokenType, string> = {
  // These values are consumed by inline `style.color`, so they must be
  // CSS colors rather than Tailwind class names.
  keyword: "#A78BFA",
  string: "#34D399",
  comment: "#475569",
  typename: "#38BDF8",
  number: "#FB923C",
  fn: "#FDE047",
  plain: "#CBD5E1",
};

export const WORKSPACE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "architecture", label: "System Architecture" },
  { id: "dependency", label: "Dependency Graph" },
  { id: "setup", label: "Environment Setup" },
] as const;

export const langColor: Record<string, string> = {
  TypeScript: "bg-blue-500",
  Python: "bg-yellow-500",
  Swift: "bg-orange-500",
};
