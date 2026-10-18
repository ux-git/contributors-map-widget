export const themes = {
  light: {
    land: "#e3e9ed",
    active: "#125c85",
    border: "#ffffff",
    text: "#435463",
    background: "#ffffff",
  },
  dark: {
    land: "#283746",
    active: "#75c9f0",
    border: "#0e1924",
    text: "#c5d3df",
    background: "#0e1924",
  },
  github: {
    land: "#e7eaf0",
    active: "#0969da",
    border: "#ffffff",
    text: "#435463",
    background: "#ffffff",
  },
};
export function paintMap(
  svg,
  summary,
  { theme = "light", label = "Contributors", truncated = false } = {},
) {
  const colors = themes[Object.hasOwn(themes, theme) ? theme : "light"];
  const [x, y, width, height] = svg
    .getAttribute("viewBox")
    .split(/\s+/)
    .map(Number);
  if (
    ![x, y, width, height].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  )
    throw new Error("Invalid map dimensions.");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.style.background = colors.background;
  // An explicit background keeps standalone SVG images correct in non-browser renderers.
  let background = svg.querySelector("#map-background");
  if (!background) {
    background = svg.ownerDocument.createElementNS(svg.namespaceURI, "rect");
    background.id = "map-background";
    svg.insertBefore(background, svg.querySelector("path"));
  }
  for (const [key, value] of Object.entries({
    x,
    y,
    width,
    height,
    fill: colors.background,
  }))
    background.setAttribute(key, String(value));
  svg.querySelector("#map-title").textContent =
    `${label} — contributor countries`;
  svg.querySelector("#map-description").textContent =
    `${summary.mapped} of ${summary.total} contributors mapped across ${Object.keys(summary.counts).length} ${Object.keys(summary.counts).length === 1 ? "country" : "countries"}. ${summary.unknown} locations unrecognized or missing.${truncated ? " Limited to the top " + summary.total + " contributors." : ""} Map by amCharts, CC BY 4.0, modified.`;
  for (const path of svg.querySelectorAll("path")) {
    const count = summary.counts[path.id] || 0;
    path.setAttribute("fill", count ? colors.active : colors.land);
    path.setAttribute("stroke", colors.border);
    path.setAttribute("stroke-width", "0.65");
    path.dataset.count = String(count);
    path.querySelector("title")?.remove();
    const title = svg.ownerDocument.createElementNS(svg.namespaceURI, "title");
    title.textContent = `${path.dataset.name}: ${count} ${count === 1 ? "contributor" : "contributors"}`;
    path.append(title);
  }
  svg.querySelector("#map-credit text").setAttribute("fill", colors.text);
  return svg;
}
