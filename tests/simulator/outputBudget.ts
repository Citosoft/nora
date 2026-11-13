import { open } from "node:fs/promises";
import { budgetToolOutput } from "@main/execution/tool-output/budget";
import type { SimulatorStep } from "./types/scenarios.types";

/** Only synthetic data in the simulator's private temporary directory is written or read. */
export async function outputBudgetSteps(directory: string): Promise<SimulatorStep[]> {
  const lines = Array.from({ length: 1_200 }, (_, index) => `Build progress ${index + 1}: checking src/generated/example-${index}.ts - no diagnostic.`);
  lines[600] = "ERROR src/parser.ts:42 - malformed input was accepted; expected a validation error.";
  lines[601] = "  at parseInput (src/parser.ts:42:7)";
  lines[1199] = "Build finished: 1 failing validation test. Exit status: 1.";
  const text = lines.join("\n");
  const result = await budgetToolOutput(text, directory);
  if (!result.path) throw new Error("Simulator log did not exceed its output budget");
  const offset = Buffer.byteLength(text.slice(0, text.indexOf("ERROR src/parser.ts")));
  const file = await open(result.path, "r");
  let chunk: string;
  try { const buffer = Buffer.alloc(1_024); const { bytesRead } = await file.read(buffer, 0, buffer.length, offset); chunk = buffer.subarray(0, bytesRead).toString("utf8"); }
  finally { await file.close(); }
  return [
    { kind: "text", text: `This synthetic log has **${result.originalBytes.toLocaleString()} bytes**. The production output-budget helper saves it intact and returns an excerpt of **${Buffer.byteLength(result.text).toLocaleString()} bytes** with the beginning, a diagnostic and the end.` },
    { kind: "tool", complete: true, native: { id: "budgeted-log", type: "commandExecution", command: "Simulated build report (not executed)", status: "failed", exitCode: 1, aggregatedOutput: result.text } },
    { kind: "text", text: "The excerpt keeps the failure and exit status visible. I need the parser diagnostic's nearby lines, so I'll read a **1,024-byte chunk**, rather than load the entire saved log." },
    { kind: "tool", complete: true, native: { id: "targeted-log-read", type: "dynamicToolCall", tool: "Read synthetic log chunk", arguments: { path: result.path, offset, length: 1_024 }, status: "completed", success: true,
      contentItems: [{ type: "inputText", text: chunk }] } },
    { kind: "text", text: "The targeted read confirms `src/parser.ts:42` accepted malformed input. Full output remains available in the temporary artifact. No real command or model request ran. Claude uses pre-model hooks for supported text results; Codex uses its native history budget, and other runtimes retain native behavior." }
  ];
}
