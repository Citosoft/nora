import type { ProvisioningService } from "../../src/types/provisioning.types";
import type { FakeClerkMetadata } from "../fakes/fakeClerkMetadata";
import type { FakeRateLimiter } from "../fakes/harness";
import type { FakeTunnelProvider } from "../fakes/fakeTunnelProvider";

export interface Harness {
  readonly clerk: FakeClerkMetadata;
  readonly tunnels: FakeTunnelProvider;
  readonly limiter: FakeRateLimiter;
  readonly service: ProvisioningService;
  readonly handle: (request: Request) => Promise<Response>;
  /** Moves the fake clock forward so registrations get distinct timestamps. */
  readonly tick: () => void;
}
