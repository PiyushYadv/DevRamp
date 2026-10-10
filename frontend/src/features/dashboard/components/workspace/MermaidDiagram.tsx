import { useEffect, useId, useState } from "react";
import type { Mermaid } from "mermaid";

let mermaidLoader: Promise<Mermaid> | null = null;

// Mermaid is large; load it only when a diagram is first shown
function loadMermaid() {
  mermaidLoader ??= import("mermaid").then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
      theme: "dark",
      fontFamily: "inherit",
      themeVariables: {
        background: "transparent",
        lineColor: "#475569",
        primaryTextColor: "#e2e8f0",
        edgeLabelBackground: "#0f172a",
        fontSize: "12px",
      },
      flowchart: { curve: "basis", padding: 12, htmlLabels: true },
    });
    return mermaid;
  });
  return mermaidLoader;
}

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chart.trim()) {
      setSvg("");
      setError(null);
      return;
    }
    let cancelled = false;
    loadMermaid()
      .then((mermaid) => mermaid.render(id, chart))
      .then(({ svg: rendered }) => {
        if (cancelled) return;
        setSvg(rendered);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSvg("");
        setError(err instanceof Error ? err.message : "Could not render diagram");
      });
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) {
    return <p className="px-4 py-4 text-xs text-slate-500">Diagram unavailable: {error}</p>;
  }
  if (!svg) {
    return <p className="px-4 py-4 text-xs text-slate-500">{chart.trim() ? "Rendering diagram..." : "No topology detected."}</p>;
  }
  return (
    <div
      className="px-4 py-4 overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto"
      // Mermaid output is sanitized (securityLevel: "strict")
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
