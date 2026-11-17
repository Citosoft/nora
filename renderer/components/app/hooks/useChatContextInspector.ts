import { useCallback, useMemo, useState } from "react";
import { useDirectContextPreview } from "./useDirectContextPreview";
import type { DirectContextTarget } from "@shared/ipc/types/directContextGateway.types";
import type { ChatContextInspector, ChatContextInspectorInput } from "@/components/app/types/chatContext.types";

/** The developer context panel of a saved direct chat: open state, the previewed work thread, and the preview it reads. Dev builds only. */
export function useChatContextInspector({ chatId, draft, revision }: ChatContextInspectorInput): ChatContextInspector {
  const available = !__NORA_IS_PRODUCTION__ && !!chatId;
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<DirectContextTarget | null>(null);
  const query = useMemo(() => available && open && chatId ? { chatId, draft, target, revision } : null, [available, open, chatId, draft, target, revision]);
  const { state, refresh } = useDirectContextPreview(query);
  const toggle = useCallback(() => setOpen((value) => !value), []);
  const close = useCallback(() => setOpen(false), []);
  return { available, open: available && open, toggle, close, target, setTarget, state, refresh };
}
