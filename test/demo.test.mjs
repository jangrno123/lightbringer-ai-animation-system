import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { analyzeMock, DEMO_SCREENPLAY_KO } from "../lib/mock-engine.mjs";
import { analyzeScreenplay, publicProviderStatus } from "../lib/provider.mjs";
import { createAppServer } from "../server.mjs";

test("mock analysis returns stable segments, shots, and continuity", async () => {
  process.env.LIGHTBRINGER_PROVIDER = "mock";
  const { result, usage } = await analyzeScreenplay({ screenplay: DEMO_SCREENPLAY_KO, language: "ko" });
  assert.equal(result.segments.length, 2);
  assert.equal(result.shots.length, 3);
  assert.deepEqual(result.continuity.unresolved, []);
  assert.equal(usage.inputTokens, 0);
});

test("public provider status never exposes secret fields", () => {
  const status = publicProviderStatus({
    provider: "anthropic",
    externalEnabled: true,
    baseUrl: "https://example.invalid",
    apiKey: "secret-value",
    model: "example-model",
    maxInputChars: 1000,
    maxOutputTokens: 500,
    timeoutMs: 10000
  });
  assert.equal(status.ready, true);
  assert.equal(JSON.stringify(status).includes("secret-value"), false);
  assert.equal(Object.hasOwn(status, "apiKey"), false);
  assert.equal(Object.hasOwn(status, "baseUrl"), false);
});

test("mock engine can localize its deterministic result", () => {
  assert.equal(analyzeMock({ language: "ko" }).sceneTitle, "무음 궤도의 신호");
  assert.equal(analyzeMock({ language: "en" }).sceneTitle, "Signal in Silent Orbit");
});

test("HTTP demo exposes health and analysis without external cost", async (t) => {
  process.env.LIGHTBRINGER_PROVIDER = "mock";
  const server = createAppServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const health = await fetch(`${base}/api/health`).then((response) => response.json());
  assert.equal(health.ok, true);
  assert.equal(health.provider, "mock");
  assert.equal(health.ready, true);

  const response = await fetch(`${base}/api/v1/screenplay/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ screenplay: DEMO_SCREENPLAY_KO, language: "ko" })
  });
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.ok, true);
  assert.equal(payload.result.shots.length, 3);
  assert.equal(payload.usage.inputTokens, 0);
});

test("short screenplay is rejected before any provider request", async () => {
  process.env.LIGHTBRINGER_PROVIDER = "mock";
  await assert.rejects(() => analyzeScreenplay({ screenplay: "too short", language: "en" }), /at least 20/);
});
