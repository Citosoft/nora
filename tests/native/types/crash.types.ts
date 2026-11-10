import type { z } from "zod";
import type { ChildProcess } from "node:child_process";
import type { crashConfigSchema, workerMessageSchema, auditSchema } from "../crash/schema";

export type CrashConfig = z.infer<typeof crashConfigSchema>;
export type CrashMessage = z.infer<typeof workerMessageSchema>;
export type CrashAudit = z.infer<typeof auditSchema>;
export interface CrashWorker {
  process: ChildProcess;
  messages: CrashMessage[];
  closed: Promise<void>;
  stop: () => Promise<void>;
}
