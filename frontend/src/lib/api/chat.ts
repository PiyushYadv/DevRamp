import { MOCK_CHAT_REPLY } from "../../features/dashboard/data/mockChat";
import type { ChatMessage } from "./types";
import { INITIAL_MESSAGES } from "../../features/dashboard/data/mockChat";
import { apiFetch } from "./client";
import { USE_MOCK_API } from "./config";

// Replace this implementation with POST /api/chat/stream later.
export async function mockChat(_query: string): Promise<ChatMessage> {
  return { ...MOCK_CHAT_REPLY, id: `assistant-${Date.now()}` };
}

export function getChatHistory(repoId: string) {
  if (USE_MOCK_API) return Promise.resolve(INITIAL_MESSAGES);
  return apiFetch<ChatMessage[]>(`/api/repository/${encodeURIComponent(repoId)}/chat/history`);
}
