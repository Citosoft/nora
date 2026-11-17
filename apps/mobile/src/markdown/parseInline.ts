import type { InlineNode } from "@/types/markdown.types";

const inlinePattern = new RegExp([
  "(`+)([^`]|[^`][\\s\\S]*?[^`])\\1(?!`)",
  "\\[([^\\]\\n]+)\\]\\(((?:[^()\\s]|\\([^()\\s]*\\))+)(?:\\s+\"[^\"]*\")?\\)",
  "\\*\\*(?=\\S)([\\s\\S]*?\\S)\\*\\*",
  "__(?=\\S)([\\s\\S]*?\\S)__",
  "\\*(?=[^\\s*])([^*\\n]*?[^\\s*])\\*",
  "(https?:\\/\\/[^\\s<>()]+[^\\s<>().,;:!?'\"])"
].join("|"), "g");

const safeSchemes = /^(https?:|mailto:)/i;

export function isSafeHref(href: string): boolean {
  return safeSchemes.test(href.trim());
}

/** Parses inline emphasis, code, links and bare URLs. Unsafe link targets keep their text but lose the link. */
export function parseInline(source: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let index = 0;
  const pushText = (text: string): void => {
    if (!text) return;
    const last = nodes.at(-1);
    if (last?.kind === "text") nodes[nodes.length - 1] = { kind: "text", text: last.text + text };
    else nodes.push({ kind: "text", text });
  };
  for (const match of source.matchAll(inlinePattern)) {
    const start = match.index;
    pushText(source.slice(index, start));
    index = start + match[0].length;
    const [, , code, linkText, href, strongStar, strongUnderscore, emphasis, url] = match;
    if (code !== undefined) nodes.push({ kind: "code", text: code.trim() === "" ? code : code.replace(/^ (.*) $/s, "$1") });
    else if (linkText !== undefined && href !== undefined) {
      if (isSafeHref(href)) nodes.push({ kind: "link", href, children: parseInline(linkText) });
      else nodes.push(...parseInline(linkText));
    } else if (strongStar !== undefined || strongUnderscore !== undefined) nodes.push({ kind: "strong", children: parseInline(strongStar ?? strongUnderscore ?? "") });
    else if (emphasis !== undefined) nodes.push({ kind: "emphasis", children: parseInline(emphasis) });
    else if (url !== undefined) nodes.push({ kind: "link", href: url, children: [{ kind: "text", text: url }] });
  }
  pushText(source.slice(index));
  return nodes;
}
