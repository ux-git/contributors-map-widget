const normalize = (value) =>
  value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
const aliases = {
  US: ["USA", "U.S.A.", "United States of America", "United States"],
  GB: [
    "UK",
    "U.K.",
    "United Kingdom",
    "Great Britain",
    "England",
    "Scotland",
    "Wales",
    "Northern Ireland",
  ],
  DE: ["Deutschland"],
  RU: ["Russia", "Russian Federation", "Россия"],
  KR: ["South Korea", "Republic of Korea"],
  KP: ["North Korea"],
  CZ: ["Czech Republic", "Czechia"],
  TR: ["Turkey", "Türkiye"],
  VN: ["Vietnam", "Viet Nam"],
  TW: ["Taiwan"],
  CI: ["Ivory Coast", "Côte d’Ivoire"],
  LA: ["Laos"],
  CD: ["DR Congo", "Democratic Republic of the Congo"],
  CG: ["Republic of the Congo"],
  BO: ["Bolivia"],
  VE: ["Venezuela"],
  TZ: ["Tanzania"],
  IR: ["Iran"],
  SY: ["Syria"],
  MD: ["Moldova"],
  PS: ["Palestine"],
};
export function createCountryResolver(countries) {
  const supported = new Set(countries.map((c) => c.code));
  const names = new Map();
  const display = new Intl.DisplayNames(["en"], { type: "region" });
  for (const { code, name } of countries) {
    const variants = [name, ...(aliases[code] || [])];
    if (/^[A-Z]{2}$/.test(code)) variants.push(display.of(code));
    for (const name of variants) {
      const key = normalize(name);
      if (!names.has(key)) names.set(key, new Set());
      names.get(key).add(code);
    }
  }
  const ordered = [...names].sort((a, b) => b[0].length - a[0].length);
  return (location) => {
    if (typeof location !== "string" || !location.trim()) return null;
    // A country code is accepted only as the entire location or a comma-separated
    // final segment, in uppercase. Never infer India from “in” or US from “us”.
    const tail = location.trim().split(",").at(-1).trim();
    if (/^[A-Z]{2}$/.test(tail) && supported.has(tail)) return tail;
    let value = ` ${normalize(location)} `;
    const matches = new Set();
    for (const [name, codes] of ordered) {
      const token = ` ${name} `;
      if (value.includes(token)) {
        codes.forEach((code) => matches.add(code));
        value = value.split(token).join(" "); // longest wins: Nigeria ≠ Niger
      }
    }
    return matches.size === 1 ? [...matches][0] : null;
  };
}
export function summarizeContributors(contributors, resolve) {
  const counts = {};
  let unknown = 0;
  for (const person of contributors) {
    const code = resolve(person.location);
    if (code) counts[code] = (counts[code] || 0) + 1;
    else unknown++;
  }
  return {
    counts,
    unknown,
    total: contributors.length,
    mapped: contributors.length - unknown,
  };
}
