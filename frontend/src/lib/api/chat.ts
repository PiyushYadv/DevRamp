import { MOCK_CHAT_REPLY, INITIAL_MESSAGES } from "../../features/dashboard/data/mockChat";
import type { ChatContext, ChatMessage, Citation } from "./types";
import { apiFetch } from "./client";
import { USE_MOCK_API } from "./config";

export async function mockChat(_query: string): Promise<ChatMessage> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  return { ...MOCK_CHAT_REPLY, id: `assistant-${Date.now()}` };
}

export function getChatHistory(repoId: string) {
  if (USE_MOCK_API) return Promise.resolve(INITIAL_MESSAGES);
  return apiFetch<ChatMessage[]>(`/api/repository/${encodeURIComponent(repoId)}/chat/history`);
}

interface StreamHandlers {
  onToken: (text: string) => void;
  onCitation: (citation: Citation) => void;
  onDone?: (messageId?: string) => void;
}

export async function streamChat(
  query: string,
  context: ChatContext,
  handlers: StreamHandlers,
) {
  if (USE_MOCK_API) {
    const reply = await mockChat(query);
    handlers.onToken(reply.content);
    reply.citations?.forEach(handlers.onCitation);
    handlers.onDone?.(reply.id);
    return;
  }

  const token = localStorage.getItem("devramp-access-token");
  const response = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/chat/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ repoId: context.repoId, query, context }),
  });

  if (!response.ok || !response.body) {
    throw new Error((await response.text()) || `Chat request failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handleEvent = (raw: string) => {
    let event = "message";
    let data = "";

    for (const line of raw.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      if (line.startsWith("data:")) data += line.slice(5).trim();
    }

    if (!data) return;

    let payload: any;
    try {
      payload = JSON.parse(data);
    } catch {
      payload = { text: data };
    }

    if (event === "token") handlers.onToken(payload.text ?? payload.delta ?? "");
    if (event === "citation" && payload.file) handlers.onCitation(payload);
    if (event === "done") handlers.onDone?.(payload.messageId);
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    events.filter(Boolean).forEach(handleEvent);

    if (done) break;
  }

  if (buffer.trim()) handleEvent(buffer);
}
