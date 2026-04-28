import type { MainServices } from "../types/mainServices.types";

const freezeServiceDomain = <T extends object>(domain: T): T => Object.freeze({ ...domain });

export function createMainServices(services: MainServices): MainServices {
  return Object.freeze({
    snapshot: freezeServiceDomain(services.snapshot),
    workspace: freezeServiceDomain(services.workspace),
    session: freezeServiceDomain(services.session),
    tooling: freezeServiceDomain(services.tooling),
    forge: freezeServiceDomain(services.forge),
    deployment: freezeServiceDomain(services.deployment)
  });
}

export type { MainServices } from "../types/mainServices.types";
