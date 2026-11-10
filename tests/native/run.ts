import { execFile } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { openLocalHost } from "@main/execution/localHost";
import type { ExecutionHost } from "@main/execution/host";
import type { AcceptanceConfig, AcceptanceReport } from "./types/acceptance.types";
import { prepareEnvironment } from "./environment";
import { observe, settle } from "./observe";
import { edit, instruction, interrupt, startAndEdit } from "./scenarios";
import { readNativeOutcome } from "./recovery";
import { crashAcceptance } from "./crash/run";

const execFileAsync = promisify(execFile);

async function run(): Promise<void> {
  if (process.env.NORA_NATIVE_LIVE !== "1") throw new Error("Set NORA_NATIVE_LIVE=1 to explicitly enable authenticated, potentially billable native acceptance");
  const provider = z.enum(["codex", "claude"]).parse(process.env.NORA_NATIVE_PROVIDER);
  const scenario = z.enum(["lifecycle", "approval", "question", "signed-out", "host-crash", "provider-crash"]).parse(process.env.NORA_NATIVE_SCENARIO ?? "lifecycle");
  const config: AcceptanceConfig = { provider, scenario,
    executable: (provider === "codex" ? process.env.NORA_CODEX_EXECUTABLE : process.env.NORA_CLAUDE_EXECUTABLE) ?? provider,
    authFile: provider === "codex" ? process.env.NORA_NATIVE_AUTH_FILE : undefined, model: process.env.NORA_NATIVE_MODEL,
    reportPath: process.env.NORA_NATIVE_REPORT ?? join(tmpdir(), `nora-native-${provider}-acceptance.json`) };
  const runtime = (await execFileAsync(config.executable, ["--version"], { timeout: 10_000 })).stdout.trim();
  const report: AcceptanceReport = { outcome: "partial", provider, scenario, runtime, model: null, checkedAt: new Date().toISOString(), checks: [], workspaceRemoved: false };
  const environment = await prepareEnvironment(config);
  let host: ExecutionHost | null = null; let stop = (): void => {};
  try {
    if (scenario === "host-crash" || scenario === "provider-crash") { await crashAcceptance(config, environment, report); return; }
    host = await openLocalHost(environment.options);
    const catalog = await host.catalog(provider, "acceptance", environment.selection);
    if (catalog.status !== "available") throw new Error("Native catalog unavailable");
    const model = config.model ? catalog.catalog.models.find((entry) => entry.id === config.model) : catalog.catalog.models[0];
    if (!model) throw new Error("No supported model selected");
    report.model = model.id;
    report.checks.push({ name: "catalog", status: "passed", detail: `authentication-${catalog.catalog.authentication}` });
    if (provider === "claude" && !process.env.ANTHROPIC_API_KEY) {
      report.checks.push({ name: "authenticated-lifecycle", status: "unverified", detail: "ANTHROPIC_API_KEY-not-configured" }); process.exitCode = 2; return;
    }
    if (scenario !== "signed-out" && catalog.catalog.authentication === "required") {
      report.checks.push({ name: "authenticated-lifecycle", status: "unverified", detail: "provider-authentication-required" }); process.exitCode = 2; return;
    }
    await host.execute({ kind: "create", commandId: "create", conversationId: "acceptance", title: "Native acceptance", parentId: null,
      workspace: environment.selection, provider: { kind: provider, instanceId: "acceptance", model: model.id,
        reasoning: model.reasoningEfforts.includes("low") ? "low" : null, permissionPolicy: "acceptance" } });
    let view = observe(host); stop = view.stop;
    const context = { host, view, checks: report.checks };
    if (scenario === "approval") { await edit(context, environment.workspacePath); return; }
    if (scenario === "question") {
      const tool = provider === "codex" ? "request_user_input" : "AskUserQuestion";
      await instruction(context, "question", `Before any other action, use your native ${tool} tool to ask me a multiple-choice question with options A and B. Wait for my selection, then reply only with the selected option. Do not use other tools.`);
      const answered = [...view.requests.values()].some((request) => request.kind === "question" && request.status === "resolved");
      report.checks.push({ name: "native-question", status: answered ? "passed" : "unverified",
        detail: answered ? provider === "codex" ? "native-answer-confirmed-with-experimental-default-mode-flag" : "native-answer-confirmed"
          : "tool-not-requested-by-runtime" }); return;
    }
    if (scenario === "signed-out") {
      await host.execute({ kind: "submit", commandId: "signed-out", conversationId: "acceptance", runId: "signed-out", instruction: "Reply OK." });
      await settle(context, "signed-out");
      report.checks.push({ name: "signed-out", status: view.runs.get("signed-out")?.failure?.code === "authentication"
        && !host.header("acceptance")?.conversation.nativeConversationId ? "passed" : "failed", detail: "authentication-rejected-before-native-thread" }); return;
    }
    const nativeId = await startAndEdit(context, environment.workspacePath);
    const run = view.runs.get("start"); const conversation = host.header("acceptance")?.conversation;
    if (!run || !conversation) throw new Error("Native acceptance state unavailable");
    const execution = { run, snapshot: { cursor: host.eventCursor(), conversation, runs: [...view.runs.values()],
      requests: [...view.requests.values()], items: [...view.items.values()] } };
    const usage = [...view.runs.values()].some((entry) => entry.usage !== null);
    report.checks.push({ name: "native-usage", status: usage ? "passed" : "unverified", detail: "normalized-native-token-counts" });
    stop(); await host.shutdown();
    await readNativeOutcome(environment.options, execution, report.checks);
    host = await openLocalHost(environment.options);
    view = observe(host); stop = view.stop;
    const resumed = { host, view, checks: report.checks };
    await instruction(resumed, "restart-resume", "Reply with the marker from our first exchange. Do not use tools.");
    report.checks.push({ name: "restart-native-identity", status: host.header("acceptance")?.conversation.nativeConversationId === nativeId ? "passed" : "failed", detail: "persisted-native-identity" });
    const recalled = [...view.items.values()].some((item) => item.runId === "restart-resume" && item.kind === "message"
      && item.role === "assistant" && item.text.includes("NORA_NATIVE_START_OK"));
    report.checks.push({ name: "restart-context", status: recalled ? "passed" : "failed", detail: "recalled-first-exchange" });
    await interrupt(resumed);
    report.checks.push({ name: "native-question", status: "unverified", detail: "not-induced-in-this-run" },
      { name: "usage-limit", status: "unverified", detail: "quota-not-deliberately-exhausted" },
      { name: "lost-owner-recovery", status: "unverified", detail: "requires-separate-process-loss-scenario" });
  } catch {
    report.checks.push({ name: "acceptance-run", status: "failed", detail: "native-lifecycle-did-not-satisfy-acceptance" });
    process.exitCode = 1;
  } finally {
    stop();
    if (host) await host.shutdown().catch(() => { process.exitCode = 1; });
    await rm(environment.directory, { recursive: true, force: true }); report.workspaceRemoved = true;
    report.outcome = process.exitCode === 1 || report.checks.some((check) => check.status === "failed") ? "failed"
      : report.checks.some((check) => check.name === "authenticated-lifecycle" && check.status === "unverified") ? "blocked"
      : report.checks.some((check) => check.status === "unverified") ? "partial" : "passed";
    await writeFile(config.reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
    console.log(JSON.stringify(report));
    process.exitCode = report.outcome === "failed" ? 1 : report.outcome === "passed" ? 0 : 2;
  }
}

void run().catch(() => { console.error("Native acceptance setup failed; check the opt-in, runtime and isolated credential configuration"); process.exitCode = 1; });
