import { test, expect } from "@playwright/test";
async function sample(page) {
  await page.goto("/?sample=1");
  await expect(page.locator("#status")).toContainText("Sample map loaded");
}
test("responsive map, country list, dark theme, download and attribution", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await sample(page);
  await expect(page.locator("#map path")).toHaveCount(256);
  await expect(page.locator("#map #AQ")).toHaveCount(0);
  await expect(page.locator("#map #RU")).toHaveAttribute("data-count", "1");
  await expect(page.locator("#map #NG")).toHaveAttribute("data-count", "1");
  await expect(page.locator("#map #NE")).toHaveAttribute("data-count", "0");
  await expect(page.locator("#summary")).toHaveText(
    "9 countries · 10 mapped · 2 unmapped",
  );
  await expect(page.locator("#countries li")).toHaveCount(9);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const svg = await page.locator("#map svg").boundingBox();
  expect(svg.width).toBeGreaterThan(240);
  const ru = await page.locator("#map #RU").evaluate((p) => ({
    x: p.getBBox().x,
    right: p.getBBox().x + p.getBBox().width,
    view:
      p.ownerSVGElement.viewBox.baseVal.x +
      p.ownerSVGElement.viewBox.baseVal.width,
  }));
  expect(ru.x).toBeGreaterThan(480);
  expect(ru.right).toBeLessThan(ru.view);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-light.png`,
    fullPage: true,
  });
  await page.locator("#theme").selectOption("dark");
  await expect(page.locator("#map #RU")).toHaveAttribute("fill", "#75c9f0");
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-dark.png`,
    fullPage: true,
  });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download SVG" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("sample-map.svg");
  const fs = await import("node:fs/promises");
  const text = await fs.readFile(await file.path(), "utf8");
  expect(text).toContain("amCharts");
  expect(text).not.toContain('id="AQ"');
  expect(text).toContain("Sample");
  expect(errors).toEqual([]);
});
test("GitHub mapping, URL parameters and profile errors preserve previous map", async ({
  page,
}) => {
  await page.route("https://api.github.com/**", async (route) => {
    const url = route.request().url();
    await route.fulfill({
      json: url.includes("/contributors?")
        ? [
            { login: "alice", contributions: 8 },
            { login: "bob", contributions: 2 },
          ]
        : { location: url.endsWith("/alice") ? "Berlin, Germany" : "Russia" },
    });
  });
  await page.goto("/?owner=ux-git&repo=test&maxContributors=12&theme=github");
  await expect(page.locator("#status")).toContainText("Map updated");
  await expect(page.locator("#summary")).toHaveText(
    "2 countries · 2 mapped · 0 unmapped",
  );
  await expect(page.locator("#map #DE")).toHaveAttribute("fill", "#0969da");
  await page.unroute("https://api.github.com/**");
  await page.route("https://api.github.com/**", (route) =>
    route.fulfill({ status: 403, json: { message: "limit" } }),
  );
  await page.locator("#repo").fill("different");
  await page.getByRole("button", { name: "Generate map" }).click();
  await expect(page.locator("#status")).toContainText("Previous map retained");
  await expect(page.locator("#map-label")).toHaveText("ux-git/test");
  await expect(page.locator("#generate")).toBeEnabled();
});
test("empty data, invalid theme fallback, and no-country data", async ({
  page,
}) => {
  await page.route("https://api.github.com/**", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto("/?owner=ux-git&repo=empty&theme=invalid");
  await expect(page.locator("#status")).toContainText("No contributors");
  await expect(page.locator("#summary")).toHaveText(
    "0 countries · 0 mapped · 0 unmapped",
  );
  await page.unroute("https://api.github.com/**");
  await page.route("https://api.github.com/**", (route) =>
    route.fulfill({
      json: route.request().url().includes("/contributors?")
        ? [{ login: "nomap" }]
        : { location: "Remote" },
    }),
  );
  await page.locator("#repo").fill("unknown");
  await page.getByRole("button", { name: "Generate map" }).click();
  await expect(page.locator("#summary")).toHaveText(
    "0 countries · 0 mapped · 1 unmapped",
  );
});
test("keyboard controls and clipboard failure are usable", async ({
  page,
  browserName,
}) => {
  await sample(page);
  await page.locator("#theme").focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press(
    browserName === "webkit" && process.platform === "darwin"
      ? "Alt+Tab"
      : "Tab",
  );
  await expect(page.locator("#generate")).toBeFocused();
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("denied")) },
      configurable: true,
    }),
  );
  await page.getByRole("button", { name: "Copy page link" }).click();
  await expect(page.locator("#status")).toContainText(
    "Clipboard unavailable. Copy this page link:",
  );
});
test("map asset failure disables generation with clear feedback", async ({
  page,
}) => {
  await page.route("**/data/world-mercator.svg", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/");
  await expect(page.locator("#status")).toContainText(
    "Map files could not load",
  );
  await expect(page.locator("#generate")).toBeDisabled();
  await expect(page.locator("#demo")).toBeDisabled();
});

test("long repository labels, limited coverage and copied links match the displayed data", async ({
  page,
}) => {
  const owner = "a".repeat(39),
    repo = "b".repeat(100);
  await page.route("https://api.github.com/**", (route) =>
    route.fulfill({
      json: route.request().url().includes("/contributors?")
        ? Array.from({ length: 20 }, (_, i) => ({ login: `u${i}` }))
        : { location: "Germany" },
    }),
  );
  await page.goto(`/?owner=${owner}&repo=${repo}&maxContributors=12`);
  await expect(page.locator("#status")).toContainText("Map updated");
  await expect(page.locator("#summary")).toHaveText(
    "1 country · 12 mapped · 0 unmapped",
  );
  await expect(page.locator("#coverage")).toContainText(
    "Contributor limit reached",
  );
  await expect(page.locator("#map-description")).toContainText(
    "Limited to the top 12 contributors",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("#repo").fill("edited-but-not-generated");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (text) => {
          window.copied = text;
        },
      },
      configurable: true,
    }),
  );
  await page.getByRole("button", { name: "Copy page link" }).click();
  const copied = new URL(await page.evaluate(() => window.copied));
  expect(copied.searchParams.get("repo")).toBe(repo);
  expect(copied.searchParams.get("maxContributors")).toBe("12");
});
