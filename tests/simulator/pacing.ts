/** Human-paced defaults; acceptance tests can scale waits without changing the scripted events. */
export const simulatorPacing = {
  firstResponseMs: 1500,
  actionGapMs: 650,
  toolRunMs: 1800,
  responseGapMs: 800,
  textChunkCharacters: 6,
  textChunkMs: 120,
  requestExpiryMs: 2000
} as const;
