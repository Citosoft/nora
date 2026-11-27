/** Names that conventionally hold credentials; such values are never put in a plan. */
const SECRET_NAME = /(key|token|secret|password|passwd|credential|auth|cookie|session)/i;

export function isSecretLikeName(name: string): boolean {
  return SECRET_NAME.test(name);
}
