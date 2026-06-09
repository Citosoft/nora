import type { ProjectScaffoldFramework } from "@/components/app/types/projectScaffoldWizard.types";

export const PROJECT_SCAFFOLD_FRAMEWORKS: ProjectScaffoldFramework[] = [
  {
    id: "nextjs",
    label: "Next.js",
    language: "TypeScript / JavaScript",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=nextjs.org&sz=64",
    description: "React application with routing, server rendering, and full-stack patterns.",
    starterCommand: "npx create-next-app@latest",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use strict typed source files.", recommended: true },
      { id: "tailwind", label: "Tailwind CSS", description: "Add utility-first styling and base app styles.", recommended: true },
      { id: "app-router", label: "App Router", description: "Use the current Next.js app directory routing model.", recommended: true },
      { id: "eslint", label: "ESLint", description: "Configure linting for React and Next.js conventions." },
      { id: "auth-js", label: "Auth.js", description: "Add session-based authentication." },
      { id: "better-auth", label: "Better Auth", description: "Add typed authentication and account flows." },
      { id: "clerk", label: "Clerk", description: "Add hosted authentication and user management." },
      { id: "supabase", label: "Supabase", description: "Add authentication and managed PostgreSQL." },
      { id: "firebase", label: "Firebase", description: "Add authentication and managed application services." },
      { id: "prisma", label: "Prisma", description: "Add database schema, client, and migrations." },
      { id: "drizzle", label: "Drizzle", description: "Add typed SQL queries and migrations." },
      { id: "postgresql", label: "PostgreSQL", description: "Configure a PostgreSQL database." },
      { id: "sqlite", label: "SQLite", description: "Use a lightweight local database." },
      { id: "neon", label: "Neon", description: "Add serverless PostgreSQL integration." },
      { id: "shadcn", label: "shadcn/ui", description: "Add accessible composable UI components." },
      { id: "material-ui", label: "Material UI", description: "Add Material Design React components." },
      { id: "chakra-ui", label: "Chakra UI", description: "Add accessible styled React components." },
      { id: "storybook", label: "Storybook", description: "Add isolated component development." },
      { id: "tanstack-query", label: "TanStack Query", description: "Add server-state fetching and caching." },
      { id: "zustand", label: "Zustand", description: "Add lightweight client state management." },
      { id: "redux-toolkit", label: "Redux Toolkit", description: "Add structured application state management." },
      { id: "docker", label: "Docker", description: "Add local and production container setup." },
      { id: "github-actions", label: "GitHub Actions", description: "Add lint, test, and build workflows." },
      { id: "sentry", label: "Sentry", description: "Add error and performance monitoring." },
      { id: "opentelemetry", label: "OpenTelemetry", description: "Add traces and application telemetry." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add fast unit tests for app logic.", recommended: true },
      { id: "playwright", label: "Playwright", description: "Add browser-level smoke and flow tests." },
      { id: "testing-library", label: "Testing Library", description: "Add React component interaction tests." },
      { id: "msw", label: "MSW", description: "Mock HTTP requests in tests." },
      { id: "storybook-tests", label: "Storybook Tests", description: "Add component interaction and accessibility tests." }
    ]
  },
  {
    id: "vite-react",
    label: "Vite React",
    language: "TypeScript / JavaScript",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=vite.dev&sz=64",
    description: "Client-rendered React app with fast local dev and simple bundling.",
    starterCommand: "npm create vite@latest",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed React components.", recommended: true },
      { id: "tailwind", label: "Tailwind CSS", description: "Add utility-first styling.", recommended: true },
      { id: "react-router", label: "React Router", description: "Add browser routing for multi-page flows." },
      { id: "eslint", label: "ESLint", description: "Configure linting for React source." },
      { id: "shadcn", label: "shadcn/ui", description: "Add accessible composable UI components." },
      { id: "material-ui", label: "Material UI", description: "Add Material Design React components." },
      { id: "chakra-ui", label: "Chakra UI", description: "Add accessible styled React components." },
      { id: "storybook", label: "Storybook", description: "Add isolated component development." },
      { id: "tanstack-query", label: "TanStack Query", description: "Add server-state fetching and caching." },
      { id: "zustand", label: "Zustand", description: "Add lightweight client state management." },
      { id: "redux-toolkit", label: "Redux Toolkit", description: "Add structured application state management." },
      { id: "supabase", label: "Supabase", description: "Add managed database and authentication." },
      { id: "firebase", label: "Firebase", description: "Add authentication and managed application services." },
      { id: "sentry", label: "Sentry", description: "Add error and performance monitoring." },
      { id: "github-actions", label: "GitHub Actions", description: "Add lint, test, and build workflows." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add unit tests with Vite-native tooling.", recommended: true },
      { id: "testing-library", label: "Testing Library", description: "Add React DOM interaction tests.", recommended: true },
      { id: "playwright", label: "Playwright", description: "Add end-to-end browser tests." },
      { id: "msw", label: "MSW", description: "Mock API requests in tests." },
      { id: "storybook-tests", label: "Storybook Tests", description: "Add component interaction and accessibility tests." }
    ]
  },
  {
    id: "vue",
    label: "Vue",
    language: "TypeScript / JavaScript",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=vuejs.org&sz=64",
    description: "Progressive frontend app with Vue single-file components and a flexible ecosystem.",
    starterCommand: "npm create vue@latest",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed Vue components.", recommended: true },
      { id: "vue-router", label: "Vue Router", description: "Add client-side routing.", recommended: true },
      { id: "pinia", label: "Pinia", description: "Add Vue's standard state management.", recommended: true },
      { id: "tailwind", label: "Tailwind CSS", description: "Add utility-first styling." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add Vue-friendly unit tests.", recommended: true },
      { id: "testing-library", label: "Testing Library", description: "Add component interaction tests." },
      { id: "playwright", label: "Playwright", description: "Add browser-level flow tests." }
    ]
  },
  {
    id: "nuxt",
    label: "Nuxt",
    language: "TypeScript / JavaScript",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=nuxt.com&sz=64",
    description: "Vue full-stack framework with routing, server rendering, and deployment presets.",
    starterCommand: "npx nuxi@latest init",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed Nuxt app source.", recommended: true },
      { id: "tailwind", label: "Tailwind CSS", description: "Add utility-first styling.", recommended: true },
      { id: "pinia", label: "Pinia", description: "Add shared Vue state management." },
      { id: "content", label: "Nuxt Content", description: "Add markdown/content collections." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add unit tests for composables and utilities.", recommended: true },
      { id: "playwright", label: "Playwright", description: "Add browser smoke tests.", recommended: true },
      { id: "eslint", label: "ESLint", description: "Add linting for Nuxt and Vue files." }
    ]
  },
  {
    id: "angular",
    label: "Angular",
    language: "TypeScript",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=angular.dev&sz=64",
    description: "Enterprise TypeScript app with Angular components, routing, dependency injection, and CLI tooling.",
    starterCommand: "npx @angular/cli@latest new",
    componentOptions: [
      { id: "routing", label: "Routing", description: "Add Angular Router setup.", recommended: true },
      { id: "standalone", label: "Standalone Components", description: "Use modern standalone component structure.", recommended: true },
      { id: "material", label: "Angular Material", description: "Add Material UI components." },
      { id: "signals", label: "Signals", description: "Use signal-based state patterns." }
    ],
    testingOptions: [
      { id: "karma", label: "Karma", description: "Use the default Angular unit test setup." },
      { id: "jest", label: "Jest", description: "Use Jest for unit tests.", recommended: true },
      { id: "playwright", label: "Playwright", description: "Add end-to-end browser tests.", recommended: true }
    ]
  },
  {
    id: "remix",
    label: "Remix",
    language: "TypeScript / JavaScript",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=remix.run&sz=64",
    description: "React full-stack app focused on nested routing, loaders, actions, and web standards.",
    starterCommand: "npx create-remix@latest",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed routes and server code.", recommended: true },
      { id: "tailwind", label: "Tailwind CSS", description: "Add utility-first styling.", recommended: true },
      { id: "prisma", label: "Prisma", description: "Add database client and schema workflow." },
      { id: "eslint", label: "ESLint", description: "Add React and Remix linting." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add unit tests for loaders and utilities.", recommended: true },
      { id: "testing-library", label: "Testing Library", description: "Add React interaction tests." },
      { id: "playwright", label: "Playwright", description: "Add end-to-end route tests.", recommended: true }
    ]
  },
  {
    id: "solidstart",
    label: "SolidStart",
    language: "TypeScript / JavaScript",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=solidjs.com&sz=64",
    description: "Solid full-stack app with fine-grained reactivity and server rendering.",
    starterCommand: "npm create solid@latest",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed Solid components.", recommended: true },
      { id: "tailwind", label: "Tailwind CSS", description: "Add utility-first styling." },
      { id: "solid-router", label: "Solid Router", description: "Add route-based app structure.", recommended: true },
      { id: "server-functions", label: "Server Functions", description: "Add server action patterns." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add unit tests.", recommended: true },
      { id: "testing-library", label: "Testing Library", description: "Add Solid component tests." },
      { id: "playwright", label: "Playwright", description: "Add browser smoke tests." }
    ]
  },
  {
    id: "qwik",
    label: "Qwik",
    language: "TypeScript / JavaScript",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=qwik.dev&sz=64",
    description: "Resumable web app framework optimized for startup performance and fine-grained loading.",
    starterCommand: "npm create qwik@latest",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed Qwik components.", recommended: true },
      { id: "qwik-city", label: "Qwik City", description: "Add routing and server rendering.", recommended: true },
      { id: "tailwind", label: "Tailwind CSS", description: "Add utility-first styling." },
      { id: "cloudflare", label: "Cloudflare Adapter", description: "Prepare edge deployment." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add unit tests.", recommended: true },
      { id: "playwright", label: "Playwright", description: "Add browser tests.", recommended: true },
      { id: "eslint", label: "ESLint", description: "Add Qwik linting." }
    ]
  },
  {
    id: "lit",
    label: "Lit",
    language: "TypeScript / JavaScript",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=lit.dev&sz=64",
    description: "Web Components app or library using Lit's lightweight reactive component model.",
    starterCommand: "npm init @open-wc",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed web components.", recommended: true },
      { id: "open-wc", label: "Open WC", description: "Use Open Web Components tooling.", recommended: true },
      { id: "storybook", label: "Storybook", description: "Add component documentation." },
      { id: "custom-elements-manifest", label: "Custom Elements Manifest", description: "Generate component metadata." }
    ],
    testingOptions: [
      { id: "web-test-runner", label: "Web Test Runner", description: "Add browser-native unit tests.", recommended: true },
      { id: "playwright", label: "Playwright", description: "Add interaction tests." },
      { id: "eslint", label: "ESLint", description: "Add linting for web components." }
    ]
  },
  {
    id: "alpine",
    label: "Alpine.js",
    language: "JavaScript",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=alpinejs.dev&sz=64",
    description: "Lightweight progressive enhancement for server-rendered HTML.",
    starterCommand: null,
    componentOptions: [
      { id: "vite", label: "Vite", description: "Use a small Vite asset pipeline.", recommended: true },
      { id: "tailwind", label: "Tailwind CSS", description: "Add utility-first styling.", recommended: true },
      { id: "htmx", label: "HTMX", description: "Add HTML-over-the-wire interactions." },
      { id: "server-rendered", label: "Server-rendered Pages", description: "Keep markup owned by the backend.", recommended: true }
    ],
    testingOptions: [
      { id: "playwright", label: "Playwright", description: "Add browser interaction tests.", recommended: true },
      { id: "vitest", label: "Vitest", description: "Add tests for frontend helpers." }
    ]
  },
  {
    id: "electron",
    label: "Electron",
    language: "TypeScript / JavaScript",
    category: "desktop",
    logoUrl: "https://www.google.com/s2/favicons?domain=electronjs.org&sz=64",
    description: "Cross-platform desktop app with Chromium, Node.js, and native OS integrations.",
    starterCommand: "npm init electron-app@latest",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed main, preload, and renderer code.", recommended: true },
      { id: "vite", label: "Vite", description: "Use Vite for fast renderer development.", recommended: true },
      { id: "react", label: "React", description: "Use React for the renderer UI.", recommended: true },
      { id: "electron-forge", label: "Electron Forge", description: "Add packaging and maker configuration.", recommended: true },
      { id: "auto-updates", label: "Auto Updates", description: "Prepare release update wiring." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add unit tests for shared and renderer logic.", recommended: true },
      { id: "playwright", label: "Playwright", description: "Add Electron/browser smoke tests." },
      { id: "eslint", label: "ESLint", description: "Add linting across Electron process boundaries.", recommended: true }
    ]
  },
  {
    id: "react-native",
    label: "React Native",
    language: "TypeScript / JavaScript",
    category: "mobile",
    logoUrl: "https://www.google.com/s2/favicons?domain=reactnative.dev&sz=64",
    description: "Native mobile app built with React components and platform APIs.",
    starterCommand: "npx @react-native-community/cli@latest init",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed components and navigation.", recommended: true },
      { id: "react-navigation", label: "React Navigation", description: "Add common stack and tab navigation.", recommended: true },
      { id: "nativewind", label: "NativeWind", description: "Use Tailwind-style styling for native views." },
      { id: "async-storage", label: "Async Storage", description: "Add persistent local storage helpers." }
    ],
    testingOptions: [
      { id: "jest", label: "Jest", description: "Add unit tests with React Native presets.", recommended: true },
      { id: "testing-library", label: "Testing Library", description: "Add React Native component interaction tests.", recommended: true },
      { id: "detox", label: "Detox", description: "Add end-to-end mobile app tests." }
    ]
  },
  {
    id: "expo",
    label: "Expo",
    language: "TypeScript / JavaScript",
    category: "mobile",
    logoUrl: "https://www.google.com/s2/favicons?domain=expo.dev&sz=64",
    description: "React Native app with Expo tooling, routing, device APIs, and easier builds.",
    starterCommand: "npx create-expo-app@latest",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed Expo app source.", recommended: true },
      { id: "expo-router", label: "Expo Router", description: "Add file-based navigation.", recommended: true },
      { id: "nativewind", label: "NativeWind", description: "Use Tailwind-style styling for native views." },
      { id: "eas", label: "EAS", description: "Prepare Expo Application Services build config." }
    ],
    testingOptions: [
      { id: "jest-expo", label: "Jest Expo", description: "Add Expo-compatible unit tests.", recommended: true },
      { id: "testing-library", label: "Testing Library", description: "Add React Native component tests.", recommended: true },
      { id: "maestro", label: "Maestro", description: "Add mobile flow tests." }
    ]
  },
  {
    id: "flutter",
    label: "Flutter",
    language: "Dart",
    category: "mobile",
    logoUrl: "https://www.google.com/s2/favicons?domain=flutter.dev&sz=64",
    description: "Cross-platform mobile, desktop, and web app using Flutter widgets and Dart.",
    starterCommand: "flutter create",
    componentOptions: [
      { id: "material", label: "Material", description: "Use Material app structure.", recommended: true },
      { id: "riverpod", label: "Riverpod", description: "Add typed state management.", recommended: true },
      { id: "go-router", label: "go_router", description: "Add declarative routing." },
      { id: "firebase", label: "Firebase", description: "Prepare Firebase integration." }
    ],
    testingOptions: [
      { id: "flutter-test", label: "Flutter Test", description: "Add unit and widget tests.", recommended: true },
      { id: "integration-test", label: "Integration Test", description: "Add Flutter integration tests." },
      { id: "very-good-analysis", label: "Very Good Analysis", description: "Add stricter Dart linting." }
    ]
  },
  {
    id: "tauri",
    label: "Tauri",
    language: "Rust + TypeScript",
    category: "desktop",
    logoUrl: "https://www.google.com/s2/favicons?domain=tauri.app&sz=64",
    description: "Lightweight desktop app with a Rust shell and web frontend.",
    starterCommand: "npm create tauri-app@latest",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed frontend source.", recommended: true },
      { id: "react", label: "React", description: "Use React for the frontend.", recommended: true },
      { id: "rust-commands", label: "Rust Commands", description: "Add typed command handlers.", recommended: true },
      { id: "auto-updater", label: "Auto Updater", description: "Prepare updater configuration." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add frontend unit tests.", recommended: true },
      { id: "cargo-test", label: "Cargo Test", description: "Add Rust command tests.", recommended: true },
      { id: "playwright", label: "Playwright", description: "Add desktop smoke tests." }
    ]
  },
  {
    id: "dotnet-maui",
    label: ".NET MAUI",
    language: "C# / .NET",
    category: "mobile",
    logoUrl: "https://www.google.com/s2/favicons?domain=dotnet.microsoft.com&sz=64",
    description: "Cross-platform native app for mobile and desktop using .NET and XAML.",
    starterCommand: "dotnet new maui",
    componentOptions: [
      { id: "mvvm", label: "MVVM", description: "Use a ViewModel-first structure.", recommended: true },
      { id: "community-toolkit", label: "Community Toolkit", description: "Add common MAUI helpers.", recommended: true },
      { id: "shell-navigation", label: "Shell Navigation", description: "Add app shell navigation.", recommended: true },
      { id: "sqlite", label: "SQLite", description: "Add local persistence." }
    ],
    testingOptions: [
      { id: "xunit", label: "xUnit", description: "Add .NET unit tests.", recommended: true },
      { id: "nunit", label: "NUnit", description: "Use NUnit test projects." },
      { id: "appium", label: "Appium", description: "Add UI automation tests." }
    ]
  },
  {
    id: "astro",
    label: "Astro",
    language: "TypeScript / JavaScript",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=astro.build&sz=64",
    description: "Content-focused web app with islands architecture and fast static output.",
    starterCommand: "npm create astro@latest",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use strict typed configuration and content collections.", recommended: true },
      { id: "tailwind", label: "Tailwind CSS", description: "Add utility-first styling.", recommended: true },
      { id: "react", label: "React Islands", description: "Add React for interactive islands." },
      { id: "mdx", label: "MDX", description: "Add MDX content support.", recommended: true },
      { id: "rss-sitemap", label: "RSS + Sitemap", description: "Add common content site metadata outputs." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add unit tests for content and helpers.", recommended: true },
      { id: "playwright", label: "Playwright", description: "Add browser smoke tests.", recommended: true },
      { id: "astro-check", label: "Astro Check", description: "Add type and content validation checks." }
    ]
  },
  {
    id: "sveltekit",
    label: "SvelteKit",
    language: "TypeScript / JavaScript",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=svelte.dev&sz=64",
    description: "Svelte app with file-based routing and server endpoints.",
    starterCommand: "npx sv create",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed Svelte source.", recommended: true },
      { id: "tailwind", label: "Tailwind CSS", description: "Add utility-first styling.", recommended: true },
      { id: "adapter-auto", label: "Adapter Auto", description: "Use the default deployment adapter." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add unit tests.", recommended: true },
      { id: "playwright", label: "Playwright", description: "Add browser tests.", recommended: true }
    ]
  },
  {
    id: "laravel",
    label: "Laravel",
    language: "PHP",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=laravel.com&sz=64",
    description: "PHP web app with routing, ORM, queues, and batteries-included conventions.",
    starterCommand: "composer create-project laravel/laravel",
    componentOptions: [
      { id: "blade", label: "Blade", description: "Use server-rendered Blade templates.", recommended: true },
      { id: "inertia-react", label: "Inertia React", description: "Use React screens through Inertia." },
      { id: "tailwind", label: "Tailwind CSS", description: "Add Tailwind styling.", recommended: true },
      { id: "sqlite", label: "SQLite", description: "Use SQLite for local development.", recommended: true },
      { id: "postgresql", label: "PostgreSQL", description: "Use PostgreSQL for production persistence." },
      { id: "sanctum", label: "Sanctum", description: "Add API token and SPA authentication." },
      { id: "docker", label: "Docker", description: "Add containerized local services." },
      { id: "github-actions", label: "GitHub Actions", description: "Add test and static-analysis workflows." },
      { id: "sentry", label: "Sentry", description: "Add error and performance monitoring." },
      { id: "opentelemetry", label: "OpenTelemetry", description: "Add distributed traces and metrics." }
    ],
    testingOptions: [
      { id: "pest", label: "Pest", description: "Use Pest for expressive PHP tests.", recommended: true },
      { id: "phpunit", label: "PHPUnit", description: "Use the standard Laravel test runner." },
      { id: "dusk", label: "Laravel Dusk", description: "Add browser automation tests." },
      { id: "testcontainers", label: "Testcontainers", description: "Add container-backed database tests." }
    ]
  },
  {
    id: "rails",
    label: "Ruby on Rails",
    language: "Ruby",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=rubyonrails.org&sz=64",
    description: "Full-stack Ruby app with MVC conventions and Active Record.",
    starterCommand: "rails new",
    componentOptions: [
      { id: "postgresql", label: "PostgreSQL", description: "Use PostgreSQL as the database.", recommended: true },
      { id: "hotwire", label: "Hotwire", description: "Use Turbo and Stimulus for interactivity.", recommended: true },
      { id: "tailwind", label: "Tailwind CSS", description: "Add Tailwind styling." },
      { id: "devise", label: "Devise", description: "Add authentication scaffolding." },
      { id: "sidekiq", label: "Sidekiq", description: "Add background job processing." },
      { id: "docker", label: "Docker", description: "Add containerized local services." },
      { id: "github-actions", label: "GitHub Actions", description: "Add test and lint workflows." },
      { id: "sentry", label: "Sentry", description: "Add error and performance monitoring." },
      { id: "opentelemetry", label: "OpenTelemetry", description: "Add distributed tracing." }
    ],
    testingOptions: [
      { id: "rspec", label: "RSpec", description: "Use RSpec for unit and request specs.", recommended: true },
      { id: "system-tests", label: "System Tests", description: "Add browser-backed Rails system tests." },
      { id: "testcontainers", label: "Testcontainers", description: "Add real database integration tests." },
      { id: "rubocop", label: "RuboCop", description: "Add Ruby style and correctness checks." }
    ]
  },
  {
    id: "django",
    label: "Django",
    language: "Python",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=djangoproject.com&sz=64",
    description: "Python web app with ORM, admin, templates, and robust defaults.",
    starterCommand: "django-admin startproject",
    componentOptions: [
      { id: "postgresql", label: "PostgreSQL", description: "Use PostgreSQL settings.", recommended: true },
      { id: "django-rest-framework", label: "Django REST Framework", description: "Add API endpoints and serializers." },
      { id: "tailwind", label: "Tailwind CSS", description: "Add Tailwind asset workflow." },
      { id: "celery", label: "Celery", description: "Add background job structure." },
      { id: "django-allauth", label: "django-allauth", description: "Add account and social authentication." },
      { id: "docker", label: "Docker", description: "Add containerized application services." },
      { id: "github-actions", label: "GitHub Actions", description: "Add test and lint workflows." },
      { id: "sentry", label: "Sentry", description: "Add error and performance monitoring." },
      { id: "opentelemetry", label: "OpenTelemetry", description: "Add distributed tracing." }
    ],
    testingOptions: [
      { id: "pytest", label: "pytest", description: "Use pytest and pytest-django.", recommended: true },
      { id: "ruff", label: "Ruff", description: "Add linting and formatting checks.", recommended: true },
      { id: "testcontainers", label: "Testcontainers", description: "Add container-backed service tests." },
      { id: "playwright", label: "Playwright", description: "Add browser tests for rendered pages." }
    ]
  },
  {
    id: "fastapi",
    label: "FastAPI",
    language: "Python",
    category: "backend",
    logoUrl: "https://www.google.com/s2/favicons?domain=fastapi.tiangolo.com&sz=64",
    description: "Python API service with typed request models and OpenAPI docs.",
    starterCommand: null,
    componentOptions: [
      { id: "pydantic", label: "Pydantic", description: "Use typed request and response models.", recommended: true },
      { id: "sqlalchemy", label: "SQLAlchemy", description: "Add database models and sessions." },
      { id: "alembic", label: "Alembic", description: "Add database migrations." },
      { id: "uv", label: "uv", description: "Use uv for dependency and environment management.", recommended: true },
      { id: "postgresql", label: "PostgreSQL", description: "Configure PostgreSQL persistence." },
      { id: "sqlite", label: "SQLite", description: "Use a lightweight local database." },
      { id: "jwt-auth", label: "JWT Auth", description: "Add token authentication and protected routes." },
      { id: "docker", label: "Docker", description: "Add local and production container setup." },
      { id: "github-actions", label: "GitHub Actions", description: "Add test and lint workflows." },
      { id: "sentry", label: "Sentry", description: "Add error and performance monitoring." },
      { id: "opentelemetry", label: "OpenTelemetry", description: "Add API traces and metrics." }
    ],
    testingOptions: [
      { id: "pytest", label: "pytest", description: "Add API and unit tests.", recommended: true },
      { id: "ruff", label: "Ruff", description: "Add linting and formatting checks.", recommended: true },
      { id: "testcontainers", label: "Testcontainers", description: "Add real database integration tests." }
    ]
  },
  {
    id: "express",
    label: "Express",
    language: "TypeScript / JavaScript",
    category: "backend",
    logoUrl: "https://www.google.com/s2/favicons?domain=expressjs.com&sz=64",
    description: "Minimal Node.js HTTP API or server-rendered app with a large middleware ecosystem.",
    starterCommand: null,
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed request handlers.", recommended: true },
      { id: "zod", label: "Zod", description: "Add runtime request validation.", recommended: true },
      { id: "prisma", label: "Prisma", description: "Add database access and migrations." },
      { id: "openapi", label: "OpenAPI", description: "Generate API docs." },
      { id: "drizzle", label: "Drizzle", description: "Add typed SQL access and migrations." },
      { id: "postgresql", label: "PostgreSQL", description: "Configure PostgreSQL persistence." },
      { id: "sqlite", label: "SQLite", description: "Use a lightweight local database." },
      { id: "neon", label: "Neon", description: "Add serverless PostgreSQL integration." },
      { id: "better-auth", label: "Better Auth", description: "Add typed authentication workflows." },
      { id: "docker", label: "Docker", description: "Add containerized local and production builds." },
      { id: "github-actions", label: "GitHub Actions", description: "Add test and lint workflows." },
      { id: "sentry", label: "Sentry", description: "Add error monitoring." },
      { id: "opentelemetry", label: "OpenTelemetry", description: "Add API tracing and metrics." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add unit tests.", recommended: true },
      { id: "supertest", label: "Supertest", description: "Add HTTP endpoint tests.", recommended: true },
      { id: "eslint", label: "ESLint", description: "Add Node linting." },
      { id: "testcontainers", label: "Testcontainers", description: "Add container-backed integration tests." }
    ]
  },
  {
    id: "nestjs",
    label: "NestJS",
    language: "TypeScript",
    category: "backend",
    logoUrl: "https://www.google.com/s2/favicons?domain=nestjs.com&sz=64",
    description: "Structured Node.js backend with modules, dependency injection, controllers, and providers.",
    starterCommand: "npx @nestjs/cli@latest new",
    componentOptions: [
      { id: "typeorm", label: "TypeORM", description: "Add database entities and repositories." },
      { id: "prisma", label: "Prisma", description: "Add typed database client.", recommended: true },
      { id: "swagger", label: "Swagger", description: "Add OpenAPI docs.", recommended: true },
      { id: "config", label: "Config Module", description: "Add typed runtime configuration.", recommended: true },
      { id: "postgresql", label: "PostgreSQL", description: "Configure PostgreSQL persistence." },
      { id: "auth", label: "Authentication", description: "Add guards, strategies, and protected routes." },
      { id: "docker", label: "Docker", description: "Add containerized local and production builds." },
      { id: "github-actions", label: "GitHub Actions", description: "Add test and lint workflows." },
      { id: "sentry", label: "Sentry", description: "Add error monitoring." },
      { id: "opentelemetry", label: "OpenTelemetry", description: "Add traces and metrics." }
    ],
    testingOptions: [
      { id: "jest", label: "Jest", description: "Use Nest's default unit test setup.", recommended: true },
      { id: "supertest", label: "Supertest", description: "Add HTTP integration tests.", recommended: true },
      { id: "eslint", label: "ESLint", description: "Add TypeScript linting." },
      { id: "testcontainers", label: "Testcontainers", description: "Add real service integration tests." }
    ]
  },
  {
    id: "hono",
    label: "Hono",
    language: "TypeScript / JavaScript",
    category: "backend",
    logoUrl: "https://www.google.com/s2/favicons?domain=hono.dev&sz=64",
    description: "Small, fast TypeScript web framework for edge, serverless, and Node runtimes.",
    starterCommand: "npm create hono@latest",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed handlers.", recommended: true },
      { id: "zod-openapi", label: "Zod OpenAPI", description: "Add validation and OpenAPI generation.", recommended: true },
      { id: "cloudflare", label: "Cloudflare Workers", description: "Target Cloudflare Workers." },
      { id: "drizzle", label: "Drizzle", description: "Add typed SQL access." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add handler and utility tests.", recommended: true },
      { id: "miniflare", label: "Miniflare", description: "Add Cloudflare worker tests." },
      { id: "eslint", label: "ESLint", description: "Add TypeScript linting." }
    ]
  },
  {
    id: "adonisjs",
    label: "AdonisJS",
    language: "TypeScript / JavaScript",
    category: "backend",
    logoUrl: "https://www.google.com/s2/favicons?domain=adonisjs.com&sz=64",
    description: "Node.js MVC backend with routing, ORM, auth, validation, and batteries-included conventions.",
    starterCommand: "npm init adonisjs@latest",
    componentOptions: [
      { id: "lucid", label: "Lucid ORM", description: "Add database models and migrations.", recommended: true },
      { id: "auth", label: "Auth", description: "Add authentication scaffolding." },
      { id: "edge", label: "Edge Templates", description: "Use server-rendered views." },
      { id: "vine", label: "VineJS", description: "Add request validation.", recommended: true }
    ],
    testingOptions: [
      { id: "japa", label: "Japa", description: "Use AdonisJS's test runner.", recommended: true },
      { id: "eslint", label: "ESLint", description: "Add TypeScript linting.", recommended: true }
    ]
  },
  {
    id: "flask",
    label: "Flask",
    language: "Python",
    category: "backend",
    logoUrl: "https://www.google.com/s2/favicons?domain=flask.palletsprojects.com&sz=64",
    description: "Lightweight Python web app or API with explicit structure and extension choices.",
    starterCommand: null,
    componentOptions: [
      { id: "blueprints", label: "Blueprints", description: "Organize routes by domain.", recommended: true },
      { id: "sqlalchemy", label: "SQLAlchemy", description: "Add database models and sessions." },
      { id: "jinja", label: "Jinja Templates", description: "Add server-rendered templates." },
      { id: "flask-login", label: "Flask-Login", description: "Add session authentication." }
    ],
    testingOptions: [
      { id: "pytest", label: "pytest", description: "Add app and route tests.", recommended: true },
      { id: "ruff", label: "Ruff", description: "Add linting and formatting checks.", recommended: true },
      { id: "coverage", label: "Coverage", description: "Add coverage reporting." }
    ]
  },
  {
    id: "spring-boot",
    label: "Spring Boot",
    language: "Java / Kotlin",
    category: "backend",
    logoUrl: "https://www.google.com/s2/favicons?domain=spring.io&sz=64",
    description: "Production-grade Java or Kotlin backend with Spring MVC, dependency injection, and starters.",
    starterCommand: "spring init",
    componentOptions: [
      { id: "web", label: "Spring Web", description: "Add REST controllers.", recommended: true },
      { id: "data-jpa", label: "Spring Data JPA", description: "Add database repositories." },
      { id: "security", label: "Spring Security", description: "Add authentication and authorization." },
      { id: "postgresql", label: "PostgreSQL", description: "Configure PostgreSQL driver." }
    ],
    testingOptions: [
      { id: "junit", label: "JUnit", description: "Add unit and slice tests.", recommended: true },
      { id: "testcontainers", label: "Testcontainers", description: "Add integration tests with real services.", recommended: true },
      { id: "rest-assured", label: "REST Assured", description: "Add API tests." }
    ]
  },
  {
    id: "aspnet-core",
    label: "ASP.NET Core",
    language: "C# / .NET",
    category: "backend",
    logoUrl: "https://www.google.com/s2/favicons?domain=dotnet.microsoft.com&sz=64",
    description: "C# web API or MVC app with .NET hosting, routing, dependency injection, and middleware.",
    starterCommand: "dotnet new webapi",
    componentOptions: [
      { id: "minimal-api", label: "Minimal API", description: "Use concise endpoint definitions.", recommended: true },
      { id: "controllers", label: "Controllers", description: "Use MVC controller structure." },
      { id: "entity-framework", label: "Entity Framework", description: "Add database access and migrations.", recommended: true },
      { id: "openapi", label: "OpenAPI", description: "Add Swagger/OpenAPI docs.", recommended: true }
    ],
    testingOptions: [
      { id: "xunit", label: "xUnit", description: "Add .NET unit tests.", recommended: true },
      { id: "webapplicationfactory", label: "WebApplicationFactory", description: "Add integration tests.", recommended: true },
      { id: "testcontainers", label: "Testcontainers", description: "Add container-backed service tests." }
    ]
  },
  {
    id: "gin",
    label: "Go + Gin",
    language: "Go",
    category: "backend",
    logoUrl: "https://www.google.com/s2/favicons?domain=gin-gonic.com&sz=64",
    description: "Go HTTP API using the Gin router and idiomatic package structure.",
    starterCommand: null,
    componentOptions: [
      { id: "postgresql", label: "PostgreSQL", description: "Add database connection setup." },
      { id: "sqlc", label: "sqlc", description: "Generate typed query code." },
      { id: "gorm", label: "GORM", description: "Use ORM models and migrations." },
      { id: "openapi", label: "OpenAPI", description: "Add API docs." }
    ],
    testingOptions: [
      { id: "go-test", label: "go test", description: "Add standard Go tests.", recommended: true },
      { id: "testify", label: "Testify", description: "Add assertions and mocks.", recommended: true },
      { id: "golangci-lint", label: "golangci-lint", description: "Add linting." }
    ]
  },
  {
    id: "axum",
    label: "Rust + Axum",
    language: "Rust",
    category: "backend",
    logoUrl: "https://www.google.com/s2/favicons?domain=tokio.rs&sz=64",
    description: "Rust web API using Axum, Tokio, typed extractors, and tower middleware.",
    starterCommand: "cargo new",
    componentOptions: [
      { id: "tokio", label: "Tokio", description: "Use async runtime.", recommended: true },
      { id: "sqlx", label: "SQLx", description: "Add async SQL and migrations." },
      { id: "serde", label: "Serde", description: "Add JSON serialization.", recommended: true },
      { id: "tracing", label: "Tracing", description: "Add structured logging.", recommended: true }
    ],
    testingOptions: [
      { id: "cargo-test", label: "Cargo Test", description: "Add unit and integration tests.", recommended: true },
      { id: "insta", label: "insta", description: "Add snapshot testing." },
      { id: "clippy", label: "Clippy", description: "Add Rust lint checks.", recommended: true }
    ]
  },
  {
    id: "phoenix",
    label: "Phoenix",
    language: "Elixir",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=phoenixframework.org&sz=64",
    description: "Elixir web app with LiveView, channels, and OTP-friendly conventions.",
    starterCommand: "mix phx.new",
    componentOptions: [
      { id: "liveview", label: "LiveView", description: "Use server-rendered interactive views.", recommended: true },
      { id: "ecto", label: "Ecto", description: "Add database access and migrations.", recommended: true },
      { id: "tailwind", label: "Tailwind CSS", description: "Use Phoenix Tailwind defaults." }
    ],
    testingOptions: [
      { id: "exunit", label: "ExUnit", description: "Use Phoenix's default test stack.", recommended: true },
      { id: "wallaby", label: "Wallaby", description: "Add browser-level feature tests." }
    ]
  },
  {
    id: "redwoodjs",
    label: "RedwoodJS",
    language: "TypeScript / JavaScript",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=redwoodjs.com&sz=64",
    description: "Full-stack React framework with API side, Prisma, GraphQL, and deployment conventions.",
    starterCommand: "yarn create redwood-app",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed web and API sides.", recommended: true },
      { id: "prisma", label: "Prisma", description: "Add database schema and migrations.", recommended: true },
      { id: "graphql", label: "GraphQL", description: "Use Redwood services and GraphQL.", recommended: true },
      { id: "auth", label: "Auth", description: "Add auth provider setup." }
    ],
    testingOptions: [
      { id: "jest", label: "Jest", description: "Add Redwood's test setup.", recommended: true },
      { id: "storybook", label: "Storybook", description: "Add component stories." },
      { id: "playwright", label: "Playwright", description: "Add browser tests." }
    ]
  },
  {
    id: "blitz",
    label: "Blitz",
    language: "TypeScript / JavaScript",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=blitzjs.com&sz=64",
    description: "Full-stack React app with RPC-style data access and Next.js foundations.",
    starterCommand: "npx blitz new",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed app and server code.", recommended: true },
      { id: "prisma", label: "Prisma", description: "Add database schema and migrations.", recommended: true },
      { id: "auth", label: "Auth", description: "Add Blitz auth scaffolding.", recommended: true },
      { id: "tailwind", label: "Tailwind CSS", description: "Add utility-first styling." }
    ],
    testingOptions: [
      { id: "jest", label: "Jest", description: "Add unit tests.", recommended: true },
      { id: "testing-library", label: "Testing Library", description: "Add React component tests." },
      { id: "playwright", label: "Playwright", description: "Add browser tests." }
    ]
  },
  {
    id: "tanstack-start",
    label: "TanStack Start",
    language: "TypeScript / JavaScript",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=tanstack.com&sz=64",
    description: "Full-stack React framework with type-safe routing, server functions, and TanStack data tooling.",
    starterCommand: "npx @tanstack/cli@latest create",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use strict typed routes and server functions.", recommended: true },
      { id: "tanstack-query", label: "TanStack Query", description: "Add server-state fetching and caching.", recommended: true },
      { id: "tailwind", label: "Tailwind CSS", description: "Add utility-first styling.", recommended: true },
      { id: "drizzle", label: "Drizzle", description: "Add typed SQL access and migrations." },
      { id: "prisma", label: "Prisma", description: "Add a generated database client and schema workflow." },
      { id: "clerk", label: "Clerk", description: "Add hosted authentication and protected routes." },
      { id: "supabase", label: "Supabase", description: "Add database and authentication integration." },
      { id: "shadcn", label: "shadcn/ui", description: "Add accessible composable UI components." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add unit and server-function tests.", recommended: true },
      { id: "testing-library", label: "Testing Library", description: "Add React interaction tests." },
      { id: "playwright", label: "Playwright", description: "Add end-to-end route tests.", recommended: true },
      { id: "msw", label: "MSW", description: "Mock network requests in tests." }
    ]
  },
  {
    id: "react-router-framework",
    label: "React Router",
    language: "TypeScript / JavaScript",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=reactrouter.com&sz=64",
    description: "React Router framework-mode app with route modules, loaders, actions, and server rendering.",
    starterCommand: "npx create-react-router@latest",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed route modules and server code.", recommended: true },
      { id: "tailwind", label: "Tailwind CSS", description: "Add utility-first styling.", recommended: true },
      { id: "prisma", label: "Prisma", description: "Add database schema and migrations." },
      { id: "drizzle", label: "Drizzle", description: "Add typed SQL queries and migrations." },
      { id: "auth-js", label: "Auth.js", description: "Add session authentication." },
      { id: "better-auth", label: "Better Auth", description: "Add typed authentication workflows." },
      { id: "shadcn", label: "shadcn/ui", description: "Add accessible UI primitives." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add route and utility tests.", recommended: true },
      { id: "testing-library", label: "Testing Library", description: "Add React interaction tests." },
      { id: "playwright", label: "Playwright", description: "Add browser flow tests.", recommended: true },
      { id: "msw", label: "MSW", description: "Mock API requests in tests." }
    ]
  },
  {
    id: "symfony",
    label: "Symfony",
    language: "PHP",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=symfony.com&sz=64",
    description: "Modular PHP framework for web applications, APIs, queues, and enterprise services.",
    starterCommand: "symfony new --webapp",
    componentOptions: [
      { id: "doctrine", label: "Doctrine ORM", description: "Add entities, repositories, and migrations.", recommended: true },
      { id: "twig", label: "Twig", description: "Add server-rendered templates.", recommended: true },
      { id: "api-platform", label: "API Platform", description: "Add documented REST and GraphQL APIs." },
      { id: "security", label: "Security", description: "Add users, authentication, and authorization.", recommended: true },
      { id: "messenger", label: "Messenger", description: "Add asynchronous messages and queue workers." },
      { id: "postgresql", label: "PostgreSQL", description: "Configure PostgreSQL for local development." },
      { id: "docker", label: "Docker", description: "Add containerized local services." }
    ],
    testingOptions: [
      { id: "phpunit", label: "PHPUnit", description: "Add unit and functional tests.", recommended: true },
      { id: "panther", label: "Panther", description: "Add browser-backed application tests." },
      { id: "phpstan", label: "PHPStan", description: "Add static analysis.", recommended: true },
      { id: "php-cs-fixer", label: "PHP CS Fixer", description: "Add automated code-style checks." }
    ]
  },
  {
    id: "cloudflare-workers",
    label: "Cloudflare Workers",
    language: "TypeScript / JavaScript",
    category: "backend",
    logoUrl: "https://www.google.com/s2/favicons?domain=workers.cloudflare.com&sz=64",
    description: "Edge application or API running on Cloudflare Workers with first-party storage bindings.",
    starterCommand: "npm create cloudflare@latest",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed Worker bindings and handlers.", recommended: true },
      { id: "hono", label: "Hono", description: "Add a typed edge router.", recommended: true },
      { id: "d1", label: "D1", description: "Add Cloudflare's managed SQL database." },
      { id: "kv", label: "KV", description: "Add globally distributed key-value storage." },
      { id: "r2", label: "R2", description: "Add object storage bindings." },
      { id: "durable-objects", label: "Durable Objects", description: "Add stateful coordination and WebSocket support." },
      { id: "queues", label: "Queues", description: "Add asynchronous message processing." },
      { id: "workers-ai", label: "Workers AI", description: "Add hosted inference bindings." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add Workers integration tests.", recommended: true },
      { id: "miniflare", label: "Miniflare", description: "Run Worker bindings locally.", recommended: true },
      { id: "playwright", label: "Playwright", description: "Add deployed application smoke tests." }
    ]
  },
  {
    id: "elysia",
    label: "Elysia",
    language: "TypeScript / Bun",
    category: "backend",
    logoUrl: "https://www.google.com/s2/favicons?domain=elysiajs.com&sz=64",
    description: "Type-safe Bun web framework for fast APIs and backend services.",
    starterCommand: "bun create elysia",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use typed routes and schemas.", recommended: true },
      { id: "drizzle", label: "Drizzle", description: "Add typed SQL access and migrations.", recommended: true },
      { id: "openapi", label: "OpenAPI", description: "Generate interactive API documentation.", recommended: true },
      { id: "jwt", label: "JWT", description: "Add token authentication." },
      { id: "eden", label: "Eden Treaty", description: "Generate a type-safe API client." },
      { id: "postgresql", label: "PostgreSQL", description: "Configure PostgreSQL persistence." },
      { id: "docker", label: "Docker", description: "Add a production container setup." }
    ],
    testingOptions: [
      { id: "bun-test", label: "Bun Test", description: "Add Bun-native unit and integration tests.", recommended: true },
      { id: "testcontainers", label: "Testcontainers", description: "Add container-backed database tests." },
      { id: "eslint", label: "ESLint", description: "Add TypeScript linting." }
    ]
  },
  {
    id: "ktor",
    label: "Ktor",
    language: "Kotlin",
    category: "backend",
    logoUrl: "https://www.google.com/s2/favicons?domain=ktor.io&sz=64",
    description: "Kotlin server framework for asynchronous APIs, services, and WebSocket applications.",
    starterCommand: null,
    componentOptions: [
      { id: "serialization", label: "Kotlin Serialization", description: "Add typed JSON request and response handling.", recommended: true },
      { id: "exposed", label: "Exposed", description: "Add Kotlin SQL access and schema management." },
      { id: "koin", label: "Koin", description: "Add dependency injection." },
      { id: "postgresql", label: "PostgreSQL", description: "Configure PostgreSQL persistence." },
      { id: "auth-jwt", label: "JWT Auth", description: "Add authenticated routes." },
      { id: "openapi", label: "OpenAPI", description: "Add API documentation." },
      { id: "docker", label: "Docker", description: "Add a production container setup." }
    ],
    testingOptions: [
      { id: "junit", label: "JUnit", description: "Add unit and application tests.", recommended: true },
      { id: "ktor-test-host", label: "Ktor Test Host", description: "Test routes without a network server.", recommended: true },
      { id: "testcontainers", label: "Testcontainers", description: "Add real database integration tests." },
      { id: "detekt", label: "Detekt", description: "Add Kotlin static analysis." }
    ]
  },
  {
    id: "ionic",
    label: "Ionic + Capacitor",
    language: "TypeScript / JavaScript",
    category: "mobile",
    logoUrl: "https://www.google.com/s2/favicons?domain=ionicframework.com&sz=64",
    description: "Cross-platform mobile and web app using Ionic UI and Capacitor native APIs.",
    starterCommand: "ionic start",
    componentOptions: [
      { id: "react", label: "React", description: "Use React for application screens.", recommended: true },
      { id: "vue", label: "Vue", description: "Use Vue for application screens." },
      { id: "angular", label: "Angular", description: "Use Angular for application screens." },
      { id: "capacitor", label: "Capacitor", description: "Add native iOS and Android projects.", recommended: true },
      { id: "native-plugins", label: "Native Plugins", description: "Add camera, filesystem, and device APIs." },
      { id: "storage", label: "Ionic Storage", description: "Add persistent local storage." },
      { id: "firebase", label: "Firebase", description: "Add authentication, database, and messaging." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add unit and component tests.", recommended: true },
      { id: "playwright", label: "Playwright", description: "Add browser flow tests." },
      { id: "appium", label: "Appium", description: "Add native device UI automation." }
    ]
  },
  {
    id: "gradio",
    label: "Gradio",
    language: "Python",
    category: "data",
    logoUrl: "https://www.google.com/s2/favicons?domain=gradio.app&sz=64",
    description: "Python interface for machine-learning models, data workflows, and interactive demos.",
    starterCommand: null,
    componentOptions: [
      { id: "blocks", label: "Blocks UI", description: "Use composable layouts and event handlers.", recommended: true },
      { id: "hugging-face", label: "Hugging Face", description: "Add model or Space integration.", recommended: true },
      { id: "pandas", label: "pandas", description: "Add tabular data workflows." },
      { id: "authentication", label: "Authentication", description: "Protect the application with login controls." },
      { id: "queue", label: "Queued Jobs", description: "Add concurrency and long-running task handling." },
      { id: "docker", label: "Docker", description: "Add a deployable container." }
    ],
    testingOptions: [
      { id: "pytest", label: "pytest", description: "Add event-handler and transformation tests.", recommended: true },
      { id: "ruff", label: "Ruff", description: "Add formatting and linting checks.", recommended: true },
      { id: "playwright", label: "Playwright", description: "Add browser interaction tests." }
    ]
  },
  {
    id: "wordpress",
    label: "WordPress",
    language: "PHP / JavaScript",
    category: "web",
    logoUrl: "https://www.google.com/s2/favicons?domain=wordpress.org&sz=64",
    description: "WordPress plugin, block theme, or custom block project with modern development tooling.",
    starterCommand: "npx @wordpress/create-block@latest",
    componentOptions: [
      { id: "plugin", label: "Plugin", description: "Create a conventional WordPress plugin.", recommended: true },
      { id: "block-theme", label: "Block Theme", description: "Create a full-site editing theme." },
      { id: "gutenberg-block", label: "Gutenberg Block", description: "Add a custom editor block.", recommended: true },
      { id: "typescript", label: "TypeScript", description: "Use typed editor source." },
      { id: "tailwind", label: "Tailwind CSS", description: "Add utility-first theme styling." },
      { id: "wp-env", label: "wp-env", description: "Add a disposable local WordPress environment.", recommended: true }
    ],
    testingOptions: [
      { id: "phpunit", label: "PHPUnit", description: "Add PHP unit and integration tests.", recommended: true },
      { id: "jest", label: "Jest", description: "Add block editor unit tests." },
      { id: "playwright", label: "Playwright", description: "Add editor and frontend browser tests." },
      { id: "phpcs", label: "PHP_CodeSniffer", description: "Enforce WordPress coding standards.", recommended: true }
    ]
  },
  {
    id: "go-fiber",
    label: "Go + Fiber",
    language: "Go",
    category: "backend",
    logoUrl: "https://www.google.com/s2/favicons?domain=gofiber.io&sz=64",
    description: "Fast Express-inspired Go web framework for APIs and backend services.",
    starterCommand: "go mod init",
    componentOptions: [
      { id: "postgresql", label: "PostgreSQL", description: "Add database connection setup." },
      { id: "sqlc", label: "sqlc", description: "Generate type-safe database queries.", recommended: true },
      { id: "gorm", label: "GORM", description: "Add ORM models and migrations." },
      { id: "jwt", label: "JWT", description: "Add token authentication." },
      { id: "swagger", label: "Swagger", description: "Generate API documentation." },
      { id: "docker", label: "Docker", description: "Add containerized local and production builds." }
    ],
    testingOptions: [
      { id: "go-test", label: "go test", description: "Add standard Go tests.", recommended: true },
      { id: "testify", label: "Testify", description: "Add assertions and mocks.", recommended: true },
      { id: "testcontainers", label: "Testcontainers", description: "Add real service integration tests." },
      { id: "golangci-lint", label: "golangci-lint", description: "Add linting." }
    ]
  },
  {
    id: "go-echo",
    label: "Go + Echo",
    language: "Go",
    category: "backend",
    logoUrl: "https://www.google.com/s2/favicons?domain=echo.labstack.com&sz=64",
    description: "Minimal high-performance Go framework for APIs and web applications.",
    starterCommand: "go mod init",
    componentOptions: [
      { id: "postgresql", label: "PostgreSQL", description: "Add database connection setup." },
      { id: "sqlc", label: "sqlc", description: "Generate type-safe database queries.", recommended: true },
      { id: "gorm", label: "GORM", description: "Add ORM models and migrations." },
      { id: "jwt", label: "JWT", description: "Add token authentication." },
      { id: "openapi", label: "OpenAPI", description: "Add API documentation." },
      { id: "docker", label: "Docker", description: "Add containerized builds." }
    ],
    testingOptions: [
      { id: "go-test", label: "go test", description: "Add handler and package tests.", recommended: true },
      { id: "testify", label: "Testify", description: "Add assertions and mocks.", recommended: true },
      { id: "testcontainers", label: "Testcontainers", description: "Add real service integration tests." },
      { id: "golangci-lint", label: "golangci-lint", description: "Add linting." }
    ]
  },
  {
    id: "actix-web",
    label: "Rust + Actix Web",
    language: "Rust",
    category: "backend",
    logoUrl: "https://www.google.com/s2/favicons?domain=actix.rs&sz=64",
    description: "Powerful Rust web framework for concurrent APIs and services.",
    starterCommand: "cargo new",
    componentOptions: [
      { id: "tokio", label: "Tokio", description: "Use the asynchronous runtime.", recommended: true },
      { id: "serde", label: "Serde", description: "Add typed JSON serialization.", recommended: true },
      { id: "sqlx", label: "SQLx", description: "Add asynchronous SQL and migrations." },
      { id: "diesel", label: "Diesel", description: "Add a typed ORM and migrations." },
      { id: "utoipa", label: "utoipa", description: "Generate OpenAPI documentation." },
      { id: "tracing", label: "Tracing", description: "Add structured observability.", recommended: true },
      { id: "docker", label: "Docker", description: "Add a production container build." }
    ],
    testingOptions: [
      { id: "cargo-test", label: "Cargo Test", description: "Add unit and integration tests.", recommended: true },
      { id: "testcontainers", label: "Testcontainers", description: "Add container-backed integration tests." },
      { id: "insta", label: "insta", description: "Add snapshot testing." },
      { id: "clippy", label: "Clippy", description: "Add Rust lint checks.", recommended: true }
    ]
  },
  {
    id: "swiftui",
    label: "SwiftUI",
    language: "Swift",
    category: "mobile",
    logoUrl: "https://www.google.com/s2/favicons?domain=developer.apple.com&sz=64",
    description: "Native Apple application using SwiftUI across iOS, macOS, watchOS, or visionOS.",
    starterCommand: null,
    componentOptions: [
      { id: "ios", label: "iOS", description: "Target iPhone and iPad.", recommended: true },
      { id: "macos", label: "macOS", description: "Add a native Mac target." },
      { id: "swiftdata", label: "SwiftData", description: "Add local model persistence.", recommended: true },
      { id: "observation", label: "Observation", description: "Use modern observable state patterns.", recommended: true },
      { id: "async-await", label: "Async/Await", description: "Add structured concurrency and API services." },
      { id: "cloudkit", label: "CloudKit", description: "Add iCloud-backed synchronization." }
    ],
    testingOptions: [
      { id: "swift-testing", label: "Swift Testing", description: "Add modern unit tests.", recommended: true },
      { id: "xctest", label: "XCTest UI", description: "Add application UI tests." },
      { id: "swiftlint", label: "SwiftLint", description: "Add Swift style checks." }
    ]
  },
  {
    id: "compose-multiplatform",
    label: "Compose Multiplatform",
    language: "Kotlin",
    category: "desktop",
    logoUrl: "https://www.google.com/s2/favicons?domain=jetbrains.com&sz=64",
    description: "Shared declarative Kotlin UI for desktop, Android, iOS, and web targets.",
    starterCommand: null,
    componentOptions: [
      { id: "desktop", label: "Desktop", description: "Target Windows, macOS, and Linux.", recommended: true },
      { id: "android", label: "Android", description: "Add an Android application target.", recommended: true },
      { id: "ios", label: "iOS", description: "Add an iOS application target." },
      { id: "web", label: "Web", description: "Add a browser target." },
      { id: "koin", label: "Koin", description: "Add dependency injection." },
      { id: "ktor-client", label: "Ktor Client", description: "Add shared networking.", recommended: true },
      { id: "sql-delight", label: "SQLDelight", description: "Add shared typed persistence." }
    ],
    testingOptions: [
      { id: "kotlin-test", label: "Kotlin Test", description: "Add common and platform tests.", recommended: true },
      { id: "junit", label: "JUnit", description: "Add JVM integration tests." },
      { id: "detekt", label: "Detekt", description: "Add Kotlin static analysis.", recommended: true }
    ]
  },
  {
    id: "godot",
    label: "Godot",
    language: "GDScript / C#",
    category: "game",
    logoUrl: "https://www.google.com/s2/favicons?domain=godotengine.org&sz=64",
    description: "Cross-platform 2D or 3D game using Godot scenes, resources, and scripting.",
    starterCommand: null,
    componentOptions: [
      { id: "2d", label: "2D Game", description: "Use a 2D scene and physics setup.", recommended: true },
      { id: "3d", label: "3D Game", description: "Use a 3D scene, camera, and physics setup." },
      { id: "gdscript", label: "GDScript", description: "Use Godot's native scripting language.", recommended: true },
      { id: "csharp", label: "C#", description: "Use the .NET-enabled Godot runtime." },
      { id: "input-map", label: "Input Map", description: "Add keyboard, controller, and touch actions.", recommended: true },
      { id: "save-system", label: "Save System", description: "Add persistent game state." },
      { id: "multiplayer", label: "Multiplayer", description: "Add networked game foundations." }
    ],
    testingOptions: [
      { id: "gut", label: "GUT", description: "Add GDScript unit tests.", recommended: true },
      { id: "gdunit", label: "GdUnit4", description: "Add scene and integration tests." },
      { id: "headless-smoke", label: "Headless Smoke Test", description: "Run project startup checks in CI." }
    ]
  },
  {
    id: "nx",
    label: "Nx",
    language: "TypeScript / JavaScript",
    category: "monorepo",
    logoUrl: "https://www.google.com/s2/favicons?domain=nx.dev&sz=64",
    description: "Integrated monorepo with project generators, task orchestration, caching, and dependency boundaries.",
    starterCommand: "npx create-nx-workspace@latest",
    componentOptions: [
      { id: "react", label: "React", description: "Add a React application and shared libraries.", recommended: true },
      { id: "nextjs", label: "Next.js", description: "Add a Next.js application." },
      { id: "angular", label: "Angular", description: "Add an Angular application." },
      { id: "nestjs", label: "NestJS", description: "Add a structured backend service." },
      { id: "storybook", label: "Storybook", description: "Add shared component documentation." },
      { id: "docker", label: "Docker", description: "Add service container builds." },
      { id: "github-actions", label: "GitHub Actions", description: "Add affected-project CI workflows.", recommended: true }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add unit tests across projects.", recommended: true },
      { id: "playwright", label: "Playwright", description: "Add application end-to-end tests.", recommended: true },
      { id: "eslint", label: "ESLint", description: "Enforce monorepo dependency boundaries.", recommended: true }
    ]
  },
  {
    id: "turborepo",
    label: "Turborepo",
    language: "TypeScript / JavaScript",
    category: "monorepo",
    logoUrl: "https://www.google.com/s2/favicons?domain=turbo.build&sz=64",
    description: "Package-based JavaScript monorepo with fast cached task pipelines and deployable applications.",
    starterCommand: "npx create-turbo@latest",
    componentOptions: [
      { id: "nextjs", label: "Next.js Apps", description: "Add web applications using Next.js.", recommended: true },
      { id: "shared-ui", label: "Shared UI Package", description: "Add reusable components and design tokens.", recommended: true },
      { id: "shared-config", label: "Shared Config", description: "Share TypeScript, lint, and formatting configuration.", recommended: true },
      { id: "storybook", label: "Storybook", description: "Document the shared UI package." },
      { id: "changesets", label: "Changesets", description: "Add package versioning and release notes." },
      { id: "docker", label: "Docker", description: "Add pruned production container builds." },
      { id: "github-actions", label: "GitHub Actions", description: "Add cached CI pipelines." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add package unit tests.", recommended: true },
      { id: "playwright", label: "Playwright", description: "Add web application flow tests.", recommended: true },
      { id: "eslint", label: "ESLint", description: "Add shared linting.", recommended: true }
    ]
  },
  {
    id: "python-typer",
    label: "Python + Typer",
    language: "Python",
    category: "cli",
    logoUrl: "https://www.google.com/s2/favicons?domain=typer.tiangolo.com&sz=64",
    description: "Typed Python command-line application with automatic help and shell completion.",
    starterCommand: "uv init",
    componentOptions: [
      { id: "uv", label: "uv", description: "Use uv for dependency management and packaging.", recommended: true },
      { id: "rich", label: "Rich", description: "Add styled terminal output and progress displays.", recommended: true },
      { id: "pydantic-settings", label: "Pydantic Settings", description: "Add typed configuration and environment variables." },
      { id: "httpx", label: "HTTPX", description: "Add asynchronous HTTP client support." },
      { id: "plugin-system", label: "Plugin System", description: "Add discoverable command extensions." },
      { id: "github-actions", label: "GitHub Actions", description: "Add package and platform tests." }
    ],
    testingOptions: [
      { id: "pytest", label: "pytest", description: "Add command and helper tests.", recommended: true },
      { id: "typer-testing", label: "Typer CliRunner", description: "Test command invocations.", recommended: true },
      { id: "ruff", label: "Ruff", description: "Add formatting and linting checks.", recommended: true },
      { id: "mypy", label: "mypy", description: "Add static type checking." }
    ]
  },
  {
    id: "rust-clap",
    label: "Rust + Clap",
    language: "Rust",
    category: "cli",
    logoUrl: "https://www.google.com/s2/favicons?domain=rust-lang.org&sz=64",
    description: "Fast native command-line application using Clap argument parsing and Cargo packaging.",
    starterCommand: "cargo new",
    componentOptions: [
      { id: "clap-derive", label: "Clap Derive", description: "Define typed commands and arguments.", recommended: true },
      { id: "tokio", label: "Tokio", description: "Add asynchronous command execution." },
      { id: "serde", label: "Serde", description: "Add configuration and structured output.", recommended: true },
      { id: "indicatif", label: "Indicatif", description: "Add progress bars and status displays." },
      { id: "tracing", label: "Tracing", description: "Add structured diagnostic logging." },
      { id: "cargo-dist", label: "cargo-dist", description: "Add cross-platform release packaging." }
    ],
    testingOptions: [
      { id: "cargo-test", label: "Cargo Test", description: "Add unit and integration tests.", recommended: true },
      { id: "assert-cmd", label: "assert_cmd", description: "Test executable behavior.", recommended: true },
      { id: "predicates", label: "predicates", description: "Add command output assertions." },
      { id: "clippy", label: "Clippy", description: "Add Rust lint checks.", recommended: true }
    ]
  },
  {
    id: "node-package",
    label: "Node Package",
    language: "TypeScript / JavaScript",
    category: "cli",
    logoUrl: "https://www.google.com/s2/favicons?domain=nodejs.org&sz=64",
    description: "Publishable Node.js library or command-line package with modern build and release tooling.",
    starterCommand: "npm init",
    componentOptions: [
      { id: "typescript", label: "TypeScript", description: "Use strict typed package source.", recommended: true },
      { id: "dual-package", label: "ESM + CommonJS", description: "Publish dual module formats." },
      { id: "tsup", label: "tsup", description: "Bundle library and declaration outputs.", recommended: true },
      { id: "commander", label: "Commander", description: "Add command-line argument parsing." },
      { id: "changesets", label: "Changesets", description: "Add versioning and changelog automation." },
      { id: "semantic-release", label: "Semantic Release", description: "Automate package releases." },
      { id: "github-actions", label: "GitHub Actions", description: "Add tests and npm publishing." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add package unit tests.", recommended: true },
      { id: "eslint", label: "ESLint", description: "Add source linting.", recommended: true },
      { id: "publint", label: "publint", description: "Validate package publishing metadata." },
      { id: "arethetypeswrong", label: "Are the Types Wrong?", description: "Validate exported TypeScript declarations." }
    ]
  },
  {
    id: "streamlit",
    label: "Streamlit",
    language: "Python",
    category: "data",
    logoUrl: "https://www.google.com/s2/favicons?domain=streamlit.io&sz=64",
    description: "Python data app with interactive widgets, charts, and simple deployment.",
    starterCommand: null,
    componentOptions: [
      { id: "pandas", label: "pandas", description: "Add data frame workflows.", recommended: true },
      { id: "plotly", label: "Plotly", description: "Add interactive charts.", recommended: true },
      { id: "sqlalchemy", label: "SQLAlchemy", description: "Add database access." },
      { id: "auth", label: "Auth", description: "Add basic authentication pattern." }
    ],
    testingOptions: [
      { id: "pytest", label: "pytest", description: "Add helper and transformation tests.", recommended: true },
      { id: "ruff", label: "Ruff", description: "Add linting and formatting checks.", recommended: true },
      { id: "playwright", label: "Playwright", description: "Add app smoke tests." }
    ]
  },
  {
    id: "dash",
    label: "Dash",
    language: "Python",
    category: "data",
    logoUrl: "https://www.google.com/s2/favicons?domain=plotly.com&sz=64",
    description: "Python analytical web app using Dash callbacks, Plotly charts, and Flask foundations.",
    starterCommand: null,
    componentOptions: [
      { id: "pandas", label: "pandas", description: "Add data frame workflows.", recommended: true },
      { id: "plotly", label: "Plotly", description: "Add chart components.", recommended: true },
      { id: "dash-bootstrap", label: "Dash Bootstrap", description: "Add Bootstrap components and layout." },
      { id: "multipage", label: "Multi-page App", description: "Add page routing structure." }
    ],
    testingOptions: [
      { id: "pytest", label: "pytest", description: "Add callback helper tests.", recommended: true },
      { id: "dash-testing", label: "Dash Testing", description: "Add browser integration tests." },
      { id: "ruff", label: "Ruff", description: "Add linting and formatting checks.", recommended: true }
    ]
  }
];
