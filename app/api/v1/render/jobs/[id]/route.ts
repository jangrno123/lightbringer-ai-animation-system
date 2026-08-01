import { getRenderJob } from "../../../../../../lib/video-provider.mjs";

export const runtime = "edge";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    const { id } = await context.params;
    const provider = new URL(request.url).searchParams.get("provider") || undefined;
    const job = await getRenderJob(id, provider);
    return Response.json({ ok: true, requestId, job }, {
      headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" }
    });
  } catch (error) {
    return Response.json({ ok: false, requestId, error: error instanceof Error ? error.message : "Unexpected error." }, { status: 400 });
  }
}
