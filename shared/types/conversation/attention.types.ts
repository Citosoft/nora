import type { z } from "zod";
import type { attentionNoticeSchema } from "@shared/conversations/attention";

/** Who is waiting on the user; `who` is the waiting bot's name, or the thread title for a Nora thread. */
export type AttentionNotice = z.infer<typeof attentionNoticeSchema>;
