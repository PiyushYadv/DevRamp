export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== "false";

export const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID ?? "";
// Add "repo" to also list and ingest private repositories
export const GITHUB_SCOPES = import.meta.env.VITE_GITHUB_SCOPES ?? "read:user user:email";
