import { logout } from "./auth";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * A stored token the API rejects is stale (expired, or left over from mock mode): sign out and send the
 * user to log in instead of leaving screens stuck on requests that can never succeed.
 */
export function handleUnauthorized(path: string, sentToken: boolean) {
  if (!sentToken || path.startsWith("/api/auth/")) return;
  logout();
  if (window.location.pathname !== "/login") window.location.replace("/login");
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = localStorage.getItem("devramp-access-token");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized(path, Boolean(token));
    const message = await response.text();
    throw new ApiError(message || `Request failed with status ${response.status}`, response.status);
  }

  return response.json() as Promise<T>;
}
