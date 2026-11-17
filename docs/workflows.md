# Workflows

A workflow defines an ordered list of stages for completing a goal. Add as many stages as the process needs, and move them up or down in the workflow designer. Stages collapse to compact summaries showing their name, assignee, and type; opening or adding a stage closes the previous editor. Existing workflows start with their stages collapsed. Each run uses the same working directory and passes earlier stage summaries to later stages.

For example:

1. **Implementation** — Nora using Claude, with instructions to implement the goal.
2. **Code review** — a saved review bot, checking correctness and regressions.
3. **QA** — a saved QA bot, running tests and reporting results.
4. **Documentation** — an agent updating documentation after verification.

Each stage has a name, instructions, an assignee, and a type:

- **Work** stages can implement, test, or change files. They report completion or that further work is needed.
- **Review** stages inspect without editing and approve or request changes. Choose this type for QA that should act as an approval gate.

Every stage runs in its own persistent thread. Workflow threads and their child threads stay out of the normal thread list. Open them from the workflow monitor, which also shows approvals and questions and lets you respond without leaving the workflow. Assign an installed thread provider and model directly, or choose a saved bot available in the workspace. Bot stages use that bot's current instructions and model when a run starts; those settings are frozen for the run. Work stages use the normal thread runtime, including bot memory and configured connectors. Review stages enforce read-only access: Claude exposes inspection tools only; Codex uses its read-only sandbox. Other providers can perform work stages but cannot currently act as reviewers. A missing bot must be replaced before starting a run.

Stages execute in order. Each stage gates the next one. If a work stage needs further work or a reviewer requests changes, downstream stages do not run: the workflow immediately starts a new pass at the configured rework destination with the previous pass's feedback. The default destination is stage 1. Choose an earlier work stage (or the same stage for work); accepted results before that destination are retained. For example, a rejected code review returns to implementation, and QA only starts after the review approves. The run completes when every work stage finishes and every review stage approves in the same pass. Iteration, total runtime, and per-stage time limits bound execution. Pausing preserves completed stages, and resuming retries the unfinished stage.

Existing writer-and-reviewer workflows and run history load as ordered stages automatically. Nora's workflow tools use the same stage model: `create_workflow` requires a nonempty `stages` array; `update_workflow` replaces that array when supplied. Each entry has optional stable `id`, `name`, `kind` (`writer` for work or `reviewer` for review), `instructions`, and optional `agent` (provider kind or instance id), `model`, `botId` from `list_bots`, and `reworkStageId` pointing to an earlier work stage’s id.

## Stage results

Nora creates the stage threads through its execution host and reuses them for rework. Each attempt includes a fresh `attempt_id` in the stage’s instructions. The agent calls the `report_workflow_stage` MCP tool with that id, its `outcome`, and a `summary`. Work stages report `complete` or `continue`; reviewers report `approve` or `changes_requested`.

The MCP endpoint identifies the calling thread. Nora checks that the report belongs to the active workflow, stage, and attempt. A report alone does not advance the workflow: the native thread turn must also complete successfully. Failed turns and missing reports pause the run. Text tags in assistant messages have no execution effect.

Review threads receive only the stage-report MCP capability plus native inspection tools. Work threads receive their normal Nora tools and configured connectors. Approvals and questions from stages or delegated bots appear in the workflow monitor; workflow-owned threads are hidden from ordinary thread navigation and reference pickers.
