import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function SetupView({
  cmd,
  comment,
}: {
  cmd: string;
  comment?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group flex items-center gap-3 py-2 px-3 rounded-md bg-[#0D1117] border border-white/[0.06] hover:border-indigo-500/30 transition-all">
      <span className="text-indigo-400 font-mono text-xs select-none">$</span>
      <span className="font-mono text-xs text-slate-300 flex-1">{cmd}</span>
      {comment && (
        <span className="text-[10px] text-slate-600 font-mono hidden group-hover:block">
          # {comment}
        </span>
      )}
      <button
        onClick={() => {
          navigator.clipboard.writeText(cmd);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
        )}
      </button>
    </div>
  );
}
