import { useMemo, useState } from "react";
import { useDirectContextPreview } from "./useDirectContextPreview";
import type { DirectContextTarget } from "@shared/ipc/types/directContextGateway.types";
import type { ChatContextInspector, ChatContextInspectorOptions } from "@/components/app/types/chatContext.types";

/** The developer Context tab of a saved direct chat's sidebar: the previewed work thread and the preview it reads while `active`. Dev builds only. */
export function useChatContextInspector({ chatId, draft, revision, active }: ChatContextInspectorOptions): ChatContextInspector {
  const available = !__NORA_IS_PRODUCTION__ && !!chatId;
  const [target, setTarget] = useState<DirectContextTarget | null>(null);
  const query = useMemo(() => available && active && chatId ? { chatId, draft, target, revision } : null, [available, active, chatId, draft, target, revision]);
  const { state, refresh } = useDirectContextPreview(query);
  return { available, target, setTarget, state, refresh };
}
