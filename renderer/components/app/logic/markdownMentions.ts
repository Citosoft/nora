import type { Element, ElementContent, Root } from "hast";
import type { ComposerSuggestionOption } from "@/components/app/types/composerInput.types";
import { splitMentionContent } from "./composerContent";

export function markdownMentions(mentions: readonly ComposerSuggestionOption[]) {
  const visit = (parent: Root | Element): void => {
    if (parent.type === "element" && ["a", "code", "pre"].includes(parent.tagName)) return;
    for (let index = parent.children.length - 1; index >= 0; index--) {
      const node = parent.children[index];
      if (node.type === "element") visit(node);
      if (node.type !== "text" || !node.value.includes("@")) continue;
      const parts = splitMentionContent(node.value, mentions);
      if (!parts.some((part) => part.kind === "mention")) continue;
      parent.children.splice(index, 1, ...parts.map((part): ElementContent => part.kind === "mention"
        ? { type: "element", tagName: "span", properties: { dataBotMention: part.mention.id },
          children: [{ type: "text", value: part.source }] }
        : { type: "text", value: part.source }));
    }
  };
  return () => visit;
}
