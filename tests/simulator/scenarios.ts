import type { SimulatorApprovalStep, SimulatorDisplayItem, SimulatorScenario, SimulatorStep } from "./types/scenarios.types";
import { simulatedFileChanges, simulatedPatches } from "./fileChanges";
import { simulatedMarkdown } from "./markdown";
import type { ProviderSkill } from "@shared/types/provider/skills.types";

export const simulatorScenarios: readonly SimulatorScenario[] = [
  { id: "tour", label: "Full chat loop", description: "Streaming, tools, a question, an approval and a final answer." },
  { id: "tools", label: "Tool gallery", description: "Commands, integrations, searches, images, agents and failure states." },
  { id: "markdown", label: "Markdown gallery", description: "Stream headings, emphasis, lists, tables, quotes and code blocks." },
  { id: "questions", label: "Questions", description: "Single choice, multiple choices and a free-text answer." },
  { id: "approvals", label: "Action approvals", description: "Command, file and network approvals with different scopes." },
  { id: "approval-stack", label: "Stacked approvals", description: "Three approvals arrive together; respond one at a time." },
  { id: "background-requests", label: "Background requests", description: "Open another conversation within 6 seconds; approvals and questions then arrive in the waiting tray, answerable in place." },
  { id: "suggestions", label: "Follow-up suggestion", description: "Ghost text after completion; Tab accepts it without sending." },
  { id: "provider-switch", label: "Switch provider", description: "Keep decisions and history while continuing from Codex to Claude in the same chat." },
  { id: "output-budget", label: "Tool output budget", description: "Save a large synthetic log, show its diagnostic excerpt and read a targeted chunk." },
  { id: "connector-sign-in", label: "Connector sign-in", description: "The model asks you to sign in to a connector before it continues." },
  { id: "usage-limit", label: "Provider usage limit", description: "The provider has no usage remaining and rejects the turn." },
  { id: "failure", label: "Provider failure", description: "A failed tool followed by a failed task." },
  { id: "recovery", label: "Lost connection", description: "Unconfirmed work, then Check native status to recover." },
  { id: "expired", label: "Expired request", description: "An unanswered question expires after two seconds." },
  { id: "long-output", label: "Long output", description: "Large output, long paths and scrolling." },
  { id: "slow", label: "Queue and interrupt", description: "A slow task for testing queued messages and interruption." },
  { id: "subagents", label: "Subagents", description: "Three agents work in parallel; follow them in thread details as they finish or fail." },
  { id: "skills", label: "Skills", description: "Load one skill, read another and let a subagent use a third; thread details shows used and available skills." }
];

/** The simulated connector that starts signed out; its sign-in completes locally without a browser. */
export const simulatedConnectorName = "Issue tracker";

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
const commandApproval: SimulatorApprovalStep = { kind: "approval", title: "Allow this command?", options,
  details: { kind: "command", command: "npm test", workingDirectory: "/simulated/workspace", reason: "Run the project tests. This command will only be simulated." } };
const approvals: SimulatorApprovalStep[] = [commandApproval,
  { kind: "approval", title: "Allow file changes?", options, details: { kind: "files", reason: "Apply an example fix.", paths: ["src/main.ts", "src/app.tsx"] } },
  { kind: "approval", title: "Allow network access?", options: [...options, { id: "always", label: "Always allow this host", intent: "allow", scope: "persistent", description: "Save a simulated rule for api.example.com." }],
    details: { kind: "network", target: "https://api.example.com", reason: "Fetch reference documentation. No request will be sent." } }];
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

