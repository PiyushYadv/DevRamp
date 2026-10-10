import type {
  AuthResponse,
  LoginPayload,
  SignupPayload,
} from "./types";
import { apiFetch } from "./client";
import { GITHUB_CLIENT_ID, GITHUB_SCOPES, USE_MOCK_API } from "./config";

const MOCK_AUTH_DELAY = 1000;
const GITHUB_OAUTH_STATE_KEY = "devramp-github-oauth";

type GithubOAuthMode = "login" | "connect";

function persistAuth(response: AuthResponse, providerOverride?: "password" | "github") {
  if (providerOverride && response.user.authProvider !== providerOverride) {
    response = { ...response, user: { ...response.user, authProvider: providerOverride } };
  }
  localStorage.setItem("devramp-auth", JSON.stringify(response));
  localStorage.setItem("devramp-access-token", response.accessToken);
  // githubUrl is only set once a GitHub account is linked, including password users who connected GitHub
  if (response.user.authProvider === "github" || response.user.githubUrl) {
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

  return startGithubOAuth("connect");
}

export async function githubAuth() {
  if (USE_MOCK_API) return mockGithubAuth();
  return startGithubOAuth("login");
}

/**
 * Redirects the browser to GitHub's consent screen. GitHub sends the user back to
 * /auth/github/callback, where completeGithubOAuth finishes the flow. The returned
 * promise never resolves because the page unloads.
 */
function startGithubOAuth(mode: GithubOAuthMode): Promise<never> {
  if (!GITHUB_CLIENT_ID) {
    return Promise.reject(new Error("GitHub sign-in is not configured (VITE_GITHUB_CLIENT_ID)."));
  }

  // Random state ties the callback to this browser tab and blocks login CSRF
  const state = crypto.randomUUID();
  sessionStorage.setItem(GITHUB_OAUTH_STATE_KEY, JSON.stringify({ state, mode }));

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/github/callback`,
    scope: GITHUB_SCOPES,
    state,
    allow_signup: "true",
  });
  window.location.assign(`https://github.com/login/oauth/authorize?${params}`);
  return new Promise<never>(() => {});
}

// OAuth codes are single-use; React StrictMode runs effects twice in development
const pendingGithubCallbacks = new Map<string, Promise<GithubOAuthMode>>();

/** Exchanges the callback `code` with the backend. Resolves to the mode the flow was started in. */
export function completeGithubOAuth(code: string, state: string): Promise<GithubOAuthMode> {
  const pending = pendingGithubCallbacks.get(code);
  if (pending) return pending;

  const promise = (async () => {
    const stored = sessionStorage.getItem(GITHUB_OAUTH_STATE_KEY);
    sessionStorage.removeItem(GITHUB_OAUTH_STATE_KEY);

    let expected: { state: string; mode: GithubOAuthMode } | null = null;
    try {
      expected = stored ? JSON.parse(stored) : null;
    } catch {
      expected = null;
    }
    if (!expected || expected.state !== state) {
      throw new Error("GitHub sign-in could not be verified. Please try again.");
    }

    const path = expected.mode === "connect" ? "/api/auth/github/connect" : "/api/auth/github";
    const response = await apiFetch<AuthResponse>(path, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    persistAuth(response, "github");
    return expected.mode;
  })();

  pendingGithubCallbacks.set(code, promise);
  return promise;
}
