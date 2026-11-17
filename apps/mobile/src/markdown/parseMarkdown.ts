import type { MarkdownBlock } from "@/types/markdown.types";
import { parseInline } from "./parseInline";

const fencePattern = /^\s{0,3}(`{3,}|~{3,})\s*([\w+-]*)/;
const headingPattern = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const rulePattern = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/;
const listPattern = /^(\s*)([-*+]|(\d{1,9})[.)])\s+(.*)$/;
const quotePattern = /^\s{0,3}>\s?(.*)$/;
const tableSeparatorPattern = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

/** Parses the Markdown subset agents commonly write. Anything unrecognised (including HTML) stays literal text. */
export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  const flushParagraph = (): void => {
    if (paragraph.length) blocks.push({ kind: "paragraph", inline: parseInline(paragraph.join("\n")) });
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const fence = fencePattern.exec(line);
    if (fence?.[1]) {
      flushParagraph();
      const marker = fence[1];
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").trim().startsWith(marker)) {
        body.push(lines[index] ?? "");
        index += 1;
      }
      blocks.push({ kind: "code", language: fence[2] || null, text: body.join("\n") });
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    const heading = headingPattern.exec(line);
    if (heading?.[1]) {
      flushParagraph();
      blocks.push({ kind: "heading", level: heading[1].length, inline: parseInline(heading[2] ?? "") });
      continue;
    }
    if (rulePattern.test(line)) {
      flushParagraph();
      blocks.push({ kind: "rule" });
      continue;
    }
    const next = lines[index + 1] ?? "";
    if (line.includes("|") && tableSeparatorPattern.test(next)) {
      flushParagraph();
      const header = splitRow(line).map(parseInline);
      const rows: ReturnType<typeof parseInline>[][] = [];
      index += 2;
      while (index < lines.length && (lines[index] ?? "").includes("|") && (lines[index] ?? "").trim()) {
        rows.push(splitRow(lines[index] ?? "").map(parseInline));
        index += 1;
      }
      index -= 1;
      blocks.push({ kind: "table", header, rows });
      continue;
    }
    const listItem = listPattern.exec(line);
    if (listItem) {
      flushParagraph();
      const ordered = listItem[3] !== undefined;
      const start = ordered ? Number(listItem[3]) : 1;
      const items: string[] = [listItem[4] ?? ""];
      while (index + 1 < lines.length) {
        const following = lines[index + 1] ?? "";
        const nextItem = listPattern.exec(following);
        if (nextItem && (nextItem[3] !== undefined) === ordered) {
          items.push(nextItem[4] ?? "");
        } else if (following.trim() && /^\s+/.test(following) && !nextItem) {
          items[items.length - 1] += `\n${following.trim()}`;
        } else if (nextItem) {
          // A nested or differently-marked list continues as indented text of the current item.
          items[items.length - 1] += `\n• ${nextItem[4] ?? ""}`;
        } else break;
        index += 1;
      }
      blocks.push({ kind: "list", ordered, start, items: items.map(parseInline) });
      continue;
    }
    const quote = quotePattern.exec(line);
    if (quote) {
      flushParagraph();
      const quoted: string[] = [quote[1] ?? ""];
      while (index + 1 < lines.length) {
        const following = quotePattern.exec(lines[index + 1] ?? "");
        if (!following) break;
        quoted.push(following[1] ?? "");
        index += 1;
      }
      blocks.push({ kind: "quote", inline: parseInline(quoted.join("\n")) });
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  return blocks;
}
