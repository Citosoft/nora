import type {
  ProjectScaffoldComponentCategory,
  ProjectScaffoldComponentGroup,
  ProjectScaffoldOption
} from "@/components/app/types/projectScaffoldWizard.types";

const CATEGORY_ORDER: ProjectScaffoldComponentCategory[] = [
  "foundation",
  "ui",
  "application",
  "data",
  "auth",
  "platform",
  "operations",
  "features"
];

const CATEGORY_LABELS: Record<ProjectScaffoldComponentCategory, string> = {
  foundation: "Foundation",
  ui: "UI & Styling",
  application: "Application",
  data: "Data & State",
  auth: "Authentication",
  platform: "Platform & Runtime",
  operations: "Operations",
  features: "Features & Integrations"
};

const UI_OPTION_IDS = new Set([
  "blade", "blocks", "chakra-ui", "dash-bootstrap", "edge", "gutenberg-block", "inertia-react",
  "jinja", "material", "material-ui", "mdx", "nativewind", "open-wc", "react", "shadcn",
  "shared-ui", "storybook", "tailwind", "twig", "vue"
]);

const APPLICATION_OPTION_IDS = new Set([
  "app-router", "blueprints", "config", "controllers", "expo-router", "go-router", "graphql", "hotwire",
  "htmx", "liveview", "minimal-api", "multipage", "pinia", "qwik-city", "react-navigation", "react-router",
  "redux-toolkit", "routing", "server-functions", "shell-navigation", "signals", "solid-router", "tanstack-query",
  "vue-router", "zustand"
]);

const DATA_OPTION_IDS = new Set([
  "alembic", "celery", "d1", "data-jpa", "diesel", "doctrine", "drizzle", "ecto", "entity-framework",
  "exposed", "gorm", "kv", "lucid", "neon", "pandas", "plotly", "postgresql", "prisma", "pydantic",
  "queue", "queues", "r2", "riverpod", "sql-delight", "sqlalchemy", "sqlc", "sqlite", "sqlx", "storage",
  "swiftdata", "typeorm"
]);

const AUTH_OPTION_IDS = new Set([
  "auth", "auth-js", "auth-jwt", "authentication", "better-auth", "clerk", "devise", "django-allauth",
  "firebase", "flask-login", "jwt", "jwt-auth", "sanctum", "security", "supabase"
]);

const PLATFORM_OPTION_IDS = new Set([
  "2d", "3d", "adapter-auto", "android", "async-await", "capacitor", "cloudflare", "cloudkit", "csharp",
  "desktop", "durable-objects", "eas", "electron-forge", "gdscript", "ios", "macos", "multiplayer",
  "native-plugins", "rust-commands", "server-rendered", "tokio", "web", "workers-ai"
]);

const OPERATIONS_OPTION_IDS = new Set([
  "auto-updater", "auto-updates", "cargo-dist", "changesets", "docker", "github-actions", "opentelemetry",
  "semantic-release", "sentry", "tracing", "wp-env"
]);

const FOUNDATION_OPTION_IDS = new Set([
  "dual-package", "plugin", "shared-config", "standalone", "typescript", "uv", "vite"
]);

export function resolveProjectScaffoldComponentCategory(optionId: string): ProjectScaffoldComponentCategory {
  if (FOUNDATION_OPTION_IDS.has(optionId)) return "foundation";
  if (UI_OPTION_IDS.has(optionId)) return "ui";
  if (APPLICATION_OPTION_IDS.has(optionId)) return "application";
  if (DATA_OPTION_IDS.has(optionId)) return "data";
  if (AUTH_OPTION_IDS.has(optionId)) return "auth";
  if (PLATFORM_OPTION_IDS.has(optionId)) return "platform";
  if (OPERATIONS_OPTION_IDS.has(optionId)) return "operations";
  return "features";
}

export function groupProjectScaffoldComponentOptions(
  options: ProjectScaffoldOption[]
): ProjectScaffoldComponentGroup[] {
  const optionsByCategory = new Map<ProjectScaffoldComponentCategory, ProjectScaffoldOption[]>();

  for (const option of options) {
    const category = resolveProjectScaffoldComponentCategory(option.id);
    optionsByCategory.set(category, [...(optionsByCategory.get(category) ?? []), option]);
  }

  return CATEGORY_ORDER.flatMap((category) => {
    const categoryOptions = optionsByCategory.get(category);
    return categoryOptions?.length
      ? [{ category, label: CATEGORY_LABELS[category], options: categoryOptions }]
      : [];
  });
}
