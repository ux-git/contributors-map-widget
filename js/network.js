/** Bound both the response and body read; propagate cancellation to fetch. */
export async function request(
  url,
  {
    signal,
    timeoutMs = 15000,
    fetcher = fetch,
    headers,
    read = (response) => response.json(),
  } = {},
) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(
    () =>
      controller.abort(
        new DOMException("Request timed out. Try again.", "TimeoutError"),
      ),
    timeoutMs,
  );
  try {
    const response = await fetcher(url, { signal: controller.signal, headers });
    return await read(response);
  } catch (error) {
    if (controller.signal.aborted) throw controller.signal.reason;
    if (error instanceof TypeError)
      throw new Error(
        "Network unavailable. Check your connection and try again.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
export function readJSON(response) {
  if (!response.ok) throw new Error(`Request failed (${response.status}).`);
  return response.json();
}
