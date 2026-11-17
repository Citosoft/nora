import type { DirectDescriptor } from "@shared/types/bots/bots.types";
import type { TimelineItem } from "@shared/types/conversation/contracts.types";
import { chatMessages, chatTranscript } from "@main/bots/chats/transcript";

/**
 * What a work thread sees for one chat message. A new task gets the chat so far, so the conversation carries over;
 * a continuing one gets the messages since it last replied, since its own session already holds the rest.
 */
export function directPrompt(direct: DirectDescriptor, items: readonly TimelineItem[], workThreadId: string, workspaceName: string): string {
  const messages = chatMessages(items);
  const since = messages.map((item) => item.workThreadId).lastIndexOf(workThreadId);
  const transcript = chatTranscript(messages, since);
  const opening = since < 0
    ? `You are ${direct.name}, chatting with the user. This thread is a task you are taking on in ${workspaceName}. The chat so far:`
    : "New in your chat with the user since your last reply:";
  return `${opening}\n\n${transcript}\n\n`
    + `Do what the latest message asks here, then reply to the user as you would in a chat: concise, conversational, and saying what you did or found. `
    + "Your reply is posted to the chat; your tool activity stays in this thread.";
}
