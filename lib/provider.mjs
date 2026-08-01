import { analyzeMock } from "./mock-engine.mjs";

const PROVIDERS = ["mock", "anthropic", "openai"];
const SUPPORTED = new Set([...PROVIDERS, "openai-compatible"]);

export const screenplayAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["project", "sceneId", "sceneTitle", "estimatedDurationSeconds", "segments", "shots", "continuity"],
  properties: {
    project: { type: "string" },
    sceneId: { type: "string" },
    sceneTitle: { type: "string" },
    estimatedDurationSeconds: { type: "number", minimum: 0 },
    segments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "status", "shotIds"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          status: { type: "string", enum: ["ready", "draft", "failed"] },
          shotIds: { type: "array", items: { type: "string" } }
        }
      }
    },
    shots: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "title", "durationSeconds", "framing", "camera", "speaker", "dialogue", "visualDirection", "audioDirection", "assets", "status"],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          durationSeconds: { type: "number", minimum: 1 },
          framing: { type: "string" },
          camera: { type: "string" },
          speaker: { type: "string" },
          dialogue: { type: "string" },
          visualDirection: { type: "string" },
          audioDirection: { type: "string" },
          assets: { type: "array", items: { type: "string" } },
          status: { type: "string", enum: ["draft", "ready", "approved"] }
        }
      }
    },
    continuity: {
      type: "object",
      additionalProperties: false,
      required: ["locationFlow", "characterAssets", "unresolved"],
      properties: {
        locationFlow: { type: "array", items: { type: "string" } },
        characterAssets: { type: "array", items: { type: "string" } },
        unresolved: { type: "array", items: { type: "string" } }
      }
    }
  }
};

