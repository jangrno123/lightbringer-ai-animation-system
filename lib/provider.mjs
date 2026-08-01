import { analyzeMock } from "./mock-engine.mjs";

const SUPPORTED = new Set(["mock", "openai-compatible", "anthropic"]);

function intEnv(name, fallback, min, max) {
  const value = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

export function providerConfig() {
  const provider = (process.env.LIGHTBRINGER_PROVIDER || "mock").toLowerCase();
  if (!SUPPORTED.has(provider)) throw new Error(`Unsupported LIGHTBRINGER_PROVIDER: ${provider}`);
  return {
    provider,
    externalEnabled: process.env.LIGHTBRINGER_EXTERNAL_API_ENABLED === "true",
    baseUrl: (process.env.LIGHTBRINGER_API_BASE_URL || "").replace(/\/$/, ""),
    apiKey: (process.env.LIGHTBRINGER_API_KEY || "").trim(),
    model: (process.env.LIGHTBRINGER_MODEL || "").trim(),
    maxInputChars: intEnv("LIGHTBRINGER_MAX_INPUT_CHARS", 12000, 500, 100000),
    maxOutputTokens: intEnv("LIGHTBRINGER_MAX_OUTPUT_TOKENS", 4000, 256, 16000),
    timeoutMs: intEnv("LIGHTBRINGER_TIMEOUT_MS", 90000, 5000, 180000)
  };
}

export function publicProviderStatus(config = providerConfig()) {
  const ready = config.provider === "mock" || Boolean(config.externalEnabled && config.baseUrl && config.apiKey && config.model);
  return {
    provider: config.provider,
    mode: config.provider === "mock" ? "mock" : "external",
    ready,
    model: config.provider === "mock" ? "LIGHTBRINGER deterministic demo" : (config.model || "not configured"),
    maxInputChars: config.maxInputChars,
    maxOutputTokens: config.maxOutputTokens,
    automaticRetry: false
  };
}

function systemInstruction(language) {
  return `You are the LIGHTBRINGER screenplay analysis adapter. Convert only the supplied screenplay into production segments and shots. Separate dialogue, visual direction, and audio direction. Estimate dialogue timing conservatively. Return JSON only with keys: project, sceneId, sceneTitle, estimatedDurationSeconds, segments, shots, continuity. Each shot must contain id, title, durationSeconds, framing, camera, speaker, dialogue, visualDirection, audioDirection, assets, status. Output language: ${language}. Never invent franchise characters or copyrighted source material.`;
}

function extractJson(text) {
  const trimmed = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("The provider did not return a complete JSON object.");
  }
}

function validateResult(result) {
  if (!result || typeof result !== "object" || !Array.isArray(result.segments) || !Array.isArray(result.shots)) {
    throw new Error("Provider response is missing segments or shots.");
  }
  return result;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAI(config, screenplay, language) {
  const response = await fetchWithTimeout(`${config.baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      max_tokens: config.maxOutputTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemInstruction(language) },
        { role: "user", content: screenplay }
      ]
    })
  }, config.timeoutMs);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Provider request failed (${response.status}).`);
  return { result: validateResult(extractJson(payload?.choices?.[0]?.message?.content)), usage: payload.usage || null };
}

async function callAnthropic(config, screenplay, language) {
  const response = await fetchWithTimeout(`${config.baseUrl}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxOutputTokens,
      temperature: 0.2,
      system: systemInstruction(language),
      messages: [{ role: "user", content: screenplay }]
    })
  }, config.timeoutMs);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Provider request failed (${response.status}).`);
  const content = Array.isArray(payload.content) ? payload.content.find((item) => item.type === "text")?.text : "";
  return { result: validateResult(extractJson(content)), usage: payload.usage || null };
}

export async function analyzeScreenplay({ screenplay, language = "ko" }) {
  const config = providerConfig();
  const text = String(screenplay || "").trim();
  if (text.length < 20) throw new Error("Screenplay must contain at least 20 characters.");
  if (text.length > config.maxInputChars) throw new Error(`Screenplay exceeds the ${config.maxInputChars.toLocaleString()} character limit.`);

  if (config.provider === "mock") return { result: analyzeMock({ language }), usage: { inputTokens: 0, outputTokens: 0 } };
  if (!config.externalEnabled) throw new Error("External API calls are disabled on this server.");
  if (!config.baseUrl || !config.apiKey || !config.model) throw new Error("External provider configuration is incomplete.");

  return config.provider === "anthropic"
    ? callAnthropic(config, text, language)
    : callOpenAI(config, text, language);
}
