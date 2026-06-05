import type { ForgeDiffSyntaxToken, ForgeDiffSyntaxTokenKind } from "@/components/app/types/forgeDiffSyntaxHighlight.types";

const LANGUAGE_KEYWORDS: Record<string, Set<string>> = {
  javascript: new Set([
    "async", "await", "break", "case", "catch", "class", "const", "continue", "default", "delete", "do", "else",
    "export", "extends", "finally", "for", "from", "function", "if", "import", "in", "instanceof", "let", "new",
    "of", "return", "static", "switch", "throw", "try", "typeof", "var", "void", "while", "yield"
  ]),
  typescript: new Set([
    "as", "async", "await", "break", "case", "catch", "class", "const", "continue", "default", "delete", "do",
    "else", "enum", "export", "extends", "finally", "for", "from", "function", "if", "implements", "import", "in",
    "instanceof", "interface", "let", "new", "of", "private", "protected", "public", "readonly", "return", "static",
    "switch", "throw", "try", "type", "typeof", "var", "void", "while", "yield"
  ]),
  python: new Set([
    "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif", "else", "except",
    "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass",
    "raise", "return", "try", "while", "with", "yield"
  ]),
  ruby: new Set([
    "begin", "break", "case", "class", "def", "do", "else", "elsif", "end", "ensure", "for", "if", "module", "next",
    "private", "protected", "public", "raise", "rescue", "return", "self", "super", "then", "unless", "until", "when",
    "while", "yield"
  ]),
  go: new Set([
    "break", "case", "chan", "const", "continue", "defer", "else", "fallthrough", "for", "func", "go", "goto", "if",
    "import", "interface", "map", "package", "range", "return", "select", "struct", "switch", "type", "var"
  ]),
  rust: new Set([
    "as", "async", "await", "break", "const", "continue", "crate", "else", "enum", "extern", "false", "fn", "for",
    "if", "impl", "in", "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return", "self", "static",
    "struct", "super", "trait", "true", "type", "unsafe", "use", "where", "while"
  ])
};

const TYPE_WORDS = new Set([
  "Array", "Boolean", "Date", "Error", "Map", "Number", "Object", "Promise", "Record", "Set", "String", "unknown",
  "boolean", "float", "int", "never", "number", "string", "unknown", "void"
]);

function getKeywordSet(languageId: string): Set<string> {
  if (languageId === "tsx" || languageId === "jsx") {
    return LANGUAGE_KEYWORDS.typescript;
  }
  return LANGUAGE_KEYWORDS[languageId] ?? LANGUAGE_KEYWORDS.javascript;
}

function classifyWord(word: string, languageId: string, nextChar: string): ForgeDiffSyntaxTokenKind {
  if (getKeywordSet(languageId).has(word)) {
    return "keyword";
  }
  if (TYPE_WORDS.has(word) || /^[A-Z][A-Za-z0-9_]*$/.test(word)) {
    return "type";
  }
  if (nextChar === ":" || nextChar === "=") {
    return "property";
  }
  return "plain";
}

function pushToken(tokens: ForgeDiffSyntaxToken[], text: string, kind: ForgeDiffSyntaxTokenKind): void {
  if (!text) {
    return;
  }
  const previous = tokens[tokens.length - 1];
  if (previous?.kind === kind) {
    previous.text += text;
    return;
  }
  tokens.push({ text, kind });
}

export function tokenizeForgeDiffCode(content: string, languageId: string): ForgeDiffSyntaxToken[] {
  const tokens: ForgeDiffSyntaxToken[] = [];
  let index = 0;

  while (index < content.length) {
    const rest = content.slice(index);
    const commentMatch = /^(\/\/.*|#.*|<!--.*-->)/.exec(rest);
    if (commentMatch?.[0]) {
      pushToken(tokens, commentMatch[0], "comment");
      index += commentMatch[0].length;
      continue;
    }

    const stringMatch = /^(`(?:\\.|[^`])*`|'(?:\\.|[^'])*'|"(?:\\.|[^"])*")/.exec(rest);
    if (stringMatch?.[0]) {
      pushToken(tokens, stringMatch[0], "string");
      index += stringMatch[0].length;
      continue;
    }

    const numberMatch = /^\b\d+(?:\.\d+)?\b/.exec(rest);
    if (numberMatch?.[0]) {
      pushToken(tokens, numberMatch[0], "number");
      index += numberMatch[0].length;
      continue;
    }

    const wordMatch = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(rest);
    if (wordMatch?.[0]) {
      const word = wordMatch[0];
      const nextChar = content[index + word.length] ?? "";
      pushToken(tokens, word, classifyWord(word, languageId, nextChar));
      index += word.length;
      continue;
    }

    const char = content[index] ?? "";
    const kind: ForgeDiffSyntaxTokenKind = /[()[\]{}.,:;]/.test(char) ? "punctuation" : "plain";
    pushToken(tokens, char, kind);
    index += 1;
  }

  return tokens.length ? tokens : [{ text: content || " ", kind: "plain" }];
}
