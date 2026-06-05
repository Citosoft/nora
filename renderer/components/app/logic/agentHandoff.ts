import { noraAgentClient } from "@/components/app/clients/noraAgentClient";
import { noraAppClient } from "@/components/app/clients/noraAppClient";
import { queueAgentInputDraftHandoff } from "@/components/app/logic/agentInputDraftHandoff";
import { normalizeSnapshot } from "@/components/app/logic/appUtils";
import type { UpdateSnapshot } from "@/components/app/types/component.types";
import type { AgentPromptSubmission } from "@shared/appTypes";

export async function sendAgentTerminalText(options: {
  agentId: string;
  text: string;
  focusAgent?: (agentId: string) => void | Promise<void>;
  submit?: boolean;
  updateSnapshot?: UpdateSnapshot;
}): Promise<void> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      await options.focusAgent?.(options.agentId);
      await noraAgentClient.sendAgentTerminalInput(options.agentId, options.text);
      if (options.submit) {
        await new Promise((resolve) => globalThis.setTimeout(resolve, 120));
        await noraAgentClient.sendAgentTerminalInput(options.agentId, "\r");
      }
      if (options.updateSnapshot) {
        options.updateSnapshot(normalizeSnapshot(await noraAppClient.getSnapshot()));
      }
      return;
    } catch (error: unknown) {
      lastError = error;
      await new Promise((resolve) => globalThis.setTimeout(resolve, 500));
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to send task details to the new agent.");
}

export async function sendInstructionToAgent(
  agentId: string,
  instruction: string,
  updateSnapshot: UpdateSnapshot
): Promise<void> {
  await sendAgentTerminalText({
    agentId,
    text: instruction,
    submit: true,
    updateSnapshot
  });
}

export async function sendPromptToAgent(
  agentId: string,
  prompt: AgentPromptSubmission,
  updateSnapshot: UpdateSnapshot
): Promise<void> {
  await noraAgentClient.sendAgentPrompt(agentId, prompt);
  updateSnapshot(normalizeSnapshot(await noraAppClient.getSnapshot()));
}

export async function waitForAgentPromptReady(
  agentId: string,
  updateSnapshot: UpdateSnapshot
): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const next = normalizeSnapshot(await noraAppClient.getSnapshot());
    const agent = next.agents.find((entry) => entry.id === agentId) ?? null;
    updateSnapshot(next);

    if (agent?.status === "running") {
      await new Promise((resolve) => globalThis.setTimeout(resolve, 200));
      return;
    }

    await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
  }
}

