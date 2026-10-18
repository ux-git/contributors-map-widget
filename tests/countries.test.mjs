import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createCountryResolver,
  summarizeContributors,
} from "../js/countries.js";
const countries = JSON.parse(readFileSync("data/countries.json", "utf8"));
const resolve = createCountryResolver(countries);
for (const [location, expected] of [
  ["Berlin, Germany", "DE"],
  ["Deutschland", "DE"],
  ["Lagos, Nigeria", "NG"],
  ["Niamey, Niger", "NE"],
  ["Dominican Republic", "DO"],
  ["Dominica", "DM"],
  ["South Africa", "ZA"],
  ["Guinea-Bissau", "GW"],
  ["Equatorial Guinea", "GQ"],
  ["Northern Ireland", "GB"],
  ["Ireland", "IE"],
  ["London, UK", "GB"],
  ["USA", "US"],
  ["U.S.A.", "US"],
  ["New York, United States of America", "US"],
  ["Moscow, Russia", "RU"],
  ["Россия", "RU"],
  ["Türkiye", "TR"],
  ["South Korea", "KR"],
  ["North Korea", "KP"],
  ["Democratic Republic of the Congo", "CD"],
  ["Republic of the Congo", "CG"],
  ["Côte d’Ivoire", "CI"],
  ["Berlin, DE", "DE"],
  ["DE", "DE"],
  ["Georgia, US", "US"],
  ["Paris", null],
  ["Remote", null],
  ["in space", null],
  ["Join us", null],
  ["Indiana", null],
  ["Germany / France", null],
  ["Antarctica", null],
  ["AQ", null],
  ["", null],
  [null, null],
])
  test(`country mapping: ${JSON.stringify(location)}`, () =>
    assert.equal(resolve(location), expected));
test("every map country name round-trips to its path ID", () => {
  for (const country of countries)
    assert.equal(resolve(country.name), country.code, country.name);
});
test("aggregation counts people, never contributions; input unchanged", () => {
  const people = [
    { location: "Germany", contributions: 100 },
    { location: "Berlin, DE", contributions: 2 },
    { location: null },
    { location: "Nigeria" },
  ];
  const before = JSON.stringify(people);
  assert.deepEqual(summarizeContributors(people, resolve), {
    counts: { DE: 2, NG: 1 },
    unknown: 1,
    total: 4,
    mapped: 3,
  });
  assert.equal(JSON.stringify(people), before);
});
