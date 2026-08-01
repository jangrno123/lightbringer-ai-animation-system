const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const state = {
  language: "ko",
  stage: "screenplay",
  analysis: null,
  selectedShotId: null,
  provider: null,
  completedStages: new Set(["screenplay"])
};

const copy = {
  ko: {
    scene: "DEMO-SC001 · 무음 궤도의 신호",
    screenplay: ["01 · APPROVED SCREENPLAY", "대본에서 제작 데이터까지", "더미 대본을 확인하고 분석을 실행하세요. Mock 모드에서는 비용이 발생하지 않습니다."],
    shots: ["02 · SHOT DESIGN & TIMING", "구간을 탐색하고 샷을 편집", "전체 대본을 펼치지 않고 선택한 구간과 샷만 확인합니다."],
    continuity: ["03 · CONTINUITY & ASSET LOCK", "샷마다 인물과 장소를 고정", "프롬프트보다 먼저 에셋 정체성과 공간 흐름을 검토합니다."],
    prompts: ["04 · PROMPT MASTER", "공통 규칙과 샷 정본을 분리", "공통 스타일·네거티브는 한 번만, 샷별 행위와 카메라는 별도로 관리합니다."],
    render: ["05 · RENDER COST GATE", "비용을 확인한 뒤 대기열 생성", "승인된 샷만 요청하고 모든 시도는 이력으로 보존합니다."],
    analyzing: "대본을 분석하고 있습니다…",
    analyzed: "분석 완료. 2개 구간과 3개 샷이 생성되었습니다.",
    analysisError: "분석 실패",
    ready: "연결됨",
    selectShot: "샷을 선택하세요",
    dummyQueued: "더미 렌더 대기열이 완료되었습니다. 외부 비용은 발생하지 않았습니다.",
    visual: "시각 지문", audio: "청각 지문", dialogue: "대사", framing: "화면 크기", camera: "카메라", assets: "에셋",
    assetLabels: { "@ARIA_PILOT": "아리아 · 인물", "@NOX_ENGINEER": "녹스 · 인물", "@LB_OBSERVATION": "라이트브링거 관측실 · 장소" }
  },
  en: {
    scene: "DEMO-SC001 · Signal in Silent Orbit",
    screenplay: ["01 · APPROVED SCREENPLAY", "From screenplay to production data", "Review the dummy screenplay and run analysis. Mock mode never incurs external cost."],
    shots: ["02 · SHOT DESIGN & TIMING", "Navigate segments and edit one shot", "Review only the selected segment and shot instead of expanding the full screenplay."],
    continuity: ["03 · CONTINUITY & ASSET LOCK", "Lock characters and locations per shot", "Review asset identity and location flow before writing generation prompts."],
    prompts: ["04 · PROMPT MASTER", "Separate shared rules from shot masters", "Define shared style and negatives once, then manage shot action and camera independently."],
    render: ["05 · RENDER COST GATE", "Approve cost before creating the queue", "Request approved shots only and preserve every attempt in history."],
    analyzing: "Analyzing screenplay…",
    analyzed: "Analysis complete. 2 segments and 3 shots were created.",
    analysisError: "Analysis failed",
    ready: "Connected",
    selectShot: "Select a shot",
    dummyQueued: "The dummy render queue completed with no external cost.",
    visual: "Visual direction", audio: "Audio direction", dialogue: "Dialogue", framing: "Framing", camera: "Camera", assets: "Assets",
    assetLabels: { "@ARIA_PILOT": "Aria · Character", "@NOX_ENGINEER": "Nox · Character", "@LB_OBSERVATION": "Lightbringer Observation Deck · Location" }
  }
};

const demoScreenplay = {
  ko: `INT. 라이트브링거 관측실 - 심우주\n\n푸른 항성광이 금이 간 관측창을 가른다. 아리아는 흔들리는 콘솔을 붙잡고 닫혀 가는 도약문을 바라본다.\n\n아리아\n도약창이 닫히기까지 사십이 초. 이번에 놓치면 돌아갈 길이 없어.\n\n경보음이 빨라진다. 녹스가 손상된 항법 장치를 우회 연결한다.\n\n녹스\n좌표를 고정해. 나머지는 내가 붙잡을게.\n\n함선이 거대한 푸른 섬광을 향해 기울어진다.`,
  en: `INT. LIGHTBRINGER OBSERVATION DECK - DEEP SPACE\n\nCold blue starlight cuts across the cracked observation window. Aria grips the shaking console and watches the jump gate collapse.\n\nARIA\nForty-two seconds until the jump gate closes. If we miss it now, there is no way back.\n\nThe warning pulse accelerates. Nox bypasses the damaged navigation array.\n\nNOX\nHold the coordinates. I will keep the rest together.\n\nThe ship banks toward a vast blue flare.`
};

