/** Request budgets. The runtime sits behind a tunnel to a possibly sleepy laptop, so reads get more room than probes. */
export const REQUEST_TIMEOUTS = Object.freeze({
  probeMs: 5_000,
  runtimeMs: 15_000,
  commandMs: 20_000,
  directoryMs: 12_000
});
