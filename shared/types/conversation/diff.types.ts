export interface DiffLineCounts { additions: number; deletions: number; }
export interface DiffLine { text: string; kind: "addition" | "deletion" | "context" | "metadata"; }
