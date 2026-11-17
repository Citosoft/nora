import type { AppDomainState, AppState } from "@shared/appTypes";

export interface AppStateProjection {
  snapshot: AppState;
  domainState: AppDomainState;
}
