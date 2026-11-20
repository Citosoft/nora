import { redactSecrets } from "./redaction";
import { secretLocation } from "./store";
import type { SecretService, SecretServiceOptions } from "@main/types/secrets/secrets.types";

/**
 * Everything a thread can do with secrets, with the user in the loop at both ends: they type the value into Nora's own dialog,
 * and they approve each command it is handed to. Callers get names and outcomes back, never a value.
 */
export function createSecretService({ store, prompts, runCommand }: SecretServiceOptions): SecretService {
  /** Secrets the user allowed a thread to keep using, by conversation. Kept in memory so approval never outlives the app session. */
  const grants = new Map<string, Set<string>>();
  const granted = (conversationId: string, names: readonly string[]): boolean => names.every((name) => grants.get(conversationId)?.has(name));

  return {
    list: (projectId) => store.list(projectId),
    vault: () => store.all(),
    save: (secret) => store.save(secret),
    remove: (location) => store.remove(location),
    pending: () => prompts.pending(),
    async request(input, origin, signal) {
      const outcome = await prompts.ask({ kind: "input", conversationIds: [...origin.conversationIds], requester: origin.requester,
        projectId: origin.projectId, workspaceName: origin.workspaceName, name: input.name, purpose: input.purpose, scope: input.scope, multiline: input.multiline,
        replaces: store.has(secretLocation(input.name, input.scope, origin.projectId)) }, signal);
      return outcome.kind === "allowed" ? "unanswered" : outcome.kind;
    },
    async run(input, origin, signal) {
      const names = [...new Set(input.secrets)];
      // Fails on a missing or unreadable secret before the user is asked to approve anything.
      const values = store.values(names, origin.projectId);
      if (!granted(origin.conversationId, names)) {
        const outcome = await prompts.ask({ kind: "use", conversationIds: [...origin.conversationIds], requester: origin.requester,
          projectId: origin.projectId, workspaceName: origin.workspaceName, command: input.command, secrets: names }, signal);
        if (outcome.kind !== "allowed") return { kind: outcome.kind === "declined" ? "declined" : "unanswered" };
        if (outcome.remember) grants.set(origin.conversationId, new Set([...(grants.get(origin.conversationId) ?? []), ...names]));
      }
      const result = await runCommand({ command: input.command, cwd: input.cwd, env: Object.fromEntries(values), timeoutMs: input.timeoutMs, signal });
      return { kind: "ran", exitCode: result.exitCode, timedOut: result.timedOut, output: redactSecrets(result.output, values) };
    },
    answer(answer) {
      const prompt = prompts.get(answer.promptId);
      if (!prompt) throw new Error("This request is no longer waiting for an answer.");
      if (answer.kind === "decline") { prompts.settle(prompt.id, { kind: "declined" }); return; }
      if (answer.kind === "save" && prompt.kind === "input") {
        // Stored before the prompt settles, so a locked keychain surfaces in the dialog and the user can retry.
        store.save({ ...secretLocation(prompt.name, prompt.scope, prompt.projectId), purpose: prompt.purpose, value: answer.value });
        prompts.settle(prompt.id, { kind: "saved" });
        return;
      }
      if (answer.kind === "allow" && prompt.kind === "use") { prompts.settle(prompt.id, { kind: "allowed", remember: answer.remember }); return; }
      throw new Error("That answer does not fit this request.");
    }
  };
}
