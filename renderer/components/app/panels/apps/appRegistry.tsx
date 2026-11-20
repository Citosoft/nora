import { defineRegistry } from "@json-render/react";
import { appCatalog } from "@shared/apps/catalog";
import { AppBadge, AppGrid, AppHeading, AppStack, AppTabs, AppText } from "./components/AppLayoutComponents";
import { AppCard } from "./components/AppCard";
import { AppKanban } from "./components/AppKanban";
import { AppImage, AppLink } from "./components/AppMediaComponents";
import { AppCalendar, AppTimeline } from "./components/AppTimeComponents";
import { AppChart, AppList, AppMetric, AppRecord, AppTable } from "./components/AppDataComponents";
import { AppButton, AppCheckbox, AppForm, AppInput, AppSelect, AppTextarea } from "./components/AppFormComponents";
import { AppDateRange } from "./components/AppDateRange";

/**
 * Every catalog component mapped to its Nora rendering. Actions are handled by the renderer's ActionProvider with the open app's
 * runtime, so the registry's own action handlers are no-ops that satisfy the catalog.
 */
export const { registry: appRegistry } = defineRegistry(appCatalog, {
  components: { Grid: AppGrid, Stack: AppStack, Card: AppCard, Tabs: AppTabs, Heading: AppHeading, Text: AppText, Badge: AppBadge, Image: AppImage, Link: AppLink, Metric: AppMetric, Table: AppTable, List: AppList, Kanban: AppKanban, Calendar: AppCalendar, Timeline: AppTimeline, Chart: AppChart, Record: AppRecord,
    Form: AppForm, Input: AppInput, Textarea: AppTextarea, Select: AppSelect, Checkbox: AppCheckbox, DateRange: AppDateRange, Button: AppButton },
  actions: { runAction: async () => undefined, refresh: async () => undefined }
});
