import { request } from "./network.js";
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_LIMIT = 20;
export function validateRepository(owner, repo) {
  if (
    typeof owner !== "string" ||
    typeof repo !== "string" ||
    !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(owner) ||
    owner.includes("--") ||
    !/^[\w.-]{1,100}$/.test(repo) ||
    repo === "." ||
    repo === ".."
  ) {
    throw new Error("Enter a valid GitHub owner and repository name.");
  }
}
function readGitHub(response) {
  if (response.status === 204) return [];
  if (!response.ok)
    throw new Error(
      response.status === 403 || response.status === 429
        ? "GitHub API limit reached. Try again later, or use the CLI with a token for larger repositories."
        : response.status === 404
          ? "Repository or profile not found. Use a public GitHub repository."
          : `GitHub request failed (${response.status}). Try again.`,
    );
  return response.json();
}
export async function fetchContributors(
  owner,
  repo,
  {
    fetcher = fetch,
    limit = 100,
    signal,
    timeoutMs = 15000,
    onProgress = () => {},
  } = {},
) {
  validateRepository(owner, repo);
  if (!Number.isInteger(limit) || limit < 1 || limit > 500)
    throw new Error("Contributor limit must be between 1 and 500.");
  signal?.throwIfAborted();
  const key = `${owner}/${repo}/${limit}`.toLowerCase();
  for (const [key, entry] of cache)
    if (Date.now() - entry.at >= CACHE_TTL) cache.delete(key);
  if (fetcher === fetch && cache.has(key)) return cache.get(key).value;
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal?.addEventListener("abort", abort, { once: true });
  const json = (url) =>
    request(url, {
      fetcher,
      timeoutMs,
      signal: controller.signal,
      headers: { Accept: "application/vnd.github+json" },
      read: readGitHub,
    });
  const workers = [];
  try {
    const people = [];
    let truncated = false;
    for (let page = 1; people.length <= limit; page++) {
      const batch = await json(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contributors?per_page=100&page=${page}`,
      );
      if (
        !Array.isArray(batch) ||
        batch.some(
          (person) =>
            !person ||
            typeof person !== "object" ||
            (person.type !== "Anonymous" && typeof person.login !== "string"),
        )
      )
        throw new Error("Unexpected GitHub contributor response.");
      people.push(...batch);
      if (people.length > limit) {
        truncated = true;
        break;
      }
      if (batch.length < 100) break;
    }
    const selected = people.slice(0, limit);
    const profiles = new Array(selected.length);
    let cursor = 0,
      completed = 0;
    for (let worker = 0; worker < Math.min(4, selected.length); worker++)
      workers.push(
        (async () => {
          while (cursor < selected.length) {
            controller.signal.throwIfAborted();
            const i = cursor++,
              person = selected[i];
            let location = null;
            if (person.type !== "Anonymous" && person.login) {
              const profile = await json(
                `https://api.github.com/users/${encodeURIComponent(person.login)}`,
              );
              if (
                !profile ||
                Array.isArray(profile) ||
                (profile.location != null &&
                  typeof profile.location !== "string")
              )
                throw new Error("Unexpected GitHub profile response.");
              location = profile.location || null;
            }
            profiles[i] = {
              login: person.login,
              contributions: person.contributions,
              location,
            };
            onProgress(++completed, selected.length);
          }
        })(),
      );
    await Promise.all(workers);
    const value = { contributors: profiles, truncated };
    if (fetcher === fetch) {
      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value);
      cache.set(key, { at: Date.now(), value });
    }
    return value;
  } catch (error) {
    controller.abort(error);
    await Promise.allSettled(workers);
    throw error;
  } finally {
    signal?.removeEventListener("abort", abort);
  }
}
