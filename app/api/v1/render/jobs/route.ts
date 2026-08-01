import { createRenderJob } from "../../../../../lib/video-provider.mjs";

export const runtime = "edge";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const body = await request.json();
    const job = await createRenderJob(body);
    return Response.json({ ok: true, requestId, job }, {
      status: job.status === "completed" ? 200 : 202,
      headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" }
    });
  } catch (error) {
    return Response.json({ ok: false, requestId, error: error instanceof Error ? error.message : "Unexpected error." }, { status: 400 });
  }
}
