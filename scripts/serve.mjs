import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { staticFiles } from "./static-files.mjs";
const production = process.argv.includes("--dist");
const root = path.resolve(import.meta.dirname, "..", production ? "dist" : ".");
const allowed = new Set([
  ...staticFiles,
  ...(production ? ["manifest.json"] : []),
]);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};
const port = Number(process.env.PORT || (production ? 4174 : 4173));
http
  .createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    // Inline SVG styles are set by the renderer; scripts remain local modules.
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.github.com; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
    );
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { Allow: "GET, HEAD" });
      res.end("Method not allowed");
      return;
    }
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const file = pathname === "/" ? "index.html" : pathname.slice(1);
      if (!allowed.has(file)) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const data = await readFile(path.join(root, file));
      res.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "text/plain",
        "Cache-Control": "no-cache",
        "Content-Length": data.length,
      });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(port, "127.0.0.1", () =>
    console.log(
      `Contributors Map${production ? " production preview" : ""}: http://127.0.0.1:${port}`,
    ),
  );
