import { NORA_PROVIDER_KIND } from "@shared/providers/providerKinds";
import type { ProviderBinding } from "@shared/types/conversation/contracts.types";

/** Group chats run on Nora's coordinator; members answer with their own models, so this binding never names a real model. */
export const GROUP_BINDING: Readonly<ProviderBinding> = { kind: NORA_PROVIDER_KIND, instanceId: "group", model: "group", reasoning: null, permissionPolicy: "group" };
