import test from "node:test";
import assert from "node:assert/strict";
import { analyzeMock, DEMO_SCREENPLAY_EN } from "../lib/mock-engine.mjs";
import { analyzeScreenplay, listPublicProviderStatus } from "../lib/provider.mjs";
import { createRenderJob, getRenderJob, listPublicVideoProviderStatus } from "../lib/video-provider.mjs";

const originalFetch = globalThis.fetch;
const managedEnv = [
  "LIGHTBRINGER_LLM_EXTERNAL_ENABLED", "OPENAI_API_KEY", "OPENAI_MODEL", "OPENAI_BASE_URL",
  "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "ANTHROPIC_BASE_URL",
  "LIGHTBRINGER_VIDEO_EXTERNAL_ENABLED", "BYTEPLUS_API_KEY", "BYTEPLUS_SEEDANCE_MODEL", "BYTEPLUS_API_BASE_URL"
];
const originalEnv = Object.fromEntries(managedEnv.map((key) => [key, process.env[key]]));

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of managedEnv) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

test("OpenAI adapter uses Responses API strict JSON Schema", async () => {
  process.env.LIGHTBRINGER_LLM_EXTERNAL_ENABLED = "true";
  process.env.OPENAI_API_KEY = "test-openai-key";
  process.env.OPENAI_MODEL = "test-openai-model";
  process.env.OPENAI_BASE_URL = "https://openai.example/v1";
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({
      status: "completed",
      output_text: JSON.stringify(analyzeMock({ language: "en" })),
      usage: { input_tokens: 120, output_tokens: 80, input_tokens_details: { cached_tokens: 20 } }
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const output = await analyzeScreenplay({ screenplay: DEMO_SCREENPLAY_EN, language: "en", provider: "openai" });
  assert.equal(request.url, "https://openai.example/v1/responses");
  assert.equal(request.options.headers.authorization, "Bearer test-openai-key");
  assert.equal(request.body.text.format.type, "json_schema");
  assert.equal(request.body.text.format.strict, true);
  assert.equal(request.body.text.format.schema.additionalProperties, false);
  assert.equal(output.result.shots.length, 3);
  assert.deepEqual(output.usage, { inputTokens: 120, outputTokens: 80, cachedInputTokens: 20 });
});

test("Anthropic adapter uses Messages API structured output", async () => {
  process.env.LIGHTBRINGER_LLM_EXTERNAL_ENABLED = "true";
  process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
  process.env.ANTHROPIC_MODEL = "test-claude-model";
  process.env.ANTHROPIC_BASE_URL = "https://anthropic.example";
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({
      stop_reason: "end_turn",
      content: [{ type: "text", text: JSON.stringify(analyzeMock({ language: "en" })) }],
      usage: { input_tokens: 100, output_tokens: 70, cache_read_input_tokens: 15 }
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const output = await analyzeScreenplay({ screenplay: DEMO_SCREENPLAY_EN, language: "en", provider: "anthropic" });
  assert.equal(request.url, "https://anthropic.example/v1/messages");
  assert.equal(request.options.headers["x-api-key"], "test-anthropic-key");
  assert.equal(request.body.output_config.format.type, "json_schema");
  assert.equal(request.body.output_config.format.schema.additionalProperties, false);
  assert.equal(output.result.segments.length, 2);
  assert.deepEqual(output.usage, { inputTokens: 100, outputTokens: 70, cachedInputTokens: 15 });
});

test("provider status lists selectable adapters without secrets", () => {
  process.env.LIGHTBRINGER_LLM_EXTERNAL_ENABLED = "true";
  process.env.OPENAI_API_KEY = "never-expose-this";
  process.env.OPENAI_MODEL = "configured-model";
  const statuses = listPublicProviderStatus();
  assert.deepEqual(statuses.map((item) => item.provider), ["mock", "anthropic", "openai"]);
  assert.equal(statuses.find((item) => item.provider === "openai").ready, true);
  assert.equal(JSON.stringify(statuses).includes("never-expose-this"), false);
});

test("BytePlus adapter creates and retrieves asynchronous Seedance tasks", async () => {
  process.env.LIGHTBRINGER_VIDEO_EXTERNAL_ENABLED = "true";
  process.env.BYTEPLUS_API_KEY = "test-byteplus-key";
  process.env.BYTEPLUS_SEEDANCE_MODEL = "test-seedance-endpoint";
  process.env.BYTEPLUS_API_BASE_URL = "https://ark.example/api/v3";
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options, body: options.body ? JSON.parse(options.body) : null });
    if (options.method === "POST") {
      return new Response(JSON.stringify({ id: "task-123", status: "queued", created_at: "2026-08-02T00:00:00Z" }), { status: 200 });
    }
    return new Response(JSON.stringify({ id: "task-123", status: "succeeded", content: { video_url: "https://cdn.example/output.mp4" } }), { status: 200 });
  };

  const created = await createRenderJob({
    provider: "byteplus",
    prompt: "A cinematic shot of a starship crossing a blue temporal gate.",
    negativePrompt: "subtitles, distorted anatomy",
    duration: 5,
    ratio: "16:9",
    resolution: "1080p",
    confirmedCost: true,
    references: [{ type: "image", url: "https://cdn.example/ship.png", role: "reference_image" }]
  });
  const completed = await getRenderJob(created.id, "byteplus");
  assert.equal(requests[0].url, "https://ark.example/api/v3/contents/generations/tasks");
  assert.equal(requests[0].options.headers.authorization, "Bearer test-byteplus-key");
  assert.equal(requests[0].body.model, "test-seedance-endpoint");
  assert.equal(requests[0].body.content[1].type, "image_url");
  assert.equal(requests[1].url, "https://ark.example/api/v3/contents/generations/tasks/task-123");
  assert.equal(completed.status, "completed");
  assert.equal(completed.outputUrl, "https://cdn.example/output.mp4");
});

test("paid video adapter refuses requests without explicit cost confirmation", async () => {
  process.env.LIGHTBRINGER_VIDEO_EXTERNAL_ENABLED = "true";
  process.env.BYTEPLUS_API_KEY = "test-byteplus-key";
  process.env.BYTEPLUS_SEEDANCE_MODEL = "test-seedance-endpoint";
  await assert.rejects(() => createRenderJob({
    provider: "byteplus",
    prompt: "A valid cinematic video generation prompt.",
    duration: 5,
    confirmedCost: false
  }), /Cost confirmation/);
});

test("video provider status does not expose keys", () => {
  process.env.LIGHTBRINGER_VIDEO_EXTERNAL_ENABLED = "true";
  process.env.BYTEPLUS_API_KEY = "never-expose-byteplus";
  process.env.BYTEPLUS_SEEDANCE_MODEL = "configured-endpoint";
  const statuses = listPublicVideoProviderStatus();
  assert.equal(statuses.find((item) => item.provider === "byteplus").ready, true);
  assert.equal(JSON.stringify(statuses).includes("never-expose-byteplus"), false);
});
