import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("theme changes apply before generation and prototype-like theme URLs are safe", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?theme=constructor");
  await expect(page.locator("#status")).toContainText("Ready.");
  await page.locator("#theme").selectOption("dark");
  await expect(page.locator("#map-background")).toHaveAttribute(
    "fill",
    "#0e1924",
  );
  expect(errors).toEqual([]);
});
test("malformed asset remains disabled and can be retried", async ({
  page,
}) => {
  await page.route("**/data/world-mercator.svg", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: "<svg><broken" }),
  );
  await page.goto("/");
  await expect(page.locator("#retry")).toBeVisible();
  await expect(page.locator("#generate")).toBeDisabled();
  await page.unroute("**/data/world-mercator.svg");
  await page.locator("#retry").click();
  await expect(page.locator("#status")).toContainText("Ready.");
  await expect(page.locator("#generate")).toBeEnabled();
});
test("cancel stops requests and keeps the previous map usable", async ({
  page,
}) => {
  await page.goto("/?sample=1");
  await expect(page.locator("#status")).toContainText("Sample map loaded");
  let release;
  const waiting = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("https://api.github.com/**", async (route) => {
    await waiting;
    await route.fulfill({ json: [] }).catch(() => {});
  });
  await page.locator("#generate").click();
  await expect(page.locator("#cancel")).toBeVisible();
  await page.locator("#theme").selectOption("dark");
  await expect(page.locator("#download")).toBeDisabled();
  await page.locator("#cancel").click();
  await expect(page.locator("#status")).toContainText(
    "Generation cancelled. Previous map retained.",
  );
  await expect(page.locator("#download")).toBeEnabled();
  await expect(page.locator("#map-label")).toContainText("Sample:");
  release();
});
test("fallback links and large text reflow without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/?sample=1");
  await expect(page.locator("#status")).toContainText("Sample map loaded");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    }),
  );
  await page.getByRole("button", { name: "Copy page link" }).click();
  await page.addStyleTag({
    content:
      "* { letter-spacing: .12em !important; word-spacing: .16em !important; line-height: 1.8 !important; } p { margin-bottom: 2em !important; }",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator("#status")).toContainText("Clipboard unavailable");
  expect(
    await page
      .locator("#owner")
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(16);
});
test("no critical or serious accessibility violations across themes", async ({
  page,
}) => {
  await page.goto("/?sample=1");
  await expect(page.locator("#status")).toContainText("Sample map loaded");
  for (const theme of ["light", "dark", "github"]) {
    await page.locator("#theme").selectOption(theme);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
});
test("downloaded SVG renders as an image with a useful intrinsic size", async ({
  page,
}) => {
  await page.goto("/?sample=1&theme=dark");
  await expect(page.locator("#status")).toContainText("Sample map loaded");
  const dimensions = await page.evaluate(async () => {
    const text = new XMLSerializer().serializeToString(
      document.querySelector("#map svg"),
    );
    const url = URL.createObjectURL(
      new Blob([text], { type: "image/svg+xml" }),
    );
    const img = new Image();
    img.src = url;
    await img.decode();
    const result = { width: img.naturalWidth, height: img.naturalHeight };
    URL.revokeObjectURL(url);
    return result;
  });
  expect(dimensions.width).toBeGreaterThan(900);
  expect(dimensions.height).toBeGreaterThan(600);
});

test("production preview serves only public assets with correct HTTP behavior", async ({
  request,
}) => {
  test.skip(!process.env.TEST_DIST, "Production preview only");
  for (const file of [
    "/.git/config",
    "/package.json",
    "/tests/geometry.test.mjs",
    "/data/world-mercator.original.svg",
  ])
    expect((await request.get(file)).status()).toBe(404);
  expect((await request.post("/")).status()).toBe(405);
  const response = await request.head("/data/world-mercator.svg");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("image/svg+xml");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["content-security-policy"]).toContain(
    "script-src 'self'",
  );
});
