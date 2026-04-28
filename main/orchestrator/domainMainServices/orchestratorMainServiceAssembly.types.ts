import type { MainServices, SnapshotService } from "../../types/mainServices.types";

/**
 * Snapshot reads (state + terminal surfaces) wired independently from
 * workspace/session so snapshot stays a narrow transport boundary.
 */
export type SnapshotMainServiceTransport = Pick<
  SnapshotService,
  "getSnapshot" | "getTerminalBuffer" | "getLocalTerminalState"
>;

export type DomainMainServicesBundle = {
  snapshot: MainServices["snapshot"];
  workspace: MainServices["workspace"];
  session: MainServices["session"];
  tooling: MainServices["tooling"];
  forge: MainServices["forge"];
};
