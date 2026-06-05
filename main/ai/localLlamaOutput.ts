export const LOCAL_GENERATION_SENTINEL = "<<<NORA_RESPONSE>>>";

export function extractLlamaCliStdout(rawText: string): string {
  const footerIndex = rawText.indexOf("\n\n[ Prompt:");
  const withoutFooter = footerIndex >= 0 ? rawText.slice(0, footerIndex) : rawText.replace(/\nExiting\.\.\.\s*$/i, "").trim();

  const lines = withoutFooter
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !isLlamaCliUiLine(line));

  return lines
    .map((line) => unwrapQuotedModelLine(line))
    .map((line) => stripInlineLlamaNoise(line))
    .filter((line) => line.length > 0)
    .join("\n")
    .trim();
}

function isLlamaCliUiLine(line: string): boolean {
  if (line.startsWith("> ")) {
    return true;
  }
  if (line.startsWith("/") || line.startsWith("Available commands:") || line.startsWith("available commands:")) {
    return true;
  }
  if (line.includes("(truncated)")) {
    return true;
  }
  if (/^loading model/i.test(line)) {
    return true;
  }
  if (/^(build|model|modalities|using custom system prompt)\b/i.test(line)) {
    return true;
  }
  if (/^(▄|██|▀▀|██    |▀▀    )/.test(line)) {
    return true;
  }
  if (/^(ctrl\+c|stop or exit)/i.test(line)) {
    return true;
  }
  if (/^regen\b|^clear\b|^read\b|^glob\b/i.test(line)) {
    return true;
  }
  return /^Exiting\.{2,}$/i.test(line);
}

export function unwrapQuotedModelLine(line: string): string {
  const quotedMatch = line.match(/^["'](.+)["']$/);
  return quotedMatch?.[1]?.trim() ?? line;
}

export function extractTextAfterSentinel(rawText: string): string {
  const sentinelIndex = rawText.lastIndexOf(LOCAL_GENERATION_SENTINEL);
  if (sentinelIndex < 0) {
    return rawText;
  }
  return rawText.slice(sentinelIndex + LOCAL_GENERATION_SENTINEL.length);
}

export function stripInlineLlamaNoise(text: string): string {
  return text
    .replace(/ggml_\w+(?::\s*[\w-]+)?\s*/gi, " ")
    .replace(/llama_\w+(?::\s*[\w.-]+)?\s*/gi, " ")
    .replace(/kernel_mul[\w-]*\s*/gi, " ")
    .replace(/~llama_\w+(?::\s*[\w.-]+)?\s*/gi, " ")
    .replace(/^(?:compiling|loaded|deallocating|decoded)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeLocalLlamaOutput(rawText: string): string {
  const withoutSentinel = extractTextAfterSentinel(rawText);
  const lines = withoutSentinel
    .split(/\r?\n/)
    .map((line) => stripInlineLlamaNoise(line.trim()))
    .filter((line) => line.length > 0);

  const contentLines: string[] = [];
  for (const line of lines) {
    if (isLlamaRuntimeNoiseLine(line)) {
      continue;
    }
    contentLines.push(line);
  }

  return contentLines.join("\n").trim();
}

function isLlamaRuntimeNoiseLine(line: string): boolean {
  if (
    line.startsWith("ggml_") ||
    line.startsWith("llama_") ||
    line.startsWith("main:") ||
    line.startsWith("~llama_") ||
    line.includes("kernel_mul_mv") ||
    line.includes("llama_perf_")
  ) {
    return true;
  }

  return /^[a-z_]+:\s/.test(line) && !line.includes(" ");
}
