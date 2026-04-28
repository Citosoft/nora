import type { AiChatMessage } from "@/components/app/types";
import type { AiChatToolActivityEntry } from "@/components/app/types/aiChatToolActivity.types";

const readStringField = (
  source: Record<string, string | number | boolean | null | object>,
  keys: readonly string[]
): string | null => {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
};

const hasValueForKeys = (
  source: Record<string, string | number | boolean | null | object>,
  keys: readonly string[]
): boolean => {
  for (const key of keys) {
    if (!(key in source)) {
      continue;
    }
    const value = source[key];
    if (value !== null && value !== undefined) {
      return true;
    }
  }
  return false;
};

const getToolActivityFromPart = (part: AiChatMessage["parts"][number], index: number): AiChatToolActivityEntry[] => {
  if (!part || typeof part !== "object" || !("type" in part) || typeof part.type !== "string") {
    return [];
  }

  const hasToolPrefix = part.type.startsWith("tool-");
  const isDynamicToolPart = part.type === "dynamic-tool";
  if (!hasToolPrefix && !isDynamicToolPart) {
    return [];
  }

  const parsedPart = part as Record<string, string | number | boolean | null | object>;
  const prefixedName = hasToolPrefix ? part.type.slice(5) : "";
  const explicitName = readStringField(parsedPart, ["toolName", "name", "tool"]);
  const toolName = explicitName || prefixedName || "tool";
  const errorMessage = readStringField(parsedPart, ["error", "errorText", "errorMessage"]);
  const invocationState = readStringField(parsedPart, ["state", "status", "invocationState"]);
  const hasResultData = hasValueForKeys(parsedPart, ["result", "output", "response", "content"]);
  const hasInputData = hasValueForKeys(parsedPart, ["input", "args", "arguments"]);
  const normalizedState = invocationState?.toLowerCase() ?? "";

  if (errorMessage) {
    return [
      {
        id: `${toolName}-${index}`,
        label: `Tool: ${toolName}`,
        detail: `failed: ${errorMessage}`,
        status: "error"
      }
    ];
  }

  if (
    hasResultData ||
    normalizedState === "result" ||
    normalizedState === "done" ||
    normalizedState === "success" ||
    normalizedState === "completed" ||
    normalizedState === "complete" ||
    normalizedState === "output-available"
  ) {
    return [
      {
        id: `${toolName}-${index}`,
        label: `Tool: ${toolName}`,
        detail: "completed",
        status: "done"
      }
    ];
  }

  if (
    normalizedState === "call" ||
    normalizedState === "running" ||
    normalizedState === "pending" ||
    normalizedState === "input-streaming" ||
    (normalizedState.length === 0 && hasInputData && !hasResultData)
  ) {
    return [
      {
        id: `${toolName}-${index}`,
        label: `Tool: ${toolName}`,
        detail: "running…",
        status: "running"
      }
    ];
  }

  return [
    {
      id: `${toolName}-${index}`,
      label: `Tool: ${toolName}`,
      detail: "invoked",
      status: "info"
    }
  ];
};

export const getAiChatToolActivityEntries = (message: AiChatMessage): AiChatToolActivityEntry[] => {
  if (!Array.isArray(message.parts) || message.parts.length === 0) {
    return [];
  }

  return message.parts.flatMap((part, index) => getToolActivityFromPart(part, index));
};
