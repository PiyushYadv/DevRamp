import { tokenize } from "../../../../utils/tokenize";
import { CLRS } from "../../constants/workspace";

export function CodeLine({
  line,
  num,
  highlight,
}: {
  line: string;
  num: number;
  highlight?: boolean;
}) {
  const tokens = tokenize(line);
  return (
    <div
      className={`flex group min-w-0 ${highlight ? "bg-indigo-500/[0.07] border-l-2 border-indigo-500" : "border-l-2 border-transparent hover:bg-white/[0.02]"}`}
    >
      <span className="w-11 text-right pr-4 py-0.5 text-[11px] font-mono text-slate-700 select-none shrink-0 group-hover:text-slate-500">
        {num}
      </span>
      <span className="font-mono text-[12px] leading-6 py-0.5 whitespace-pre">
        {tokens.map((t, i) => (
          <span key={i} style={{ color: CLRS[t.type] }}>
            {t.text}
          </span>
        ))}
      </span>
    </div>
  );
}
