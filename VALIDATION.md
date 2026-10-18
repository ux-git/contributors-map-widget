# Validation — Mercator map update

Date: 2026-10-18, Europe/Berlin. Owner: Codex. Base: `07d91d0e9214abe5629907ab1f24f03f3a74b49b`, branch `main`. Changes are local and uncommitted; no remote host was deployed or verified.

## Baseline, before implementation

Ran three characterization tests before replacing the page. All passed, demonstrating:

1. The latest `index.html` generated avatar badges and contained no map.
2. The prior generator at `a7bafeb` attempted to select ISO alpha-2 codes against numeric TopoJSON IDs (Germany: `DE` versus `276`).
3. Its substring algorithm could select Niger for a Nigerian location.

The original characterization script is retained as `scripts/baseline.test.mjs`; run `node --test scripts/baseline.test.mjs` with full Git history to reproduce. It is separate from the current regression suite, which works without historical commits.

## Current verification

- Logic/geometry/API suite: exact name-to-ID round-trip for all 256 retained regions; overlapping names, aliases, codes, unknown locations, aggregation, pagination, limits, API errors, and safe SVG text.
- Geometry: all non-Russian paths unchanged; AQ absent; Russia's 22 rings become 20 after joining two fragment pairs. XOR comparison against the exact translated source is empty, area is conserved, all Russia coordinates are on the right, and no artificial vertical cut edge remains. All geometry fits the new viewBox.
- Browser checks use Chrome on localhost: desktop 1440×1000, tablet 768×1024, mobile 375×667, narrow 320×740. Touch emulation on tablet/mobile, not physical-device testing.
- Browser scenarios cover light/dark themes, SVG downloads and credit, no horizontal overflow, country counts, URL input, keyboard use, clipboard failure/success, API error recovery, empty and unmapped results, missing assets, long repository labels, limited coverage, and stale form edits versus copied links.
- Desktop/mobile light screenshots and desktop dark screenshot visually inspected. Russia is continuous on the right; no Antarctica or clipping appears. Country list provides readable counts where small regions are too small to inspect on a phone.
- Live public GitHub smoke test through localhost and CLI succeeded: `ux-git/contributors-map-widget`, 1 contributor checked, 1 mapped, Germany. `map.svg` is this actual snapshot. `sample-map.svg` is explicitly illustrative (12 people, 10 mapped across 9 countries).
- Dependency audit: zero vulnerabilities.
- Final suite totals and status are recorded in project-state.json / PROJECT_STATUS.md.

Browser screenshots and traces are reproducible with `npm run test:browser` and stored in ignored `test-results/`. They contain fixture data; the textual findings and test code are retained here for a new clone.

## Boundaries

No physical-device or native Safari testing was performed; the later production-readiness pass covers the WebKit engine. GitHub locations are public self-reports; no city geocoder is used. Browser requests use unauthenticated API access, which can hit limits on larger repositories. CLI supports an optional environment token and checks up to 500 contributors. Partial coverage is labeled in the SVG description. No automatic hourly workflow exists in this checkout; generation is manual. No Git commit, push, or deployment was performed.

## Production readiness follow-up — 2026-10-18

Reviewed and corrected responsive control grouping, 16px mobile inputs, long-text reflow, initial theme handling, invalid assets, pending-request cleanup, and SVG export sizing. Added a public-file-only build, integrity manifest, restrictive preview server, and CI. No remote deployment or push was performed.

Current checks include 61 logic/geometry/API/documentation tests, Chromium and WebKit browser regressions, WCAG A/AA axe scans for light/dark/GitHub themes, malformed-asset retry, cancellation with stale-map retention, timeout and sibling-request cleanup, image decoding, text spacing, and production HTTP behavior. Final results are recorded in project-state.json. Screenshots at desktop and mobile were visually reviewed after the layout changes.

Firefox limitation: the Playwright Firefox binary exits before opening a page with “Could not find profile folder.” This reproduced with the default temporary directory, /private/tmp, and an isolated workspace profile. Firefox tests are retained for CI on Ubuntu; no Firefox verification is claimed locally. WebKit uses Alt+Tab for full keyboard navigation under macOS conventions. Tests use emulated viewports, not physical phones or native Safari.

The static artifact’s allowlist, byte-for-byte source parity and SHA-256 manifest are checked by `npm run verify:build`. `map.svg` was refreshed against live public GitHub data (1 contributor, Germany). The CI workflow is prepared but has not run remotely. The production preview is local only at port 4174.
