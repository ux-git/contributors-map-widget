import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchContributors, validateRepository } from "../js/github.js";
const reply = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});
test("fetches all pages and profile locations with bounded concurrency", async () => {
  const urls = [];
  let active = 0,
    peak = 0;
  const fetcher = async (url) => {
    urls.push(url);
    if (url.includes("/contributors?"))
      return reply(
        url.endsWith("page=1")
          ? Array.from({ length: 100 }, (_, i) => ({ login: `u${i}` }))
          : [{ login: "last" }],
      );
    active++;
    peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, 1));
    active--;
    return reply({ location: "Germany" });
  };
  const result = await fetchContributors("ux-git", "test", {
    fetcher,
    limit: 500,
  });
  assert.equal(result.contributors.length, 101);
  assert.equal(result.contributors[100].location, "Germany");
  assert.equal(result.truncated, false);
  assert.ok(peak <= 4);
  assert.ok(urls.some((u) => u.endsWith("page=2")));
});
test("limits profiles and reports truncated coverage", async () => {
  let profiles = 0;
  const result = await fetchContributors("ux-git", "test", {
    limit: 12,
    fetcher: async (url) =>
      url.includes("/contributors?")
        ? reply(Array.from({ length: 20 }, (_, i) => ({ login: `u${i}` })))
        : (profiles++, reply({ location: null })),
  });
  assert.equal(profiles, 12);
  assert.equal(result.truncated, true);
  assert.equal(result.contributors.length, 12);
});
test("empty repository 204 works", async () =>
  assert.deepEqual(
    await fetchContributors("ux-git", "empty", {
      fetcher: async () => reply(null, 204),
    }),
    { contributors: [], truncated: false },
  ));
for (const status of [403, 404, 429, 500])
  test(`API error ${status} is surfaced`, async () =>
    assert.rejects(
      fetchContributors("ux-git", "test", {
        fetcher: async () => reply({}, status),
      }),
      /GitHub|Repository/,
    ));
test("profile failure fails generation instead of showing incomplete success", async () =>
  assert.rejects(
    fetchContributors("ux-git", "test", {
      fetcher: async (url) =>
        url.includes("/contributors?")
          ? reply([{ login: "u" }])
          : reply({}, 403),
    }),
    /limit/,
  ));
test("invalid paths and limits rejected before network", async () => {
  for (const value of ["../test", "<svg>", "a/b", ""])
    assert.throws(() => validateRepository(value, "repo"));
  await assert.rejects(
    fetchContributors("ux-git", "repo", { limit: -1 }),
    /limit/,
  );
});

const waitingFetch = (_url, { signal }) =>
  new Promise((_, reject) => {
    if (signal.aborted) reject(signal.reason);
    else
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      });
  });
test("timeout releases a stalled GitHub request", async () => {
  await assert.rejects(
    fetchContributors("ux-git", "test", {
      fetcher: waitingFetch,
      timeoutMs: 10,
    }),
    (error) => error.name === "TimeoutError",
  );
});
test("caller cancellation stops an in-flight generation", async () => {
  const controller = new AbortController();
  const result = fetchContributors("ux-git", "test", {
    fetcher: waitingFetch,
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(result, (error) => error.name === "AbortError");
});
test("one failed profile aborts the other workers without fetching remaining profiles", async () => {
  let requested = 0,
    aborted = 0;
  await assert.rejects(
    fetchContributors("ux-git", "test", {
      fetcher: async (url, { signal }) => {
        if (url.includes("/contributors?"))
          return reply(
            Array.from({ length: 12 }, (_, i) => ({ login: `u${i}` })),
          );
        requested++;
        if (url.endsWith("/u0")) return reply({}, 403);
        return new Promise((_, reject) =>
          signal.addEventListener(
            "abort",
            () => {
              aborted++;
              reject(signal.reason);
            },
            { once: true },
          ),
        );
      },
    }),
    /limit/,
  );
  assert.equal(requested, 4);
  assert.equal(aborted, 3);
});
test("malformed contributor/profile data fails clearly", async () => {
  for (const data of [[null], {}, [{ login: 123 }]])
    await assert.rejects(
      fetchContributors("ux-git", "test", { fetcher: async () => reply(data) }),
      /Unexpected/,
    );
  await assert.rejects(
    fetchContributors("ux-git", "test", {
      fetcher: async (url) =>
        reply(
          url.includes("/contributors?") ? [{ login: "u" }] : { location: 42 },
        ),
    }),
    /Unexpected/,
  );
});
test("network failures produce an actionable message", async () => {
  await assert.rejects(
    fetchContributors("ux-git", "test", {
      fetcher: async () => {
        throw new TypeError("Failed to fetch");
      },
    }),
    /Network unavailable/,
  );
});
