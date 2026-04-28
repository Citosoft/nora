import type { ShortcutActionMap, ShortcutDefinition } from "@/components/app/types/component.types";
import { useEffect } from "react";

export function useKeyboardShortcuts(
  definitions: ShortcutDefinition[],
  actions: ShortcutActionMap
): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const matched = definitions.find((definition) => shortcutMatches(event, definition));
      if (!matched) {
        return;
      }

      if (!matched.allowInEditable && isEditableEventTarget(event.target)) {
        return;
      }

      event.preventDefault();
      actions[matched.id]();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [actions, definitions]);
}

function shortcutMatches(event: KeyboardEvent, definition: ShortcutDefinition): boolean {
  const requiredKeys = new Set(definition.keys);
  const expectedMeta = requiredKeys.has("mod");
  const expectedShift = requiredKeys.has("shift");
  const expectedAlt = requiredKeys.has("alt");

  if ((event.metaKey || event.ctrlKey) !== expectedMeta) {
    return false;
  }

  if (event.shiftKey !== expectedShift) {
    return false;
  }

  if (event.altKey !== expectedAlt) {
    return false;
  }

  const primaryKey = definition.keys.find((key) => !["mod", "shift", "alt"].includes(key));
  if (!primaryKey) {
    return false;
  }

  return event.key.toLowerCase() === primaryKey;
}

function isEditableEventTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select";
}
