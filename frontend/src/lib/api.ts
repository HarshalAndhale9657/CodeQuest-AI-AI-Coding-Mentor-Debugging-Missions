import type {
  AiStatus,
  ArenaAttack,
  ArenaResult,
  ChallengeDetail,
  ChallengeSummary,
  HintResponse,
  ImportPlatform,
  Me,
  Portfolio,
  ProfileInput,
  ProfileView,
  Roadmap,
  SubmissionView,
  TypingDrills,
  TypingRunInput,
  TypingRunResult,
} from "./types";

const TOKEN_KEY = "codequest.token";
const NAME_KEY = "codequest.name";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null; // private mode or blocked storage
  }
}

export function getToken(): string | null {
  return safeStorage()?.getItem(TOKEN_KEY) ?? null;
}

export function getName(): string | null {
  return safeStorage()?.getItem(NAME_KEY) ?? null;
}

export function clearSession(): void {
  safeStorage()?.removeItem(TOKEN_KEY);
  safeStorage()?.removeItem(NAME_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Can't reach the CodeQuest server. Check your connection and try again.");
  }
  const text = await response.text();
  let body: Record<string, unknown> = {};
  if (text) {
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new ApiError(response.status, "The server sent an unexpected response.");
    }
  }
  if (!response.ok) {
    if (response.status === 401) clearSession();
    const detail = typeof body.error === "string" ? body.error : `Request failed (${response.status}).`;
    throw new ApiError(response.status, detail, body);
  }
  return body as T;
}

/** Keeps the cached display name in step after the learner renames themselves. */
export function setStoredName(name: string): void {
  safeStorage()?.setItem(NAME_KEY, name);
}

export async function startSession(persona: "priya" | "guest", name?: string): Promise<void> {
  const body = await request<{ token: string; user: { name: string } }>("/api/session", {
    method: "POST",
    body: JSON.stringify({ persona, name }),
  });
  safeStorage()?.setItem(TOKEN_KEY, body.token);
  safeStorage()?.setItem(NAME_KEY, body.user.name);
}

export const api = {
  health: () => request<{ status: string; runner: string; sandboxed: boolean; missions: number }>("/api/health"),
  challenges: () => request<ChallengeSummary[]>("/api/challenges"),
  challenge: (id: string) => request<ChallengeDetail>(`/api/challenges/${encodeURIComponent(id)}`),
  submit: (challengeId: string, code: string) =>
    request<{ submission_id: string; status: string; hidden_test_count: number; visible_test_count: number }>(
      "/api/submissions",
      { method: "POST", body: JSON.stringify({ challenge_id: challengeId, code }) },
    ),
  submission: (id: string) => request<SubmissionView>(`/api/submissions/${encodeURIComponent(id)}`),
  hint: (challengeId: string) =>
    request<HintResponse>(`/api/challenges/${encodeURIComponent(challengeId)}/hint`, { method: "POST" }),
  me: () => request<Me>("/api/me"),
  extensionPairingCode: () =>
    request<{ code: string; expires_in_s: number }>("/api/ext/pairing-code", { method: "POST" }),
  portfolio: (handle: string) => request<Portfolio>(`/api/portfolio/${encodeURIComponent(handle)}`),
  requestImport: (platform: ImportPlatform, handle: string) =>
    request<{ status: "queued" | "cached" }>("/api/imports", {
      method: "POST",
      body: JSON.stringify({ platform, handle }),
    }),
  aiStatus: () => request<AiStatus>("/api/settings/ai"),
  setAi: (enabled: boolean) =>
    request<AiStatus>("/api/settings/ai", { method: "POST", body: JSON.stringify({ enabled }) }),
  profile: () => request<ProfileView>("/api/me/profile"),
  updateProfile: (input: ProfileInput) =>
    request<ProfileView>("/api/me/profile", { method: "PUT", body: JSON.stringify(input) }),
  roadmap: () => request<Roadmap>("/api/me/roadmap"),
  replan: (useAi: boolean) =>
    request<Roadmap>("/api/me/roadmap", { method: "POST", body: JSON.stringify({ use_ai: useAi }) }),
  markRoadmapItem: (itemId: string, done: boolean) =>
    request<Roadmap>("/api/me/roadmap/items", { method: "POST", body: JSON.stringify({ item_id: itemId, done }) }),
  typingDrills: () => request<TypingDrills>("/api/typing/drills"),
  postTypingRun: (input: TypingRunInput) =>
    request<TypingRunResult>("/api/typing/results", { method: "POST", body: JSON.stringify(input) }),
  exportData: () => request<Record<string, unknown>>("/api/me/export"),
  deleteAccount: () => request<{ deleted: boolean }>("/api/me", { method: "DELETE" }),
  attacks: () => request<ArenaAttack[]>("/api/arena/attacks"),
  runAttack: (index: number) =>
    request<ArenaResult>("/api/arena/run", { method: "POST", body: JSON.stringify({ index }) }),
};
