import { useEffect, useState } from "react";
import { Github, LockKeyhole, X } from "lucide-react";
import { connectGithub } from "../../../../lib/api/auth";

interface GitHubConnectModalProps {
  open: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

export function GitHubConnectModal({ open, onClose, onConnected }: GitHubConnectModalProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      setConnecting(false);
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !connecting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, connecting, onClose]);

  if (!open) return null;

  const handleConnect = async () => {
    setError("");
    setConnecting(true);
    try {
      await connectGithub();
      onConnected?.();
      onClose();
    } catch {
      setError("Unable to connect GitHub right now. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !connecting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="github-connect-title"
        className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#111827] shadow-2xl shadow-black/60 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
              <Github className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="github-connect-title" className="text-sm font-semibold text-white">
                Connect GitHub
              </h2>
              <p className="text-[11px] text-slate-500">Required to access your repositories</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={connecting}
            aria-label="Close"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] p-4 mb-5">
            <div className="flex gap-3">
              <LockKeyhole className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-slate-200 mb-1">Repository access</p>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  DevRamp needs GitHub authorization before it can list repositories you can connect. Your repository list will be limited to what your GitHub authorization allows.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 mb-4">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={connecting}
              className="px-3.5 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors disabled:opacity-60"
            >
              {connecting ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Github className="w-3.5 h-3.5" />
              )}
              {connecting ? "Connecting..." : "Continue with GitHub"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
