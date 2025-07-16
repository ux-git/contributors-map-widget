// js/generate-map.js
import fs from "fs/promises";
import { JSDOM } from "jsdom";
import fetch from "node-fetch";
import * as d3 from "d3";
import topojson from "topojson-client";
import countries from "i18n-iso-countries";

// auto‑detect owner/repo from package.json
const { repository } = JSON.parse(
  await fs.readFile("package.json", "utf-8")
);
const [, OWNER, REPO] = repository.url.match(/github\.com\/([^/]+)\/([^/.]+)/);

async function build() {
  // set up a virtual DOM with an 800×450 SVG
  const dom = new JSDOM(`<svg width="800" height="450"></svg>`);
  const svg = d3.select(dom.window.document.querySelector("svg"));

  // projection + path
  const projection = d3.geoMercator().scale(130).translate([400, 225]);
  const path = d3.geoPath(projection);

  // load world map (you can commit world-110m.json under /data)
  const topo = JSON.parse(await fs.readFile("data/world-110m.json", "utf-8"));
  const countriesData = topojson.feature(topo, topo.objects.countries).features;

  // draw base map
  svg
    .selectAll("path")
    .data(countriesData)
    .join("path")
    .attr("d", path)
    .attr("fill", "#eee")
    .attr("stroke", "#999")
    .attr("id", (d) => d.id);

  // fetch contributors and highlight
  const contributors = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contributors?per_page=100`
  ).then((r) => r.json());

  for (const c of contributors) {
    const user = await fetch(c.url).then((r) => r.json());
    const loc = (user.location || "").toLowerCase();
    const names = countries.getNames("en");
    const found = Object.entries(names).find(([, name]) =>
      loc.includes(name.toLowerCase())
    );
    if (found) {
      svg.select(`#${found[0]}`).attr("fill", "#003366");
    }
  }

  // write out the SVG
  const out = dom.window.document.querySelector("svg").outerHTML;
  await fs.writeFile("map.svg", out);
  console.log("✅ map.svg generated");
}

build();