function intEnv(name, fallback, min, max) {
  const value = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function boolEnv(name, fallback = false) {
  const value = process.env[name];
  return value === undefined ? fallback : value.toLowerCase() === "true";
}

function normalizeProvider(value) {
  const provider = String(value || "mock").toLowerCase();
  if (!SUPPORTED.has(provider)) throw new Error(`Unsupported LLM provider: ${provider}`);
  return provider === "openai-compatible" ? "openai" : provider;
}

function trimBaseUrl(value, fallback) {
  return String(value || fallback).trim().replace(/\/+$/, "");
}

export function providerConfig(providerOverride) {
  const provider = normalizeProvider(providerOverride || process.env.LIGHTBRINGER_LLM_PROVIDER || process.env.LIGHTBRINGER_PROVIDER || "mock");
  const legacyProvider = process.env.LIGHTBRINGER_PROVIDER ? normalizeProvider(process.env.LIGHTBRINGER_PROVIDER) : null;
  const useLegacy = legacyProvider === provider;
  const common = {
    provider,
    externalEnabled: boolEnv("LIGHTBRINGER_LLM_EXTERNAL_ENABLED", boolEnv("LIGHTBRINGER_EXTERNAL_API_ENABLED")),
    maxInputChars: intEnv("LIGHTBRINGER_MAX_INPUT_CHARS", 12000, 500, 100000),
    maxOutputTokens: intEnv("LIGHTBRINGER_MAX_OUTPUT_TOKENS", 4000, 256, 32000),
    timeoutMs: intEnv("LIGHTBRINGER_TIMEOUT_MS", 120000, 5000, 300000)
  };

  if (provider === "openai") {
    return {
      ...common,
      baseUrl: trimBaseUrl(process.env.OPENAI_BASE_URL || (useLegacy ? process.env.LIGHTBRINGER_API_BASE_URL : ""), "https://api.openai.com/v1"),
      apiKey: String(process.env.OPENAI_API_KEY || (useLegacy ? process.env.LIGHTBRINGER_API_KEY : "") || "").trim(),
      model: String(process.env.OPENAI_MODEL || (useLegacy ? process.env.LIGHTBRINGER_MODEL : "") || "").trim()
    };
  }
  if (provider === "anthropic") {
    return {
      ...common,
      baseUrl: trimBaseUrl(process.env.ANTHROPIC_BASE_URL || (useLegacy ? process.env.LIGHTBRINGER_API_BASE_URL : ""), "https://api.anthropic.com"),
      apiKey: String(process.env.ANTHROPIC_API_KEY || (useLegacy ? process.env.LIGHTBRINGER_API_KEY : "") || "").trim(),
      model: String(process.env.ANTHROPIC_MODEL || (useLegacy ? process.env.LIGHTBRINGER_MODEL : "") || "").trim()
    };
  }
  return { ...common, baseUrl: "", apiKey: "", model: "LIGHTBRINGER deterministic demo" };
}

export function publicProviderStatus(config = providerConfig()) {
  const ready = config.provider === "mock" || Boolean(config.externalEnabled && config.apiKey && config.model);
  return {
    provider: config.provider,
    label: config.provider === "openai" ? "OpenAI" : config.provider === "anthropic" ? "Claude · Anthropic" : "LIGHTBRINGER Mock",
    mode: config.provider === "mock" ? "mock" : "external",
    ready,
    model: config.model || "not configured",
    maxInputChars: config.maxInputChars,
    maxOutputTokens: config.maxOutputTokens,
    structuredOutput: config.provider !== "mock",
    automaticRetry: false
  };
}

export function listPublicProviderStatus() {
  return PROVIDERS.map((provider) => publicProviderStatus(providerConfig(provider)));
}

function systemInstruction(language) {
  return `You are the LIGHTBRINGER screenplay analysis adapter. Convert only the supplied approved screenplay into production-ready segments and shots. Separate spoken dialogue, visual direction, and audio direction. Preserve every line of dialogue verbatim. Estimate readable dialogue timing from syllable or word count, pauses, laughter, reactions, and dramatic rhythm; never force long dialogue into an implausibly short shot. Select framing and camera movement from dramatic intent rather than repeating defaults. Use @ASSET_CODE placeholders for identified characters and locations, and list unresolved identities separately. Return data that exactly matches the supplied JSON schema. Output language: ${language}. Never invent franchise characters or copyrighted source material not present in the screenplay.`;
}

function validateResult(result) {
  if (!result || typeof result !== "object" || !Array.isArray(result.segments) || !Array.isArray(result.shots)) {
    throw new Error("Provider response is missing segments or shots.");
  }
  if (!result.continuity || !Array.isArray(result.continuity.unresolved)) {
    throw new Error("Provider response is missing continuity data.");
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

async function readPayload(response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Provider returned a non-JSON response (${response.status}).`);
  }
}

function responseError(payload, status) {
  return payload?.error?.message || payload?.message || `Provider request failed (${status}).`;
}

function parseOpenAIOutput(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === "refusal") throw new Error(content.refusal || "OpenAI refused the screenplay analysis request.");
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  throw new Error("OpenAI returned no structured screenplay output.");
}

function normalizeOpenAIUsage(usage) {
  return {
    inputTokens: usage?.input_tokens || 0,
    outputTokens: usage?.output_tokens || 0,
    cachedInputTokens: usage?.input_tokens_details?.cached_tokens || 0
  };
}

async function callOpenAI(config, screenplay, language) {
  const response = await fetchWithTimeout(`${config.baseUrl}/responses`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      instructions: systemInstruction(language),
      input: screenplay,
      max_output_tokens: config.maxOutputTokens,
      text: {
        format: {
          type: "json_schema",
          name: "lightbringer_screenplay_analysis",
          strict: true,
          schema: screenplayAnalysisSchema
        }
      }
    })
  }, config.timeoutMs);
  const payload = await readPayload(response);
  if (!response.ok) throw new Error(responseError(payload, response.status));
  if (payload.status === "incomplete") {
    const reason = payload.incomplete_details?.reason || "unknown reason";
    throw new Error(`OpenAI output was incomplete: ${reason}. Split the approved screenplay into smaller segments.`);
  }
  return {
    result: validateResult(JSON.parse(parseOpenAIOutput(payload))),
    usage: normalizeOpenAIUsage(payload.usage)
  };
}

function normalizeAnthropicUsage(usage) {
  return {
    inputTokens: usage?.input_tokens || 0,
    outputTokens: usage?.output_tokens || 0,
    cachedInputTokens: usage?.cache_read_input_tokens || 0
  };
}

async function callAnthropic(config, screenplay, language) {
  const response = await fetchWithTimeout(`${config.baseUrl}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": config.apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxOutputTokens,
      system: systemInstruction(language),
      messages: [{ role: "user", content: screenplay }],
      output_config: { format: { type: "json_schema", schema: screenplayAnalysisSchema } }
    })
  }, config.timeoutMs);
  const payload = await readPayload(response);
  if (!response.ok) throw new Error(responseError(payload, response.status));
  if (payload.stop_reason === "max_tokens") {
    throw new Error("Claude output reached the token limit. Split the approved screenplay into smaller segments.");
  }
  if (payload.stop_reason === "refusal") throw new Error("Claude refused the screenplay analysis request.");
  const content = Array.isArray(payload.content) ? payload.content.find((item) => item.type === "text")?.text : "";
  if (!content) throw new Error("Claude returned no structured screenplay output.");
  return { result: validateResult(JSON.parse(content)), usage: normalizeAnthropicUsage(payload.usage) };
}

export async function analyzeScreenplay({ screenplay, language = "ko", provider }) {
  const config = providerConfig(provider);
  const text = String(screenplay || "").trim();
  if (text.length < 20) throw new Error("Screenplay must contain at least 20 characters.");
  if (text.length > config.maxInputChars) throw new Error(`Screenplay exceeds the ${config.maxInputChars.toLocaleString()} character limit.`);

  if (config.provider === "mock") return { result: analyzeMock({ language }), usage: { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 } };
  if (!config.externalEnabled) throw new Error("External LLM calls are disabled on this server.");
  if (!config.apiKey || !config.model) throw new Error(`${config.provider} configuration is incomplete.`);

  return config.provider === "anthropic"
    ? callAnthropic(config, text, language)
    : callOpenAI(config, text, language);
}
