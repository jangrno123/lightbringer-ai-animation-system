import { providerConfig, publicProviderStatus } from "../../../lib/provider.mjs";

export const runtime = "edge";

export async function GET() {
  const requestId = crypto.randomUUID();
  try {
    return Response.json({ ok: true, requestId, ...publicProviderStatus(providerConfig()) }, {
      headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" }
    });
  } catch (error) {
    return Response.json({ ok: false, requestId, error: error instanceof Error ? error.message : "Configuration error." }, { status: 500 });
  }
}
