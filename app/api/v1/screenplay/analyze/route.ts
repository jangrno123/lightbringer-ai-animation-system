import { analyzeScreenplay } from "../../../../../lib/provider.mjs";

export const runtime = "edge";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 256 * 1024) return Response.json({ ok: false, requestId, error: "Request body is too large." }, { status: 413 });
    const body = await request.json() as { screenplay?: string; language?: string };
    const output = await analyzeScreenplay({ screenplay: body.screenplay, language: body.language });
    return Response.json({ ok: true, requestId, elapsedMs: Date.now() - startedAt, ...output }, {
      headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" }
    });
  } catch (error) {
    return Response.json({ ok: false, requestId, error: error instanceof Error ? error.message : "Unexpected error." }, { status: 400 });
  }
}
