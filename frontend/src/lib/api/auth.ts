import type {
  AuthResponse,
  LoginPayload,
  SignupPayload,
} from "./types";
import { apiFetch } from "./client";
import { USE_MOCK_API } from "./config";

const MOCK_AUTH_DELAY = 1000;

function persistAuth(response: AuthResponse, providerOverride?: "password" | "github") {
  if (providerOverride && response.user.authProvider !== providerOverride) {
    response = { ...response, user: { ...response.user, authProvider: providerOverride } };
  }
  localStorage.setItem("devramp-auth", JSON.stringify(response));
  localStorage.setItem("devramp-access-token", response.accessToken);
  if (response.user.authProvider === "github") {
    localStorage.setItem("devramp-github-connected", "true");
  } else {
    localStorage.removeItem("devramp-github-connected");
  }
  window.dispatchEvent(new Event("devramp-auth-changed"));
  return response;
}

function mockAuthResponse(
  name: string,
  email: string,
  authProvider: "password" | "github" = "password",
): AuthResponse {
  return persistAuth({
    user: {
      id: authProvider === "github" ? "github-user-1" : "mock-user-1",
      name,
      email,
      githubUrl: authProvider === "github" ? "https://github.com" : undefined,
      authProvider,
    },
    accessToken: authProvider === "github" ? "mock-github-access-token" : "mock-access-token",
  });
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem("devramp-auth"));
}

export function isGithubConnected() {
  return localStorage.getItem("devramp-github-connected") === "true" ||
    getCurrentUser()?.authProvider === "github";
}

export function getCurrentUser(): AuthResponse["user"] | null {
  const stored = localStorage.getItem("devramp-auth");
  if (!stored) return null;
  try {
    return (JSON.parse(stored) as AuthResponse).user;
  } catch {
    return null;
  }
}

export function logout() {
  localStorage.removeItem("devramp-auth");
  localStorage.removeItem("devramp-access-token");
  localStorage.removeItem("devramp-github-connected");
  window.dispatchEvent(new Event("devramp-auth-changed"));
}

export async function mockLogin({ email }: LoginPayload): Promise<AuthResponse> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_AUTH_DELAY));
  return mockAuthResponse(email.split("@")[0] || "DevRamp user", email);
}

export async function mockSignup({ name, email }: SignupPayload): Promise<AuthResponse> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_AUTH_DELAY));
  return mockAuthResponse(name, email);
}

export async function mockGithubAuth(): Promise<AuthResponse> {
  await new Promise((resolve) => setTimeout(resolve, 800));
  return mockAuthResponse("GitHub user", "github-user@devramp.local", "github");
}

export async function login(payload: LoginPayload) {
  const response = USE_MOCK_API
    ? await mockLogin(payload)
    : await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
  return USE_MOCK_API ? response : persistAuth(response, "password");
}

export async function signup(payload: SignupPayload) {
  const response = USE_MOCK_API
    ? await mockSignup(payload)
    : await apiFetch<AuthResponse>("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
      });
  return USE_MOCK_API ? response : persistAuth(response, "password");
}

export async function connectGithub(): Promise<AuthResponse> {
  if (USE_MOCK_API) {
    const current = getCurrentUser();
    if (!current) throw new Error("Authentication required");
    const response: AuthResponse = {
      user: { ...current, authProvider: "github", githubUrl: current.githubUrl ?? "https://github.com" },
      accessToken: localStorage.getItem("devramp-access-token") ?? "mock-access-token",
    };
    return persistAuth(response, "github");
  }

  const response = await apiFetch<AuthResponse>("/api/auth/github/connect", { method: "POST" });
  return persistAuth(response, "github");
}

export async function githubAuth() {
  const response = USE_MOCK_API
    ? await mockGithubAuth()
    : await apiFetch<AuthResponse>("/api/auth/github", { method: "POST" });
  return USE_MOCK_API ? response : persistAuth(response, "github");
}
