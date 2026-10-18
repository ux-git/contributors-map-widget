import { createCountryResolver, summarizeContributors } from "./countries.js";
import { fetchContributors, validateRepository } from "./github.js";
import { paintMap, themes } from "./render.js";
import { request, readJSON } from "./network.js";
const $ = (id) => document.getElementById(id);
const emptySummary = { counts: {}, mapped: 0, total: 0, unknown: 0 };
let base, resolve, names;
let current = null,
  active = null;
function status(message, error = false) {
  $("status").textContent = message;
  $("status").classList.toggle("error", error);
}
function controls() {
  $("map").setAttribute("aria-busy", String(Boolean(active)));
  $("generate").disabled = Boolean(active) || !base;
  $("demo").disabled = Boolean(active) || !base;
  $("generate").textContent = active && base ? "Generating…" : "Generate map ↗";
  $("cancel").hidden = !active || !base;
  $("download").disabled = Boolean(active) || !current;
  $("copyUrl").disabled = Boolean(active) || !current;
}
function render() {
  const theme = $("theme").value;
  const summary = current
    ? summarizeContributors(current.people, resolve)
    : emptySummary;
  const svg = paintMap(base.cloneNode(true), summary, {
    theme,
    label: current?.label || "Contributors",
    truncated: current?.truncated,
  });
  $("map").replaceChildren(svg);
  document.querySelector(".swatch.active").style.background =
    themes[theme].active;
  document.querySelector(".swatch:not(.active)").style.background =
    themes[theme].land;
  if (!current) return;
  $("map-label").textContent = current.label;
  $("map-kind").textContent = current.sample
    ? "SAMPLE DATA · MERCATOR"
    : "GITHUB DATA · MERCATOR";
  const countryCount = Object.keys(summary.counts).length;
  $("summary").textContent =
    `${countryCount} ${countryCount === 1 ? "country" : "countries"} · ${summary.mapped} mapped · ${summary.unknown} unmapped`;
  $("coverage").textContent =
    `${summary.total} ${summary.total === 1 ? "contributor" : "contributors"} checked. ${summary.unknown} ${summary.unknown === 1 ? "has a missing or unrecognized country location" : "have missing or unrecognized country locations"}.${current.truncated ? " Contributor limit reached; this map covers only the top contributors." : ""}${current.sample ? " These are illustrative sample locations, not live GitHub data." : ""}`;
  $("countries").replaceChildren(
    ...Object.entries(summary.counts)
      .sort(
        (a, b) => b[1] - a[1] || names.get(a[0]).localeCompare(names.get(b[0])),
      )
      .map(([code, count]) => {
        const li = document.createElement("li"),
          label = document.createElement("span"),
          number = document.createElement("strong");
        label.textContent = names.get(code);
        number.textContent = count;
        li.append(label, number);
        return li;
      }),
  );
  controls();
}
async function generate(sample) {
  if (active || !base) return;
  const owner = $("owner").value.trim(),
    repo = $("repo").value.trim(),
    limit = Number($("maxContributors").value);
  if (!sample) {
    try {
      validateRepository(owner, repo);
    } catch (error) {
      status(error.message, true);
      return;
    }
  }
  active = new AbortController();
  controls();
  status(
    sample ? "Loading sample…" : `Fetching contributors for ${owner}/${repo}…`,
  );
  try {
    let next;
    if (sample) {
      const people = await request("data/sample-contributors.json", {
        signal: active.signal,
        read: readJSON,
      });
      if (
        !Array.isArray(people) ||
        people.some(
          (p) => !p || (p.location != null && typeof p.location !== "string"),
        )
      )
        throw new Error("Sample data could not be loaded. Try again.");
      next = { people, label: "Sample: a worldwide community", sample: true };
    } else {
      const result = await fetchContributors(owner, repo, {
        limit,
        signal: active.signal,
        onProgress: (done, total) =>
          status(`Reading public profile locations: ${done} of ${total}…`),
      });
      next = {
        people: result.contributors,
        label: `${owner}/${repo}`,
        owner,
        repo,
        limit,
        truncated: result.truncated,
        sample: false,
      };
    }
    active.signal.throwIfAborted();
    current = next;
    render();
    status(
      sample
        ? "Sample map loaded — illustrative data, ready to explore."
        : current.people.length
          ? "Map updated. Countries are matched from public profile locations."
          : "No contributors found for this repository.",
    );
  } catch (error) {
    const message =
      error.name === "AbortError" ? "Generation cancelled." : error.message;
    status(
      `${message}${current ? " Previous map retained." : ""}`,
      error.name !== "AbortError",
    );
  } finally {
    active = null;
    controls();
  }
}
$("theme").addEventListener("change", () => {
  if (base) render();
});
$("contributorsForm").addEventListener("submit", (e) => {
  e.preventDefault();
  generate(false);
});
$("demo").addEventListener("click", () => generate(true));
$("cancel").addEventListener("click", () => active?.abort());
$("download").addEventListener("click", () => {
  if (!current || active) return;
  const svg = document.querySelector("#map svg");
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = current.sample ? "sample-map.svg" : "map.svg";
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$("copyUrl").addEventListener("click", async () => {
  if (!current || active) return;
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set("theme", $("theme").value);
  if (current.sample) url.searchParams.set("sample", "1");
  else
    for (const [key, value] of Object.entries({
      owner: current.owner,
      repo: current.repo,
      maxContributors: current.limit,
    }))
      url.searchParams.set(key, value);
  try {
    await navigator.clipboard.writeText(url.href);
    status("Page link copied. Use Download SVG for image embedding.");
  } catch {
    status("Clipboard unavailable. Copy this page link: " + url.href, true);
  }
});
async function loadAssets() {
  if (active) return;
  active = new AbortController();
  base = undefined;
  controls();
  $("retry").hidden = true;
  status("Loading map…");
  try {
    const [source, countries] = await Promise.all([
      request("data/world-mercator.svg", {
        signal: active.signal,
        read: (response) => {
          if (!response.ok) throw new Error("Map unavailable");
          return response.text();
        },
      }),
      request("data/countries.json", { signal: active.signal, read: readJSON }),
    ]);
    const doc = new DOMParser().parseFromString(source, "image/svg+xml");
    const svg = doc.documentElement;
    if (
      doc.querySelector("parsererror") ||
      svg.localName !== "svg" ||
      !svg.querySelector("#map-title") ||
      !svg.querySelector("#map-description") ||
      !svg.querySelector("#map-credit text") ||
      !Array.isArray(countries) ||
      !countries.length ||
      countries.some(
        (c) =>
          !c ||
          typeof c.code !== "string" ||
          typeof c.name !== "string" ||
          !doc.getElementById(c.code),
      )
    )
      throw new Error("Invalid map files");
    const resolver = createCountryResolver(countries);
    // Publish readiness only once all assets have validated and can render.
    paintMap(svg, emptySummary);
    base = svg;
    resolve = resolver;
    names = new Map(countries.map((c) => [c.code, c.name]));
    render();
    status("Ready. Generate a map from GitHub or explore the sample.");
  } catch (error) {
    active.abort();
    base = undefined;
    $("retry").hidden = false;
    status(
      "Map files could not load. Reload to retry, or use Retry loading map.",
      true,
    );
  } finally {
    active = null;
    controls();
  }
  return Boolean(base);
}
$("retry").addEventListener("click", loadAssets);
const params = new URLSearchParams(location.search);
if (Object.hasOwn(themes, params.get("theme")))
  $("theme").value = params.get("theme");
if (await loadAssets()) {
  if (params.get("sample") === "1") generate(true);
  else if (params.get("owner") && params.get("repo")) {
    $("owner").value = params.get("owner");
    $("repo").value = params.get("repo");
    if (["12", "24", "100", "500"].includes(params.get("maxContributors")))
      $("maxContributors").value = params.get("maxContributors");
    generate(false);
  }
}
