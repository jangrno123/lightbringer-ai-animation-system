const VIDEO_PROVIDERS = ["mock", "byteplus"];
const SUPPORTED = new Set([...VIDEO_PROVIDERS, "volcengine"]);

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
  if (!SUPPORTED.has(provider)) throw new Error(`Unsupported video provider: ${provider}`);
  return provider;
}

export function videoProviderConfig(providerOverride) {
  const provider = normalizeProvider(providerOverride || process.env.LIGHTBRINGER_VIDEO_PROVIDER || "mock");
  const isVolcengine = provider === "volcengine";
  return {
    provider,
    externalEnabled: boolEnv("LIGHTBRINGER_VIDEO_EXTERNAL_ENABLED"),
    baseUrl: String(
      isVolcengine
        ? process.env.VOLCENGINE_ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3"
        : process.env.BYTEPLUS_API_BASE_URL || "https://ark.ap-southeast.bytepluses.com/api/v3"
    ).trim().replace(/\/+$/, ""),
    apiKey: String(isVolcengine ? process.env.VOLCENGINE_ARK_API_KEY || "" : process.env.BYTEPLUS_API_KEY || "").trim(),
    model: String(isVolcengine ? process.env.VOLCENGINE_SEEDANCE_MODEL || "" : process.env.BYTEPLUS_SEEDANCE_MODEL || "").trim(),
    timeoutMs: intEnv("LIGHTBRINGER_VIDEO_TIMEOUT_MS", 30000, 5000, 120000)
  };
}

export function publicVideoProviderStatus(config = videoProviderConfig()) {
  const ready = config.provider === "mock" || Boolean(config.externalEnabled && config.apiKey && config.model);
  return {
    provider: config.provider,
    label: config.provider === "byteplus" ? "BytePlus · Seedance" : config.provider === "volcengine" ? "Volcengine Ark · Seedance" : "LIGHTBRINGER Mock Renderer",
    mode: config.provider === "mock" ? "mock" : "external",
    model: config.provider === "mock" ? "Deterministic storyboard queue" : (config.model || "not configured"),
    ready,
    asynchronous: config.provider !== "mock",
    automaticRetry: false,
    costConfirmationRequired: true
  };
}

export function listPublicVideoProviderStatus() {
  return VIDEO_PROVIDERS.map((provider) => publicVideoProviderStatus(videoProviderConfig(provider)));
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
    throw new Error(`Video provider returned a non-JSON response (${response.status}).`);
  }
}

function providerError(payload, status) {
  return payload?.error?.message || payload?.message || `Video provider request failed (${status}).`;
}

function validateRenderRequest(input) {
  const prompt = String(input?.prompt || "").trim();
  if (prompt.length < 10) throw new Error("Render prompt must contain at least 10 characters.");
  if (prompt.length > 8000) throw new Error("Render prompt exceeds the 8,000-character safety limit.");
  if (input?.confirmedCost !== true) throw new Error("Cost confirmation is required before creating a render job.");
  const duration = Number(input?.duration || 5);
  if (!Number.isFinite(duration) || duration < 1 || duration > 15) throw new Error("Duration must be between 1 and 15 seconds.");
  const references = Array.isArray(input?.references) ? input.references.slice(0, 12) : [];
  return {
    prompt,
    negativePrompt: String(input?.negativePrompt || "").trim(),
    duration,
    ratio: String(input?.ratio || "16:9"),
    resolution: String(input?.resolution || "1080p"),
    generateAudio: input?.generateAudio === true,
    watermark: input?.watermark === true,
    references
  };
}

function normalizeStatus(status) {
  const value = String(status || "queued").toLowerCase();
  if (["succeeded", "completed", "success"].includes(value)) return "completed";
  if (["failed", "error", "cancelled", "canceled"].includes(value)) return "failed";
  if (["running", "processing", "in_progress"].includes(value)) return "processing";
  return "queued";
}

function contentForSeedance(request) {
  const text = request.negativePrompt
    ? `${request.prompt}\n\nNegative prompt: ${request.negativePrompt}`
    : request.prompt;
  const content = [{ type: "text", text }];
  for (const reference of request.references) {
    const type = String(reference?.type || "image").toLowerCase();
    const url = String(reference?.url || "").trim();
    if (!url) continue;
    if (type === "video") content.push({ type: "video_url", video_url: { url }, role: reference.role || "reference_video" });
    else if (type === "audio") content.push({ type: "audio_url", audio_url: { url }, role: reference.role || "reference_audio" });
    else content.push({ type: "image_url", image_url: { url }, role: reference.role || "reference_image" });
  }
  return content;
}

async function createExternalJob(config, request) {
  const response = await fetchWithTimeout(`${config.baseUrl}/contents/generations/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      content: contentForSeedance(request),
      duration: request.duration,
      ratio: request.ratio,
      resolution: request.resolution,
      generate_audio: request.generateAudio,
      watermark: request.watermark
    })
  }, config.timeoutMs);
  const payload = await readPayload(response);
  if (!response.ok) throw new Error(providerError(payload, response.status));
  const id = payload.id || payload.task_id;
  if (!id) throw new Error("Seedance did not return a render task ID.");
  return {
    id,
    provider: config.provider,
    model: config.model,
    status: normalizeStatus(payload.status),
    createdAt: payload.created_at || new Date().toISOString(),
    rawStatus: payload.status || "queued"
  };
}

export async function createRenderJob(input) {
  const request = validateRenderRequest(input);
  const config = videoProviderConfig(input?.provider);
  if (config.provider === "mock") {
    return {
      id: `mock_${crypto.randomUUID()}`,
      provider: "mock",
      model: "Deterministic storyboard queue",
      status: "completed",
      createdAt: new Date().toISOString(),
      outputUrl: null
    };
  }
  if (!config.externalEnabled) throw new Error("External video generation is disabled on this server.");
  if (!config.apiKey || !config.model) throw new Error(`${config.provider} Seedance configuration is incomplete.`);
  return createExternalJob(config, request);
}

export async function getRenderJob(id, providerOverride) {
  const jobId = String(id || "").trim();
  if (!jobId) throw new Error("Render task ID is required.");
  const config = videoProviderConfig(providerOverride || (jobId.startsWith("mock_") ? "mock" : undefined));
  if (config.provider === "mock") {
    return { id: jobId, provider: "mock", status: "completed", outputUrl: null };
  }
  if (!config.externalEnabled || !config.apiKey || !config.model) throw new Error(`${config.provider} Seedance configuration is incomplete.`);
  const response = await fetchWithTimeout(`${config.baseUrl}/contents/generations/tasks/${encodeURIComponent(jobId)}`, {
    headers: { authorization: `Bearer ${config.apiKey}` }
  }, config.timeoutMs);
  const payload = await readPayload(response);
  if (!response.ok) throw new Error(providerError(payload, response.status));
  return {
    id: payload.id || payload.task_id || jobId,
    provider: config.provider,
    model: payload.model || config.model,
    status: normalizeStatus(payload.status),
    rawStatus: payload.status,
    outputUrl: payload.content?.video_url || payload.output?.video_url || payload.video_url || null,
    createdAt: payload.created_at || null,
    updatedAt: payload.updated_at || null,
    error: payload.error?.message || null
  };
}
