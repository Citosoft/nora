import assert from "node:assert/strict";
import test from "node:test";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkGfm from "remark-gfm";
import type { Element, Root } from "hast";
import { markdownHtmlPlugins } from "@/components/app/logic/markdownHtml";

function parseMarkdown(markdown: string): Root {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(markdownHtmlPlugins);
  return processor.runSync(processor.parse(markdown));
}

function elements(tree: Root | Element): Element[] {
  return tree.children.flatMap((child) => child.type === "element" ? [child, ...elements(child)] : []);
}

test("parses linked picture badges with theme sources and an image fallback", () => {
  const nodes = elements(parseMarkdown('<a href="https://vercel.com/request-review"><picture><source media="(prefers-color-scheme: dark)" srcset="https://example.com/dark.svg"><source media="(prefers-color-scheme: light)" srcset="https://example.com/light.svg"><img src="https://example.com/light.svg" alt="Request Review"></picture></a>'));
  assert.deepEqual(nodes.map((node) => node.tagName), ["p", "a", "picture", "source", "source", "img"]);
  assert.equal(nodes.find((node) => node.tagName === "a")?.properties.href, "https://vercel.com/request-review");
  assert.deepEqual(nodes.filter((node) => node.tagName === "source").map((node) => node.properties), [
    { media: "(prefers-color-scheme: dark)", srcSet: "https://example.com/dark.svg" },
    { media: "(prefers-color-scheme: light)", srcSet: "https://example.com/light.svg" }
  ]);
  assert.equal(nodes.at(-1)?.properties.alt, "Request Review");
});

test("strips executable HTML, event handlers, styles, and unsafe URLs", () => {
  const tree = parseMarkdown('<script>alert(1)</script>\n\n<iframe src="https://example.com"></iframe><a href="javascript:alert(1)" onclick="alert(1)">link</a><img src="file:///private/image.png" onerror="alert(1)" style="display:none"><picture><source srcset="javascript:alert(1)"></picture>');
  const nodes = elements(tree);
  assert.ok(nodes.every((node) => !["script", "iframe"].includes(node.tagName)));
  for (const node of nodes) {
    assert.equal(node.properties.onClick, undefined);
    assert.equal(node.properties.onError, undefined);
    assert.equal(node.properties.style, undefined);
    assert.equal(node.properties.href, undefined);
    assert.equal(node.properties.src, undefined);
    assert.equal(node.properties.srcSet, undefined);
  }
  assert.ok(!JSON.stringify(tree).includes("alert(1)"));
});

test("keeps HTML code examples literal and preserves GFM tables and task lists", () => {
  const nodes = elements(parseMarkdown('`<img src="example.png">`\n\n```html\n<script>example()</script>\n```\n\n| Name | Status |\n| --- | --- |\n| Preview | Ready |\n\n- [x] Deployed'));
  assert.ok(!nodes.some((node) => ["img", "script"].includes(node.tagName)));
  assert.ok(nodes.some((node) => node.tagName === "table"));
  const checkbox = nodes.find((node) => node.tagName === "input");
  assert.equal(checkbox?.properties.checked, true);
  assert.equal(checkbox?.properties.disabled, true);
  assert.equal(nodes.filter((node) => node.tagName === "code").length, 2);
});
