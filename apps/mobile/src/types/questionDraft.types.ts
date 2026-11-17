/** In-progress answers to a question request, per question ID. */
export type QuestionDraft = Record<string, { selected: string[]; other: string }>;
