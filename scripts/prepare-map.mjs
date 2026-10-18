import { readFile, writeFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import clipping from "polygon-clipping";
const source = await readFile(
  new URL("../data/world-mercator.original.svg", import.meta.url),
  "utf8",
);
const doc = new JSDOM(source, { contentType: "image/svg+xml" }).window.document;
const svg = doc.documentElement;
svg.querySelector("#AQ").remove();
// Replace the original credit with one credited, modification-aware footer.
svg.querySelector("#amcharts-credit")?.remove();
// The source is a 960-unit-wide Mercator world. Only Russia's western
// antimeridian fragments move: +960 preserves their exact scale and latitude.
const russia = svg.querySelector("#RU");
const rings = russia
  .getAttribute("d")
  .match(/M[^M]+/g)
  .map((part) => {
    const numbers = part.match(/-?\d+(?:\.\d+)?/g).map(Number);
    const ring = Array.from({ length: numbers.length / 2 }, (_, i) =>
      numbers.slice(i * 2, i * 2 + 2),
    );
    if (Math.max(...ring.map((p) => p[0])) < 480)
      ring.forEach((p) => (p[0] += 960));
    ring.push([...ring[0]]);
    return [ring];
  });
// Union touching polygons to remove the artificial antimeridian border.
const joined = clipping.union(...rings);
russia.setAttribute(
  "d",
  joined
    .flatMap((poly) =>
      poly.map(
        (ring) =>
          "M" +
          ring
            .map((p) => p.map((n) => Number(n.toFixed(2))).join(","))
            .join("L") +
          "Z",
      ),
    )
    .join(""),
);
const paths = [...svg.querySelectorAll("path")];
const points = paths.flatMap((p) =>
  p
    .getAttribute("d")
    .match(/-?\d+(?:\.\d+)?/g)
    .map(Number),
);
const xs = points.filter((_, i) => i % 2 === 0),
  ys = points.filter((_, i) => i % 2 === 1);
const minX = Math.min(...xs) - 4,
  minY = Math.min(...ys) - 4;
const width = Math.max(...xs) - minX + 4,
  height = Math.max(...ys) - minY + 4;
svg.setAttribute(
  "viewBox",
  `${minX.toFixed(2)} ${minY.toFixed(2)} ${width.toFixed(2)} ${(height + 24).toFixed(2)}`,
);
svg.setAttribute("role", "img");
svg.setAttribute("aria-labelledby", "map-title map-description");
const title = doc.createElementNS(svg.namespaceURI, "title");
title.id = "map-title";
title.textContent = "Contributor countries — Mercator world map";
svg.prepend(title);
const desc = doc.createElementNS(svg.namespaceURI, "desc");
desc.id = "map-description";
desc.textContent = "Map geometry by amCharts, CC BY 4.0.";
svg.insertBefore(desc, title.nextSibling);
const credit = doc.createElementNS(svg.namespaceURI, "g");
credit.id = "map-credit";
const text = doc.createElementNS(svg.namespaceURI, "text");
text.setAttribute("x", "4");
text.setAttribute("y", String(minY + height + 14));
text.setAttribute("font-family", "sans-serif");
text.setAttribute("font-size", "12");
text.setAttribute("fill", "#576574");
text.textContent = "Map: amcharts.com · CC BY 4.0 · modified";
credit.append(text);
svg.append(credit);
const metadata = doc.createElementNS(svg.namespaceURI, "metadata");
metadata.textContent =
  "Source: https://www.amcharts.com/svg-maps/ | License: https://creativecommons.org/licenses/by/4.0/ | Modified map geometry.";
svg.append(metadata);
await writeFile(
  new URL("../data/world-mercator.svg", import.meta.url),
  svg.outerHTML + "\n",
);
await writeFile(
  new URL("../data/countries.json", import.meta.url),
  JSON.stringify(
    paths.map((p) => ({ code: p.id, name: p.getAttribute("data-name") })),
    null,
    2,
  ) + "\n",
);
console.log(
  `Prepared ${paths.length} regions; viewBox ${svg.getAttribute("viewBox")}`,
);
