import type { NativeReasoningProps } from "@/components/app/types/nativeActivity.types";

/** One collapsible block for consecutive reasoning, keeping each segment's text separate. */
export function NativeReasoning({ items }: NativeReasoningProps) {
  return <details className="text-sm text-muted-foreground">
    <summary>Reasoning</summary>
    <div className="mt-2 space-y-3">{items.map((item) => <pre key={item.id} className="whitespace-pre-wrap">{item.text}</pre>)}</div>
  </details>;
}
