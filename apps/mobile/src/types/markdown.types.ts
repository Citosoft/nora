/** A deliberately small Markdown subset rendered with native text: no raw HTML, no images, only http(s)/mailto links. */
export type InlineNode =
  | { kind: "text"; text: string }
  | { kind: "strong"; children: InlineNode[] }
  | { kind: "emphasis"; children: InlineNode[] }
  | { kind: "code"; text: string }
  | { kind: "link"; href: string; children: InlineNode[] };

export type MarkdownBlock =
  | { kind: "heading"; level: number; inline: InlineNode[] }
  | { kind: "paragraph"; inline: InlineNode[] }
  | { kind: "code"; language: string | null; text: string }
  | { kind: "list"; ordered: boolean; start: number; items: InlineNode[][] }
  | { kind: "quote"; inline: InlineNode[] }
  | { kind: "table"; header: InlineNode[][]; rows: InlineNode[][][] }
  | { kind: "rule" };
