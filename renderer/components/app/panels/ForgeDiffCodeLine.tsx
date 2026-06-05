import { tokenizeForgeDiffCode } from "@/components/app/logic/forgeDiffSyntaxHighlight";
import type { ForgeDiffCodeLineKind, ForgeDiffCodeLineProps } from "@/components/app/types/forgeDiffCodeLine.types";
import type { ForgeDiffSyntaxTokenKind } from "@/components/app/types/forgeDiffSyntaxHighlight.types";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

function getDiffCodeLineKind(text: string): ForgeDiffCodeLineKind {
  if (text.startsWith("+") && !text.startsWith("+++")) {
    return "added";
  }
  if (text.startsWith("-") && !text.startsWith("---")) {
    return "deleted";
  }
  if (text.startsWith(" ")) {
    return "context";
  }
  return "meta";
}

function getDiffCodeContent(text: string, kind: ForgeDiffCodeLineKind): string {
  if (kind === "added" || kind === "deleted" || kind === "context") {
    return text.slice(1) || " ";
  }
  return text || " ";
}

function getDiffMarker(text: string, kind: ForgeDiffCodeLineKind): string {
  if (kind === "added") {
    return "+";
  }
  if (kind === "deleted") {
    return "-";
  }
  if (kind === "context") {
    return " ";
  }
  return text.startsWith("@@") ? "@@" : " ";
}

function getTokenClassName(tokenKind: ForgeDiffSyntaxTokenKind, resolvedTheme: ForgeDiffCodeLineProps["resolvedTheme"]): string {
  if (tokenKind === "comment") {
    return "text-muted-foreground italic";
  }
  if (tokenKind === "string") {
    return resolvedTheme === "dark" ? "text-emerald-300" : "text-emerald-700";
  }
  if (tokenKind === "keyword") {
    return resolvedTheme === "dark" ? "text-sky-300" : "text-blue-700";
  }
  if (tokenKind === "number") {
    return resolvedTheme === "dark" ? "text-amber-300" : "text-amber-700";
  }
  if (tokenKind === "type") {
    return resolvedTheme === "dark" ? "text-violet-300" : "text-violet-700";
  }
  if (tokenKind === "property") {
    return resolvedTheme === "dark" ? "text-cyan-300" : "text-cyan-700";
  }
  if (tokenKind === "punctuation") {
    return "text-muted-foreground";
  }
  return "";
}

export function ForgeDiffCodeLine({ text, languageId, resolvedTheme }: ForgeDiffCodeLineProps) {
  const kind = useMemo(() => getDiffCodeLineKind(text), [text]);
  const marker = useMemo(() => getDiffMarker(text, kind), [kind, text]);
  const content = useMemo(() => getDiffCodeContent(text, kind), [kind, text]);
  const tokens = useMemo(
    () => (kind === "meta" ? [{ text: content, kind: "plain" as const }] : tokenizeForgeDiffCode(content, languageId)),
    [content, kind, languageId]
  );

  if (kind === "meta") {
    return <span className="text-muted-foreground">{content}</span>;
  }

  return (
    <span className="grid min-w-0 grid-cols-[1.25rem_minmax(0,1fr)]">
      <span
        className={cn(
          "select-none font-semibold",
          kind === "added" ? "text-emerald-600 dark:text-emerald-300" : null,
          kind === "deleted" ? "text-red-600 dark:text-red-300" : null,
          kind === "context" ? "text-muted-foreground/70" : null
        )}
        aria-hidden
      >
        {marker}
      </span>
      <span className="min-w-0">
        {tokens.map((token, index) => (
          <span key={`${index}-${token.kind}`} className={getTokenClassName(token.kind, resolvedTheme)}>
            {token.text}
          </span>
        ))}
      </span>
    </span>
  );
}