function translateStatic() {
  document.documentElement.lang = state.language;
  $$(`[data-${state.language}]`).forEach((element) => {
    element.textContent = element.dataset[state.language];
  });
  $("#languageButton").textContent = state.language === "ko" ? "EN" : "KO";
  $("#sceneLabel").textContent = copy[state.language].scene;
  $("#screenplayInput").value = demoScreenplay[state.language];
  updateCharacterCount();
  setStage(state.stage);
  if (state.analysis) renderAnalysis();
}

function setStage(stage) {
  state.stage = stage;
  $$(".stage-panel").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === stage));
  $$(".workflow-step").forEach((step) => step.classList.toggle("active", step.dataset.stage === stage));
  const [eyebrow, title, description] = copy[state.language][stage];
  $("#stageEyebrow").textContent = eyebrow;
  $("#stageTitle").textContent = title;
  $("#stageDescription").textContent = description;
  const order = ["screenplay", "shots", "continuity", "prompts", "render"];
  $("#progressValue").textContent = `${Math.round(((order.indexOf(stage) + 1) / order.length) * 100)}%`;
}

function notify(message, error = false) {
  const notice = $("#notice");
  notice.textContent = message;
  notice.className = `notice show${error ? " error" : ""}`;
}

function unlockWorkflow() {
  $$(".workflow-step").forEach((step) => { step.disabled = false; });
}

function updateCharacterCount() {
  const max = state.provider?.maxInputChars || 12000;
  $("#characterCount").textContent = `${$("#screenplayInput").value.length.toLocaleString()} / ${max.toLocaleString()}`;
}

async function loadHealth() {
  const badge = $("#engineBadge");
  try {
    const response = await fetch("/api/health");
    state.provider = await response.json();
    badge.classList.add(state.provider.ready ? "ready" : "error");
    $("span", badge).textContent = `${state.provider.provider.toUpperCase()} · ${state.provider.ready ? copy[state.language].ready : "NOT READY"}`;
    updateCharacterCount();
  } catch {
    badge.classList.add("error");
    $("span", badge).textContent = "API OFFLINE";
  }
}

