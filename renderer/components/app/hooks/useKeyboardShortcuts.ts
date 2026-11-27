import { useKeybindings } from "@/components/app/hooks/useKeybindings";
import { keybindingMatchesEvent } from "@/components/app/logic/keybindings/keybindingMatching";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type { KeyboardShortcutActions } from "@/components/app/types/keybindings.types";
import { useEffect, useMemo } from "react";

/**
 * Runs the window-wide (workbench-scope) command whose user-resolved chord matches a keystroke, when `actions`
 * handles it. Several callers can each own a slice of the workbench commands.
 */
export function useKeyboardShortcuts(actions: KeyboardShortcutActions): void {
  const { bindings } = useKeybindings();
  const workbenchBindings = useMemo(() => bindings.filter((binding) => binding.scope === "workbench"), [bindings]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const matched = workbenchBindings.find((binding) => keybindingMatchesEvent(binding, event));
      const action = matched ? actions[matched.commandId] : undefined;
      if (!action) {
        return;
      }
      event.preventDefault();
      action();
      if (matched) trackAnalyticsEvent({ name: "command.invoked", properties: { command: matched.commandId, via: "keybinding" } });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [actions, workbenchBindings]);
}
