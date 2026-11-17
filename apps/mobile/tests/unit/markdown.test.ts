import { describe, expect, it } from "vitest";
import { parseInline } from "@/markdown/parseInline";
import { parseMarkdown } from "@/markdown/parseMarkdown";

describe("markdown", () => {
  it("parses headings, lists, code fences, quotes and tables", () => {
    const blocks = parseMarkdown("# Plan\n\n1. First\n2. Second\n\n```ts\nconst x = 1;\n```\n> Note\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n---");
    expect(blocks.map((block) => block.kind)).toEqual(["heading", "list", "code", "quote", "table", "rule"]);
    expect(blocks[2]).toEqual({ kind: "code", language: "ts", text: "const x = 1;" });
    expect(blocks[1]).toMatchObject({ kind: "list", ordered: true, start: 1 });
  });

  it("keeps HTML literal and drops unsafe link targets", () => {
    expect(parseMarkdown("<script>alert(1)</script>")).toEqual([{ kind: "paragraph", inline: [{ kind: "text", text: "<script>alert(1)</script>" }] }]);
    expect(parseInline("[click](javascript:alert(1))")).toEqual([{ kind: "text", text: "click" }]);
    expect(parseInline("[docs](https://withnora.run)")).toEqual([{ kind: "link", href: "https://withnora.run", children: [{ kind: "text", text: "docs" }] }]);
  });

  it("parses emphasis, inline code and bare URLs", () => {
    expect(parseInline("**Done** with *care*: `npm test` see https://example.com.")).toEqual([
      { kind: "strong", children: [{ kind: "text", text: "Done" }] },
      { kind: "text", text: " with " },
      { kind: "emphasis", children: [{ kind: "text", text: "care" }] },
      { kind: "text", text: ": " },
      { kind: "code", text: "npm test" },
      { kind: "text", text: " see " },
      { kind: "link", href: "https://example.com", children: [{ kind: "text", text: "https://example.com" }] },
      { kind: "text", text: "." }
    ]);
  });
});