async function analyze() {
  if (!$("#costConfirm").checked) return notify(state.language === "ko" ? "호출 범위를 먼저 확인하세요." : "Confirm the request scope first.", true);
  const button = $("#analyzeButton");
  button.disabled = true;
  notify(copy[state.language].analyzing);
  $("#requestMeta").textContent = state.provider ? `${state.provider.provider} · ${state.provider.model}` : "";
  const startedAt = performance.now();
  try {
    const response = await fetch("/api/v1/screenplay/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ screenplay: $("#screenplayInput").value, language: state.language })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Request failed");
    state.analysis = payload.result;
    state.selectedShotId = state.analysis.shots[0]?.id || null;
    unlockWorkflow();
    renderAnalysis();
    $("#requestMeta").textContent = `${payload.requestId.slice(0, 8)} · ${Math.round(performance.now() - startedAt)}ms · ${payload.usage?.inputTokens ?? 0}/${payload.usage?.outputTokens ?? 0} tokens`;
    notify(copy[state.language].analyzed);
    setStage("shots");
  } catch (error) {
    notify(`${copy[state.language].analysisError}: ${error.message}`, true);
  } finally {
    button.disabled = false;
  }
}

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderSegments() {
  const list = $("#segmentList");
  list.replaceChildren();
  $("#segmentCount").textContent = state.analysis.segments.length;
  state.analysis.segments.forEach((segment) => {
    const wrapper = el("div", "segment");
    const head = el("div", "segment-head");
    head.append(el("b", "", segment.id), el("span", "", segment.status.toUpperCase()));
    wrapper.append(head);
    segment.shotIds.forEach((shotId) => {
      const shot = state.analysis.shots.find((item) => item.id === shotId);
      if (!shot) return;
      const button = el("button", `shot-link${shot.id === state.selectedShotId ? " active" : ""}`);
      button.type = "button";
      button.append(el("b", "", `${shot.id} · ${shot.durationSeconds}s`), el("small", "", shot.title));
      button.addEventListener("click", () => { state.selectedShotId = shot.id; renderSegments(); renderShot(); renderPrompt(); });
      wrapper.append(button);
    });
    list.append(wrapper);
  });
}

function field(label, value, wide = false, multiline = false) {
  const wrapper = el("label", `field${wide ? " wide" : ""}`);
  wrapper.append(el("span", "", label));
  const control = el(multiline ? "textarea" : "input");
  control.value = value || "";
  wrapper.append(control);
  return wrapper;
}

function renderShot() {
  const shot = state.analysis.shots.find((item) => item.id === state.selectedShotId);
  if (!shot) return;
  $("#shotCode").textContent = shot.id;
  $("#shotTitle").textContent = shot.title;
  $("#shotDuration").textContent = `${shot.durationSeconds}s`;
  const editor = $("#shotEditor");
  editor.className = "shot-editor";
  editor.replaceChildren(
    field(copy[state.language].framing, shot.framing),
    field(copy[state.language].camera, shot.camera),
    field(`${copy[state.language].dialogue} · ${shot.speaker || "—"}`, shot.dialogue, true, true),
    field(copy[state.language].visual, shot.visualDirection, false, true),
    field(copy[state.language].audio, shot.audioDirection, false, true),
    field(copy[state.language].assets, shot.assets.join(" · "), true)
  );
}

function renderContinuity() {
  const rows = $("#continuityRows");
  rows.replaceChildren();
  state.analysis.shots.forEach((shot) => {
    const row = el("div", "continuity-row");
    const pills = el("div", "asset-pills");
    shot.assets.forEach((asset) => pills.append(el("span", "asset-pill", asset)));
    row.append(el("b", "", shot.id), el("span", "", shot.title), pills);
    rows.append(row);
  });
  const assets = [...new Set(state.analysis.shots.flatMap((shot) => shot.assets))];
  const library = $("#assetLibrary");
  library.replaceChildren();
  const imageByAsset = { "@ARIA_PILOT": "/assets/demo/asset-aria.jpg", "@NOX_ENGINEER": "/assets/demo/asset-nox.jpg", "@LB_OBSERVATION": "/assets/demo/shot-001.jpg" };
  assets.forEach((asset) => {
    const item = el("div", "asset-item");
    const img = el("img", "asset-thumb");
    img.src = imageByAsset[asset] || "/assets/demo/shot-002.jpg";
    img.alt = "";
    const label = el("div");
    label.append(el("b", "", asset), el("span", "", copy[state.language].assetLabels[asset] || asset));
    item.append(img, label);
    library.append(item);
  });
}

function promptFor(shot) {
  if (!shot) return "";
  return `${$("#commonPrompt").value}. ${shot.framing}, ${shot.camera}. ${shot.visualDirection} ${shot.speaker ? `${shot.speaker} says in ${state.language === "ko" ? "Korean" : "English"}: “${shot.dialogue}”` : ""}. Maintain identity for ${shot.assets.join(", ")}. Audio: ${shot.audioDirection}. Negative: ${$("#negativePrompt").value}.`;
}

function renderPrompt() {
  const select = $("#promptShotSelect");
  const previous = select.value || state.selectedShotId;
  select.replaceChildren();
  state.analysis.shots.forEach((shot) => {
    const option = el("option", "", `${shot.id} · ${shot.title}`);
    option.value = shot.id;
    select.append(option);
  });
  select.value = state.analysis.shots.some((shot) => shot.id === previous) ? previous : state.analysis.shots[0]?.id;
  state.selectedShotId = select.value;
  $("#shotPrompt").value = promptFor(state.analysis.shots.find((shot) => shot.id === select.value));
}

function renderAnalysis() {
  renderSegments();
  renderShot();
  renderContinuity();
  renderPrompt();
}

function createDummyQueue() {
  const history = $("#renderHistory");
  history.replaceChildren();
  state.analysis.shots.forEach((shot, index) => {
    const item = el("div", "history-item");
    item.append(el("span", "", `${String(index + 1).padStart(2, "0")} · ${shot.id}`), el("b", "", "COMPLETED"));
    history.append(item);
  });
  notify(copy[state.language].dummyQueued);
  $("#progressValue").textContent = "100%";
}

$("#workflowNav").addEventListener("click", (event) => {
  const button = event.target.closest(".workflow-step");
  if (button && !button.disabled) setStage(button.dataset.stage);
});
$$('[data-next]').forEach((button) => button.addEventListener("click", () => setStage(button.dataset.next)));
$("#languageButton").addEventListener("click", () => { state.language = state.language === "ko" ? "en" : "ko"; translateStatic(); loadHealth(); });
$("#apiSetupButton").addEventListener("click", () => $("#apiDialog").showModal());
$("#screenplayInput").addEventListener("input", updateCharacterCount);
$("#analyzeButton").addEventListener("click", analyze);
$("#promptShotSelect").addEventListener("change", () => { state.selectedShotId = $("#promptShotSelect").value; renderPrompt(); });
$("#commonPrompt").addEventListener("input", renderPrompt);
$("#negativePrompt").addEventListener("input", renderPrompt);
$("#renderButton").addEventListener("click", createDummyQueue);

translateStatic();
loadHealth();
