import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { NativeTimelineProps } from "@/components/app/types/nativePanels.types";
import { NativeReview } from "./NativeReview";

export function NativeTimeline({ items }: NativeTimelineProps) {
  return <div className="space-y-5">{items.map((item) => {
    switch (item.kind) {
      case "message": return <article key={item.id} aria-label={`${item.role} message`}
        className={item.role === "user" ? "ml-auto max-w-[85%] rounded-xl bg-muted px-4 py-3" : "native-prose"}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.text}</ReactMarkdown></article>;
      case "reasoning": return <details key={item.id} className="text-sm text-muted-foreground"><summary>Reasoning</summary><pre className="mt-2 whitespace-pre-wrap">{item.text}</pre></details>;
      case "tool": return <details key={item.id} open={item.state === "failed"} className="rounded-lg border p-3 text-sm"><summary>{item.label} · {item.state}</summary><pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap">{item.output}</pre></details>;
      case "milestone": return <p key={item.id} className="text-sm text-muted-foreground">{item.text}</p>;
      case "plan": return <ol key={item.id} className="space-y-2 text-sm">{item.steps.map((step, index) => <li key={index}>{step.state} · {step.text}</li>)}</ol>;
      case "changes": return <details key={item.id} className="text-sm"><summary>{item.paths.length} reported file changes · {item.attribution} scope</summary><ul>{item.paths.map((path) => <li key={path}>{path}</li>)}</ul></details>;
      case "subagent": return <p key={item.id} className="text-sm">{item.label} · {item.state}</p>;
      case "review": return <NativeReview key={item.id} result={item.result} />;
    }
  })}</div>;
}
