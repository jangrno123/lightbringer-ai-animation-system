import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeScreenplay, listPublicProviderStatus, providerConfig, publicProviderStatus } from "./lib/provider.mjs";
import { createRenderJob, getRenderJob, listPublicVideoProviderStatus, publicVideoProviderStatus, videoProviderConfig } from "./lib/video-provider.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const publicRoot = join(root, "public");
const assetsRoot = join(root, "assets");
const port = Number.parseInt(process.env.PORT || "4173", 10);
const maxBodyBytes = 256 * 1024;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'"
  });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBodyBytes) throw Object.assign(new Error("Request body is too large."), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw Object.assign(new Error("Request body must be valid JSON."), { status: 400 });
  }
}

function safeFile(base, pathname) {
  const relative = normalize(pathname).replace(/^([/\\])+/, "");
  const file = join(base, relative || "index.html");
  return file.startsWith(base) ? file : null;
}

async function serveStatic(res, pathname) {
  const fromAssets = pathname.startsWith("/assets/");
  const relative = fromAssets ? pathname.slice("/assets/".length) : pathname.slice(1);
  let file = safeFile(fromAssets ? assetsRoot : publicRoot, relative || "index.html");
  if (!file) return false;
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    const content = await readFile(file);
    res.writeHead(200, {
      "content-type": mime[extname(file).toLowerCase()] || "application/octet-stream",
      "cache-control": fromAssets ? "public, max-age=86400" : "no-cache",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'"
    });
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

export function createAppServer() {
  return createServer(async (req, res) => {
    const requestId = crypto.randomUUID();
    const url = new URL(req.url || "/", "http://localhost");
    try {
      if (req.method === "GET" && url.pathname === "/api/health") {
        return json(res, 200, {
          ok: true,
          requestId,
          ...publicProviderStatus(providerConfig()),
          providers: listPublicProviderStatus(),
          video: publicVideoProviderStatus(videoProviderConfig()),
          videoProviders: listPublicVideoProviderStatus()
        });
      }
      if (req.method === "POST" && url.pathname === "/api/v1/screenplay/analyze") {
        const body = await readJson(req);
        const startedAt = Date.now();
        const output = await analyzeScreenplay({ screenplay: body.screenplay, language: body.language, provider: body.provider });
        return json(res, 200, { ok: true, requestId, elapsedMs: Date.now() - startedAt, ...output });
      }
      if (req.method === "POST" && url.pathname === "/api/v1/render/jobs") {
        const body = await readJson(req);
        const job = await createRenderJob(body);
        return json(res, job.status === "completed" ? 200 : 202, { ok: true, requestId, job });
      }
      if (req.method === "GET" && url.pathname.startsWith("/api/v1/render/jobs/")) {
        const id = decodeURIComponent(url.pathname.slice("/api/v1/render/jobs/".length));
        const job = await getRenderJob(id, url.searchParams.get("provider") || undefined);
        return json(res, 200, { ok: true, requestId, job });
      }
      if (req.method === "GET" || req.method === "HEAD") {
        if (await serveStatic(res, url.pathname)) return;
        if (!url.pathname.includes(".")) {
          if (await serveStatic(res, "/index.html")) return;
        }
      }
      json(res, 404, { ok: false, requestId, error: "Not found." });
    } catch (error) {
      const status = Number(error?.status) || (error?.name === "AbortError" ? 504 : 400);
      json(res, status, { ok: false, requestId, error: error?.message || "Unexpected error." });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createAppServer().listen(port, "0.0.0.0", () => {
    const status = publicProviderStatus(providerConfig());
    console.log(`LIGHTBRINGER demo listening on http://localhost:${port} (${status.provider})`);
  });
}
