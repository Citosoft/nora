import type { SimulatorScenario, SimulatorStep } from "./types/scenarios.types";
import { simulatedFileChanges, simulatedPatches } from "./fileChanges";
import { simulatedMarkdown } from "./markdown";

export const simulatorScenarios: readonly SimulatorScenario[] = [
  { id: "tour", label: "Full chat loop", description: "Streaming, tools, a question, an approval and a final answer." },
  { id: "tools", label: "Tool gallery", description: "Commands, integrations, searches, images, agents and failure states." },
  { id: "markdown", label: "Markdown gallery", description: "Stream headings, emphasis, lists, tables, quotes and code blocks." },
  { id: "questions", label: "Questions", description: "Single choice, multiple choices and a free-text answer." },
  { id: "approvals", label: "Action approvals", description: "Command, file and network approvals with different scopes." },
  { id: "usage-limit", label: "Provider usage limit", description: "The provider has no usage remaining and rejects the turn." },
  { id: "failure", label: "Provider failure", description: "A failed tool followed by a failed task." },
  { id: "recovery", label: "Lost connection", description: "Unconfirmed work, then Check native status to recover." },
  { id: "expired", label: "Expired request", description: "An unanswered question expires after two seconds." },
  { id: "long-output", label: "Long output", description: "Large output, long paths and scrolling." },
  { id: "slow", label: "Queue and interrupt", description: "A slow task for testing queued messages and interruption." }
];

const options = [
  { id: "allow", label: "Allow once", intent: "allow" as const, scope: "once" as const, description: "Allow only this simulated action." },
  { id: "session", label: "Allow for this session", intent: "allow" as const, scope: "session" as const, description: "Allow matching actions during this simulated session." },
  { id: "deny", label: "Decline", intent: "deny" as const, description: "Skip this action and continue." },
  { id: "cancel", label: "Stop task", intent: "cancel" as const, description: "Decline and interrupt this simulated task." }
];
const questions: Extract<SimulatorStep, { kind: "questions" }> = { kind: "questions", questions: [
  { id: "pet", text: "Do you prefer dogs or cats?", options: ["Dogs", "Cats"], multiple: false, allowOther: true },
  { id: "activities", text: "Which activities should we include?", options: ["Walking", "Reading", "Cooking"], multiple: true },
  { id: "notes", text: "Any other preferences?", options: [], multiple: false }
] };
const commandApproval: SimulatorStep = { kind: "approval", title: "Allow this command?", options,
  details: { kind: "command", command: "npm test", workingDirectory: "/simulated/workspace", reason: "Run the project tests. This command will only be simulated." } };
