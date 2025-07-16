// js/generate-map.js
import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import * as d3 from "d3";
import topojson from "topojson-client";
import countries from "i18n-iso-countries";

// read owner/repo from package.json
const { repository } = JSON.parse(await fs.readFile("package.json", "utf-8"));
const match = repository.url.match(/github\.com\/([^\/]+)\/([^\/.]+)/);
const [_, OWNER, REPO] = match;

async function buildMap() {
  // 1. Set up a virtual DOM with an 800×450 SVG
  const dom = new JSDOM(`<svg width="800" height="450"></svg>`);
  const svg = d3.select(dom.window.document.querySelector("svg"));

  // 2. Projection + path generator
  const projection = d3.geoMercator().scale(130).translate([400, 225]);
  const path = d3.geoPath(projection);

  // 3. Load world TopoJSON (you may need to commit world-110m.json under /data)
  const topo = JSON.parse(
    await fs.readFile(path.resolve("data/world-110m.json"), "utf-8")
  );
  const features = topojson.feature(topo, topo.objects.countries).features;

  // 4. Draw all countries
  svg
    .selectAll("path")
    .data(features)
    .join("path")
    .attr("d", path)
    .attr("id", (d) => d.id)
    .attr("fill", "#eee")
    .attr("stroke", "#999");

  // 5. Fetch contributors & highlight
  const contributors = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contributors?per_page=100`
  ).then((r) => r.json());

  for (const c of contributors) {
    const user = await fetch(c.url).then((r) => r.json());
    const loc = (user.location || "").toLowerCase();
    const names = countries.getNames("en");
    const found = Object.entries(names).find(
      ([iso, name]) => loc.includes(name.toLowerCase())
    );
    if (found) {
      svg.select(`#${found[0]}`).attr("fill", "#003366");
    }
  }

  // 6. Serialize & write to map.svg
  const out = dom.window.document.querySelector("svg").outerHTML;
  await fs.writeFile("map.svg", out);
  console.log("✅ map.svg generated");
}

buildMap();
