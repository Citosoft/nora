import type { ClaudeFrame, ClaudeOpenInput, ClaudeSession } from "@main/types/execution/claude.types";

/** The shape adapter tests script: one turn's frames, with the controls a turn needs. */
export interface ScriptedClaudeTurn extends AsyncIterable<ClaudeFrame> {
  interrupt(): Promise<void>;
  close(): void | Promise<void>;
}

/**
 * Wraps a scripted single turn as a session whose process ends with that turn, like one with no background work, so
 * each run in a test opens its own session.
 */
export function singleTurnOpener(open: (input: ClaudeOpenInput) => ScriptedClaudeTurn): (input: ClaudeOpenInput) => ClaudeSession {
  return (input) => {
    const turn = open(input);
    let closed = false;
    return {
      opening: { close() {}, [Symbol.asyncIterator]: () => turn[Symbol.asyncIterator]() },
      send() { throw new Error("A single-turn test session takes no further turns"); },
      interrupt: () => turn.interrupt(),
      async close() { if (!closed) { closed = true; await turn.close(); } },
      isLive: () => false,
      hasBackgroundWork: () => false
    };
  };
}
