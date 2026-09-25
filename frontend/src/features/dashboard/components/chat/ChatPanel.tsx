import { useEffect, useRef, useState } from "react";
import { FileCode2, Send, X, Zap } from "lucide-react";
import { tokenize } from "../../../../utils/tokenize";
import { CLRS } from "../../constants/workspace";
import { useChat } from "../../hooks/useChat";
import { useDashboard } from "../../context/DashboardContext";

function HighlightedCode({ code }: { code: string }) {
  return (
    <pre className="p-3 text-[11px] font-mono overflow-x-auto leading-relaxed bg-[#0D1117]">
      {code.split("\n").map((line, lineIndex) => (
        <span key={lineIndex} className="block">
          {tokenize(line).map((token, tokenIndex) => (
            <span key={tokenIndex} style={{ color: CLRS[token.type] }}>
              {token.text}
            </span>
          ))}
        </span>
      ))}
    </pre>
  );
}

export function ChatPanel() {
  const { repoId, selectedFile } = useDashboard();
  const [fileContext, setFileContext] = useState<string | null>(selectedFile);
  const { messages, sendMessage, isLoading } = useChat(
    repoId || null,
    fileContext,
  );
  const [input, setInput] = useState("");
  const [width, setWidth] = useState(300);
  const [resizing, setResizing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  };

  useEffect(() => {
    setFileContext(selectedFile);
  }, [selectedFile]);

  useEffect(() => {
    if (!resizing) return;
    const handlePointerMove = (event: PointerEvent) => {
      const nextWidth = window.innerWidth - event.clientX;
      setWidth(Math.min(520, Math.max(260, nextWidth)));
    };
    const stopResizing = () => setResizing(false);
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", stopResizing);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizing]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const query = input;
    setInput("");

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    });

    sendMessage(query);
  };

  return (
    <aside
      className="relative shrink-0 flex flex-col bg-[#0D1117] border-l border-white/6"
      style={{ width }}
    >
      <button
        type="button"
        aria-label="Resize chat panel"
        title="Drag to resize"
        onPointerDown={() => setResizing(true)}
        className="absolute -left-1 top-0 bottom-0 z-10 w-2 cursor-col-resize hover:bg-indigo-500/50 transition-colors"
      />
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center">
            <Zap className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-semibold text-white">
            Ask the Codebase
          </span>
        </div>
        <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 font-mono">
          {fileContext ? "File Context" : "Full Repo"}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            {msg.role === "user" ? (
              <div className="max-w-[85%] px-3 py-2 rounded-xl rounded-tr-sm bg-indigo-600 text-white text-[11px] leading-relaxed">
                {msg.content}
              </div>
            ) : (
              <div className="w-full">
                <div
                  className="text-[11px] text-slate-300 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(
                        /`(.*?)`/g,
                        "<code style='color:#a78bfa;font-family:monospace'>$1</code>",
                      ),
                  }}
                />
                {msg.code && (
                  <div className="mt-2 rounded-md overflow-hidden border border-white/10">
                    <div className="px-3 py-1.5 bg-slate-900/80 border-b border-white/10">
                      <span className="text-[10px] font-mono text-slate-500">
                        TypeScript
                      </span>
                    </div>
                    <HighlightedCode code={msg.code} />
                  </div>
                )}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {msg.citations.map((c) => (
                      <span
                        key={c.label}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-[10px] font-mono text-indigo-300 hover:bg-indigo-500/20 cursor-pointer transition-colors"
                      >
                        <span className="text-[9px]">📄</span>
                        {c.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-white/6 shrink-0">
        <div className="flex items-end gap-2 px-3 py-2 rounded-lg border border-white/8 bg-white/3 focus-within:border-indigo-500/40 transition-colors">
          {fileContext && (
            <div className="flex items-center gap-1.5 max-w-30 mb-0.5 shrink-0 rounded-md border border-indigo-500/20 bg-indigo-500/8 px-1.5 py-1">
              <FileCode2 className="w-3 h-3 text-indigo-400 shrink-0" />
              <span
                className="text-[9px] font-mono text-indigo-300 truncate"
                title={fileContext}
              >
                {fileContext.split("/").pop()}
              </span>
              <button
                type="button"
                onClick={() => setFileContext(null)}
                aria-label="Clear current file context"
                title="Clear file context"
                className="text-indigo-400/60 hover:text-indigo-300 shrink-0"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              resizeTextarea();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about authentication, data flows, or setup..."
            rows={1}
            className="flex-1 min-h-6 max-h-40 bg-transparent text-[11px] text-slate-300 placeholder-slate-600 resize-none overflow-y-auto outline-none leading-5"
          />

          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex items-center justify-center w-7 h-7 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0 mb-0.5"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <p className="text-[9px] text-slate-700 mt-1.5 text-center font-mono">
          Powered by DevRamp AI
        </p>
      </div>
    </aside>
  );
}
