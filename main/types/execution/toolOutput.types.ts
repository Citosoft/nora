export interface BudgetedToolOutput { text: string; path: string | null; originalBytes: number; }
export interface ClaudeToolOutputOptions { directory: string; enabled(): boolean; }
