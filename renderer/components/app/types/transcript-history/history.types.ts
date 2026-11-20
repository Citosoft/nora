import type { PropsWithChildren, RefObject } from "react";

export interface PromptPosition {
  id: string;
  text: string;
  top: number;
}

export interface HistoryPrompt extends PromptPosition {
  output: string | null;
}

export type HistoryEntry = { kind: "prompt"; prompt: PromptPosition } | { kind: "output"; text: string };

export interface HistorySnapshot {
  prompts: HistoryPrompt[];
  visible: string[];
}

export type TranscriptHistoryProps = PropsWithChildren<{
  scrollRef: RefObject<HTMLDivElement | null>;
  onNavigate(): void;
  className?: string;
}>;
