/** A save lost a race with another editor while waiting for the settings queue. */
export class BotRevisionConflict extends Error {
  constructor() { super("This bot changed. Reload bots and try again."); }
}