type SubagentPatch = Omit<Extract<SimulatorDisplayItem, { kind: "subagent" }>, "kind" | "nativeId">;
const simulatedAgents = {
  // The reviewer requests its own model; the others follow the thread's subagent model setting.
  reviewer: { nativeId: "simulated-agent-reviewer", label: "Review the example diff", agentType: "code-reviewer", model: "simulated", effort: "high",
    prompt: "Review the changes in src/main.ts and src/app.tsx for correctness and readability. Report concrete issues only." },
  tests: { nativeId: "simulated-agent-tests", label: "Run the test suite", agentType: "test-runner",
    prompt: "Run the project's unit tests and summarize any failures with the file and test name." },
  research: { nativeId: "simulated-agent-research", label: "Check the API documentation", agentType: "researcher", effort: "low",
    prompt: "Find the documented limits for the example API and compare them with the client defaults." }
} as const;
/** Re-emitting an agent under the same display id updates it in place, as a provider reporting progress would. */
function agentStep(agent: keyof typeof simulatedAgents, patch: Partial<SubagentPatch>): SimulatorStep {
  const { nativeId, ...base } = simulatedAgents[agent];
  return { kind: "display", id: `agent-${agent}`, item: { kind: "subagent", nativeId, state: "running", ...base, ...patch } };
}
const subagents: SimulatorStep[] = [
  { kind: "text", text: "I'll split this across three agents: one reviews the diff, one runs the tests and one checks the API documentation. Open **thread details** to follow them." },
  agentStep("reviewer", {}),
  agentStep("tests", {}),
  agentStep("research", {}),
  { kind: "tool", details: { parentId: simulatedAgents.reviewer.nativeId }, complete: true,
    native: { id: "agent-review-read", type: "commandExecution", command: "git diff -- src/main.ts src/app.tsx", status: "completed", exitCode: 0, aggregatedOutput: "2 files changed, 18 insertions(+), 6 deletions(-)" } },
  agentStep("reviewer", { progress: "Reading the changed files" }),
  { kind: "tool", details: { parentId: simulatedAgents.tests.nativeId }, complete: true,
    native: { id: "agent-tests-run", type: "commandExecution", command: "npm test", status: "completed", exitCode: 0, aggregatedOutput: "42 tests passed", durationMs: 2400 } },
  agentStep("tests", { progress: "All 42 tests passed; checking coverage" }),
  { kind: "tool", details: { parentId: simulatedAgents.research.nativeId }, complete: true, native: { id: "agent-research-search", type: "webSearch", query: "example API rate limits" } },
  agentStep("research", { progress: "Comparing documented limits with the client" }),
  { kind: "pause", milliseconds: 1200 },
  agentStep("tests", { state: "completed", result: "All 42 unit tests passed. Coverage is unchanged at 87%." }),
  { kind: "tool", details: { parentId: simulatedAgents.reviewer.nativeId }, complete: true,
    native: { id: "agent-review-grep", type: "commandExecution", command: "rg retryCount src", status: "completed", exitCode: 0, aggregatedOutput: "src/main.ts:14: const retryCount = 3;" } },
  agentStep("reviewer", { progress: "Checking retry handling in src/main.ts" }),
  { kind: "tool", details: { parentId: simulatedAgents.research.nativeId }, complete: true,
    native: { id: "agent-research-fetch", type: "mcpToolCall", server: "Team documents", tool: "Read page", arguments: { page: "api-limits" }, status: "failed", error: { message: "Page not found" } } },
  agentStep("research", { state: "failed", result: "The API limits page could not be found, so the limits were not compared." }),
  { kind: "pause", milliseconds: 1500 },
  agentStep("reviewer", { state: "completed", result: "One issue: src/main.ts retries 3 times without backoff. Consider exponential backoff. No other problems found." }),
  { kind: "text", text: "Two agents finished and one failed:\n\n- **Review**: add backoff to the retry loop in `src/main.ts`.\n- **Tests**: all 42 passed.\n- **Documentation**: the limits page was missing, so that check did not run." }
];

/** Skills the simulated runtime offers, one per scope; none are real files. */
export const simulatedSkills: readonly ProviderSkill[] = [
  { name: "code-review", description: "Review a diff for correctness and readability.", scope: "user" },
  { name: "release-notes", description: "Draft release notes from merged changes.", scope: "workspace" },
  { name: "pdf", description: "Read, split and summarize PDF documents.", scope: "plugin", plugin: "documents" },
  { name: "simplify", description: "Suggest simplifications for changed code.", scope: "system" },
  { name: "dataviz", description: "Choose and style charts for a dataset.", scope: "plugin", plugin: "analytics" }
];
const skillAgent = { nativeId: "simulated-agent-spec", label: "Summarize the product spec", agentType: "researcher",
  prompt: "Summarize the attached product spec PDF in five bullet points." } as const;
const skills: SimulatorStep[] = [
  { kind: "text", text: "I'll load the review skill, check the release notes guide and have an agent summarize the spec. Thread details lists each skill under **Skills**." },
  { kind: "tool", complete: true, details: { skill: { name: "code-review", evidence: "loaded" } },
    native: { id: "skill-load", type: "dynamicToolCall", tool: "Skill", arguments: { skill: "code-review" }, status: "completed", success: true, contentItems: [{ type: "inputText", text: "Loaded skill: code-review" }] } },
  { kind: "tool", complete: true, native: { id: "skill-read", type: "commandExecution", command: "cat .claude/skills/release-notes/SKILL.md", status: "completed", exitCode: 0,
    aggregatedOutput: "---\nname: release-notes\ndescription: Draft release notes from merged changes.\n---\nGroup changes by Features and Fixes." } },
  { kind: "display", id: "agent-spec", item: { kind: "subagent", ...skillAgent, state: "running" } },
  { kind: "tool", complete: true, details: { parentId: skillAgent.nativeId, skill: { name: "pdf", evidence: "loaded" } },
    native: { id: "skill-agent-load", type: "dynamicToolCall", tool: "Skill", arguments: { skill: "pdf" }, status: "completed", success: true, contentItems: [{ type: "inputText", text: "Loaded skill: pdf" }] } },
  { kind: "display", id: "agent-spec", item: { kind: "subagent", ...skillAgent, state: "completed", result: "The spec covers onboarding, billing, exports, roles and audit logs." } },
  { kind: "text", text: "Done. **code-review** was loaded, the **release-notes** guide was read directly, and the agent loaded **pdf**. The other skills stay listed as available." }
];

