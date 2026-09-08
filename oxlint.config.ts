import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react, next, antiSlop],
  ignorePatterns: [
    ...core.ignorePatterns,
    "*.tsbuildinfo",
    ".eve",
    ".workflow-data",
    ".claude",
    ".codex",
    ".conductor",
    ".superset",
  ],
  overrides: [
    {
      // eve derives the model-facing tool name from the filename, so these stay snake_case.
      files: ["agent/tools/**"],
      rules: { "unicorn/filename-case": ["error", { case: "snakeCase" }] },
    },
  ],
  rules: {
    // Sequential awaits in loops are deliberate here (rate-limited source reads, ordered writes).
    "no-await-in-loop": "off",
  },
});
