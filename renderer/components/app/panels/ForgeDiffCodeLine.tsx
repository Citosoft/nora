import { tokenizeForgeDiffCode } from "@/components/app/logic/forgeDiffSyntaxHighlight";
import { diffTextClass } from "@/components/app/logic/diffLineStyles";
import type { DiffLineTone } from "@/components/app/types/diffLine.types";
import type { ForgeDiffCodeLineProps } from "@/components/app/types/forgeDiffCodeLine.types";
import type { ForgeDiffSyntaxTokenKind } from "@/components/app/types/forgeDiffSyntaxHighlight.types";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

function getDiffCodeContent(text: string, tone: DiffLineTone): string {
  return tone === "addition" || tone === "deletion" || tone === "context" ? text.slice(1) || " " : text || " ";
}

const MARKERS: Partial<Record<DiffLineTone, string>> = { addition: "+", deletion: "-", context: " " };

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

export function ForgeDiffCodeLine({ text, tone, languageId, resolvedTheme }: ForgeDiffCodeLineProps) {
  const marker = MARKERS[tone];
  const content = getDiffCodeContent(text, tone);
  const tokens = useMemo(() => (marker === undefined ? [] : tokenizeForgeDiffCode(content, languageId)), [content, marker, languageId]);

  if (marker === undefined) {
    return <span className={diffTextClass(tone)}>{content}</span>;
  }

  return (
    <span className="grid min-w-0 grid-cols-[1.25rem_minmax(0,1fr)]">
      <span className={cn("select-none font-semibold", tone === "context" ? "text-muted-foreground/70" : diffTextClass(tone))} aria-hidden>
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
