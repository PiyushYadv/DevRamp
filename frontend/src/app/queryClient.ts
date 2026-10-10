import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "../lib/api/client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Client errors (401/403/404/422) won't succeed on retry; only retry network and server failures once
      retry: (failureCount, error) =>
        failureCount < 1 && !(error instanceof ApiError && error.status < 500),
    },
  },
});
