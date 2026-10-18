import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { staticFiles } from "./static-files.mjs";
const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "dist");
// Read every input before replacing a previous, valid artifact.
const inputs = await Promise.all(
  staticFiles.map(async (file) => ({
    file,
    data: await readFile(path.join(root, file)),
  })),
);
await rm(out, { recursive: true, force: true });
const manifest = {};
for (const { file, data } of inputs) {
  const destination = path.join(out, file);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, data);
  manifest[file] = createHash("sha256").update(data).digest("hex");
}
await writeFile(
  path.join(out, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  `Built ${inputs.length} public files into dist/. No runtime packages required.`,
);
