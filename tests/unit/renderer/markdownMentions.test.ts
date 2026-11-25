import assert from "node:assert/strict";
import test from "node:test";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import type { ElementContent } from "hast";
import { markdownMentions } from "@/components/app/logic/markdownMentions";

test("thread markdown marks known bot mentions without changing links, code or email addresses", () => {
  const processor = unified().use(remarkParse).use(remarkRehype)
    .use(markdownMentions([{ id: "ada", name: "Ada", icon: null }]));
  const tree = processor.runSync(processor.parse("Ask @ADA. Email person@Ada.example or see [@Ada](https://example.com) and `@Ada`."));
  const paragraph = tree.children[0];
  assert.equal(paragraph.type, "element");
  if (paragraph.type !== "element") return;
  const elements = paragraph.children.filter((child): child is Extract<ElementContent, { type: "element" }> => child.type === "element");
  assert.deepEqual(elements.map((element) => element.tagName), ["span", "a", "code"]);
  assert.equal(elements[0].properties.dataBotMention, "ada");
});
