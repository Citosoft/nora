export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const nowIso = (): string => new Date().toISOString();

export const futureIso = (milliseconds: number): string =>
  new Date(Date.now() + milliseconds).toISOString();
