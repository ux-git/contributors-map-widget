# Changelog

## 2026-10-18 — Mercator map update (local, uncommitted)

- Restored geographic contributor highlighting after finding that the latest commit contained an avatar badge; examined and tested the earlier map generator before implementation.
- Replaced mismatched numeric country IDs and substring matching with verified country IDs and whole-name/alias matching. Unmapped locations and limited contributor coverage are reported explicitly.
- Added the amCharts Mercator SVG, removed Antarctica from the displayed/exported map, and joined both wrapped Russian fragments at the right edge without artificial seam strokes or area loss.
- Preserved GitHub repository selection, themes, share links, and SVG output. Added pagination, bounded profile requests, a five-minute cache, safe text rendering, sample data, error recovery, and a CLI generator.
- Reworked the page for desktop, tablet, and narrow mobile screens with keyboard controls, text country counts, and standalone SVG downloads.
- Added logic, geometry, API, documentation, and browser tests; recorded source/license and verification in VALIDATION.md. No push or deployment performed.

## 2026-10-18 — Copy cleanup

- Removed the geographic-change badge and explanatory references from the page and SVG accessibility descriptions at the user’s request. Map geometry and required attribution are preserved.

## 2026-10-18 — Production readiness audit

- Tightened mobile form spacing, grouped short controls, raised input text to 16px, added a skip-to-map link, and fixed overflow for long labels/URLs and user text-spacing overrides.
- Fixed initial theme selection, prototype-like URL theme values, malformed asset readiness, retry behavior, and singular/plural counts. Country ties now sort by displayed name.
- Added bounded request timeouts, cancellation, progress reporting, malformed-response checks, a bounded result cache, and aborting sibling profile requests after failure. Default browser limit is 24 to reduce unauthenticated API pressure.
- Made downloaded SVGs self-sized with an explicit background and a non-interactive credit inside the accessible image; the page retains keyboard-accessible attribution links. Source/license URLs are preserved in SVG metadata.
- Added a strict public-file production build, SHA-256 verification, a restricted local preview server, formatting checks, and CI that validates and uploads the build without deploying.
- Expanded unit and browser regressions, including axe audits across themes, cancellation/retry, export decoding, reflow, and HTTP behavior. Chromium/WebKit verified; local Firefox launch is blocked by a profile-folder error and remains configured in CI.

## 2026-10-18 — Release preparation

- User authorized push and deployment. Added GitHub Pages artifact deployment gated on all checks, with read-only PR validation and documentation-only push exclusion.
- Adjusted WebKit keyboard testing to use the platform-specific navigation chord on macOS and standard Tab on Linux CI.
- Existing public site identified as https://ux-git.github.io/contributors-map-widget/. Release remains pending until CI and live verification succeed.

## 2026-10-18 — Live release verified

- Pushed website commit `c2314d6e02c6734a4832e63bef9e22aff2017e60` to main.
- All 61 automated checks and 78 browser tests passed in [CI run 39164523992](https://github.com/ux-git/contributors-map-widget/actions/runs/39164523992), including Firefox on Ubuntu. Deployment 7160468397 succeeded to GitHub Pages.
- Verified https://ux-git.github.io/contributors-map-widget/ at 22:44 CEST: all 12 public files match the build manifest; desktop/mobile, dark theme, SVG downloads, and live GitHub data generation passed without page errors.
- This follow-up is documentation only and does not redeploy. The website codebase remains c2314d6 even if repository HEAD advances.

## 2026-10-18 — Organized README server refreshed

- Identified the README image as a separate Python service, [sws2apps/github-contribution-heatmap](https://github.com/sws2apps/github-contribution-heatmap), rather than the GitHub Pages widget.
- Ported the exact verified geometry, preserved themes/variants and attribution, corrected island country IDs and exact Niger resolution. Server code commit `c5bdb8837f01b7eb83695a5a53f403394192a52f` pushed to main.
- All 256 original location cases and 3 new renderer/route tests passed; Chrome checked both variants/themes at 375px and 1440px; Python dependencies passed `pip check`.
- Vercel production deployment `7160566917` succeeded. At `2026-10-18T20:52:38Z`, the original service URL and GitHub Camo image both served `mercator-v2`. Actual Organized README image verified in Chrome; no README modification or cache purge needed.

## 2026-10-18 — Taller README map card

- Server card now 1200×600 (2:1), with a full-width map column and less header gap; map is approximately 26% larger in each dimension.
- Server commit `c928f774500809c991a1afcbfb4cf303dbd7e16e` pushed; Vercel deployment `7160749156` succeeded. Origin and GitHub Camo both verified at 1200×600 at `2026-10-18T21:08:17.375370+00:00`.
- All 256 location cases and 3 renderer tests pass; both themes visually checked at 375/768/1440px in Chrome. Audit: zero vulnerabilities.
