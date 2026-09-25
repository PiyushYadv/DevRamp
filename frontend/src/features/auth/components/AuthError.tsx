import { AlertCircle } from "lucide-react";

export function AuthError({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-xs">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {message}
    </div>
  );
}
