import { z } from "zod";

/**
 * json-render prop expressions an app's UI may use in place of a literal prop. The catalog wraps every prop with `dynamic` so a spec
 * validates whether a value is written out or read from state at render time.
 */
const comparison = { eq: z.unknown().optional(), neq: z.unknown().optional(), gt: z.number().optional(), gte: z.number().optional(),
  lt: z.number().optional(), lte: z.number().optional(), not: z.boolean().optional() };
const singleCondition = z.union([z.object({ $state: z.string().min(1), ...comparison }).strict(), z.object({ $item: z.string(), ...comparison }).strict()]);
export const visibilityConditionSchema: z.ZodType<unknown> = z.lazy(() => z.union([z.boolean(), singleCondition, z.array(singleCondition),
  z.object({ $and: z.array(visibilityConditionSchema) }).strict(), z.object({ $or: z.array(visibilityConditionSchema) }).strict()]));

/** `$cond` branches are left open because their type is the wrapped prop's, which this schema cannot see. */
export const propExpressionSchema = z.union([
  z.object({ $state: z.string().min(1) }).strict(),
  z.object({ $item: z.string() }).strict(),
  z.object({ $index: z.literal(true) }).strict(),
  z.object({ $bindState: z.string().min(1) }).strict(),
  z.object({ $bindItem: z.string() }).strict(),
  z.object({ $template: z.string() }).strict(),
  z.object({ $cond: visibilityConditionSchema, $then: z.unknown(), $else: z.unknown() }).strict()
]);

/** A prop that is either the literal value or an expression resolved at render time. */
export const dynamic = <T extends z.ZodType>(literal: T) => z.union([literal, propExpressionSchema]);