/** Requests raised while you are looking elsewhere, so they surface as in-app toasts rather than in this thread. */
const BACKGROUND_DELAY_MS = 6000;
const backgroundRequests: SimulatorStep[] = [
  { kind: "text", text: `Open another conversation or scenario now. In ${BACKGROUND_DELAY_MS / 1000} seconds this thread will ask for two approvals, `
    + "then a quick question, then one that needs this thread. Each appears in the waiting tray in the bottom-right corner while you are elsewhere." },
  { kind: "pause", milliseconds: BACKGROUND_DELAY_MS },
  { kind: "approval-batch", approvals: [commandApproval, approvals[1]] },
  { kind: "questions", questions: [{ id: "branch", text: "Which branch should I use for the fix?", options: ["main", "release", "new branch"], multiple: false }] },
  { ...questions },
  { kind: "text", text: "All background requests were answered. Run the scenario in a second thread to see requests from several threads in one tray." }
];

export function stepsForScenario(instruction: string): SimulatorStep[] {
  const id = instruction.trim().split(/\s/)[0].replace(/^\//, "");
  switch (id) {
    case "output-budget": return [{ kind: "output-budget" }];
    case "tools": return tools;
    case "markdown": return [{ kind: "text", text: simulatedMarkdown }];
    case "questions": return [questions];
    case "approvals": return approvals;
    case "approval-stack": return [{ kind: "approval-batch", approvals }];
    case "background-requests": return backgroundRequests;
    case "suggestions": return [{ kind: "text", text: "The example changes are ready. A suggested follow-up will appear in the empty composer when this turn finishes." },
      { kind: "suggestion", text: "Run the test suite and summarize any failures." }];
    case "provider-switch": return [
      { kind: "text", text: "We've agreed to **preserve the public API**, add a parser in `src/parser.ts`, and cover malformed input with unit tests. The parser and tests are still unfinished." },
      { kind: "display", id: "handoff-plan", item: { kind: "plan", steps: [{ text: "Preserve the public API", state: "completed" }, { text: "Implement the parser and test malformed input", state: "pending" }] } },
      { kind: "text", text: "To try a provider handoff, wait for this turn to finish, then click **Change** beside the model picker. Choose the **Claude** icon and a simulated model, choose **Simulated permissions**, close the picker, and send **Continue the parser work**. The same chat keeps this history and gains a provider-change marker. Everything is local and uses zero tokens." }
    ];
    case "connector-sign-in": return [
      { kind: "text", text: `To find the open issues assigned to you I need access to **${simulatedConnectorName}**, which isn't signed in yet.` },
      { kind: "display", id: "connector-sign-in", item: { kind: "connector-sign-in", server: simulatedConnectorName,
        reason: "Read the open issues assigned to you. Sign-in is simulated and never opens a browser." } },
      { kind: "text", text: "Once you're signed in, send a message and I'll continue." }];
    case "usage-limit": return [{ kind: "failure", failure: { code: "usage-limit", message: "Codex usage limit reached", retryable: true } }];
    case "failure": return [failedTool, { kind: "failure" }];
    case "recovery": return [{ kind: "recovery" }];
    case "expired": return [{ ...questions, expire: true }];
    case "long-output": return [{ kind: "tool", complete: true, native: { id: "long", type: "commandExecution", command: "npm run example-report", status: "completed", exitCode: 0,
      aggregatedOutput: Array.from({ length: 500 }, (_, index) => `Line ${index + 1}: /simulated/workspace/${"nested/".repeat(12)}file.ts — example output`).join("\n") } }];
    case "slow": return [tools[0], { kind: "pause", milliseconds: 15_000 }, tools[2]];
    case "subagents": return subagents;
    case "skills": return skills;
    default: return [{ kind: "text", text: "This is a simulated conversation. I’ll inspect the project, ask for your preferences, and request approval." },
      ...tools.slice(0, 6), questions, commandApproval];
  }
}
