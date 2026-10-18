import { readFile, writeFile } from "node:fs/promises";
const state = JSON.parse(await readFile("project-state.json", "utf8"));
const output = `# Project status\n\nGenerated from project-state.json.\n\n- Project: ${state.project}\n- Updated: ${state.updated}\n- Owner: ${state.owner}\n- Task: ${state.task}\n- Status: ${state.status}\n- Base commit: ${state.baseCommit}\n- Deployment: ${state.deployment}\n- Validation: ${state.validation || "In progress"}\n`;
if (process.argv.includes("--write"))
  await writeFile("PROJECT_STATUS.md", output);
if (
  process.argv.includes("--check") &&
  (await readFile("PROJECT_STATUS.md", "utf8")) !== output
)
  throw new Error(
    "PROJECT_STATUS.md is stale. Run node scripts/project-status.mjs --write",
  );
