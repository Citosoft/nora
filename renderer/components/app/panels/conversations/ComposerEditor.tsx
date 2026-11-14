import type { ClipboardEvent } from "react";
import { useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ReferencePill } from "@/components/app/shared/ReferencePill";
import { IssueReferencePill } from "@/components/app/shared/IssueReferencePill";
import { deleteComposerReference, moveComposerHistory, recordComposerHistory } from "@/components/app/logic/composerContent";
import { composerProjectionMatches, readComposerCaret, readComposerText, replaceComposerSelection, setComposerSelection, writeComposerContent } from "@/components/app/logic/composerEditorDom";
import type { ComposerEditorProps, ComposerHistory, ComposerPillHost } from "@/components/app/types/composerEditor.types";

/** Native editing owns input and IME; the serialized string owns persistence and undo history. */
export function ComposerEditor({ inputRef, value, disabled, placeholder, onValueChange, onCaretChange, onFiles, mentions, className, onKeyDown, ...props }: ComposerEditorProps) {
  const element = useRef<HTMLDivElement>(null);
  const composing = useRef(false);
  const restoreCaret = useRef<number | null>(null);
  const history = useRef<ComposerHistory>({ values: [value], index: 0 });
  const [hosts, setHosts] = useState<ComposerPillHost[]>([]);
  useImperativeHandle(inputRef, () => ({ focus: () => element.current?.focus(), setSelectionRange: (start, end) => {
    if (element.current) setComposerSelection(element.current, start, end, mentions);
  } }), [mentions]);
  useLayoutEffect(() => {
    const root = element.current;
    if (!root || composing.current) return;
    const current = readComposerText(root);
    const focused = root.ownerDocument.activeElement === root;
    const caret = restoreCaret.current ?? (focused ? readComposerCaret(root) : value.length);
    restoreCaret.current = null;
    // A sent or externally cleared draft starts a fresh history rather than restoring sent text on Undo.
    history.current = value === "" && current !== value && history.current.values[history.current.index] !== value ? { values: [value], index: 0 } : recordComposerHistory(history.current, value);
    if (current === value && composerProjectionMatches(root, value, mentions)) {
      setHosts((previous) => previous.every((host) => root.contains(host.element)) ? previous : previous.filter((host) => root.contains(host.element)));
      return;
    }
    setHosts(writeComposerContent(root, value, mentions));
    if (focused) setComposerSelection(root, caret, caret, mentions);
  }, [value, mentions]);
  const change = (): void => {
    const root = element.current;
    if (!root || composing.current) return;
    const text = readComposerText(root);
    if (text === "" && root.childNodes.length) {
      root.replaceChildren(); setHosts([]); setComposerSelection(root, 0, 0);
    }
    onValueChange(text, readComposerCaret(root));
  };
  const copy = (event: ClipboardEvent<HTMLDivElement>, cut: boolean): void => {
    const selection = event.currentTarget.ownerDocument.getSelection();
    if (!selection?.rangeCount || selection.isCollapsed) return;
    event.preventDefault();
    event.clipboardData.setData("text/plain", readComposerText(selection.getRangeAt(0).cloneContents()));
    if (cut && !disabled) { replaceComposerSelection(event.currentTarget, ""); change(); }
  };
  return <div {...props} ref={element} role="textbox" aria-multiline="true" aria-disabled={disabled} tabIndex={disabled ? -1 : 0} contentEditable={!disabled} suppressContentEditableWarning
    data-placeholder={placeholder} className={`min-h-24 max-h-72 w-full overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-transparent py-2 text-sm focus-visible:outline-none empty:before:pointer-events-none empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className ?? ""}`}
    onInput={change} onSelect={() => { if (element.current) onCaretChange(readComposerCaret(element.current)); }}
    onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; change(); }}
    onKeyDown={(event) => {
      if (disabled) { event.preventDefault(); return; }
      const selection = event.currentTarget.ownerDocument.getSelection();
      if (!composing.current && !event.nativeEvent.isComposing && event.keyCode !== 229 && !event.ctrlKey && !event.metaKey && !event.altKey && selection?.isCollapsed && (event.key === "Backspace" || event.key === "Delete")) {
        const next = deleteComposerReference(value, readComposerCaret(event.currentTarget), event.key === "Backspace" ? -1 : 1, mentions);
        if (next) { event.preventDefault(); restoreCaret.current = next.caret; onValueChange(next.text, next.caret); return; }
      }
      if (!composing.current && !event.nativeEvent.isComposing && event.keyCode !== 229 && (event.ctrlKey || event.metaKey) && !event.altKey && (event.key.toLowerCase() === "z" || event.key.toLowerCase() === "y")) {
        event.preventDefault();
        const direction = event.shiftKey || event.key.toLowerCase() === "y" ? 1 : -1;
        const next = moveComposerHistory(history.current, direction);
        if (next.index === history.current.index) return;
        history.current = next;
        const text = history.current.values[history.current.index];
        restoreCaret.current = text.length;
        onValueChange(text, text.length);
        return;
      }
      onKeyDown?.(event);
      if (!event.defaultPrevented && event.key === "Enter" && !composing.current && !event.nativeEvent.isComposing && event.keyCode !== 229) {
        event.preventDefault(); replaceComposerSelection(event.currentTarget, "\n"); change();
      }
    }}
    onCopy={(event) => copy(event, false)} onCut={(event) => copy(event, true)}
    onDrop={(event) => {
      if (event.dataTransfer.files.length) return;
      event.preventDefault();
      if (!disabled) { replaceComposerSelection(event.currentTarget, event.dataTransfer.getData("text/plain")); change(); }
    }}
    onPaste={(event) => {
      event.preventDefault();
      if (disabled) return;
      const files = Array.from(event.clipboardData.files);
      if (files.length && onFiles) { onFiles(files); return; }
      replaceComposerSelection(event.currentTarget, event.clipboardData.getData("text/plain")); change();
    }}>
    {hosts.map((host) => createPortal(host.part.kind === "issue" ? <IssueReferencePill reference={host.part.reference} /> : <ReferencePill icon={host.part.mention.icon} title={host.part.mention.detail}>@{host.part.mention.name}</ReferencePill>, host.element))}
  </div>;
}
