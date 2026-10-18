import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
test("README local document and image links resolve", () => {
  const content = readFileSync("README.md", "utf8");
  for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|#)/.test(target)) continue;
    assert.ok(existsSync(path.resolve(target)), target);
  }
});
test("page static module and stylesheet assets exist", () => {
  const content = readFileSync("index.html", "utf8");
  for (const match of content.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (match[1].startsWith("http")) continue;
    assert.ok(existsSync(match[1]), match[1]);
  }
});
