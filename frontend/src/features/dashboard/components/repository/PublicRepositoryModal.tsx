import { useState } from "react";
import { Github, Link, Loader2, X } from "lucide-react";

interface PublicRepositoryModalProps {
  open: boolean;
  onClose: () => void;
  onConnect: (url: string) => Promise<void>;
}

export function PublicRepositoryModal({ open, onClose, onConnect }: PublicRepositoryModalProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const submit = async () => {
    const value = url.trim();
    setError("");
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(value)) {
      setError("Enter a valid public GitHub repository URL.");
      return;
    }
    try {
      setLoading(true);
      await onConnect(value);
      setUrl("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to connect repository.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-xl border border-white/[0.1] bg-[#111827] p-5 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Github className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white">Connect public repository</h2>
            </div>
            <p className="text-xs text-slate-500">No GitHub account connection is required.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/[0.05]"><X className="w-4 h-4" /></button>
        </div>

        <label className="block text-[11px] text-slate-400 mb-2">Repository URL</label>
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3">
          <Link className="w-3.5 h-3.5 text-slate-600" />
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="https://github.com/owner/repository"
            className="w-full bg-transparent py-2.5 text-xs text-white outline-none placeholder:text-slate-700"
          />
        </div>
        {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-md text-xs text-slate-400 hover:text-white hover:bg-white/[0.05]">Cancel</button>
          <button onClick={submit} disabled={loading} className="flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-medium text-white">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Github className="w-3.5 h-3.5" />}
            {loading ? "Connecting..." : "Connect repository"}
          </button>
        </div>
      </div>
    </div>
  );
}
