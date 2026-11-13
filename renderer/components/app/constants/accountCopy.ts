/** Omit generic welcome copy while preserving verification and recovery instructions. */
export const accountCopy = {
  signIn: { start: { subtitle: "" } },
  signUp: { start: { subtitle: "" } }
} as const;