const failedTool: SimulatorStep = { kind: "tool", native: { id: "failed", type: "commandExecution", command: "npm run missing-script", status: "failed", exitCode: 1, aggregatedOutput: "Missing script: missing-script" }, complete: true };
const tools: SimulatorStep[] = [
  { kind: "tool", native: { id: "command", type: "commandExecution", command: "npm test", cwd: "/simulated/workspace", status: "inProgress" }, complete: false },
  { kind: "pause", milliseconds: 500 },
  { kind: "tool", native: { id: "command", type: "commandExecution", command: "npm test", status: "completed", aggregatedOutput: "42 tests passed", exitCode: 0, durationMs: 1250 }, complete: true },
  { kind: "tool", native: { id: "mcp", type: "mcpToolCall", server: "Team documents", tool: "Search documentation", arguments: { query: "API reference" }, status: "inProgress" }, complete: false },
  { kind: "pause", milliseconds: 500 },
  { kind: "tool", native: { id: "mcp", type: "mcpToolCall", server: "Team documents", tool: "Search documentation", status: "completed", result: { content: [{ type: "text", text: "Found three matching documents." }] } }, complete: true },
  { kind: "tool", native: { id: "search", type: "webSearch", query: "How to test a desktop app" }, complete: true },
  { kind: "tool", native: { id: "dynamic", type: "dynamicToolCall", tool: "Lookup workspace", arguments: { id: "demo" }, status: "completed", success: true, contentItems: [{ type: "inputText", text: "Workspace found." }] }, complete: true },
  { kind: "tool", native: { id: "image", type: "imageView", path: "/simulated/screenshot.png" }, complete: true },
  { kind: "tool", native: { id: "generated", type: "imageGeneration", status: "completed", savedPath: "/simulated/generated.png", revisedPrompt: "An example landscape" }, complete: true },
  { kind: "tool", native: { id: "output", type: "functionCallOutput", name: "Read example result", output: [{ type: "inputText", text: "Example standalone tool result." }] }, complete: true },
  { kind: "tool", native: { id: "wait", type: "sleep", durationMs: 1000 }, complete: true },
  { kind: "tool", native: { id: "agent", type: "collabAgentToolCall", tool: "Review changes", prompt: "Check the example diff", status: "completed" }, complete: true },
  failedTool,
  { kind: "tool", native: { id: "declined", type: "commandExecution", command: "npm publish", status: "declined" }, complete: true },
  { kind: "tool", native: { id: "stopped", type: "commandExecution", command: "npm run watch", status: "interrupted" }, complete: true },
  { kind: "tool", native: { id: "unconfirmed", type: "futureTool", status: "inProgress" }, complete: false },
  { kind: "display", id: "plan", item: { kind: "plan", steps: [{ text: "Inspect the example project", state: "completed" }, { text: "Run validation", state: "running" }] } },
  { kind: "display", id: "child", item: { kind: "subagent", nativeId: "simulated-reviewer", label: "Example reviewer", state: "running" } },
  { kind: "pause", milliseconds: 300 },
  { kind: "display", id: "child", item: { kind: "subagent", nativeId: "simulated-reviewer", label: "Example reviewer", state: "completed" } },
  { kind: "display", id: "changes", item: { kind: "changes", paths: simulatedFileChanges.map((change) => change.path), patches: simulatedPatches, attribution: "turn" } },
  { kind: "display", id: "milestone", item: { kind: "milestone", text: "Example validation finished." } },
  { kind: "display", id: "plan", item: { kind: "plan", steps: [{ text: "Inspect the example project", state: "completed" }, { text: "Run validation", state: "completed" }] } }
];

export function stepsForScenario(instruction: string): SimulatorStep[] {
  const id = instruction.trim().split(/\s/)[0].replace(/^\//, "");
  switch (id) {
    case "tools": return tools;
    case "markdown": return [{ kind: "text", text: simulatedMarkdown }];
    case "questions": return [questions];
    case "approvals": return [commandApproval,
      { kind: "approval", title: "Allow file changes?", options, details: { kind: "files", reason: "Apply an example fix.", paths: ["src/main.ts", "src/app.tsx"] } },
      { kind: "approval", title: "Allow network access?", options: [...options, { id: "always", label: "Always allow this host", intent: "allow", scope: "persistent", description: "Save a simulated rule for api.example.com." }],
        details: { kind: "network", target: "https://api.example.com", reason: "Fetch reference documentation. No request will be sent." } }];
    case "usage-limit": return [{ kind: "failure", failure: { code: "usage-limit", message: "Codex usage limit reached", retryable: true } }];
    case "failure": return [failedTool, { kind: "failure" }];
    case "recovery": return [{ kind: "recovery" }];
    case "expired": return [{ ...questions, expire: true }];
    case "long-output": return [{ kind: "tool", complete: true, native: { id: "long", type: "commandExecution", command: "npm run example-report", status: "completed", exitCode: 0,
      aggregatedOutput: Array.from({ length: 500 }, (_, index) => `Line ${index + 1}: /simulated/workspace/${"nested/".repeat(12)}file.ts — example output`).join("\n") } }];
    case "slow": return [tools[0], { kind: "pause", milliseconds: 15_000 }, tools[2]];
    default: return [{ kind: "text", text: "This is a simulated conversation. I’ll inspect the project, ask for your preferences, and request approval." },
      ...tools.slice(0, 6), questions, commandApproval];
  }
}
