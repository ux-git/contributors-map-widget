import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { staticFiles } from "./static-files.mjs";
const root = new URL("../dist/", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("manifest.json", root), "utf8"),
);
const files = (await readdir(root, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile())
  .map((entry) =>
    path.relative(fileURLToPath(root), path.join(entry.parentPath, entry.name)),
  );
assert.deepEqual(
  files.sort(),
  [...staticFiles, "manifest.json"].sort(),
  "Distribution contains only approved public files",
);
assert.deepEqual(Object.keys(manifest).sort(), [...staticFiles].sort());
for (const file of staticFiles) {
  const data = await readFile(new URL(file, root));
  assert.equal(
    createHash("sha256").update(data).digest("hex"),
    manifest[file],
    file,
  );
  assert.deepEqual(
    data,
    await readFile(new URL("../" + file, import.meta.url)),
    file,
  );
}
console.log(
  "Production artifact: file allowlist, source parity and all SHA-256 hashes verified.",
);
