import { splitComposerContent, snapComposerOffset } from "./composerContent";
import type { ComposerSuggestionOption } from "@/components/app/types/composerInput.types";
import type { ComposerPillHost } from "@/components/app/types/composerEditor.types";

const REFERENCE_ATTRIBUTE = "data-composer-source";

export function readComposerText(root: Node): string {
  if (root.nodeType === Node.TEXT_NODE) return root.textContent ?? "";
  if (root instanceof HTMLElement) {
    if (root.hasAttribute("data-composer-tail")) return "";
    const reference = root.getAttribute(REFERENCE_ATTRIBUTE);
    if (reference !== null) return reference;
    if (root.tagName === "BR") return "\n";
  }
  if (root.childNodes.length === 1 && root.firstChild instanceof HTMLElement && root.firstChild.tagName === "BR") return "";
  let text = "";
  let index = 0;
  for (const child of Array.from(root.childNodes)) {
    if (child instanceof HTMLElement && /^(DIV|P)$/.test(child.tagName) && index > 0) text += "\n";
    index++;
    text += readComposerText(child);
  }
  return text;
}

export function readComposerCaret(root: HTMLElement): number {
  const selection = root.ownerDocument.getSelection();
  if (!selection?.focusNode || !root.contains(selection.focusNode)) return readComposerText(root).length;
  const prefix = root.ownerDocument.createRange();
  prefix.selectNodeContents(root);
  prefix.setEnd(selection.focusNode, selection.focusOffset);
  return readComposerText(prefix.cloneContents()).length;
}

export function setComposerSelection(root: HTMLElement, start: number, end: number, mentions: readonly ComposerSuggestionOption[] = []): void {
  const text = readComposerText(root);
  const from = snapComposerOffset(text, start, mentions), to = snapComposerOffset(text, end, mentions);
  const range = root.ownerDocument.createRange();
  const locate = (target: number, isEnd: boolean): void => {
    let offset = 0;
    const visit = (parent: Node): boolean => {
      for (let index = 0; index < parent.childNodes.length; index++) {
        const node = parent.childNodes[index];
        const length = readComposerText(node).length;
        if (target <= offset + length) {
          if (node.nodeType === Node.TEXT_NODE) {
            if (isEnd) range.setEnd(node, target - offset); else range.setStart(node, target - offset);
          } else if (node instanceof HTMLElement && node.hasAttribute(REFERENCE_ATTRIBUTE)) {
            const position = index + (target > offset ? 1 : 0);
            if (isEnd) range.setEnd(parent, position); else range.setStart(parent, position);
          } else if (node.childNodes.length) return visit(node);
          else { if (isEnd) range.setEnd(parent, index); else range.setStart(parent, index); }
          return true;
        }
        offset += length;
      }
      return false;
    };
    if (!visit(root)) { if (isEnd) range.setEnd(root, root.childNodes.length); else range.setStart(root, root.childNodes.length); }
  };
  locate(from, false); locate(to, true);
  const selection = root.ownerDocument.getSelection();
  selection?.removeAllRanges(); selection?.addRange(range);
}

export function writeComposerContent(root: HTMLElement, value: string, mentions: readonly ComposerSuggestionOption[] = []): ComposerPillHost[] {
  const fragment = root.ownerDocument.createDocumentFragment();
  const hosts: ComposerPillHost[] = [];
  for (const part of splitComposerContent(value, mentions)) {
    if (part.kind === "text") fragment.append(root.ownerDocument.createTextNode(part.source));
    else {
      const element = root.ownerDocument.createElement("span");
      element.contentEditable = "false";
      element.setAttribute(REFERENCE_ATTRIBUTE, part.source);
      element.className = "inline-block align-baseline select-all";
      element.setAttribute("aria-label", part.kind === "issue" ? `${part.reference.provider === "gitlab" ? "GitLab" : "GitHub"} issue #${part.reference.number}` : `Mention ${part.mention.name}`);
      fragment.append(element);
      hosts.push({ element, part });
    }
  }
  if (value.endsWith("\n")) {
    const tail = root.ownerDocument.createElement("br");
    tail.setAttribute("data-composer-tail", "");
    fragment.append(tail);
  }
  root.replaceChildren(fragment);
  return hosts;
}

/** Ordinary typing can keep its live DOM and selection when the existing reference hosts still match. */
export function composerProjectionMatches(root: HTMLElement, value: string, mentions: readonly ComposerSuggestionOption[] = []): boolean {
  if (Boolean(root.querySelector("[data-composer-tail]")) !== value.endsWith("\n")) return false;
  const expected = splitComposerContent(value, mentions).filter((part) => part.kind !== "text").map((part) => part.source);
  const actual = Array.from(root.querySelectorAll(`[${REFERENCE_ATTRIBUTE}]`)).map((element) => element.getAttribute(REFERENCE_ATTRIBUTE));
  return actual.length === expected.length && actual.every((source, index) => source === expected[index]);
}

export function replaceComposerSelection(root: HTMLElement, text: string): void {
  const selection = root.ownerDocument.getSelection();
  const selected = selection?.rangeCount ? selection.getRangeAt(0) : null;
  const range = selected && root.contains(selected.commonAncestorContainer) ? selected : root.ownerDocument.createRange();
  if (range !== selected) { range.selectNodeContents(root); range.collapse(false); }
  range.deleteContents();
  const inserted = root.ownerDocument.createTextNode(text);
  range.insertNode(inserted);
  range.setStart(inserted, text.length); range.collapse(true);
  selection?.removeAllRanges(); selection?.addRange(range);
}
