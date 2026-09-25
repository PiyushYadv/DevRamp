import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ChatMessage } from "../../../lib/api/types";
import { getChatHistory, mockChat } from "../../../lib/api/chat";
import { INITIAL_MESSAGES } from "../data/mockChat";

export function useChat(repoId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const history = useQuery({
    queryKey: ["chat-history", repoId],
    queryFn: () => getChatHistory(repoId!),
    enabled: Boolean(repoId),
    initialData: INITIAL_MESSAGES,
  });
  useEffect(() => {
    if (history.data) setMessages(history.data);
  }, [history.data]);
  const mutation = useMutation({
    mutationFn: mockChat,
    onSuccess: (reply) => {
      setMessages((current) => [...current, reply]);
    },
  });

  const sendMessage = (query: string) => {
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: "user", content: query },
    ]);
    mutation.mutate(query);
  };

  return {
    messages,
    setMessages,
    sendMessage,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
