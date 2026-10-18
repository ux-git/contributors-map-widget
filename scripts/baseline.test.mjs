import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const historical = (path) =>
  execFileSync("git", ["show", `a7bafeb:${path}`], { encoding: "utf8" });
test("baseline: latest page has avatars but no country mapping", () => {
  const html = execFileSync("git", ["show", "07d91d0:index.html"], {
    encoding: "utf8",
  });
  assert.match(html, /avatarElements/);
  assert.doesNotMatch(html, /geoMercator/);
});
test("baseline: historical country IDs cannot match ISO alpha-2 lookup", () => {
  const topo = JSON.parse(historical("data/world-110m.json"));
  const ids = topo.objects.countries.geometries.map((g) => String(g.id));
  assert.ok(ids.includes("276"), "Germany is numeric 276");
  assert.ok(!ids.includes("DE"), "Germany has no DE path");
  assert.match(historical("js/generate-map.js"), /found\[0\]/);
});
test("baseline: substring matching confuses Niger and Nigeria", () => {
  const names = [
    ["NE", "Niger"],
    ["NG", "Nigeria"],
  ];
  assert.equal(
    names.find(([, name]) => "lagos, nigeria".includes(name.toLowerCase()))[0],
    "NE",
  );
});
