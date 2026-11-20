import { z } from "zod";

export const SECRET_NAME_MAX = 64;
export const SECRET_PURPOSE_MAX = 300;
/** Room for certificates and service-account files, which are the largest secrets people hand over. */
export const SECRET_VALUE_MAX = 32_768;
export const SECRET_COMMAND_MAX = 8000;

/** Names double as the environment variable a command reads the secret from. */
export const secretNameSchema = z.string().max(SECRET_NAME_MAX)
  .regex(/^[A-Z][A-Z0-9_]*$/, "Secret names use capital letters, digits and underscores, like GITHUB_TOKEN");
/** A workspace secret is offered only to that workspace's threads and wins over an everywhere secret of the same name. */
export const secretScopeSchema = z.enum(["workspace", "everywhere"]);
export const secretSummarySchema = z.object({ name: secretNameSchema, purpose: z.string(), scope: secretScopeSchema, updatedAt: z.string().min(1) }).strict();

/** A saved secret as Settings lists it; a null `projectId` means it applies in every workspace. */
export const vaultSecretSchema = z.object({ name: secretNameSchema, purpose: z.string(), projectId: z.string().min(1).nullable(), updatedAt: z.string().min(1) }).strict();
export const vaultSecretListSchema = z.array(vaultSecretSchema);
export const secretValueSchema = z.string().min(1, "Enter a value to save").max(SECRET_VALUE_MAX, "This value is too long to save");

const promptBase = {
  id: z.string().min(1),
  /** The asking thread first, then its parents; any of them may show the prompt, since a bot asked from another thread is not on screen. */
  conversationIds: z.array(z.string().min(1)).min(1),
  /** Who is asking: a bot's name, or Nora. */
  requester: z.string().min(1),
  /** The workspace the asking thread runs in, which a workspace-scoped secret is saved for. */
  projectId: z.string().min(1),
  workspaceName: z.string().min(1),
  createdAt: z.string().min(1)
};
/** What the window is shown while a tool call waits on the user. Prompts never carry a secret's value. */
export const secretPromptSchema = z.discriminatedUnion("kind", [
  z.object({ ...promptBase, kind: z.literal("input"), name: secretNameSchema, purpose: z.string(), scope: secretScopeSchema,
    multiline: z.boolean(), replaces: z.boolean() }).strict(),
  z.object({ ...promptBase, kind: z.literal("use"), command: z.string().min(1), secrets: z.array(secretNameSchema).min(1) }).strict()
]);
export const secretPromptListSchema = z.array(secretPromptSchema);

const promptId = z.string().min(1);
export const secretPromptAnswerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("save"), promptId, value: secretValueSchema }).strict(),
  /** `remember` lets the asking thread use the same secrets again without another prompt, until Nora restarts. */
  z.object({ kind: z.literal("allow"), promptId, remember: z.boolean() }).strict(),
  z.object({ kind: z.literal("decline"), promptId }).strict()
]);
