# Architecture

This document describes where to add code and how runtime boundaries are enforced.

## Runtime Boundaries

- `main/`: privileged runtime for filesystem, process, network, provider integrations, and IPC handlers.
- `renderer/`: React UI, local interaction state, and view composition.
- `shared/`: stable contracts and data types used on both sides of Electron.

## IPC Model

- Renderer only talks to main through `window.nora` in `main/preload.ts`.
- Main handlers are registered in `main/main.ts`.
- Sensitive handlers validate payloads at runtime before touching workspace/filesystem or session orchestration.
- External URL opens and browser-image imports use a shared HTTPS-only URL policy.

## Main Process Service Composition

- `main/orchestrator.ts` is the composition root for workspace/session/tooling/forge behavior.
- `main/orchestrator/` modules provide focused helper domains (workspace actions, runtime helpers, dependency builders, service factories).
- `main/services/` exposes the app-facing service API consumed by IPC handlers.

## Renderer App Composition

- `renderer/components/app/views/`: app-level composition entry points.
- `renderer/components/app/hooks/`: custom React hooks.
- `renderer/components/app/logic/`: non-React helper logic.
- `renderer/components/app/context/`: app-level context/provider wiring.

## Contributor Recipes

### Add a new main capability

1. Add/update shared contract types in `shared/types/`.
2. Implement behavior in `main/orchestrator/` or `main/services/`.
3. Add a narrow IPC route in `main/main.ts` with runtime validation.
4. Expose a preload API method in `main/preload.ts`.
5. Consume it from renderer clients/hooks/components.

### Add a new renderer feature

1. Put reusable domain logic in `renderer/components/app/logic/`.
2. Keep UI composition in `views/` and surface folders.
3. Keep hooks focused in `hooks/`, with strict typed inputs/outputs.

## Cross-Platform Hygiene

- Run `npm run check:path-hygiene` before release and in CI.
- The script blocks path separator drift and case-collision duplicates in tracked files.
