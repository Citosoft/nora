/** Web: the Web Crypto UUID (the app is served over HTTPS, a secure context). */
export const createId = (): string => globalThis.crypto.randomUUID();
