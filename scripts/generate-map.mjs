import { readFile, writeFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import {
  createCountryResolver,
  summarizeContributors,
} from "../js/countries.js";
import { fetchContributors } from "../js/github.js";
import { paintMap } from "../js/render.js";
const sample = process.argv.includes("--sample");
const owner = process.env.MAP_OWNER || "ux-git",
  repo = process.env.MAP_REPO || "contributors-map-widget";
const countries = JSON.parse(await readFile("data/countries.json", "utf8"));
const result = sample
  ? {
      contributors: JSON.parse(
        await readFile("data/sample-contributors.json", "utf8"),
      ),
    }
  : await fetchContributors(owner, repo, {
      limit: 500,
      fetcher: async (url, options) =>
        fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            ...(process.env.GITHUB_TOKEN
              ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
              : {}),
          },
        }),
    });
const { contributors, truncated = false } = result;
const summary = summarizeContributors(
  contributors,
  createCountryResolver(countries),
);
const doc = new JSDOM(await readFile("data/world-mercator.svg", "utf8"), {
  contentType: "image/svg+xml",
}).window.document;
paintMap(doc.documentElement, summary, {
  label: sample ? "Sample contributors" : `${owner}/${repo}`,
  truncated,
});
await writeFile(
  sample ? "sample-map.svg" : "map.svg",
  doc.documentElement.outerHTML + "\n",
);
console.log(
  `${sample ? "sample-map.svg" : "map.svg"}: ${summary.mapped}/${summary.total} mapped in ${Object.keys(summary.counts).length} ${Object.keys(summary.counts).length === 1 ? "country" : "countries"}.${truncated ? " Limited to the top 500 contributors." : ""}`,
);
