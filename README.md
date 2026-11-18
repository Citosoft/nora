```
 ███╗   ██╗  ██████╗  ██████╗   █████╗
 ██╔██╗ ██║ ██╔═══██╗ ██╔══██╗ ██╔══██╗
 ██║╚██╗██║ ██║   ██║ ██████╔╝ ███████║
 ██║ ╚████║ ██║   ██║ ██╔══██╗ ██╔══██║
 ██║  ╚███║ ╚██████╔╝ ██║  ██║ ██║  ██║
 ╚═╝   ╚══╝  ╚═════╝  ╚═╝  ╚═╝ ╚═╝  ╚═╝
```

# Nora

**Your AI team. Bots and agents, working side by side.**

Nora is a calm desktop workspace for working alongside your AI team. It runs Claude, Codex and ACP agents natively, and lets you shape them into bots with names, faces, roles and memory. Start a thread with an agent or a bot, bring more in to work it together, and keep all of it in one app.

Free during the beta. Nora 2.0 runs on macOS, Windows and Linux.

**[Download Nora](https://www.withnora.run/download)**

[![CI](https://github.com/Citosoft/nora/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Citosoft/nora/actions/workflows/ci.yml)
[![Release](https://github.com/Citosoft/nora/actions/workflows/release.yml/badge.svg)](https://github.com/Citosoft/nora/actions/workflows/release.yml)
[![Latest release](https://img.shields.io/github/v/release/Citosoft/nora?sort=semver&logo=github)](https://github.com/Citosoft/nora/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/Citosoft/nora/blob/main/package.json)

## Native Claude, Codex and ACP agents

Claude runs through the Claude Agent SDK. Codex runs through the Codex app server. Installed ACP agents, such as Cursor, OpenCode, Grok, Goose, Kimi and Google Antigravity, run as native thread providers, with their own models, modes, approvals and sign-in.

A thread keeps the work, not just the chat: the conversation, the workspace, branch and host, the agent and model, and the changes it reviewed. Settle a finished thread to clear it from view and reopen it later. Nora can also pick up Claude Code and Codex conversations you started outside the app.

Terminals stay available for commands you run yourself. Threads use real checkouts and branches, and can open in your editor.

## Bots with memory

A bot is a teammate you set up once: a name, a role, standing instructions, a provider and model, and an animated face whose eyes show what it is doing. Message a bot directly, or ask Nora to create one. Twelve templates, such as Code reviewer, Researcher and Planner, open the editor already filled in.

Bots can live everywhere or in one workspace. A workspace bot can be kept private, or shared with collaborators as a file in `.nora/bots`.

Bots and Nora keep notes that carry from one thread to the next. You can read, add, edit and delete those notes. Memory stays on your machine and is never written to your repository.

## Group chats

Start a group chat with two to six bots. Mention the member who should answer, ask everyone at once, and let bots ask each other for help. The reply comes back to the thread that asked.

## A Personal workspace

On first launch Nora creates a Personal workspace, so you can plan, write or research without a folder, repository or terminal. Add a folder or project when you are ready. Git controls appear only where Git is available.

## Roles

Nora asks what kind of work you do: engineering, design, product, writing, research, operations, general, or a role you describe yourself. That choice shapes the tools you see first, the starter tasks, and the guidance your agents receive. A role does not grant permissions, and it does not change your provider or model. Change it any time in Settings. Existing conversations keep the role they started with.

## MCP connectors

Add MCP connectors in Nora, sign in through your browser or with an API key, and Claude, Codex and ACP threads receive their tools. Limit a connector to chosen workspaces or bots, and see each connector’s status beside the thread.

## Nora Remote

Nora Remote is a small app for phones and browsers. Chat with your agents, follow their progress, and approve or answer whatever is waiting, while the work keeps running on your own computer.

Agents, files and history stay on that computer. It needs to be on, awake and online, with Nora running. Sign in with the same Nora account. Open Nora Remote in a browser and add it to your home screen, then turn it on in Nora Desktop under Settings → Remote access.

## Download

Nora 2.0.0 is free during the beta for macOS, Windows and Linux.

**[Download Nora](https://www.withnora.run/download)** · [release notes](https://www.withnora.run/changelog/v2-0-0)

The download page also has a one-line terminal install for the latest release.

## Project structure

- `main/`: privileged Electron runtime (IPC handlers, orchestration, integrations)
- `renderer/`: React UI and interaction state
- `shared/`: cross-boundary contracts and shared types
- `tests/`: unit and behavior-focused tests

See [ARCHITECTURE.md](./ARCHITECTURE.md) for boundary and composition details.

## Development

Requirements, from `package.json` `engines`:

- Node.js `>=24.16.0 <25`
- npm `>=11.13.0`

Install and run in development:

```bash
npm install
npm run dev
```

Run with the production build/start flow:

```bash
npm start
```

## Scripts

- `npm run dev`: development runner
- `npm run dev:nogpu`: development runner with GPU disabled
- `npm run build`: compile and bundle app assets
- `npm run test:unit`: TypeScript unit test pipeline
- `npm run check:path-hygiene`: path/casing hygiene checks
- `npm run check:shell-assembly-imports`: shell assembly import guard
- `npm run check:nora-bridge-usage`: bridge API usage guard
- `npm run package`: package the app via Electron Forge
- `npm run make`: create distributables via Electron Forge

## Release builds

Version tags matching `v*` trigger release workflows in `.github/workflows/` to build and publish release artifacts.

## Contributing

- [AGENTS.md](./AGENTS.md): repository engineering rules
- [ARCHITECTURE.md](./ARCHITECTURE.md): runtime architecture and boundaries

## Links

- [Nora](https://www.withnora.run)
- [Download](https://www.withnora.run/download)
- [Documentation](https://www.withnora.run/docs)
- [v2.0.0 release notes](https://www.withnora.run/changelog/v2-0-0)
- [GitHub releases](https://github.com/Citosoft/nora/releases)

## License

MIT (see `package.json`).
