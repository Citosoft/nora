import type { ComposerDraftBuffer, ComposerDraftBufferDeps } from "@/components/app/types/composerInput.types";

/** Keep storage and shell subscribers out of the native input event's critical path. */
export function createComposerDraftBuffer({ value, publish, display }: ComposerDraftBufferDeps): ComposerDraftBuffer {
  let draft = value;
  let published = value;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancel = (): void => { if (timer !== null) clearTimeout(timer); timer = null; };
  const flush = (): void => {
    cancel();
    if (draft === published) return;
    published = draft;
    publish(draft);
  };
  return {
    edit(text) {
      draft = text;
      display(text);
      cancel();
      timer = setTimeout(flush, 200);
    },
    receive(text) {
      // An acknowledgement of our last publish must not overwrite newer local keystrokes.
      if (text === published) return;
      cancel();
      draft = published = text;
      display(text);
    },
    flush,
    dispose: flush
  };
}
