import type {
  LoopRunGoalTemplate,
  LoopRunGoalTemplateCategory,
  LoopRunGoalTemplateGroup
} from "@/components/app/types/loopRunGoalTemplates.types";

const TEMPLATE_CATEGORY_LABELS: Record<LoopRunGoalTemplateCategory, string> = {
  quick: "Quick validation",
  delivery: "Delivery",
  improvement: "Improvements",
  maintenance: "Maintenance"
};

const TEMPLATE_CATEGORY_ORDER: LoopRunGoalTemplateCategory[] = ["quick", "delivery", "improvement", "maintenance"];

export const LOOP_RUN_GOAL_TEMPLATES: LoopRunGoalTemplate[] = [
  {
    id: "smoke-test",
    label: "Smoke test",
    description: "Tiny change to verify the workflow, agents, and guardrails end to end.",
    category: "quick",
    goalKind: "custom",
    objective: [
      "Run a minimal end-to-end validation of this workflow.",
      "Make one small, safe change that proves the writer can edit the repository and reviewers can inspect it.",
      "Good options: add a short note to README, create a tiny docs file, or fix an obvious typo.",
      "Run available verification commands if they exist, then return complete only when the change is verifiable."
    ].join("\n"),
    limits: {
      maxIterations: 2,
      maxDurationMinutes: 15,
      roleTimeoutMinutes: 5
    }
  },
  {
    id: "implement-spec",
    label: "Implement spec",
    description: "Build out the selected workspace spec with tests and verification.",
    category: "delivery",
    goalKind: "spec",
    objective: [
      "Implement the attached spec completely.",
      "Break work into coherent increments, add or update tests for changed behavior,",
      "and run the project verification commands before marking the run complete."
    ].join(" ")
  },
  {
    id: "complete-task",
    label: "Complete task",
    description: "Finish the selected task file and satisfy its definition of done.",
    category: "delivery",
    goalKind: "task",
    objective: [
      "Complete the attached task file.",
      "Follow its goal, context, and definition of done.",
      "Avoid unrelated edits and add missing tests before finishing."
    ].join(" ")
  },
  {
    id: "improve-one-area",
    label: "Improve one area",
    description: "Find the strongest improvement candidate in the codebase and carry one focused improvement through to completion.",
    category: "improvement",
    goalKind: "custom",
    objective: [
      "Inspect the codebase and identify the best single feature or product area to improve.",
      "Evaluate candidates by user impact, current weakness, implementation feasibility, and the ability to verify the result.",
      "Choose one focused improvement target, state the target and success criteria clearly, then implement it completely.",
      "Follow the existing architecture and product conventions, add or update focused tests where practical, and avoid unrelated refactors.",
      "Continue working until the selected improvement is implemented and verified; do not stop after analysis or recommendations."
    ].join(" ")
  },
  {
    id: "fix-ci",
    label: "Fix failing CI",
    description: "Find and fix the current CI failure with the smallest correct change.",
    category: "maintenance",
    goalKind: "custom",
    objective: [
      "Identify the failing CI check affecting this branch or workspace.",
      "Reproduce the failure locally when possible, implement the smallest correct fix,",
      "and verify with the same commands CI would run."
    ].join(" ")
  },
  {
    id: "add-tests",
    label: "Add test coverage",
    description: "Increase coverage around a critical path without changing product behavior unnecessarily.",
    category: "improvement",
    goalKind: "custom",
    objective: [
      "Identify a critical path that lacks adequate automated test coverage.",
      "Add focused tests for the highest-risk behavior, keep production changes minimal,",
      "and run the relevant test suite before completing the run."
    ].join(" ")
  },
  {
    id: "review-feedback",
    label: "Address review feedback",
    description: "Choose open review comments from a pull or merge request to address in this run.",
    category: "maintenance",
    goalKind: "custom",
    objective: [
      "Address the selected review comments from the attached handoff file.",
      "Fix each cited issue, add regression tests where appropriate,",
      "and leave the branch in a merge-ready state."
    ].join(" ")
  },
  {
    id: "refactor-safely",
    label: "Refactor safely",
    description: "Improve structure or readability while preserving behavior.",
    category: "improvement",
    goalKind: "custom",
    objective: [
      "Refactor the targeted area to improve structure, readability, or maintainability.",
      "Preserve existing behavior, keep the diff focused,",
      "and prove equivalence with tests or verification commands before completing."
    ].join(" ")
  }
];

export const LOOP_RUN_GOAL_TEMPLATE_GROUPS: LoopRunGoalTemplateGroup[] = TEMPLATE_CATEGORY_ORDER.map((category) => ({
  id: category,
  label: TEMPLATE_CATEGORY_LABELS[category],
  templates: LOOP_RUN_GOAL_TEMPLATES.filter((template) => template.category === category)
}));
