import type { SecretCodec } from "@main/types/secretEncryption.types";
import type { SecretPrompt, SecretPromptAnswer, SecretScope, SecretSummary, VaultSecret } from "@shared/types/secrets/secrets.types";

export interface SecretStoreOptions {
  path: string;
  /** Must refuse rather than store plaintext; see `createKeychainOnlyCodec`. */
  codec: SecretCodec;
  now(): string;
  /** Called with every saved secret after each write. */
  onChanged?(secrets: VaultSecret[]): void;
}
/** What identifies a saved secret: its name and the workspace it belongs to, or a null project for every workspace. */
export interface SecretLocation { name: string; projectId: string | null; }
export interface SecretSave extends SecretLocation { purpose: string; value: string; }
/** The registry of saved secrets. Only `values` ever decrypts, and only for a command about to run. */
export interface SecretStore {
  /** The secrets a workspace's threads can use, without values; a workspace secret hides an everywhere one of the same name. */
  list(projectId: string): SecretSummary[];
  /** Every saved secret in every scope, without values, for Settings. */
  all(): VaultSecret[];
  has(location: SecretLocation): boolean;
  save(secret: SecretSave): void;
  /** False when there was nothing to remove. */
  remove(location: SecretLocation): boolean;
  /** Decrypted values by name for one workspace; throws naming any secret that is missing or can no longer be read. */
  values(names: readonly string[], projectId: string): Map<string, string>;
}

/** A prompt before the broker gives it an id and a time. Distributes over the union so each kind keeps its own fields. */
export type SecretPromptDraft = SecretPrompt extends infer Prompt ? Prompt extends SecretPrompt ? Omit<Prompt, "id" | "createdAt"> : never : never;
/** How a prompt ended. `unanswered` covers a lapsed prompt and a tool call the runtime gave up on. */
export type SecretPromptOutcome = { kind: "saved" } | { kind: "allowed"; remember: boolean } | { kind: "declined" } | { kind: "unanswered" };
export interface SecretPromptBrokerOptions {
  nextId(): string;
  now(): string;
  /** How long a prompt waits before it lapses; kept under the runtimes' tool-call limit so the model hears back. */
  timeoutMs: number;
  onChanged(prompts: SecretPrompt[]): void;
}
/** Prompts waiting on the user, held in memory only: a prompt dies with the tool call that opened it. */
export interface SecretPromptBroker {
  ask(draft: SecretPromptDraft, signal: AbortSignal): Promise<SecretPromptOutcome>;
  pending(): SecretPrompt[];
  get(id: string): SecretPrompt | undefined;
  settle(id: string, outcome: SecretPromptOutcome): void;
}

export interface SecretCommandInput {
  command: string;
  cwd: string;
  /** Added to the app's own environment for this one process. */
  env: Readonly<Record<string, string>>;
  timeoutMs: number;
  signal: AbortSignal;
}
/** `output` is stdout and stderr in arrival order, unredacted; `exitCode` is null when the process was killed. */
export interface SecretCommandResult { exitCode: number | null; output: string; timedOut: boolean; }
export type SecretCommandRunner = (input: SecretCommandInput) => Promise<SecretCommandResult>;

/** The thread a tool call acts for, as the secret service needs it. */
export interface SecretOrigin {
  conversationId: string;
  /** The thread, then its parents; see the prompt contract. */
  conversationIds: readonly string[];
  requester: string;
  projectId: string;
  workspaceName: string;
}
export interface SecretRequestInput { name: string; purpose: string; scope: SecretScope; multiline: boolean; }
export interface SecretRunInput { command: string; secrets: readonly string[]; timeoutMs: number; cwd: string; }
/** A finished command with its output already redacted, or the user's refusal to run it. */
export type SecretRunOutcome = { kind: "ran"; exitCode: number | null; output: string; timedOut: boolean } | { kind: "declined" } | { kind: "unanswered" };
export interface SecretServiceOptions {
  store: SecretStore;
  prompts: SecretPromptBroker;
  runCommand: SecretCommandRunner;
}
export interface SecretService {
  /** Asks the user for a secret in the window's secure dialog and stores what they enter; the value never returns to the caller. */
  request(input: SecretRequestInput, origin: SecretOrigin, signal: AbortSignal): Promise<Exclude<SecretPromptOutcome["kind"], "allowed">>;
  list(projectId: string): SecretSummary[];
  vault(): VaultSecret[];
  /** Saves a secret the user typed into Settings. */
  save(secret: SecretSave): void;
  remove(location: SecretLocation): boolean;
  /** Runs a command with secrets in its environment once the user allows it, and redacts them from what it printed. */
  run(input: SecretRunInput, origin: SecretOrigin, signal: AbortSignal): Promise<SecretRunOutcome>;
  pending(): SecretPrompt[];
  /** The window's answer to a prompt. A save that cannot be stored throws and leaves the prompt open to retry. */
  answer(answer: SecretPromptAnswer): void;
}