async function waitForAgentConversationReady(
  agentId: string,
  updateSnapshot: UpdateSnapshot
): Promise<void> {
  let acceptedTrustPrompt = false;
  let acceptedModelPrompt = false;
  let acceptedContinuePrompt = false;
  let promptReadyAt: number | null = null;
  let codexRunningSinceMs: number | null = null;
  let geminiRunningSinceMs: number | null = null;
  let geminiLastNormalizedOutput = "";
  let geminiStableIterations = 0;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const next = normalizeSnapshot(await noraAppClient.getSnapshot());
    const agent = next.agents.find((entry) => entry.id === agentId) ?? null;
    updateSnapshot(next);

    if (!agent) {
      throw new Error("Agent session could not be found while waiting for prompt readiness.");
    }

    const buffer = await noraAgentClient.getAgentTerminalBuffer(agentId);
    const plainOutput = buffer.replace(/\x1B\[[0-9;?]*[ -/]*[@-~]/g, "").replace(/\s+/g, " ");

    if (agent.toolId === "codex") {
      const hasTrustPrompt = plainOutput.includes("Do you trust the contents of this directory?");
      const hasModelPrompt = plainOutput.includes("Choose how you'd like Codex to proceed.");
      const hasContinuePrompt = plainOutput.includes("Press enter to continue");

      if (!acceptedTrustPrompt && hasTrustPrompt) {
        acceptedTrustPrompt = true;
        await noraAgentClient.sendAgentTerminalInput(agentId, "1");
        await noraAgentClient.sendAgentTerminalInput(agentId, "\r");
      }

      if (!acceptedModelPrompt && hasModelPrompt) {
        acceptedModelPrompt = true;
        await noraAgentClient.sendAgentTerminalInput(agentId, "1");
        await noraAgentClient.sendAgentTerminalInput(agentId, "\r");
      }

      if (!acceptedContinuePrompt && hasContinuePrompt) {
        acceptedContinuePrompt = true;
        await noraAgentClient.sendAgentTerminalInput(agentId, "\r");
      }

      const promptReady =
        plainOutput.includes("Tip: Use /mcp to list configured MCP tools.") ||
        plainOutput.includes("Summarize recent commits") ||
        plainOutput.includes(" /status");

      if (promptReady && promptReadyAt === null) {
        promptReadyAt = Date.now();
      }

      if (promptReadyAt !== null && Date.now() - promptReadyAt > 1200) {
        return;
      }

      const hasPendingStartupPrompt =
        (hasTrustPrompt && !acceptedTrustPrompt) ||
        (hasModelPrompt && !acceptedModelPrompt) ||
        (hasContinuePrompt && !acceptedContinuePrompt);

      if (agent.status !== "running") {
        codexRunningSinceMs = null;
      } else if (codexRunningSinceMs === null) {
        codexRunningSinceMs = Date.now();
      }

      // Do not hand off while the PTY is "running" but Codex has not printed
      // anything yet: the first prompt can be dropped and the UI still shows
      // context entries from sendAgentPrompt. Require a short warm-up and
      // either visible output or a longer fallback delay (new Codex banners).
      const CODEX_HANDOFF_MIN_MS = 900;
      const CODEX_HANDOFF_FALLBACK_MS = 2_800;
      const CODEX_HANDOFF_MIN_BUFFER = 40;
      const elapsedSinceRunning =
        agent.status === "running" && codexRunningSinceMs !== null ? Date.now() - codexRunningSinceMs : 0;
      const bufferLooksReady =
        plainOutput.length >= CODEX_HANDOFF_MIN_BUFFER ||
        promptReady ||
        hasTrustPrompt ||
        hasModelPrompt ||
        hasContinuePrompt;
      const codexCanAcceptHandoff =
        agent.status === "running" &&
        !hasPendingStartupPrompt &&
        elapsedSinceRunning >= CODEX_HANDOFF_MIN_MS &&
        (bufferLooksReady || elapsedSinceRunning >= CODEX_HANDOFF_FALLBACK_MS);

      if (codexCanAcceptHandoff) {
        return;
      }
    } else if (agent.toolId === "gemini") {
      const GEMINI_MIN_MS_AFTER_RUNNING = 1_600;
      const GEMINI_STABLE_ITERATIONS = 3;
      const GEMINI_MIN_BUFFER_CHARS = 32;
      const GEMINI_FALLBACK_MAX_MS = 8_000;
      const GEMINI_POST_IDLE_MS = 300;

      if (agent.status !== "running") {
        geminiRunningSinceMs = null;
        geminiLastNormalizedOutput = "";
        geminiStableIterations = 0;
      } else {
        if (geminiRunningSinceMs === null) {
          geminiRunningSinceMs = Date.now();
        }

        const elapsed = Date.now() - geminiRunningSinceMs;

        if (plainOutput !== geminiLastNormalizedOutput) {
          geminiLastNormalizedOutput = plainOutput;
          geminiStableIterations = 0;
        } else if (plainOutput.length >= GEMINI_MIN_BUFFER_CHARS) {
          geminiStableIterations += 1;
        }

        const outputSettled =
          elapsed >= GEMINI_MIN_MS_AFTER_RUNNING &&
          geminiStableIterations >= GEMINI_STABLE_ITERATIONS;
        const giveUpAndProceed = elapsed >= GEMINI_FALLBACK_MAX_MS;

        if (outputSettled || giveUpAndProceed) {
          await new Promise((resolve) => globalThis.setTimeout(resolve, GEMINI_POST_IDLE_MS));
          return;
        }
      }
    } else if (agent.status === "running") {
      await new Promise((resolve) => globalThis.setTimeout(resolve, 200));
      return;
    }

    await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
  }
}

export async function handoffPromptToAgent(options: {
  agentId: string;
  prompt: AgentPromptSubmission;
  updateSnapshot: UpdateSnapshot;
  focusAgent?: (agentId: string) => Promise<void>;
}): Promise<void> {
  if (options.focusAgent) {
    await options.focusAgent(options.agentId);
  }

  queueAgentInputDraftHandoff(options.agentId, options.prompt.text);
  await waitForAgentConversationReady(options.agentId, options.updateSnapshot);
  await sendPromptToAgent(options.agentId, options.prompt, options.updateSnapshot);
}
