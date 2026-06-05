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
      { id: "eslint", label: "ESLint", description: "Configure linting for React and Next.js conventions." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add fast unit tests for app logic.", recommended: true },
      { id: "playwright", label: "Playwright", description: "Add browser-level smoke and flow tests." },
      { id: "testing-library", label: "Testing Library", description: "Add React component interaction tests." }
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
      { id: "eslint", label: "ESLint", description: "Configure linting for React source." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add unit tests with Vite-native tooling.", recommended: true },
      { id: "testing-library", label: "Testing Library", description: "Add React DOM interaction tests.", recommended: true },
      { id: "playwright", label: "Playwright", description: "Add end-to-end browser tests." }
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
      { id: "sqlite", label: "SQLite", description: "Use SQLite for local development.", recommended: true }
    ],
    testingOptions: [
      { id: "pest", label: "Pest", description: "Use Pest for expressive PHP tests.", recommended: true },
      { id: "phpunit", label: "PHPUnit", description: "Use the standard Laravel test runner." }
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
      { id: "devise", label: "Devise", description: "Add authentication scaffolding." }
    ],
    testingOptions: [
      { id: "rspec", label: "RSpec", description: "Use RSpec for unit and request specs.", recommended: true },
      { id: "system-tests", label: "System Tests", description: "Add browser-backed Rails system tests." }
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
      { id: "celery", label: "Celery", description: "Add background job structure." }
    ],
    testingOptions: [
      { id: "pytest", label: "pytest", description: "Use pytest and pytest-django.", recommended: true },
      { id: "ruff", label: "Ruff", description: "Add linting and formatting checks.", recommended: true }
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
      { id: "uv", label: "uv", description: "Use uv for dependency and environment management.", recommended: true }
    ],
    testingOptions: [
      { id: "pytest", label: "pytest", description: "Add API and unit tests.", recommended: true },
      { id: "ruff", label: "Ruff", description: "Add linting and formatting checks.", recommended: true }
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
      { id: "openapi", label: "OpenAPI", description: "Generate API docs." }
    ],
    testingOptions: [
      { id: "vitest", label: "Vitest", description: "Add unit tests.", recommended: true },
      { id: "supertest", label: "Supertest", description: "Add HTTP endpoint tests.", recommended: true },
      { id: "eslint", label: "ESLint", description: "Add Node linting." }
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
      { id: "config", label: "Config Module", description: "Add typed runtime configuration.", recommended: true }
    ],
    testingOptions: [
      { id: "jest", label: "Jest", description: "Use Nest's default unit test setup.", recommended: true },
      { id: "supertest", label: "Supertest", description: "Add HTTP integration tests.", recommended: true },
      { id: "eslint", label: "ESLint", description: "Add TypeScript linting." }
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
