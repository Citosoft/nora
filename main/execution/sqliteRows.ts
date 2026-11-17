import { z } from "zod";

const jsonRowSchema = z.object({ json: z.string() });

export function readJsonRow<T>(row: unknown, schema: z.ZodType<T>): T {
  return schema.parse(JSON.parse(jsonRowSchema.parse(row).json));
}
