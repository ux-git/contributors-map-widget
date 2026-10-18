import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import clipping from "polygon-clipping";
import { paintMap } from "../js/render.js";
const parse = (file) =>
  new JSDOM(readFileSync(file, "utf8"), { contentType: "image/svg+xml" }).window
    .document;
const source = parse("data/world-mercator.original.svg"),
  doc = parse("data/world-mercator.svg");
function rings(path) {
  return path
    .getAttribute("d")
    .match(/M[^M]+/g)
    .map((part) => {
      const n = part.match(/-?\d+(?:\.\d+)?/g).map(Number);
      return Array.from({ length: n.length / 2 }, (_, i) =>
        n.slice(i * 2, i * 2 + 2),
      );
    });
}
const area = (ring) =>
  Math.abs(
    ring.reduce((sum, p, i) => {
      const q = ring[(i + 1) % ring.length];
      return sum + p[0] * q[1] - q[0] * p[1];
    }, 0) / 2,
  );
test("Antarctica removed, all other IDs retained exactly once", () => {
  const expected = [...source.querySelectorAll("path")]
    .map((p) => p.id)
    .filter((id) => id !== "AQ")
    .sort();
  const actual = [...doc.querySelectorAll("path")].map((p) => p.id).sort();
  assert.deepEqual(actual, expected);
  assert.equal(new Set(actual).size, actual.length);
  assert.equal(doc.querySelector("#AQ"), null);
});
test("all non-Russian geometry is unchanged", () => {
  for (const p of doc.querySelectorAll("path"))
    if (p.id !== "RU")
      assert.equal(
        p.getAttribute("d"),
        source.getElementById(p.id).getAttribute("d"),
        p.id,
      );
});
test("Russia unwrapped, stitched without lost area or seam", () => {
  const old = rings(source.querySelector("#RU")),
    joined = rings(doc.querySelector("#RU"));
  assert.equal(
    joined.length,
    old.length - 2,
    "two touching fragment pairs merged",
  );
  assert.ok(
    joined.flat().every(([x]) => x > 480),
    "no Russia left of Alaska",
  );
  assert.ok(
    joined.flat().some(([x]) => x > 960),
    "far east extends beyond original edge",
  );
  assert.ok(
    Math.abs(
      joined.reduce((s, r) => s + area(r), 0) -
        old.reduce((s, r) => s + area(r), 0),
    ) < 0.1,
    "area preserved",
  );
  for (const ring of joined)
    for (let i = 1; i < ring.length; i++)
      assert.ok(
        !(ring[i][0] === 960 && ring[i - 1][0] === 960),
        "no artificial vertical seam",
      );
  const expected = old.map((r) => {
    const shifted = r.map(([x, y]) => [
      x + (Math.max(...r.map((p) => p[0])) < 480 ? 960 : 0),
      y,
    ]);
    shifted.push(shifted[0]);
    return [shifted];
  });
  assert.deepEqual(
    clipping.xor(
      clipping.union(...expected),
      joined.map((r) => [r]),
    ),
    [],
    "exact translated geometry",
  );
});
test("viewBox fits every retained point and removes Antarctic dead space", () => {
  const [x, y, w, h] = doc.documentElement
    .getAttribute("viewBox")
    .split(" ")
    .map(Number);
  assert.ok(h < 700);
  for (const p of doc.querySelectorAll("path"))
    for (const [px, py] of rings(p).flat())
      assert.ok(px >= x && px <= x + w && py >= y && py <= y + h, p.id);
});
test("render highlights exact country IDs and safely escapes titles", () => {
  const svg = doc.documentElement.cloneNode(true);
  paintMap(
    svg,
    { counts: { DE: 2, RU: 1, NG: 1 }, mapped: 4, total: 5, unknown: 1 },
    { label: "<img onerror=alert(1)>", theme: "dark" },
  );
  assert.equal(svg.querySelector("#DE").getAttribute("fill"), "#75c9f0");
  assert.equal(svg.querySelector("#NE").getAttribute("fill"), "#283746");
  assert.equal(
    svg.querySelector("#DE title").textContent,
    "Germany: 2 contributors",
  );
  assert.equal(svg.querySelectorAll("img").length, 0);
  assert.match(svg.outerHTML, /amCharts/);
});

test("export discloses limited coverage and uses singular country label", () => {
  const svg = doc.documentElement.cloneNode(true);
  paintMap(
    svg,
    { counts: { DE: 12 }, mapped: 12, total: 12, unknown: 0 },
    { truncated: true },
  );
  assert.match(
    svg.querySelector("#map-description").textContent,
    /across 1 country\./,
  );
  assert.match(
    svg.querySelector("#map-description").textContent,
    /Limited to the top 12 contributors/,
  );
});

test("SVG export has intrinsic dimensions and a portable themed background", () => {
  const svg = doc.documentElement.cloneNode(true);
  paintMap(
    svg,
    { counts: {}, mapped: 0, total: 0, unknown: 0 },
    { theme: "dark" },
  );
  assert.ok(Number(svg.getAttribute("width")) > 900);
  assert.ok(Number(svg.getAttribute("height")) > 600);
  assert.equal(
    svg.querySelector("#map-background").getAttribute("fill"),
    "#0e1924",
  );
  paintMap(
    svg,
    { counts: {}, mapped: 0, total: 0, unknown: 0 },
    { theme: "constructor" },
  );
  assert.equal(svg.querySelectorAll("#map-background").length, 1);
  assert.equal(
    svg.querySelector("#map-background").getAttribute("fill"),
    "#ffffff",
  );
});
