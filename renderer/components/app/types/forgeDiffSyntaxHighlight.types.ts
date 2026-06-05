export type ForgeDiffSyntaxTokenKind =
  | "plain"
  | "comment"
  | "string"
  | "keyword"
  | "number"
  | "type"
  | "property"
  | "punctuation";

export type ForgeDiffSyntaxToken = {
  text: string;
  kind: ForgeDiffSyntaxTokenKind;
};
