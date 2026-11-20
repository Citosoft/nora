import type { z } from "zod";
import type { Spec } from "@json-render/core";
import type {
  appActionResultSchema, appActivityEntrySchema, appActionRunSchema, appActionSchema, appAlertSchema, appBuildStepSchema, appArgBindingSchema, appDefinitionSchema, appRenderDataSchema, appSourceErrorKindSchema,
  appConnectorSourceSchema, appFileSourceSchema, appSourcePageSchema, appSourceArgSchema, appSourceInputsSchema, appSourceRefreshSchema, appSourceSchema, appSourceStateSchema, appSpecInputSchema, appSpecSchema, appStateBindingSchema, appSummarySchema, appVersionSchema
} from "@shared/apps/contracts";
import type { appValueFormatSchema } from "@shared/apps/catalog";
import type { appIconSchema } from "@shared/apps/icons";

export type AppSourceRefresh = z.infer<typeof appSourceRefreshSchema>;
export type AppSource = z.infer<typeof appSourceSchema>;
export type AppIcon = z.infer<typeof appIconSchema>;
export type AppConnectorSource = z.infer<typeof appConnectorSourceSchema>;
export type AppSourcePage = z.infer<typeof appSourcePageSchema>;
export type AppFileSource = z.infer<typeof appFileSourceSchema>;
export type AppStateBinding = z.infer<typeof appStateBindingSchema>;
export type AppSourceArg = z.infer<typeof appSourceArgSchema>;
/** Values for bound source arguments, keyed by source id then argument name. */
export type AppSourceInputs = z.infer<typeof appSourceInputsSchema>;
export type AppArgBinding = z.infer<typeof appArgBindingSchema>;
export type AppAction = z.infer<typeof appActionSchema>;
export type AppAlert = z.infer<typeof appAlertSchema>;
export type AppSpec = z.infer<typeof appSpecSchema>;
/** A spec as the agent sends it, before validation; its UI is only checked for shape here. */
export type AppSpecInput = z.infer<typeof appSpecInputSchema>;
export type AppUiSpec = Spec;
export type AppDefinition = z.infer<typeof appDefinitionSchema>;
export type AppSummary = z.infer<typeof appSummarySchema>;
export type AppVersion = z.infer<typeof appVersionSchema>;
export type AppSourceErrorKind = z.infer<typeof appSourceErrorKindSchema>;
export type AppSourceState = z.infer<typeof appSourceStateSchema>;
export type AppRenderData = z.infer<typeof appRenderDataSchema>;
export type AppActionResult = z.infer<typeof appActionResultSchema>;
export type AppActivityEntry = z.infer<typeof appActivityEntrySchema>;
export type AppBuildStep = z.infer<typeof appBuildStepSchema>;
export type AppActionRun = z.infer<typeof appActionRunSchema>;
export type AppValueFormat = z.infer<typeof appValueFormatSchema>;
