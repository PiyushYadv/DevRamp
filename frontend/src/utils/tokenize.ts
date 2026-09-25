import { KEYWORDS } from "../features/dashboard/constants/workspace";
import type { TokenType } from "../features/dashboard/types";

export function tokenize(
  line: string,
): Array<{ text: string; type: TokenType }> {
  const out: Array<{ text: string; type: TokenType }> = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === "/" && line[i + 1] === "/") {
      out.push({ text: line.slice(i), type: "comment" });
      break;
    }
    if (line[i] === '"' || line[i] === "'") {
      const q = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== q) {
        if (line[j] === "\\") j++;
        j++;
      }
      out.push({ text: line.slice(i, j + 1), type: "string" });
      i = j + 1;
      continue;
    }
    if (line[i] === "`") {
      let j = i + 1;
      while (j < line.length && line[j] !== "`") {
        if (line[j] === "\\") j++;
        j++;
      }
      out.push({ text: line.slice(i, j + 1), type: "string" });
      i = j + 1;
      continue;
    }
    if (/[a-zA-Z_$]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++;
      const w = line.slice(i, j);
      if (KEYWORDS.has(w)) out.push({ text: w, type: "keyword" });
      else if (/^[A-Z]/.test(w)) out.push({ text: w, type: "typename" });
      else if (line[j] === "(") out.push({ text: w, type: "fn" });
      else out.push({ text: w, type: "plain" });
      i = j;
      continue;
    }
    if (/[0-9]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[0-9.]/.test(line[j])) j++;
      out.push({ text: line.slice(i, j), type: "number" });
      i = j;
      continue;
    }
    out.push({ text: line[i], type: "plain" });
    i++;
  }
  return out;
}
