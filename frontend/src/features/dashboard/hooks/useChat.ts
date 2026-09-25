import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ChatContext, ChatMessage, Citation } from "../../../lib/api/types";
import { getChatHistory, streamChat } from "../../../lib/api/chat";
import { INITIAL_MESSAGES } from "../data/mockChat";

export function useChat(repoId: string | null, filePath: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const history = useQuery({
    queryKey: ["chat-history", repoId],
    queryFn: () => getChatHistory(repoId!),
    enabled: Boolean(repoId),
    initialData: INITIAL_MESSAGES,
  });

  useEffect(() => {
    if (history.data) setMessages(history.data);
  }, [history.data]);

  const sendMessage = async (query: string) => {
    if (!repoId || isLoading) return;

    setError(null);
    setIsLoading(true);

    const context: ChatContext = {
      repoId,
      ...(filePath ? { filePath } : {}),
    };

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
    };

    const assistantId = `assistant-${Date.now()}`;
    setMessages((current) => [...current, userMessage, {
      id: assistantId,
      role: "assistant",
      content: "",
      citations: [],
    }]);

    try {
      const citations: Citation[] = [];
      await streamChat(query, context, {
        onToken: (text) => {
          setMessages((current) => current.map((message) =>
            message.id === assistantId
              ? { ...message, content: message.content + text }
              : message,
          ));
        },
        onCitation: (citation) => {
          citations.push(citation);
          setMessages((current) => current.map((message) =>
            message.id === assistantId
              ? { ...message, citations: [...citations] }
              : message,
          ));
        },
      });
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error("Unable to get a response.");
      setError(nextError);
      setMessages((current) => current.filter((message) => message.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  };

  return { messages, setMessages, sendMessage, isLoading, error };
}
