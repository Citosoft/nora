/** A work thread's brief with its completion criteria appended, so the agent checks them before reporting back. */
export function withDoneCriteria(brief: string, done: string | null | undefined): string {
  return done ? `${brief}\n\nDone means: ${done}\nCheck this before you report back, and say plainly if it is not met yet.` : brief;
}
